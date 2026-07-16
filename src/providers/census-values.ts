import type { EconomicEvent } from "../types";
import { htmlToText, assertHtmlResponse } from "../parsers/html";
import { dateAndTimeToUtc, parseDateOnly } from "./helpers";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";

export const CENSUS_RESIDENTIAL_VALUES_URL = "https://www.census.gov/construction/nrc/current/";

export type CensusReleaseValue = {
  actualValue: string | null;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
};

export type CensusReleaseEvent = Pick<EconomicEvent, "id" | "name" | "eventTimeUtc">;

type ResidentialSnapshot = {
  releaseDate: string;
  releasePeriod: string;
  metrics: Record<string, { actualValue: string; previousValue: string | null }>;
};

function monthNumber(value: string): number {
  return ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(value.toLowerCase()) + 1;
}

function parseNumber(value: string | undefined): string | null {
  const match = /\d[\d,]*/.exec(value ?? "");
  return match?.[0] ?? null;
}

function localDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseCensusResidentialRelease(body: string): ResidentialSnapshot {
  const text = htmlToText(body);
  const heading = /MONTHLY NEW RESIDENTIAL CONSTRUCTION,\s*([A-Za-z]+)\s+(\d{4})/i.exec(text);
  const release = /FOR IMMEDIATE RELEASE:\s*(?:[A-Za-z]+,\s*)?([A-Za-z]+\s+\d{1,2},\s+\d{4})/i.exec(text);
  if (!heading || !release) throw new Error("Census residential release metadata was not found");
  const month = monthNumber(heading[1]);
  if (month < 1) throw new Error(`unsupported Census release month: ${heading[1]}`);
  const releaseDate = parseDateOnly(release[1]);
  const building = /Building Permits[\s\S]*?rate of\s+([\d,]+)\.[\s\S]*?revised [A-Za-z]+ rate of\s+([\d,]+)/i.exec(text);
  const starts = /Housing Starts[\s\S]*?rate of\s+([\d,]+)\.[\s\S]*?revised [A-Za-z]+ estimate of\s+([\d,]+)/i.exec(text);
  const buildingActual = parseNumber(building?.[1]);
  const buildingPrevious = parseNumber(building?.[2]);
  const startsActual = parseNumber(starts?.[1]);
  const startsPrevious = parseNumber(starts?.[2]);
  if (!buildingActual || !startsActual) throw new Error("Census residential release values were not found");
  return {
    releaseDate,
    releasePeriod: `${heading[2]}-${String(month).padStart(2, "0")}`,
    metrics: {
      "Building Permits Prel": { actualValue: buildingActual, previousValue: buildingPrevious },
      "Housing Starts": { actualValue: startsActual, previousValue: startsPrevious },
    },
  };
}

export async function fetchCensusEventValues(events: CensusReleaseEvent[], fetchedAt = new Date().toISOString()): Promise<Map<string, CensusReleaseValue>> {
  const requested = events.filter((event) => event.name === "Building Permits Prel" || event.name === "Housing Starts");
  if (!requested.length) return new Map();
  const response = await fetchWithTimeout(CENSUS_RESIDENTIAL_VALUES_URL, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": "EconomicEventBot/1.0 (+https://github.com/lijingchiu/EconomicEvent)" } });
  const body = await readBodyWithLimit(response);
  assertHtmlResponse(response, body);
  const snapshot = parseCensusResidentialRelease(body);
  const values = new Map<string, CensusReleaseValue>();
  const sourceUpdatedAt = dateAndTimeToUtc(snapshot.releaseDate, "8:30 AM");
  for (const event of requested) {
    const metric = snapshot.metrics[event.name];
    if (!metric) continue;
    const eventDate = localDate(event.eventTimeUtc);
    if (eventDate === snapshot.releaseDate) {
      values.set(event.id, { ...metric, valueUnit: "units", valueSourceUrl: CENSUS_RESIDENTIAL_VALUES_URL, sourceUpdatedAt });
    } else if (eventDate > snapshot.releaseDate && new Date(event.eventTimeUtc).getTime() > new Date(fetchedAt).getTime()) {
      values.set(event.id, { actualValue: null, previousValue: metric.actualValue, valueUnit: "units", valueSourceUrl: CENSUS_RESIDENTIAL_VALUES_URL, sourceUpdatedAt });
    }
  }
  return values;
}

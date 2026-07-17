import type { EconomicEvent, Env } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";

const TARGET_RATE_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARU";
const TARGET_RATE_SOURCE_URL = "https://fred.stlouisfed.org/series/DFEDTARU";

type FederalReserveValueEvent = Pick<EconomicEvent, "id" | "name" | "eventTimeUtc">;
type FederalReserveValue = {
  actualValue: string | null;
  previousValue: string | null;
  valueUnit: string;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
  releasePeriod: string;
};

function dateInNewYork(value: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseFredCsv(csv: string): Array<{ date: string; value: string }> {
  return csv.replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const [date, rawValue] = line.split(",");
    const value = rawValue?.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && value && value !== "." && Number.isFinite(Number(value)) ? [{ date, value }] : [];
  });
}

export async function fetchFederalReserveEventValues(events: FederalReserveValueEvent[], _env: Env, fetchedAt = new Date().toISOString()): Promise<Map<string, FederalReserveValue>> {
  const relevant = events.filter((event) => event.name === "FOMC Interest Rate Decision");
  if (!relevant.length) return new Map();
  const earliestDate = relevant.map((event) => dateInNewYork(event.eventTimeUtc)).sort()[0];
  const start = new Date(`${earliestDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 14);
  const response = await fetchWithTimeout(`${TARGET_RATE_URL}&cosd=${start.toISOString().slice(0, 10)}`, { headers: { accept: "text/csv,text/plain,*/*" } });
  const body = await readBodyWithLimit(response);
  if (!response.ok) throw new Error(`failed to fetch Federal Reserve target rate (HTTP ${response.status})`);
  const observations = parseFredCsv(body);
  if (!observations.length) throw new Error("Federal Reserve target rate returned no observations");

  const fetchedTime = new Date(fetchedAt).getTime();
  const values = new Map<string, FederalReserveValue>();
  for (const event of relevant) {
    const eventDate = dateInNewYork(event.eventTimeUtc);
    const eventReleased = new Date(event.eventTimeUtc).getTime() <= fetchedTime;
    const actual = eventReleased ? observations.find((item) => item.date === eventDate)?.value ?? null : null;
    const prior = [...observations].reverse().find((item) => item.date < eventDate)?.value ?? null;
    if (actual == null && prior == null) continue;
    values.set(event.id, {
      actualValue: actual,
      previousValue: prior,
      valueUnit: "%",
      valueSourceUrl: TARGET_RATE_SOURCE_URL,
      sourceUpdatedAt: fetchedAt,
      releasePeriod: eventDate,
    });
  }
  return values;
}

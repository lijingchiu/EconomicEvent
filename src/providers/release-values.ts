import { parseHtmlTableRows } from "../parsers/html";
import type { EconomicEvent, Env } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";

export const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
export const UMICH_VALUES_URL = "https://www.sca.isr.umich.edu/";
export const ISM_MANUFACTURING_VALUES_URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/";
export const ISM_SERVICES_VALUES_URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/";

const USER_AGENT = "EconomicEventBot/1.0 (+https://github.com/lijingchiu/EconomicEvent)";

export type ReleaseValue = {
  actualValue: string;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
};

export type ReleaseValueEvent = Pick<EconomicEvent, "id" | "name" | "eventTimeUtc">;

type YearMonth = { year: number; month: number };
type BlsDatum = { year: string; period: string; value: string };
type BlsSeries = { seriesID: string; data: BlsDatum[] };
type BlsResponse = {
  status?: string;
  message?: string[];
  Results?: { series?: BlsSeries[] };
};

const BLS_SERIES_BY_METRIC: Record<string, string[]> = {
  "Inflation Rate MoM": ["CUSR0000SA0"],
  "Core Inflation Rate MoM": ["CUSR0000SA0L1E"],
  "Inflation Rate YoY": ["CUUR0000SA0"],
  "Core Inflation Rate YoY": ["CUUR0000SA0L1E"],
  "PPI MoM": ["WPSFD4"],
  "Non Farm Payrolls": ["CES0000000001"],
  "Unemployment Rate": ["LNS14000000"],
  "JOLTs Job Openings": ["JTS00000000JOL"],
};

function zonedYearMonth(iso: string): YearMonth {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date(iso));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function shiftMonth(period: YearMonth, delta: number): YearMonth {
  const date = new Date(Date.UTC(period.year, period.month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function periodKey(period: YearMonth): string {
  return `${period.year}-M${String(period.month).padStart(2, "0")}`;
}

function seriesValues(series: BlsSeries | undefined): Map<string, number> {
  const values = new Map<string, number>();
  for (const item of series?.data ?? []) {
    const value = Number(item.value);
    if (item.period !== "M13" && Number.isFinite(value)) values.set(`${item.year}-${item.period}`, value);
  }
  return values;
}

function oneDecimal(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return Object.is(rounded, -0) ? "0.0" : rounded.toFixed(1);
}

function percentChange(current: number | undefined, comparison: number | undefined): string | null {
  if (current == null || comparison == null || comparison === 0) return null;
  return oneDecimal(((current / comparison) - 1) * 100);
}

function valueAt(values: Map<string, number>, period: YearMonth): number | undefined {
  return values.get(periodKey(period));
}

function metricValue(name: string, series: Map<string, Map<string, number>>, period: YearMonth): Pick<ReleaseValue, "actualValue" | "previousValue" | "valueUnit"> | null {
  const previous = shiftMonth(period, -1);
  const twoMonthsAgo = shiftMonth(period, -2);
  const yearAgo = shiftMonth(period, -12);
  const priorYearAgo = shiftMonth(period, -13);
  const seriesId = BLS_SERIES_BY_METRIC[name]?.[0];
  const values = seriesId ? series.get(seriesId) : undefined;
  if (!values) return null;

  if (name === "Unemployment Rate") {
    const actual = valueAt(values, period);
    if (actual == null) return null;
    const prior = valueAt(values, previous);
    return { actualValue: oneDecimal(actual), previousValue: prior == null ? null : oneDecimal(prior), valueUnit: "%" };
  }

  if (name === "Non Farm Payrolls") {
    const current = valueAt(values, period);
    const priorLevel = valueAt(values, previous);
    if (current == null || priorLevel == null) return null;
    const earlierLevel = valueAt(values, twoMonthsAgo);
    return {
      actualValue: String(Math.round(current - priorLevel)),
      previousValue: earlierLevel == null ? null : String(Math.round(priorLevel - earlierLevel)),
      valueUnit: "K",
    };
  }

  if (name === "JOLTs Job Openings") {
    const actual = valueAt(values, period);
    if (actual == null) return null;
    const prior = valueAt(values, previous);
    return { actualValue: String(Math.round(actual)), previousValue: prior == null ? null : String(Math.round(prior)), valueUnit: "K" };
  }

  const yearOverYear = name.endsWith("YoY");
  const actual = yearOverYear
    ? percentChange(valueAt(values, period), valueAt(values, yearAgo))
    : percentChange(valueAt(values, period), valueAt(values, previous));
  if (actual == null) return null;
  const prior = yearOverYear
    ? percentChange(valueAt(values, previous), valueAt(values, priorYearAgo))
    : percentChange(valueAt(values, previous), valueAt(values, twoMonthsAgo));
  return { actualValue: actual, previousValue: prior, valueUnit: "%" };
}

export function buildBlsEventValues(events: ReleaseValueEvent[], response: BlsResponse, fetchedAt: string): Map<string, ReleaseValue> {
  if (response.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS API request failed: ${(response.message ?? []).join("; ") || response.status || "unknown status"}`);
  }
  const expectedPeriod = shiftMonth(zonedYearMonth(events[0].eventTimeUtc), -1);
  const series = new Map((response.Results?.series ?? []).map((item) => [item.seriesID, seriesValues(item)]));
  const values = new Map<string, ReleaseValue>();
  for (const event of events) {
    const metric = metricValue(event.name, series, expectedPeriod);
    if (metric) values.set(event.id, { ...metric, valueSourceUrl: BLS_API_URL, sourceUpdatedAt: fetchedAt });
  }
  return values;
}

export async function fetchBlsEventValues(events: ReleaseValueEvent[], env: Env, fetchedAt = new Date().toISOString()): Promise<Map<string, ReleaseValue>> {
  if (!events.length) return new Map();
  const seriesIds = [...new Set(events.flatMap((event) => BLS_SERIES_BY_METRIC[event.name] ?? []))];
  if (!seriesIds.length) return new Map();
  const expectedPeriod = shiftMonth(zonedYearMonth(events[0].eventTimeUtc), -1);
  const body: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: String(expectedPeriod.year - 2),
    endyear: String(expectedPeriod.year),
  };
  if (env.BLS_API_KEY) body.registrationkey = env.BLS_API_KEY;
  const response = await fetchWithTimeout(BLS_API_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": USER_AGENT },
    body: JSON.stringify(body),
  });
  const raw = await readBodyWithLimit(response);
  if (!response.ok) throw new Error(`BLS API returned HTTP ${response.status}`);
  let parsed: BlsResponse;
  try { parsed = JSON.parse(raw) as BlsResponse; } catch { throw new Error("BLS API returned invalid JSON"); }
  return buildBlsEventValues(events, parsed, fetchedAt);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function parseUmichEventValue(event: ReleaseValueEvent, html: string, fetchedAt: string): ReleaseValue | null {
  const heading = /\b(Preliminary|Final)\s+Results\s+for\s+([A-Za-z]+)\s+(\d{4})\b/i.exec(html);
  if (!heading) throw new Error("Michigan results heading was not found");
  const expected = zonedYearMonth(event.eventTimeUtc);
  const publishedMonth = MONTHS.indexOf(heading[2].toLowerCase()) + 1;
  const expectedPhase = /\bprel/i.test(event.name) ? "preliminary" : "final";
  if (heading[1].toLowerCase() !== expectedPhase || publishedMonth !== expected.month || Number(heading[3]) !== expected.year) return null;
  const row = parseHtmlTableRows(html).find((cells) => /^index of consumer sentiment$/i.test(cells[0]?.trim() ?? ""));
  const actual = Number(row?.[1]);
  const prior = Number(row?.[2]);
  if (!Number.isFinite(actual)) throw new Error("Michigan sentiment value was not found");
  return {
    actualValue: oneDecimal(actual),
    previousValue: Number.isFinite(prior) ? oneDecimal(prior) : null,
    valueUnit: null,
    valueSourceUrl: UMICH_VALUES_URL,
    sourceUpdatedAt: fetchedAt,
  };
}

export async function fetchUmichEventValues(events: ReleaseValueEvent[], fetchedAt = new Date().toISOString()): Promise<Map<string, ReleaseValue>> {
  if (!events.length) return new Map();
  const response = await fetchWithTimeout(UMICH_VALUES_URL, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT } });
  const html = await readBodyWithLimit(response);
  if (!response.ok) throw new Error(`Michigan results page returned HTTP ${response.status}`);
  const values = new Map<string, ReleaseValue>();
  for (const event of events) {
    const value = parseUmichEventValue(event, html, fetchedAt);
    if (value) values.set(event.id, value);
  }
  return values;
}

function ismValuesUrl(event: ReleaseValueEvent): string {
  const period = shiftMonth(zonedYearMonth(event.eventTimeUtc), -1);
  const month = MONTHS[period.month - 1];
  const baseUrl = event.name === "ISM Services PMI" ? ISM_SERVICES_VALUES_URL : ISM_MANUFACTURING_VALUES_URL;
  return `${baseUrl}${month}/`;
}

function numericCell(value: string | undefined): number | undefined {
  const match = /[-+]?\d+(?:\.\d+)?/.exec((value ?? "").replace(/,/g, ""));
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseIsmEventValue(event: ReleaseValueEvent, html: string, fetchedAt: string, valueSourceUrl = ismValuesUrl(event)): ReleaseValue | null {
  const label = event.name === "ISM Services PMI" ? "Services" : event.name === "ISM Manufacturing PMI" ? "Manufacturing" : null;
  if (!label) return null;
  const row = parseHtmlTableRows(html).find((cells) => new RegExp(`^${label}\\s+PMI\\b`, "i").test(cells[0]?.replace(/\s+/g, " ").trim() ?? ""));
  const actual = numericCell(row?.[1]);
  const prior = numericCell(row?.[2]);
  if (actual == null) throw new Error(`${label} PMI value was not found`);
  return {
    actualValue: oneDecimal(actual),
    previousValue: prior == null ? null : oneDecimal(prior),
    valueUnit: "%",
    valueSourceUrl,
    sourceUpdatedAt: fetchedAt,
  };
}

export async function fetchIsmEventValues(events: ReleaseValueEvent[], fetchedAt = new Date().toISOString()): Promise<Map<string, ReleaseValue>> {
  if (!events.length) return new Map();
  const htmlByUrl = new Map<string, string>();
  const values = new Map<string, ReleaseValue>();
  for (const event of events) {
    const valueSourceUrl = ismValuesUrl(event);
    let html = htmlByUrl.get(valueSourceUrl);
    if (html == null) {
      const response = await fetchWithTimeout(valueSourceUrl, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT } });
      html = await readBodyWithLimit(response);
      if (!response.ok) throw new Error(`ISM report page returned HTTP ${response.status}`);
      htmlByUrl.set(valueSourceUrl, html);
    }
    const value = parseIsmEventValue(event, html, fetchedAt, valueSourceUrl);
    if (value) values.set(event.id, value);
  }
  return values;
}

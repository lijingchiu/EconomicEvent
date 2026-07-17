import { parseHtmlTableRows } from "../parsers/html";
import type { EconomicEvent, Env } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";

export const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
export const UMICH_VALUES_URL = "https://www.sca.isr.umich.edu/";
export const ISM_MANUFACTURING_VALUES_URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/";
export const ISM_SERVICES_VALUES_URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/";

const USER_AGENT = "EconomicEventBot/1.0 (+https://github.com/lijingchiu/EconomicEvent)";

export type ReleaseValue = {
  actualValue: string | null;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
  releasePeriod?: string | null;
};

export type ReleaseValueEvent = Pick<EconomicEvent, "id" | "name" | "eventTimeUtc"> & Pick<Partial<EconomicEvent>, "description">;

type YearMonth = { year: number; month: number };
type YearQuarter = { year: number; quarter: number };
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
  "JOLTs Job Openings": ["JTS000000000000000JOL"],
  "Employment Cost Index QoQ": ["CIS1010000000000Q"],
  "Nonfarm Productivity QoQ Prel": ["PRS85006092"],
  "Unit Labor Costs QoQ Prel": ["PRS85006112"],
  "Nonfarm Productivity QoQ Revised": ["PRS85006092"],
  "Unit Labor Costs QoQ Revised": ["PRS85006112"],
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

function quarterKey(period: YearQuarter): string {
  return `${period.year}-Q${String(period.quarter).padStart(2, "0")}`;
}

function shiftQuarter(period: YearQuarter, delta: number): YearQuarter {
  const index = period.year * 4 + period.quarter - 1 + delta;
  return { year: Math.floor(index / 4), quarter: ((index % 4) + 4) % 4 + 1 };
}

function eventQuarter(event: ReleaseValueEvent): YearQuarter | null {
  const source = `${event.description ?? ""} ${event.name}`;
  const match = /\b(first|second|third|fourth|1st|2nd|3rd|4th)\s+quarter\s+(\d{4})\b/i.exec(source);
  if (match) {
    const quarter = ["first", "1st", "second", "2nd", "third", "3rd", "fourth", "4th"].indexOf(match[1].toLowerCase());
    return { year: Number(match[2]), quarter: Math.floor(quarter / 2) + 1 };
  }
  const delta = event.name === "Employment Cost Index QoQ"
    ? -1
    : /\bQoQ Prel$/.test(event.name)
      ? -2
      : /\bQoQ Revised$/.test(event.name)
        ? -3
        : null;
  if (delta == null) return null;
  const referenceMonth = shiftMonth(zonedYearMonth(event.eventTimeUtc), delta);
  return { year: referenceMonth.year, quarter: Math.ceil(referenceMonth.month / 3) };
}

function expectedMonthlyPeriod(event: ReleaseValueEvent): YearMonth {
  return shiftMonth(zonedYearMonth(event.eventTimeUtc), event.name === "JOLTs Job Openings" ? -2 : -1);
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

function quarterlyMetricValue(event: ReleaseValueEvent, series: Map<string, Map<string, number>>): (Pick<ReleaseValue, "actualValue" | "previousValue" | "valueUnit"> & { releasePeriod: string }) | null {
  const period = eventQuarter(event);
  const seriesId = BLS_SERIES_BY_METRIC[event.name]?.[0];
  const values = seriesId ? series.get(seriesId) : undefined;
  if (!period || !values) return null;
  const actual = values.get(quarterKey(period));
  const prior = values.get(quarterKey(shiftQuarter(period, -1)));
  if (actual == null && prior == null) return null;
  return {
    actualValue: actual == null ? null : oneDecimal(actual),
    previousValue: prior == null ? null : oneDecimal(prior),
    valueUnit: "%",
    releasePeriod: quarterKey(period),
  };
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
    const prior = valueAt(values, previous);
    if (actual == null && prior == null) return null;
    return { actualValue: actual == null ? null : oneDecimal(actual), previousValue: prior == null ? null : oneDecimal(prior), valueUnit: "%" };
  }

  if (name === "Non Farm Payrolls") {
    const current = valueAt(values, period);
    const priorLevel = valueAt(values, previous);
    const earlierLevel = valueAt(values, twoMonthsAgo);
    const actual = current == null || priorLevel == null ? null : String(Math.round(current - priorLevel));
    const prior = priorLevel == null || earlierLevel == null ? null : String(Math.round(priorLevel - earlierLevel));
    if (actual == null && prior == null) return null;
    return {
      actualValue: actual,
      previousValue: prior,
      valueUnit: "K",
    };
  }

  if (name === "JOLTs Job Openings") {
    const actual = valueAt(values, period);
    const prior = valueAt(values, previous);
    if (actual == null && prior == null) return null;
    return { actualValue: actual == null ? null : String(Math.round(actual)), previousValue: prior == null ? null : String(Math.round(prior)), valueUnit: "K" };
  }

  const yearOverYear = name.endsWith("YoY");
  const actual = yearOverYear
    ? percentChange(valueAt(values, period), valueAt(values, yearAgo))
    : percentChange(valueAt(values, period), valueAt(values, previous));
  const prior = yearOverYear
    ? percentChange(valueAt(values, previous), valueAt(values, priorYearAgo))
    : percentChange(valueAt(values, previous), valueAt(values, twoMonthsAgo));
  if (actual == null && prior == null) return null;
  return { actualValue: actual, previousValue: prior, valueUnit: "%" };
}

export function buildBlsEventValues(events: ReleaseValueEvent[], response: BlsResponse, fetchedAt: string): Map<string, ReleaseValue> {
  if (response.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS API request failed: ${(response.message ?? []).join("; ") || response.status || "unknown status"}`);
  }
  const series = new Map((response.Results?.series ?? []).map((item) => [item.seriesID, seriesValues(item)]));
  const values = new Map<string, ReleaseValue>();
  for (const event of events) {
    const quarterly = /\bQoQ\b/.test(event.name) ? quarterlyMetricValue(event, series) : null;
    const expectedPeriod = expectedMonthlyPeriod(event);
    const metric = quarterly ?? metricValue(event.name, series, expectedPeriod);
    if (metric) {
      const future = new Date(event.eventTimeUtc).getTime() > new Date(fetchedAt).getTime();
      values.set(event.id, { ...metric, actualValue: future ? null : metric.actualValue, previousValue: future ? metric.actualValue ?? metric.previousValue : metric.previousValue, valueSourceUrl: BLS_API_URL, sourceUpdatedAt: fetchedAt, releasePeriod: quarterly?.releasePeriod ?? periodKey(expectedPeriod) });
    }
  }
  return values;
}

export async function fetchBlsEventValues(events: ReleaseValueEvent[], env: Env, fetchedAt = new Date().toISOString()): Promise<Map<string, ReleaseValue>> {
  if (!events.length) return new Map();
  const seriesIds = [...new Set(events.flatMap((event) => BLS_SERIES_BY_METRIC[event.name] ?? []))];
  if (!seriesIds.length) return new Map();
  const years = events.map((event) => eventQuarter(event)?.year ?? expectedMonthlyPeriod(event).year);
  const body: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: String(Math.min(...years) - 2),
    endyear: String(Math.max(...years)),
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
    releasePeriod: `${expected.year}-${String(expected.month).padStart(2, "0")}`,
  };
}

export async function fetchUmichEventValues(events: ReleaseValueEvent[], fetchedAt = new Date().toISOString()): Promise<Map<string, ReleaseValue>> {
  if (!events.length) return new Map();
  const response = await fetchWithTimeout(UMICH_VALUES_URL, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT } });
  const html = await readBodyWithLimit(response);
  if (!response.ok) throw new Error(`Michigan results page returned HTTP ${response.status}`);
  const values = new Map<string, ReleaseValue>();
  const latest = parseUmichLatestValue(html, fetchedAt);
  for (const event of events) {
    const value = parseUmichEventValue(event, html, fetchedAt);
    if (value) {
      values.set(event.id, value);
      continue;
    }
    const isFuture = new Date(event.eventTimeUtc).getTime() > new Date(fetchedAt).getTime();
    const expected = zonedYearMonth(event.eventTimeUtc);
    const sourceIsEarlier = latest && (latest.year < expected.year || (latest.year === expected.year && latest.month < expected.month) || (latest.year === expected.year && latest.month === expected.month && latest.phase === "preliminary" && /final/i.test(event.name)));
    if (isFuture && sourceIsEarlier && latest) {
      values.set(event.id, { actualValue: null, previousValue: latest.value, valueUnit: null, valueSourceUrl: UMICH_VALUES_URL, sourceUpdatedAt: fetchedAt, releasePeriod: `${expected.year}-${String(expected.month).padStart(2, "0")}` });
    }
  }
  return values;
}

function parseUmichLatestValue(html: string, fetchedAt: string): { phase: "preliminary" | "final"; year: number; month: number; value: string } | null {
  const heading = /\b(Preliminary|Final)\s+Results\s+for\s+([A-Za-z]+)\s+(\d{4})\b/i.exec(html);
  if (!heading) return null;
  const row = parseHtmlTableRows(html).find((cells) => /^index of consumer sentiment$/i.test(cells[0]?.trim() ?? ""));
  const actual = Number(row?.[1]);
  if (!Number.isFinite(actual)) return null;
  return { phase: heading[1].toLowerCase() as "preliminary" | "final", month: MONTHS.indexOf(heading[2].toLowerCase()) + 1, year: Number(heading[3]), value: oneDecimal(actual) };
}

function ismValuesUrl(event: ReleaseValueEvent, delta = 0): string {
  const period = shiftMonth(zonedYearMonth(event.eventTimeUtc), -1 + delta);
  const month = MONTHS[period.month - 1];
  const baseUrl = event.name === "ISM Services PMI" ? ISM_SERVICES_VALUES_URL : ISM_MANUFACTURING_VALUES_URL;
  return `${baseUrl}${month}/`;
}

async function fetchIsmPage(url: string): Promise<Response> {
  const init = { headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT }, cache: "no-store" as RequestCache };
  const response = await fetchWithTimeout(url, init);
  if (response.status !== 404) return response;
  return fetchWithTimeout(`${url}?refresh=${Date.now()}`, init);
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
    releasePeriod: periodKey(shiftMonth(zonedYearMonth(event.eventTimeUtc), -1)),
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
      const response = await fetchIsmPage(valueSourceUrl);
      html = await readBodyWithLimit(response);
      if (response.ok) htmlByUrl.set(valueSourceUrl, html);
      else if (new Date(event.eventTimeUtc).getTime() <= new Date(fetchedAt).getTime()) throw new Error(`ISM report page returned HTTP ${response.status}`);
    }
    let value: ReleaseValue | null = null;
    if (html && html.trim()) {
      try { value = parseIsmEventValue(event, html, fetchedAt, valueSourceUrl); } catch (error) {
        if (new Date(event.eventTimeUtc).getTime() <= new Date(fetchedAt).getTime()) throw error;
      }
    }
    if (value) {
      values.set(event.id, value);
      continue;
    }
    if (new Date(event.eventTimeUtc).getTime() > new Date(fetchedAt).getTime()) {
      const priorUrl = ismValuesUrl(event, -1);
      let priorHtml = htmlByUrl.get(priorUrl);
      if (priorHtml == null) {
        const priorResponse = await fetchIsmPage(priorUrl);
        priorHtml = await readBodyWithLimit(priorResponse);
        if (!priorResponse.ok) {
          if (new Date(event.eventTimeUtc).getTime() > new Date(fetchedAt).getTime()) continue;
          throw new Error(`ISM prior report page returned HTTP ${priorResponse.status}`);
        }
        htmlByUrl.set(priorUrl, priorHtml);
      }
      const prior = parseIsmEventValue(event, priorHtml, fetchedAt, priorUrl);
      if (prior?.actualValue != null) values.set(event.id, { actualValue: null, previousValue: prior.actualValue, valueUnit: prior.valueUnit ?? null, valueSourceUrl: priorUrl, sourceUpdatedAt: prior.sourceUpdatedAt ?? fetchedAt });
    }
  }
  return values;
}

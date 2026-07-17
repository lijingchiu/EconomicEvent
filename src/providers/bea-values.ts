import type { Env } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import type { ReleaseValue, ReleaseValueEvent } from "./release-values";

export const BEA_DATA_URL = "https://apps.bea.gov/api/data/";

type BeaRow = {
  LineNumber?: string;
  TimePeriod?: string;
  DataValue?: string;
};

type BeaResponse = {
  BEAAPI?: {
    Results?: {
      Data?: BeaRow[];
      Error?: { APIErrorCode?: string; APIErrorDescription?: string };
    };
  };
};

type MetricSpec = {
  table: "T10101" | "T20307" | "T20600";
  frequency: "M" | "Q";
  line: string;
  directPercent: boolean;
};

const METRICS: Record<string, MetricSpec> = {
  "GDP Growth Rate QoQ Adv": { table: "T10101", frequency: "Q", line: "1", directPercent: true },
  "GDP Growth Rate QoQ": { table: "T10101", frequency: "Q", line: "1", directPercent: true },
  "Core PCE Price Index MoM": { table: "T20307", frequency: "M", line: "25", directPercent: true },
  "Personal Income MoM": { table: "T20600", frequency: "M", line: "1", directPercent: false },
  "Personal Spending MoM": { table: "T20600", frequency: "M", line: "29", directPercent: false },
};

function numeric(value: string | undefined): number | null {
  const parsed = Number((value ?? "").replace(/,/g, "").replace(/\([^)]*\)/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function oneDecimal(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return Object.is(rounded, -0) ? "0.0" : rounded.toFixed(1);
}

function periodForRelease(eventTimeUtc: string, frequency: "M" | "Q"): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric" }).formatToParts(new Date(eventTimeUtc));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const dataMonth = new Date(Date.UTC(year, month - 2, 1));
  if (frequency === "M") return `${dataMonth.getUTCFullYear()}M${String(dataMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const quarterMonth = new Date(Date.UTC(year, month - 4, 1));
  return `${quarterMonth.getUTCFullYear()}Q${Math.floor(quarterMonth.getUTCMonth() / 3) + 1}`;
}

function sortedSeries(rows: BeaRow[], spec: MetricSpec): Array<{ period: string; value: number }> {
  return rows
    .filter((row) => String(row.LineNumber ?? "") === spec.line && typeof row.TimePeriod === "string")
    .map((row) => ({ period: String(row.TimePeriod), value: numeric(row.DataValue) }))
    .filter((row): row is { period: string; value: number } => row.value != null)
    .sort((left, right) => left.period.localeCompare(right.period));
}

function percentSeries(rows: BeaRow[], spec: MetricSpec): Map<string, string> {
  const series = sortedSeries(rows, spec);
  const result = new Map<string, string>();
  for (let index = 0; index < series.length; index += 1) {
    if (spec.directPercent) result.set(series[index].period, oneDecimal(series[index].value));
    else if (index > 0 && series[index - 1].value !== 0) result.set(series[index].period, oneDecimal(((series[index].value / series[index - 1].value) - 1) * 100));
  }
  return result;
}

function priorPeriod(periods: string[], expected: string): string | null {
  const index = periods.indexOf(expected);
  return index > 0 ? periods[index - 1] : null;
}

async function fetchTable(env: Env, spec: MetricSpec, years: number[]): Promise<BeaRow[]> {
  const userId = env.BEA_API_KEY?.trim();
  if (!userId) return [];
  const url = new URL(BEA_DATA_URL);
  url.searchParams.set("UserID", userId);
  url.searchParams.set("method", "GetData");
  url.searchParams.set("DataSetName", "NIPA");
  url.searchParams.set("TableName", spec.table);
  url.searchParams.set("Frequency", spec.frequency);
  url.searchParams.set("Year", [...new Set(years)].sort().join(","));
  url.searchParams.set("ResultFormat", "JSON");
  const response = await fetchWithTimeout(url.toString(), { headers: { accept: "application/json" } });
  const body = await readBodyWithLimit(response);
  if (!response.ok) throw new Error(`BEA API returned HTTP ${response.status}`);
  let parsed: BeaResponse;
  try { parsed = JSON.parse(body) as BeaResponse; } catch { throw new Error("BEA API returned invalid JSON"); }
  const error = parsed.BEAAPI?.Results?.Error;
  if (error) throw new Error(`BEA API ${error.APIErrorCode ?? "error"}: ${error.APIErrorDescription ?? "request failed"}`);
  return parsed.BEAAPI?.Results?.Data ?? [];
}

export function buildBeaEventValues(events: ReleaseValueEvent[], tables: Map<string, BeaRow[]>, fetchedAt: string): Map<string, ReleaseValue> {
  const result = new Map<string, ReleaseValue>();
  for (const event of events) {
    const spec = METRICS[event.name];
    if (!spec) continue;
    const values = percentSeries(tables.get(spec.table) ?? [], spec);
    const expected = periodForRelease(event.eventTimeUtc, spec.frequency);
    const periods = [...values.keys()].sort();
    const expectedValue = values.get(expected) ?? null;
    const previousKey = priorPeriod(periods, expected);
    const previousValue = previousKey ? values.get(previousKey) ?? null : null;
    if (expectedValue != null) {
      result.set(event.id, { actualValue: expectedValue, previousValue, valueUnit: "%", valueSourceUrl: BEA_DATA_URL, sourceUpdatedAt: fetchedAt, releasePeriod: expected });
      continue;
    }
    const latestPeriod = periods.filter((period) => period < expected).at(-1);
    if (latestPeriod && new Date(event.eventTimeUtc).getTime() > new Date(fetchedAt).getTime()) {
      result.set(event.id, { actualValue: null, previousValue: values.get(latestPeriod) ?? null, valueUnit: "%", valueSourceUrl: BEA_DATA_URL, sourceUpdatedAt: fetchedAt, releasePeriod: expected });
    }
  }
  return result;
}

export async function fetchBeaEventValues(events: ReleaseValueEvent[], env: Env, fetchedAt = new Date().toISOString()): Promise<Map<string, ReleaseValue>> {
  if (!events.length || !env.BEA_API_KEY?.trim()) return new Map();
  const specsByTable = new Map<MetricSpec["table"], MetricSpec>();
  for (const event of events) {
    const spec = METRICS[event.name];
    if (spec) specsByTable.set(spec.table, spec);
  }
  const specs = [...specsByTable.values()];
  const years = events.flatMap((event) => {
    const year = new Date(event.eventTimeUtc).getUTCFullYear();
    return [year - 1, year];
  });
  const rows = await Promise.all(specs.map(async (spec) => [spec.table, await fetchTable(env, spec, years)] as const));
  return buildBeaEventValues(events, new Map(rows), fetchedAt);
}

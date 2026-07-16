import type { EconomicCalendarProvider } from "./index";
import type { EconomicEvent } from "../types";
import type { AppConfig, Env, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { assertHtmlResponse, htmlToText } from "../parsers/html";
import { eventFromRelease, dateAndTimeToUtc, inRange, parseDateOnly, releaseMetricNames } from "./helpers";

const WPSR_SCHEDULE_URL = "https://www.eia.gov/petroleum/supply/weekly/schedule.php";
const WPSR_REPORT_URL = "https://www.eia.gov/petroleum/supply/weekly/";
const WPSR_VALUES_URL = "https://ir.eia.gov/wpsr/table1.csv";
const WNGSR_SCHEDULE_URL = "https://ir.eia.gov/ngs/schedule.html";
const WNGSR_REPORT_URL = "https://ir.eia.gov/ngs/ngs.html";
const WNGSR_VALUES_URL = "https://ir.eia.gov/ngs/wngsr.json";

type MetricSnapshot = {
  actualValue: string;
  previousValue: string;
  valueUnit: string;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
};

type SnapshotBundle = {
  releaseDate: string;
  metrics: Record<string, { values: MetricSnapshot; description: string }>;
};

function localDateParts(date: Date): { date: string; weekday: number } {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(date);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayName);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: dayIndex };
}

function daysBetween(fromUtc: Date, toUtc: Date): Date[] {
  const result: Date[] = [];
  const cursor = new Date(fromUtc.getTime() - 3 * 86_400_000);
  const end = new Date(toUtc.getTime() + 3 * 86_400_000);
  while (cursor <= end) {
    result.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

type ScheduleException = { date: string; time: string; standardDate: string };

function parseScheduleExceptions(text: string, standardWeekday: number): ScheduleException[] {
  const result: ScheduleException[] = [];
  const datePattern = "(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}";
  const pattern = new RegExp(`(${datePattern})\\s+(?:[A-Za-z]+)\\s+(\\d{1,2}:\\d{2}\\s*[ap]\\.?m\\.?)`, "gi");
  for (const match of text.matchAll(pattern)) {
    try {
      const alternateDate = new Date(`${match[1]} 12:00:00Z`);
      if (Number.isNaN(alternateDate.getTime())) continue;
      const alternateWeekday = alternateDate.getUTCDay();
      let best: Date | undefined;
      for (let offset = -3; offset <= 3; offset += 1) {
        const candidate = new Date(alternateDate.getTime() + offset * 86_400_000);
        if (candidate.getUTCDay() === standardWeekday && (!best || Math.abs(offset) < Math.abs((best.getTime() - alternateDate.getTime()) / 86_400_000))) best = candidate;
      }
      if (!best || alternateWeekday === standardWeekday) continue;
      const iso = (date: Date) => date.toISOString().slice(0, 10);
      const time = match[2].replace(/\./g, "").replace(/\s+/g, " ").toUpperCase();
      result.push({ date: iso(alternateDate), time, standardDate: iso(best) });
    } catch {
      /* ignore malformed schedule rows; the warning is emitted by the provider */
    }
  }
  return result;
}

function normalizeLabel(value: string): string {
  return value.normalize("NFKC").replace(/^\uFEFF/, "").replace(/\u001a/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === "\"" && line[index + 1] === "\"") {
        cell += "\"";
        index += 1;
        continue;
      }
      if (char === "\"") {
        quoted = false;
        continue;
      }
      cell += char;
      continue;
    }
    if (char === "\"") {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsvRows(text: string): string[][] {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(parseCsvLine);
}

function parseNumber(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(parsed)) throw new Error(`invalid numeric value: ${value}`);
  return parsed;
}

function formatNumber(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function directionPhrase(value: number, unit: string, reference: string, fractionDigits: number): string {
  if (value === 0) return `unchanged ${reference}`;
  return `${value > 0 ? "up" : "down"} ${formatNumber(Math.abs(value), fractionDigits)} ${unit} ${reference}`;
}

function comparisonPhrase(value: number, unit: string, reference: string, fractionDigits: number): string {
  if (value === 0) return `equal to ${reference}`;
  return `${formatNumber(Math.abs(value), fractionDigits)} ${unit} ${value > 0 ? "above" : "below"} ${reference}`;
}

export type EiaReleaseValue = {
  actualValue: string | null;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
};

export type EiaReleaseEvent = Pick<EconomicEvent, "id" | "name" | "eventTimeUtc">;

const WPSR_RELEASE_NAME = "Weekly Petroleum Status Report";

function parseEiaDate(value: string): string {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const monthAbbrev = /^(\d{4})-([A-Za-z]{3})-(\d{2})(?:\s+.*)?$/.exec(trimmed);
  if (monthAbbrev) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(monthAbbrev[2].toLowerCase()) + 1;
    if (month < 1) throw new Error(`unsupported month in EIA date: ${value}`);
    return `${monthAbbrev[1]}-${String(month).padStart(2, "0")}-${monthAbbrev[3]}`;
  }
  return parseDateOnly(trimmed);
}

async function fetchText(url: string, init: RequestInit, errorMessage: string): Promise<string> {
  const response = await fetchWithTimeout(url, init);
  const body = await readBodyWithLimit(response);
  if (!response.ok) throw new Error(`${errorMessage} (HTTP ${response.status})`);
  if (!body.trim()) throw new Error(`${errorMessage} returned an empty response`);
  return body;
}

export async function fetchEiaEventValues(events: EiaReleaseEvent[], fetchedAt = new Date().toISOString()): Promise<Map<string, EiaReleaseValue>> {
  if (!events.length) return new Map();
  const names = new Set(events.map((event) => event.name));
  const [wpsr, wngsr] = await Promise.all([
    names.has(WPSR_RELEASE_NAME) || names.has("Crude Oil Inventories") || names.has("Gasoline Inventories") || names.has("Distillate Inventories")
      ? fetchWpsrSnapshot()
      : Promise.resolve(null),
    names.has("Natural Gas Storage")
      ? fetchWngsrSnapshot()
      : Promise.resolve(null),
  ]);
  const values = new Map<string, EiaReleaseValue>();
  for (const event of events) {
    const localDate = localDateParts(new Date(event.eventTimeUtc)).date;
    if (event.name === "Natural Gas Storage" && wngsr?.releaseDate === localDate) {
      const metric = wngsr.metrics[event.name];
      if (metric) values.set(event.id, metric.values);
      continue;
    }
    if (event.name === "Natural Gas Storage" && wngsr && localDate > wngsr.releaseDate) {
      const metric = wngsr.metrics[event.name];
      if (metric) values.set(event.id, { ...metric.values, actualValue: null, previousValue: metric.values.actualValue });
      continue;
    }
    if ((event.name === WPSR_RELEASE_NAME || event.name === "Crude Oil Inventories" || event.name === "Gasoline Inventories" || event.name === "Distillate Inventories") && wpsr?.releaseDate === localDate) {
      // Older D1 rows stored the whole WPSR as one release-level event. Keep
      // those rows backfillable by using crude oil as the release headline.
      const metricName = event.name === WPSR_RELEASE_NAME ? "Crude Oil Inventories" : event.name;
      const metric = wpsr.metrics[metricName];
      if (metric) values.set(event.id, metric.values);
      continue;
    }
    if ((event.name === WPSR_RELEASE_NAME || event.name === "Crude Oil Inventories" || event.name === "Gasoline Inventories" || event.name === "Distillate Inventories") && wpsr && localDate > wpsr.releaseDate) {
      const metricName = event.name === WPSR_RELEASE_NAME ? "Crude Oil Inventories" : event.name;
      const metric = wpsr.metrics[metricName];
      if (metric) values.set(event.id, { ...metric.values, actualValue: null, previousValue: metric.values.actualValue });
    }
  }
  return values;
}

function buildWpsrSnapshot(reportHtml: string, csvBody: string): SnapshotBundle {
  const reportText = htmlToText(reportHtml);
  const releaseMatch = /Data for week ending\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+Release Date:\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i.exec(reportText);
  if (!releaseMatch) throw new Error("WPSR release date not found");
  const releaseDate = parseDateOnly(releaseMatch[1]);
  const sourceUpdatedAt = dateAndTimeToUtc(releaseDate, "10:30 AM");
  const rows = new Map(parseCsvRows(csvBody).map((row) => [normalizeLabel(row[0] ?? ""), row]));
  const specs = [
    { metricName: "Crude Oil Inventories", rowLabel: "Crude Oil", descriptionLabel: "Crude oil inventories" },
    { metricName: "Gasoline Inventories", rowLabel: "Total Motor Gasoline", descriptionLabel: "Gasoline inventories" },
    { metricName: "Distillate Inventories", rowLabel: "Distillate Fuel Oil", descriptionLabel: "Distillate inventories" },
  ] as const;
  const metrics: SnapshotBundle["metrics"] = {};
  for (const spec of specs) {
    const row = rows.get(normalizeLabel(spec.rowLabel));
    if (!row || row.length < 7) throw new Error(`WPSR row not found: ${spec.rowLabel}`);
    const actual = parseNumber(row[1]);
    const previous = parseNumber(row[2]);
    const weekChange = parseNumber(row[3]);
    const yearChange = parseNumber(row[6]);
    metrics[spec.metricName] = {
      values: {
        actualValue: formatNumber(actual, 1),
        previousValue: formatNumber(previous, 1),
        valueUnit: "million barrels",
        valueSourceUrl: WPSR_REPORT_URL,
        sourceUpdatedAt,
      },
      description: `${spec.descriptionLabel} were ${formatNumber(actual, 1)} million barrels, ${directionPhrase(weekChange, "million barrels", "from the prior week", 1)} and ${comparisonPhrase(yearChange, "million barrels", "the year-ago level", 1)}.`,
    };
  }
  return { releaseDate, metrics };
}

function buildWngsrSnapshot(jsonBody: string): SnapshotBundle {
  const payload = JSON.parse(jsonBody) as Record<string, unknown>;
  const releaseDate = parseEiaDate(String(payload.release_date ?? ""));
  const sourceUpdatedAt = dateAndTimeToUtc(releaseDate, "10:30 AM");
  const currentWeek = parseEiaDate(String(payload.current_week ?? releaseDate));
  const series = Array.isArray(payload.series) ? payload.series[0] as Record<string, unknown> | undefined : undefined;
  if (!series) throw new Error("WNGSR series data not found");
  const data = Array.isArray(series.data) ? series.data as unknown[] : [];
  if (data.length < 3) throw new Error("WNGSR historical data missing");
  const currentRow = data[0] as [string, number];
  const weekAgoRow = data[1] as [string, number];
  const current = parseNumber(String(currentRow[1]));
  const weekAgo = parseNumber(String(weekAgoRow[1]));
  const fiveYearAvg = parseNumber(String((series.calculated as Record<string, unknown> | undefined)?.["5yr-avg"] ?? ""));
  const metricName = "Natural Gas Storage";
  return {
    releaseDate,
    metrics: {
      [metricName]: {
        values: {
          actualValue: formatNumber(current, 0),
          previousValue: formatNumber(weekAgo, 0),
          valueUnit: "Bcf",
          valueSourceUrl: WNGSR_REPORT_URL,
          sourceUpdatedAt,
        },
        description: `Working gas in storage was ${formatNumber(current, 0)} Bcf as of Friday, ${formatDate(currentWeek)}, ${directionPhrase(current - weekAgo, "Bcf", "from the previous week", 0)} and ${comparisonPhrase(current - fiveYearAvg, "Bcf", "the five-year average", 0)}.`,
      },
    },
  };
}

async function fetchWpsrSnapshot(): Promise<SnapshotBundle> {
  const [reportHtml, csvBody] = await Promise.all([
    fetchText(WPSR_REPORT_URL, { headers: { accept: "text/html" } }, "failed to fetch WPSR report page"),
    fetchText(WPSR_VALUES_URL, { headers: { accept: "text/csv,text/plain,*/*" } }, "failed to fetch WPSR values"),
  ]);
  return buildWpsrSnapshot(reportHtml, csvBody);
}

async function fetchWngsrSnapshot(): Promise<SnapshotBundle> {
  const jsonBody = await fetchText(WNGSR_VALUES_URL, { headers: { accept: "application/json,text/plain,*/*" } }, "failed to fetch WNGSR values");
  return buildWngsrSnapshot(jsonBody);
}

export class EiaProvider implements EconomicCalendarProvider {
  readonly name = "eia" as const;
  readonly sourceUrl = "https://www.eia.gov/reports/upcoming.php";

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events = [];
    const sources = [
      { url: WPSR_SCHEDULE_URL, marker: /weekly petroleum status report/i, weekday: 3, time: "10:30 AM", name: "Weekly Petroleum Status Report", id: "wpsr", valueFetcher: fetchWpsrSnapshot, description: "EIA official weekly petroleum report; inventory values are pulled from the official report when available." },
      { url: WNGSR_SCHEDULE_URL, marker: /standard release time.*thursdays/i, weekday: 4, time: "10:30 AM", name: "Natural Gas Storage", id: "wngsr", valueFetcher: fetchWngsrSnapshot, description: "EIA official weekly natural gas storage report; values are pulled from the official report when available." },
    ] as const;

    for (const source of sources) {
      let snapshot: SnapshotBundle | undefined;
      try {
        const response = await fetchWithTimeout(source.url, { headers: { accept: "text/html" } });
        const body = await readBodyWithLimit(response);
        assertHtmlResponse(response, body);
        const text = htmlToText(body);
        if (!source.marker.test(text)) throw new Error("EIA schedule did not contain the expected release marker");
        const exceptions = parseScheduleExceptions(text, source.weekday);
        const skippedStandardDates = new Set(exceptions.map((item) => item.standardDate));

        try {
          snapshot = await source.valueFetcher();
        } catch (error) {
          warnings.push({ code: "value_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch EIA values", provider: this.name, sourceUrl: source.url, details: { valueSourceUrl: source.id === "wpsr" ? WPSR_REPORT_URL : WNGSR_REPORT_URL } });
        }

        for (const date of daysBetween(range.fromUtc, range.toUtc)) {
          const local = localDateParts(date);
          if (local.weekday !== source.weekday) continue;
          if (skippedStandardDates.has(local.date)) continue;
          const eventTimeUtc = dateAndTimeToUtc(local.date, source.time);
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const metricNames = releaseMetricNames(source.name);
          for (const metricName of metricNames) {
            const metricSnapshot = snapshot?.releaseDate === local.date ? snapshot.metrics[metricName] : undefined;
            const built = await eventFromRelease({
              provider: "eia",
              providerEventId: source.id === "wpsr" && metricName === "Crude Oil Inventories"
                ? `${source.id}-${local.date}`
                : `${source.id}-${metricName}-${local.date}`,
              sourceUrl: source.url,
              name: metricName,
              eventTimeUtc,
              description: metricSnapshot?.description ?? source.description,
              sourceUpdatedAt: metricSnapshot?.values.sourceUpdatedAt ?? fetchedAtUtc,
              raw: { date: local.date, source: source.id, metricName },
              values: metricSnapshot?.values,
            }, env, config);
            if (built.event) events.push(built.event);
            else if (built.warning) warnings.push(built.warning);
          }
        }
        for (const exception of exceptions) {
          const eventTimeUtc = dateAndTimeToUtc(exception.date, exception.time);
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const metricNames = releaseMetricNames(source.name);
          for (const metricName of metricNames) {
            const metricSnapshot = snapshot?.releaseDate === exception.date ? snapshot.metrics[metricName] : undefined;
            const built = await eventFromRelease({
              provider: "eia",
              providerEventId: source.id === "wpsr" && metricName === "Crude Oil Inventories"
                ? `${source.id}-${exception.date}`
                : `${source.id}-${metricName}-${exception.date}-holiday`,
              sourceUrl: source.url,
              name: metricName,
              eventTimeUtc,
              description: metricSnapshot?.description ?? source.description,
              sourceUpdatedAt: metricSnapshot?.values.sourceUpdatedAt ?? fetchedAtUtc,
              raw: { ...exception, source: source.id, metricName },
              values: metricSnapshot?.values,
            }, env, config);
            if (built.event) events.push(built.event);
            else if (built.warning) warnings.push(built.warning);
          }
        }
      } catch (error) {
        warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch EIA schedule", provider: this.name, sourceUrl: source.url });
      }
    }

    if (!events.length) warnings.push({ code: "no_events", message: "EIA schedules contained no tracked events in requested range", provider: this.name, sourceUrl: this.sourceUrl });
    return { provider: this.name, fetchedAtUtc, sourceUrl: this.sourceUrl, events, warnings };
  }
}

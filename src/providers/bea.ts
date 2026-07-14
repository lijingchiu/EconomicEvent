import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { eventFromRelease, dateAndTimeToUtc, inRange, metricProviderEventId, releaseMetricNames } from "./helpers";

const URL = "https://apps.bea.gov/API/signup/release_dates.json";

function releaseRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  for (const key of ["release_dates", "releaseDates", "data", "releases", "results"]) {
    const rows = releaseRows(object[key]);
    if (rows.length) return rows;
  }
  return Object.values(object).flatMap((item) => releaseRows(item));
}

function stringField(row: Record<string, unknown>, keys: string[]): string | undefined { for (const key of keys) { const value = row[key]; if (typeof value === "string" || typeof value === "number") return String(value); } return undefined; }

export class BeaProvider implements EconomicCalendarProvider {
  readonly name = "bea" as const;
  readonly sourceUrl = URL;

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events = [];
    try {
      const response = await fetchWithTimeout(URL, { headers: { accept: "application/json" } });
      const body = await readBodyWithLimit(response);
      if (!response.ok) throw new Error(`source returned HTTP ${response.status}`);
      if (!/application\/json/i.test(response.headers.get("content-type") ?? "")) throw new Error("BEA JSON endpoint returned an unexpected content type");
      const rows = releaseRows(JSON.parse(body));
      for (const row of rows) {
        const date = stringField(row, ["date", "release_date", "releaseDate"]);
        const time = stringField(row, ["time", "release_time", "releaseTime"]) ?? "8:30 AM";
        const name = stringField(row, ["release", "name", "title", "description"]);
        const providerEventId = stringField(row, ["id", "uid", "release_id", "releaseId"]);
        if (!date || !name) { warnings.push({ code: "missing_required_field", message: "BEA row missing date or release name", provider: this.name, sourceUrl: URL }); continue; }
        try {
          const eventTimeUtc = dateAndTimeToUtc(date, time);
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const baseId = providerEventId ?? `${date}|${name}`;
          for (const metricName of releaseMetricNames(name)) {
            const built = await eventFromRelease({ provider: "bea", providerEventId: metricProviderEventId(baseId, name, metricName), sourceUrl: URL, name: metricName, eventTimeUtc, description: name, sourceUpdatedAt: fetchedAtUtc, raw: { row, metricName } }, env, config);
            if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
          }
        } catch (error) { warnings.push({ code: "event_parse_failed", message: error instanceof Error ? error.message : "failed to parse BEA event", provider: this.name, sourceUrl: URL }); }
      }
      if (!rows.length) warnings.push({ code: "no_rows", message: "BEA JSON array was empty", provider: this.name, sourceUrl: URL });
    } catch (error) { warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch BEA release dates", provider: this.name, sourceUrl: URL }); }
    return { provider: this.name, fetchedAtUtc, sourceUrl: URL, events, warnings };
  }
}

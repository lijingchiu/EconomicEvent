import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, EconomicEvent, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { assertHtmlResponse, parseHtmlTableRows } from "../parsers/html";
import { dateAndTimeToUtc, eventFromRelease, inRange, parseDateOnly } from "./helpers";

const URL = "https://www.census.gov/economic-indicators/calendar-listview.html";

function components(indicator: string): string[] {
  if (/advance monthly sales for retail/i.test(indicator)) return ["Retail Sales MoM"];
  if (/advance report on durable goods/i.test(indicator)) return ["Durable Goods Orders MoM"];
  if (/new residential construction/i.test(indicator)) return ["Building Permits Prel", "Housing Starts"];
  return [];
}

function addEvent(events: Map<string, EconomicEvent>, event: EconomicEvent): void { events.set(event.providerEventId ?? event.id, event); }

export class CensusProvider implements EconomicCalendarProvider {
  readonly name = "census" as const;
  readonly sourceUrl = URL;

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events = new Map<string, EconomicEvent>();
    try {
      const response = await fetchWithTimeout(URL, { headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" } });
      const body = await readBodyWithLimit(response);
      assertHtmlResponse(response, body);
      const rows = parseHtmlTableRows(body);
      for (const row of rows.slice(1)) {
        const indicator = row[0]?.replace(/\s+/g, " ").trim() ?? "";
        const names = components(indicator);
        if (!names.length) continue;
        const date = row[1];
        const time = row[2];
        if (!date || !time) { warnings.push({ code: "missing_required_field", message: "Census row missing release date or time", provider: this.name, sourceUrl: URL }); continue; }
        try {
          const eventTimeUtc = dateAndTimeToUtc(parseDateOnly(date), time);
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const releaseId = row[4] || row[3] || `${date}|${indicator}`;
          for (const name of names) {
            const built = await eventFromRelease({ provider: "census", providerEventId: `${releaseId}|${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, sourceUrl: URL, name, eventTimeUtc, description: `${indicator} — ${row[3] ?? ""}`.trim(), sourceUpdatedAt: fetchedAtUtc, raw: { row, indicator, name } }, env, config);
            if (built.event) addEvent(events, built.event); else if (built.warning) warnings.push(built.warning);
          }
        } catch (error) {
          warnings.push({ code: "event_parse_failed", message: error instanceof Error ? error.message : "failed to parse Census event", provider: this.name, sourceUrl: URL });
        }
      }
      if (!rows.length) warnings.push({ code: "no_rows", message: "Census economic indicator calendar was empty", provider: this.name, sourceUrl: URL });
    } catch (error) {
      warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch Census release calendar", provider: this.name, sourceUrl: URL });
    }
    if (!events.size && !warnings.some((warning) => warning.code === "source_fetch_failed")) warnings.push({ code: "no_events", message: "Census calendar contained no tracked events in requested range", provider: this.name, sourceUrl: URL });
    return { provider: this.name, fetchedAtUtc, sourceUrl: URL, events: [...events.values()], warnings };
  }
}

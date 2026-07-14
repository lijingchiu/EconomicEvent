import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, EconomicEvent, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { assertHtmlResponse, parseHtmlTableRows } from "../parsers/html";
import { dateAndTimeToUtc, eventFromRelease, inRange, parseDateOnly } from "./helpers";

const URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function numberCell(value: string | undefined): string | undefined {
  const match = /\b(\d{1,2})\b/.exec(value ?? "");
  return match?.[1];
}

export class IsmProvider implements EconomicCalendarProvider {
  readonly name = "ism" as const;
  readonly sourceUrl = URL;

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events: EconomicEvent[] = [];
    try {
      const response = await fetchWithTimeout(URL, { headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" } });
      const body = await readBodyWithLimit(response);
      assertHtmlResponse(response, body);
      const rows = parseHtmlTableRows(body);
      for (const row of rows) {
        const month = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})$/i.exec((row[0] ?? "").replace(/\s+/g, " ").trim());
        if (!month) continue;
        const manufacturingDay = numberCell(row[1]);
        const servicesDay = numberCell(row[2]);
        for (const item of [
          { day: manufacturingDay, name: "ISM Manufacturing PMI", key: "manufacturing" },
          { day: servicesDay, name: "ISM Services PMI", key: "services" },
        ]) {
          if (!item.day) continue;
          try {
            const date = parseDateOnly(`${month[1]} ${item.day}, ${month[2]}`);
            const eventTimeUtc = dateAndTimeToUtc(date, "10:00 AM");
            if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
            const built = await eventFromRelease({ provider: "ism", providerEventId: `${date}|${item.key}`, sourceUrl: URL, name: item.name, eventTimeUtc, description: "ISM official PMI release schedule; release time is 10:00 AM Eastern.", sourceUpdatedAt: fetchedAtUtc, raw: { row, date, item } }, env, config);
            if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
          } catch (error) { warnings.push({ code: "event_parse_failed", message: error instanceof Error ? error.message : "failed to parse ISM event", provider: this.name, sourceUrl: URL }); }
        }
      }
      if (!rows.length) warnings.push({ code: "no_rows", message: "ISM release calendar was empty", provider: this.name, sourceUrl: URL });
    } catch (error) {
      warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch ISM release calendar", provider: this.name, sourceUrl: URL });
    }
    if (!events.length && !warnings.some((warning) => warning.code === "source_fetch_failed")) warnings.push({ code: "no_events", message: "ISM calendar contained no tracked events in requested range", provider: this.name, sourceUrl: URL });
    return { provider: this.name, fetchedAtUtc, sourceUrl: URL, events, warnings };
  }
}

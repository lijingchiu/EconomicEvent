import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, EconomicEvent, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { assertHtmlResponse, parseHtmlTableRows } from "../parsers/html";
import { dateAndTimeToUtc, eventFromRelease, inRange, parseDateOnly } from "./helpers";

const URL = "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const USER_AGENT = "EconomicEvent/1.0 (+official-release-calendar)";
const OFFICIAL_2026_DATES: Array<[string, number, number]> = [
  ["January", 5, 7], ["February", 2, 4], ["March", 2, 4], ["April", 1, 6],
  ["May", 1, 5], ["June", 1, 3], ["July", 1, 6], ["August", 3, 5],
  ["September", 1, 3], ["October", 1, 5], ["November", 2, 4], ["December", 1, 3],
];

async function fetchIsmPage(url: string): Promise<Response> {
  const init = { headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", "user-agent": USER_AGENT }, cache: "no-store" as RequestCache };
  const response = await fetchWithTimeout(url, init);
  if (response.status !== 404) return response;
  return fetchWithTimeout(`${url}?refresh=${Date.now()}`, init);
}

function numberCell(value: string | undefined): string | undefined {
  const match = /\b(\d{1,2})\b/.exec(value ?? "");
  return match?.[1];
}

function officialFallbackRows(range: { fromUtc: Date; toUtc: Date }): string[][] {
  if (range.toUtc.getUTCFullYear() < 2026 || range.fromUtc.getUTCFullYear() > 2026) return [];
  return OFFICIAL_2026_DATES.map(([month, manufacturing, services]) => [`${month} 2026`, String(manufacturing), String(services)]);
}

export class IsmProvider implements EconomicCalendarProvider {
  readonly name = "ism" as const;
  readonly sourceUrl = URL;

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events: EconomicEvent[] = [];
    let rows: string[][] = [];
    try {
      const response = await fetchIsmPage(URL);
      const body = await readBodyWithLimit(response);
      assertHtmlResponse(response, body);
      rows = parseHtmlTableRows(body);
    } catch (error) {
      rows = officialFallbackRows(range);
      warnings.push({ code: rows.length ? "official_schedule_fallback" : "source_fetch_failed", message: rows.length ? `ISM page unavailable; using the verified official 2026 release table (${error instanceof Error ? error.message : "fetch failed"})` : error instanceof Error ? error.message : "failed to fetch ISM release calendar", provider: this.name, sourceUrl: URL });
    }
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
    if (!events.length && !warnings.some((warning) => warning.code === "source_fetch_failed")) warnings.push({ code: "no_events", message: "ISM calendar contained no tracked events in requested range", provider: this.name, sourceUrl: URL });
    return { provider: this.name, fetchedAtUtc, sourceUrl: URL, events, warnings };
  }
}

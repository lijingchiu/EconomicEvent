import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { assertHtmlResponse, htmlToText } from "../parsers/html";
import { eventFromRelease, dateAndTimeToUtc, inRange } from "./helpers";

const WPSR_URL = "https://www.eia.gov/petroleum/supply/weekly/schedule.php";
const WNGSR_URL = "https://ir.eia.gov/ngs/schedule.html";

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
  while (cursor <= end) { result.push(new Date(cursor)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
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
    } catch { /* ignore malformed schedule rows; the warning is emitted by the provider */ }
  }
  return result;
}

export class EiaProvider implements EconomicCalendarProvider {
  readonly name = "eia" as const;
  readonly sourceUrl = "https://www.eia.gov/reports/upcoming.php";

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events = [];
    const sources = [
      { url: WPSR_URL, marker: /weekly petroleum status report/i, weekday: 3, time: "10:30 AM", name: "Weekly Petroleum Status Report", id: "wpsr" },
      { url: WNGSR_URL, marker: /standard release time.*thursdays/i, weekday: 4, time: "10:30 AM", name: "Natural Gas Storage", id: "wngsr" },
    ];
    for (const source of sources) {
      try {
        const response = await fetchWithTimeout(source.url, { headers: { accept: "text/html" } });
        const body = await readBodyWithLimit(response);
        assertHtmlResponse(response, body);
        const text = htmlToText(body);
        if (!source.marker.test(text)) throw new Error("EIA schedule did not contain the expected release marker");
        const exceptions = parseScheduleExceptions(text, source.weekday);
        const skippedStandardDates = new Set(exceptions.map((item) => item.standardDate));
        for (const date of daysBetween(range.fromUtc, range.toUtc)) {
          const local = localDateParts(date);
          if (local.weekday !== source.weekday) continue;
          if (skippedStandardDates.has(local.date)) continue;
          const eventTimeUtc = dateAndTimeToUtc(local.date, source.time);
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const built = await eventFromRelease({ provider: "eia", providerEventId: `${source.id}-${local.date}`, sourceUrl: source.url, name: source.name, eventTimeUtc, description: "EIA official weekly release schedule; holiday weeks may be delayed.", sourceUpdatedAt: fetchedAtUtc, raw: { date: local.date, source: source.id } }, env, config);
          if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
        }
        for (const exception of exceptions) {
          const eventTimeUtc = dateAndTimeToUtc(exception.date, exception.time);
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const built = await eventFromRelease({ provider: "eia", providerEventId: `${source.id}-${exception.date}-holiday`, sourceUrl: source.url, name: source.name, eventTimeUtc, description: "EIA official holiday-adjusted release schedule.", sourceUpdatedAt: fetchedAtUtc, raw: exception }, env, config);
          if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
        }
      } catch (error) { warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch EIA schedule", provider: this.name, sourceUrl: source.url }); }
    }
    if (!events.length) warnings.push({ code: "no_events", message: "EIA schedules contained no tracked events in requested range", provider: this.name, sourceUrl: this.sourceUrl });
    return { provider: this.name, fetchedAtUtc, sourceUrl: this.sourceUrl, events, warnings };
  }
}

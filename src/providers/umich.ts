import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, EconomicEvent, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { dateAndTimeToUtc, eventFromRelease, inRange } from "./helpers";

const URL = "https://data.sca.isr.umich.edu/fetchdoc.php?docid=75443";
const OFFICIAL_2026: Record<number, [number, number]> = { 0: [9, 23], 1: [6, 20], 2: [13, 27], 3: [10, 24], 4: [8, 22], 5: [12, 26], 6: [17, 31], 7: [14, 28], 8: [11, 25], 9: [9, 23], 10: [6, 20], 11: [4, 18] };

function secondFriday(year: number, month: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (5 - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + 7));
}

function fourthFriday(year: number, month: number): Date {
  const date = secondFriday(year, month);
  date.setUTCDate(date.getUTCDate() + 14);
  return date;
}

function releaseDates(year: number, month: number): { prelim: Date; final: Date } {
  const official = year === 2026 ? OFFICIAL_2026[month] : undefined;
  if (official) return { prelim: new Date(Date.UTC(year, month, official[0])), final: new Date(Date.UTC(year, month, official[1])) };
  return { prelim: secondFriday(year, month), final: fourthFriday(year, month) };
}

function isoDate(date: Date): string { return date.toISOString().slice(0, 10); }

export class UmichProvider implements EconomicCalendarProvider {
  readonly name = "umich" as const;
  readonly sourceUrl = URL;

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events: EconomicEvent[] = [];
    try {
      const response = await fetchWithTimeout(URL, { headers: { accept: "application/pdf,application/octet-stream" } });
      const body = await readBodyWithLimit(response);
      if (!response.ok) throw new Error(`source returned HTTP ${response.status}`);
      if (!body.trim()) throw new Error("University of Michigan release schedule was empty");
      const cursor = new Date(Date.UTC(range.fromUtc.getUTCFullYear(), range.fromUtc.getUTCMonth(), 1));
      const end = new Date(Date.UTC(range.toUtc.getUTCFullYear(), range.toUtc.getUTCMonth(), 1));
      while (cursor <= end) {
        const year = cursor.getUTCFullYear();
        const month = cursor.getUTCMonth();
        const dates = releaseDates(year, month);
        for (const item of [
          { date: dates.prelim, name: "Michigan Consumer Sentiment Prel", key: "prelim" },
          { date: dates.final, name: "Michigan Consumer Sentiment Final", key: "final" },
        ]) {
          const eventTimeUtc = dateAndTimeToUtc(isoDate(item.date), "10:00 AM");
          if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
          const built = await eventFromRelease({ provider: "umich", providerEventId: `${isoDate(item.date)}|${item.key}`, sourceUrl: URL, name: item.name, eventTimeUtc, description: "University of Michigan Surveys of Consumers official release schedule.", sourceUpdatedAt: fetchedAtUtc, raw: { scheduleUrl: URL, date: isoDate(item.date), item } }, env, config);
          if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
        }
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } catch (error) {
      warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch University of Michigan release schedule", provider: this.name, sourceUrl: URL });
    }
    if (!events.length && !warnings.some((warning) => warning.code === "source_fetch_failed")) warnings.push({ code: "no_events", message: "University of Michigan schedule contained no events in requested range", provider: this.name, sourceUrl: URL });
    return { provider: this.name, fetchedAtUtc, sourceUrl: URL, events, warnings };
  }
}

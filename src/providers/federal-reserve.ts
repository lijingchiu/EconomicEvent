import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { htmlToText } from "../parsers/html";
import { eventFromRelease, dateAndTimeToUtc, inRange, parseDateOnly } from "./helpers";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const RELEASES = [
  { label: "FOMC Minutes", name: "FOMC Minutes", time: "2:00 PM" },
  { label: "FOMC Press Conference", name: "FOMC Press Conference", time: "2:30 PM" },
  { label: "FOMC Meeting", name: "FOMC Interest Rate Decision", time: "2:00 PM" },
  { label: "Beige Book", name: "Beige Book", time: "2:00 PM" },
];

function findDay(text: string, label: string, startAt = 0): string | undefined {
  const index = text.indexOf(label, startAt);
  if (index < 0) return undefined;
  const tail = text.slice(index + label.length, index + label.length + 220);
  if (label === "FOMC Meeting") {
    const meetingDay = /two-day meeting,\s+[^-]+-\s+([0-9]{1,2})/i.exec(tail);
    if (meetingDay) return meetingDay[1];
  }
  const match = /(?:^|\s)([0-9]{1,2})(?=\s|$)/.exec(tail);
  return match?.[1];
}

function monthRange(fromUtc: Date, toUtc: Date): Array<{ year: number; month: number }> {
  const result: Array<{ year: number; month: number }> = [];
  const cursor = new Date(Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth(), 1));
  const end = new Date(Date.UTC(toUtc.getUTCFullYear(), toUtc.getUTCMonth(), 1));
  while (cursor <= end) { result.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 }); cursor.setUTCMonth(cursor.getUTCMonth() + 1); }
  return result;
}

function chairAppearances(text: string): Array<{ day: string; time: string; kind: "Speech" | "Testimony" | "Discussion"; surname: string; description: string }> {
  const result: Array<{ day: string; time: string; kind: "Speech" | "Testimony" | "Discussion"; surname: string; description: string }> = [];
  const pattern = /(\d{1,2}:\d{2}\s*[ap]\.?(?:m)\.?)\s+(Speech|Testimony|Discussion)\s*-\s*Chair(?:man|woman)?\s+([A-Z][A-Za-z.'-]+)\s+([A-Z][A-Za-z.'-]+)/g;
  for (const match of text.matchAll(pattern)) {
    const start = (match.index ?? 0) + match[0].length;
    const next = text.slice(start).search(/\s\d{1,2}:\d{2}\s*[ap]\.?(?:m)\.?\s/);
    const segment = text.slice(start, next >= 0 ? start + next : Math.min(text.length, start + 700)).replace(/\s+/g, " ").trim();
    const dayMatches = [...segment.matchAll(/\b([1-3]?\d)\b/g)];
    const day = dayMatches.at(-1)?.[1];
    if (!day) continue;
    result.push({ day, time: match[1], kind: match[2] as "Speech" | "Testimony" | "Discussion", surname: match[4], description: segment.slice(0, 320) });
  }
  return result;
}

export class FederalReserveProvider implements EconomicCalendarProvider {
  readonly name = "federal_reserve" as const;
  readonly sourceUrl = "https://www.federalreserve.gov/newsevents/calendar.htm";

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events = [];
    for (const { year, month } of monthRange(range.fromUtc, range.toUtc)) {
      const sourceUrl = `https://www.federalreserve.gov/newsevents/${year}-${MONTHS[month - 1]}.htm`;
      try {
        const response = await fetchWithTimeout(sourceUrl, { headers: { accept: "text/html" } });
        const body = await readBodyWithLimit(response);
        if (!response.ok) throw new Error(`source returned HTTP ${response.status}`);
        if (!/text\/html/i.test(response.headers.get("content-type") ?? "")) throw new Error("Federal Reserve calendar returned an unexpected content type");
        const text = htmlToText(body);
        for (const release of RELEASES) {
          const day = findDay(text, release.label);
          if (!day) continue;
          try {
            const date = parseDateOnly(`${MONTHS[month - 1]} ${day}, ${year}`);
            const eventTimeUtc = dateAndTimeToUtc(date, release.time);
            if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
            const meetingDate = text.slice(Math.max(0, text.indexOf(release.label) - 100), text.indexOf(release.label) + 100).replace(/\s+/g, " ").trim();
            const built = await eventFromRelease({ provider: "federal_reserve", providerEventId: `${year}-${month}-${release.label}-${day}`, sourceUrl, name: release.name, eventTimeUtc, description: meetingDate, sourceUpdatedAt: fetchedAtUtc, raw: { release, day, meetingDate } }, env, config);
            if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
          } catch (error) { warnings.push({ code: "event_parse_failed", message: error instanceof Error ? error.message : "failed to parse Federal Reserve event", provider: this.name, sourceUrl }); }
        }
        for (const appearance of chairAppearances(text)) {
          try {
            const date = parseDateOnly(`${MONTHS[month - 1]} ${appearance.day}, ${year}`);
            const eventTimeUtc = dateAndTimeToUtc(date, appearance.time);
            if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
            const kind = appearance.kind === "Discussion" ? "Speech" : appearance.kind;
            const built = await eventFromRelease({ provider: "federal_reserve", providerEventId: `${date}|chair-${appearance.surname.toLowerCase()}-${appearance.kind.toLowerCase()}`, sourceUrl, name: `Fed Chair ${appearance.surname} ${kind}`, eventTimeUtc, description: appearance.description, sourceUpdatedAt: fetchedAtUtc, raw: { appearance, year, month } }, env, config);
            if (built.event) events.push(built.event); else if (built.warning) warnings.push(built.warning);
          } catch (error) { warnings.push({ code: "event_parse_failed", message: error instanceof Error ? error.message : "failed to parse Federal Reserve Chair appearance", provider: this.name, sourceUrl }); }
        }
      } catch (error) { warnings.push({ code: "source_fetch_failed", message: error instanceof Error ? error.message : "failed to fetch Federal Reserve calendar", provider: this.name, sourceUrl }); }
    }
    if (!events.length) warnings.push({ code: "no_events", message: "Federal Reserve calendar contained no tracked events in requested range", provider: this.name, sourceUrl: this.sourceUrl });
    return { provider: this.name, fetchedAtUtc, sourceUrl: this.sourceUrl, events, warnings };
  }
}

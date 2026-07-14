import type { EconomicCalendarProvider } from "./index";
import type { AppConfig, Env, EconomicEvent, ProviderFetchResult, ProviderWarning } from "../types";
import { fetchWithTimeout, readBodyWithLimit } from "../utils/fetch-with-timeout";
import { assertHtmlResponse, parseHtmlTableRows } from "../parsers/html";
import { parseIcs } from "../parsers/ics";
import { eventFromRelease, dateAndTimeToUtc, inRange, metricProviderEventId, parseDateOnly, releaseMetricNames } from "./helpers";

const BLS_ICS_URL = "https://www.bls.gov/schedule/news_release/bls.ics";
const BLS_USER_AGENT = "us-economic-event-alerts/1.0 (+https://www.bls.gov/schedule/)";
const BLS_HEADERS = {
  accept: "text/calendar,text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
  "user-agent": BLS_USER_AGENT,
};

function releaseIdentity(eventTimeUtc: string, name: string): string {
  const date = eventTimeUtc.slice(0, 10);
  const baseName = name.replace(/\s+for\s+.*/i, "").replace(/\s+/g, " ").trim().toLowerCase();
  return `${date}|${baseName}`;
}

function addEvent(events: Map<string, EconomicEvent>, event: EconomicEvent): void {
  events.set(event.providerEventId ?? event.id, event);
}

function monthsInRange(fromUtc: Date, toUtc: Date): Array<{ year: number; month: number }> {
  const cursor = new Date(Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth(), 1));
  const end = new Date(Date.UTC(toUtc.getUTCFullYear(), toUtc.getUTCMonth(), 1));
  const result: Array<{ year: number; month: number }> = [];
  while (cursor <= end) {
    result.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

export class BlsProvider implements EconomicCalendarProvider {
  readonly name = "bls" as const;
  readonly sourceUrl = BLS_ICS_URL;

  async fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult> {
    const fetchedAtUtc = new Date().toISOString();
    const warnings: ProviderWarning[] = [];
    const events = new Map<string, EconomicEvent>();
    let icsFailure: string | undefined;

    // The BLS online calendar is the most stable official source and is intended
    // for automated calendar subscriptions. Keep the HTML list as a fallback
    // because BLS occasionally serves 403s to one of the two representations.
    try {
      const response = await fetchWithTimeout(BLS_ICS_URL, { headers: BLS_HEADERS });
      const body = await readBodyWithLimit(response);
      if (!response.ok) throw new Error(`source returned HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !/text\/calendar|text\/plain|application\/ics/i.test(contentType)) {
        throw new Error(`unexpected content-type ${contentType}`);
      }
      for (const release of parseIcs(body)) {
        if (!inRange(release.eventTimeUtc, range.fromUtc, range.toUtc)) continue;
        const baseId = releaseIdentity(release.eventTimeUtc, release.summary);
        for (const metricName of releaseMetricNames(release.summary)) {
          const built = await eventFromRelease({
            provider: "bls",
            providerEventId: metricProviderEventId(baseId, release.summary, metricName),
            sourceUrl: BLS_ICS_URL,
            name: metricName,
            eventTimeUtc: release.eventTimeUtc,
            description: release.description ? `${release.description} (${release.summary})` : release.summary,
            sourceUpdatedAt: release.sourceUpdatedAt ?? fetchedAtUtc,
            raw: { release, metricName },
          }, env, config);
          if (built.event) addEvent(events, built.event);
          else if (built.warning) warnings.push(built.warning);
        }
      }
    } catch (error) {
      icsFailure = error instanceof Error ? error.message : "failed to fetch BLS ICS calendar";
    }

    if (!events.size) {
      const htmlFailures: string[] = [];
      for (const { year, month } of monthsInRange(range.fromUtc, range.toUtc)) {
        const sourceUrl = `https://www.bls.gov/schedule/${year}/${String(month).padStart(2, "0")}_sched_list.htm`;
        try {
          const response = await fetchWithTimeout(sourceUrl, { headers: { ...BLS_HEADERS, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" } });
          const body = await readBodyWithLimit(response);
          assertHtmlResponse(response, body);
          const rows = parseHtmlTableRows(body);
          for (const [date, time, ...releaseParts] of rows.slice(1)) {
            if (!date || !time || !releaseParts.length || !/\d{1,2}:\d{2}\s*[ap]m/i.test(time)) continue;
            const release = releaseParts.join(" ").replace(/\s+/g, " ").trim();
            try {
              const eventTimeUtc = dateAndTimeToUtc(parseDateOnly(date), time);
              if (!inRange(eventTimeUtc, range.fromUtc, range.toUtc)) continue;
              const baseId = releaseIdentity(eventTimeUtc, release);
              for (const metricName of releaseMetricNames(release)) {
                const built = await eventFromRelease({
                  provider: "bls",
                  providerEventId: metricProviderEventId(baseId, release, metricName),
                  sourceUrl,
                  name: metricName,
                  eventTimeUtc,
                  sourceUpdatedAt: fetchedAtUtc,
                  raw: { date, time, release, metricName },
                }, env, config);
                if (built.event) addEvent(events, built.event);
                else if (built.warning) warnings.push(built.warning);
              }
            } catch (error) {
              warnings.push({ code: "event_parse_failed", message: error instanceof Error ? error.message : "failed to parse BLS event", provider: this.name, sourceUrl });
            }
          }
        } catch (error) {
          htmlFailures.push(`${sourceUrl}: ${error instanceof Error ? error.message : "failed to fetch BLS schedule"}`);
        }
      }
      if (!events.size) {
        const failures = [icsFailure, ...htmlFailures].filter(Boolean).join("; ");
        warnings.push({ code: "source_fetch_failed", message: failures || "BLS schedule contained no tracked events", provider: this.name, sourceUrl: this.sourceUrl });
      }
    }

    if (!events.size && !warnings.some((warning) => warning.code === "source_fetch_failed")) {
      warnings.push({ code: "no_events", message: "BLS schedule contained no tracked events in requested range", provider: this.name, sourceUrl: this.sourceUrl });
    }
    const dedupedEvents = [...new Map([...events.values()].map((event) => [event.providerEventId ?? event.id, event] as const)).values()];
    return { provider: this.name, fetchedAtUtc, sourceUrl: this.sourceUrl, events: dedupedEvents, warnings };
  }
}

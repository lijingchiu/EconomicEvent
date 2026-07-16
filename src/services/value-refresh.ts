import { fetchBlsEventValues, fetchUmichEventValues } from "../providers/release-values";
import { fetchEiaEventValues } from "../providers/eia";
import { listEventsMissingValues, setOfficialEventValues, type EventValueCandidate } from "../repositories/events";
import type { Env, ProviderName } from "../types";
import { log, logError } from "../utils/logger";

const AUTOMATIC_RETRY_MINUTES = new Set([0, 1, 2, 3, 5, 8, 12, 20, 30]);

export type ValueRefreshSummary = {
  checkedEvents: number;
  attemptedSources: number;
  updatedEvents: number;
  unavailableEvents: number;
  failedEvents: number;
  errors: Array<{ provider: ProviderName; eventTimeUtc: string; message: string }>;
};

type RefreshOptions = { force?: boolean };

function groupEvents(events: EventValueCandidate[]): Map<string, EventValueCandidate[]> {
  const groups = new Map<string, EventValueCandidate[]>();
  for (const event of events) {
    const key = `${event.provider}|${event.eventTimeUtc}`;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return groups;
}

function isScheduledAttempt(event: EventValueCandidate, now: Date): boolean {
  const minutesAfterRelease = Math.floor((now.getTime() - new Date(event.eventTimeUtc).getTime()) / 60_000);
  return AUTOMATIC_RETRY_MINUTES.has(minutesAfterRelease);
}

export async function refreshDueEventValues(env: Env, now = new Date(), options: RefreshOptions = {}): Promise<ValueRefreshSummary> {
  const fromUtc = new Date(now.getTime() - (options.force ? 24 * 60 : 31) * 60_000).toISOString();
  const candidates = await listEventsMissingValues(env.DB, fromUtc, now.toISOString());
  const due = options.force ? candidates : candidates.filter((event) => isScheduledAttempt(event, now));
  const groups = groupEvents(due);
  const summary: ValueRefreshSummary = {
    checkedEvents: due.length,
    attemptedSources: groups.size,
    updatedEvents: 0,
    unavailableEvents: 0,
    failedEvents: 0,
    errors: [],
  };

  for (const events of groups.values()) {
    const provider = events[0].provider;
    const eventTimeUtc = events[0].eventTimeUtc;
    const fetchedAt = now.toISOString();
    try {
      const values = provider === "bls"
        ? await fetchBlsEventValues(events, env, fetchedAt)
        : provider === "umich"
          ? await fetchUmichEventValues(events, fetchedAt)
          : provider === "eia"
            ? await fetchEiaEventValues(events, fetchedAt)
            : new Map();
      for (const event of events) {
        const value = values.get(event.id);
        if (!value) {
          summary.unavailableEvents += 1;
          continue;
        }
        if (await setOfficialEventValues(env.DB, event.id, value)) summary.updatedEvents += 1;
      }
      log("info", "event_values_refreshed", { provider, eventTimeUtc, candidates: events.length, updated: values.size }, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown value refresh error";
      summary.failedEvents += events.length;
      summary.errors.push({ provider, eventTimeUtc, message });
      logError("event_values_refresh_failed", error, { provider, eventTimeUtc, candidates: events.length }, env);
    }
  }

  return summary;
}

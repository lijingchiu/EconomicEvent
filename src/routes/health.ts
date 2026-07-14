import type { Env } from "../types";
import { getRuntimeConfig } from "../config";
import { json } from "../utils/auth";
import { lastSuccessfulSync } from "../repositories/sync-runs";
import { listEvents, upcomingCount } from "../repositories/events";

export async function healthRoute(env: Env, now = new Date()): Promise<Response> {
  const config = await getRuntimeConfig(env);
  const nowIso = now.toISOString();
  const nextEvents = await listEvents(env.DB, { fromUtc: nowIso, toUtc: new Date(now.getTime() + 30 * 86_400_000).toISOString(), limit: 5 });
  return json({ status: "ok", currentUtc: nowIso, appTimezone: config.appTimezone, enabledProviders: config.enabledProviders, lastSuccessfulSync: await lastSuccessfulSync(env.DB), nextFiveUpcomingEventsCount: nextEvents.length, nextThirtyDaysCount: await upcomingCount(env.DB, nowIso) });
}

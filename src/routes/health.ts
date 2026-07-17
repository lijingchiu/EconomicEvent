import type { Env } from "../types";
import { getRuntimeConfig } from "../config";
import { json } from "../utils/auth";
import { lastSuccessfulSync } from "../repositories/sync-runs";
import { listEvents, upcomingCount } from "../repositories/events";
import { listProviderHealth } from "../repositories/provider-health";
import { listScheduledTaskHealth } from "../repositories/scheduled-tasks";

export async function healthRoute(env: Env, now = new Date()): Promise<Response> {
  const config = await getRuntimeConfig(env);
  const nowIso = now.toISOString();
  const nextEvents = await listEvents(env.DB, { fromUtc: nowIso, toUtc: new Date(now.getTime() + 30 * 86_400_000).toISOString(), limit: 5 });
  const providers = await listProviderHealth(env.DB);
  const tasks = await listScheduledTaskHealth(env.DB, now);
  const failingProviders = providers.filter((provider) => config.enabledProviders.includes(provider.provider as typeof config.enabledProviders[number]) && Number(provider.consecutiveFailures ?? 0) >= 3);
  const staleTasks = tasks.filter((task) => task.stale || task.status === "failed");
  return json({
    status: failingProviders.length || staleTasks.length ? "degraded" : "ok",
    currentUtc: nowIso,
    appTimezone: config.appTimezone,
    enabledProviders: config.enabledProviders,
    lastSuccessfulSync: await lastSuccessfulSync(env.DB),
    nextFiveUpcomingEventsCount: nextEvents.length,
    nextThirtyDaysCount: await upcomingCount(env.DB, nowIso),
    providers,
    scheduledTasks: tasks,
    issues: [
      ...failingProviders.map((provider) => ({ type: "provider", name: provider.provider, message: provider.lastError ?? "provider failed repeatedly" })),
      ...staleTasks.map((task) => ({ type: "scheduled_task", name: task.taskName, message: task.errorMessage ?? "scheduled task is stale" })),
    ],
  });
}

export async function readinessRoute(env: Env, now = new Date()): Promise<Response> {
  const health = await healthRoute(env, now);
  const payload = await health.json() as { status: string };
  return json(payload, payload.status === "ok" ? 200 : 503);
}

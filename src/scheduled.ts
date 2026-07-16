import type { Env } from "./types";
import { syncProviders, cleanupDatabase } from "./services/provider-sync";
import { checkDueNotifications } from "./services/notification-checker";
import { sendProviderHealthAlerts } from "./services/provider-health-alert";
import { refreshDueEventValues } from "./services/value-refresh";
import { log, logError } from "./utils/logger";

async function runTask(name: string, cron: string, env: Env, task: () => Promise<unknown>): Promise<unknown | Error> {
  try {
    const result = await task();
    log("info", "scheduled_task_completed", { cron, task: name }, env);
    return result;
  } catch (error) {
    logError("scheduled_task_failed", error, { cron, task: name }, env);
    return error instanceof Error ? error : new Error("scheduled task failed");
  }
}

function throwIfFailed(cron: string, results: Array<unknown | Error>): void {
  const errors = results.filter((result): result is Error => result instanceof Error);
  if (errors.length) throw new AggregateError(errors, `${errors.length} task(s) failed for cron ${cron}`);
}

export async function runScheduled(cron: string, env: Env, now = new Date()): Promise<void> {
  if (cron === "* * * * *") {
    const results = [
      await runTask("notifications", cron, env, () => checkDueNotifications(env, now.toISOString())),
      await runTask("event_values", cron, env, () => refreshDueEventValues(env, now)),
    ];
    throwIfFailed(cron, results);
    return;
  }
  if (cron === "7 */6 * * *" || cron === "23 18 * * *") {
    const results = [
      await runTask("provider_sync", cron, env, () => syncProviders(env, undefined, { now, full: cron === "23 18 * * *" })),
      await runTask("event_values", cron, env, () => refreshDueEventValues(env, now, { force: true })),
      await runTask("provider_health", cron, env, () => sendProviderHealthAlerts(env, now.toISOString())),
    ];
    throwIfFailed(cron, results);
    return;
  }
  if (cron === "41 18 * * *") {
    const result = await runTask("database_cleanup", cron, env, () => cleanupDatabase(env, now.toISOString()));
    throwIfFailed(cron, [result]);
    return;
  }
  log("warn", "scheduled_cron_ignored", { cron }, env);
}

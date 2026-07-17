import type { Env } from "./types";
import { syncProviders, cleanupDatabase } from "./services/provider-sync";
import { checkDueNotifications } from "./services/notification-checker";
import { sendProviderHealthAlerts } from "./services/provider-health-alert";
import { refreshDueEventValues } from "./services/value-refresh";
import { log, logError } from "./utils/logger";
import { acquireTaskLock, finishScheduledTask, releaseTaskLock, startScheduledTask } from "./repositories/scheduled-tasks";
import { maybeSendDailyDigest } from "./services/daily-digest";

async function runTask(name: string, cron: string, env: Env, task: () => Promise<unknown>): Promise<unknown | Error> {
  const startedAt = new Date().toISOString();
  const owner = crypto.randomUUID();
  let runId: number | null = null;
  let locked = false;
  try {
    if (env.DB && typeof env.DB.prepare === "function") {
      try {
        runId = await startScheduledTask(env.DB, name, cron, startedAt);
        locked = await acquireTaskLock(env.DB, name, owner, startedAt);
        if (!locked) {
          await finishScheduledTask(env.DB, runId, "skipped", new Date().toISOString(), { reason: "task_already_running" });
          log("warn", "scheduled_task_skipped", { cron, task: name, reason: "task_already_running" }, env);
          return undefined;
        }
      } catch (telemetryError) {
        runId = null;
        locked = false;
        logError("scheduled_task_telemetry_failed", telemetryError, { cron, task: name }, env);
      }
    }
    const result = await task();
    if (runId != null) await finishScheduledTask(env.DB, runId, "success", new Date().toISOString(), result);
    log("info", "scheduled_task_completed", { cron, task: name }, env);
    return result;
  } catch (error) {
    if (runId != null) {
      await finishScheduledTask(env.DB, runId, "failed", new Date().toISOString(), undefined, error instanceof Error ? error.message : "scheduled task failed").catch(() => undefined);
    }
    logError("scheduled_task_failed", error, { cron, task: name }, env);
    return error instanceof Error ? error : new Error("scheduled task failed");
  } finally {
    if (locked) await releaseTaskLock(env.DB, name, owner).catch(() => undefined);
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
      await runTask("daily_digest", cron, env, () => maybeSendDailyDigest(env, now)),
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

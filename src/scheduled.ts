import type { Env } from "./types";
import { syncProviders, cleanupDatabase } from "./services/provider-sync";
import { checkDueNotifications } from "./services/notification-checker";
import { sendProviderHealthAlerts } from "./services/provider-health-alert";
import { refreshDueEventValues } from "./services/value-refresh";

export async function runScheduled(cron: string, env: Env, now = new Date()): Promise<void> {
  if (cron === "* * * * *") {
    await Promise.all([
      checkDueNotifications(env, now.toISOString()),
      refreshDueEventValues(env, now),
    ]);
    return;
  }
  if (cron === "7 */6 * * *" || cron === "23 18 * * *") {
    await syncProviders(env, undefined, { now, full: cron === "23 18 * * *" });
    await Promise.all([
      sendProviderHealthAlerts(env, now.toISOString()),
      refreshDueEventValues(env, now, { force: true }),
    ]);
    return;
  }
  if (cron === "41 18 * * *") {
    await cleanupDatabase(env, now.toISOString());
  }
}

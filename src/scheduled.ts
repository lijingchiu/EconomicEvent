import type { Env } from "./types";
import { syncProviders, cleanupDatabase } from "./services/provider-sync";
import { checkDueNotifications } from "./services/notification-checker";
import { sendProviderHealthAlerts } from "./services/provider-health-alert";

export async function runScheduled(cron: string, env: Env, now = new Date()): Promise<void> {
  if (cron === "* * * * *") {
    await checkDueNotifications(env, now.toISOString());
    return;
  }
  if (cron === "7 */6 * * *" || cron === "23 18 * * *") {
    await syncProviders(env, undefined, { now, full: cron === "23 18 * * *" });
    await sendProviderHealthAlerts(env, now.toISOString());
    return;
  }
  if (cron === "41 18 * * *") {
    await cleanupDatabase(env, now.toISOString());
  }
}

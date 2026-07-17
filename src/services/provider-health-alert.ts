import type { Env } from "../types";
import { providersNeedingAlert, markAlertSent } from "../repositories/provider-health";
import { createNotificationAdapters } from "../providers/notifications";
import { getRuntimeConfig } from "../config";

export async function sendProviderHealthAlerts(env: Env, now = new Date().toISOString()): Promise<number> {
  const config = await getRuntimeConfig(env);
  if (!config.notificationsEnabled) return 0;
  const providers = await providersNeedingAlert(env.DB, now);
  if (!providers.length) return 0;
  const adapters = createNotificationAdapters(env);
  let sent = 0;
  for (const provider of providers) {
    let providerSent = false;
    for (const channel of config.notificationChannels) {
      const adapter = adapters.get(channel);
      if (!adapter?.configured) continue;
      try {
        await adapter.sendMessage("官方資料來源健康警告", `Provider ${String(provider.provider)} 已連續 ${String(provider.consecutiveFailures)} 次同步失敗。\n錯誤摘要：${String(provider.lastError ?? "unknown")}`);
        providerSent = true;
        sent += 1;
      } catch {
        // A channel failure must not prevent the remaining health alerts.
      }
    }
    if (providerSent) await markAlertSent(env.DB, String(provider.provider), now);
  }
  return sent;
}

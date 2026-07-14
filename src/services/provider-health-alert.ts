import type { Env } from "../types";
import { providersNeedingAlert, markAlertSent } from "../repositories/provider-health";
import { DiscordWebhookClient } from "../providers/discord";
import { getRuntimeConfig } from "../config";

export async function sendProviderHealthAlerts(env: Env, now = new Date().toISOString()): Promise<number> {
  if (!(await getRuntimeConfig(env)).notificationsEnabled) return 0;
  const providers = await providersNeedingAlert(env.DB, now);
  if (!providers.length) return 0;
  const client = new DiscordWebhookClient(env);
  let sent = 0;
  for (const provider of providers) {
    try {
      await client.send({ embeds: [{ title: "⚠️ 官方資料來源健康警告", description: `Provider ${String(provider.provider)} 已連續 ${String(provider.consecutiveFailures)} 次同步失敗。`, color: 0xF1C40F, fields: [{ name: "錯誤摘要", value: String(provider.lastError ?? "unknown") }], footer: { text: "請檢查官方頁面格式或網路狀態。" }, timestamp: now }], allowed_mentions: { parse: [] } });
      await markAlertSent(env.DB, String(provider.provider), now);
      sent += 1;
    } catch {
      // A notification failure must not prevent other provider health alerts.
    }
  }
  return sent;
}

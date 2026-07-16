import type { Env } from "../types";
import { findDueDeliveries, claimDelivery, expireOldDeliveries, markFailure, markSent, releaseStaleSending } from "../repositories/deliveries";
import { DiscordHttpError, DiscordWebhookClient } from "../providers/discord";
import { log, logError } from "../utils/logger";
import { getRuntimeConfig } from "../config";

export async function checkDueNotifications(env: Env, now = new Date().toISOString()): Promise<{ due: number; sent: number; failed: number; expired: number }> {
  const config = await getRuntimeConfig(env);
  if (!config.notificationsEnabled) return { due: 0, sent: 0, failed: 0, expired: 0 };
  const expired = await expireOldDeliveries(env.DB, now, 3);
  await releaseStaleSending(env.DB, now, 10);
  const due = (await findDueDeliveries(env.DB, now, 3, config.eventImpactFilter))
    .filter((delivery) => config.enabledProviders.includes(delivery.event.provider));
  const client = new DiscordWebhookClient(env);
  let sent = 0;
  let failed = 0;
  for (const delivery of due) {
    if (!await claimDelivery(env.DB, delivery.id, now)) continue;
    try {
      const response = await client.sendEventReminder(delivery.event, delivery.reminderMinutes);
      await markSent(env.DB, delivery.id, new Date().toISOString(), response.messageId);
      sent += 1;
      log("info", "notification_sent", { deliveryId: delivery.id, eventId: delivery.event.id, reminderMinutes: delivery.reminderMinutes }, env);
    } catch (error) {
      const retryable = error instanceof DiscordHttpError
        ? error.retryable
        : !(error instanceof Error && /not configured|HTTP 400|HTTP 401|HTTP 403|HTTP 404/.test(error.message));
      await markFailure(env.DB, delivery.id, new Date().toISOString(), error instanceof Error ? error.message : "notification failed", retryable);
      failed += 1;
      logError("notification_send", error, { deliveryId: delivery.id, eventId: delivery.event.id }, env);
    }
  }
  return { due: due.length, sent, failed, expired };
}

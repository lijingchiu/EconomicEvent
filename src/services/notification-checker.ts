import type { Env } from "../types";
import { findDueDeliveries, claimDelivery, expireOldDeliveries, markFailure, markSent, releaseStaleSending } from "../repositories/deliveries";
import { DiscordHttpError } from "../providers/discord";
import { createNotificationAdapters, NotificationHttpError } from "../providers/notifications";
import { log, logError } from "../utils/logger";
import { getRuntimeConfig } from "../config";
import { getOwnerPreferences } from "../repositories/personalization";

function quietHoursActive(now: string, timeZone: string, start: string | null, end: string | null): boolean {
  if (!start || !end || start === end) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const current = Number(parts.hour) * 60 + Number(parts.minute);
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const from = minutes(start), to = minutes(end);
  return from < to ? current >= from && current < to : current >= from || current < to;
}

export async function checkDueNotifications(env: Env, now = new Date().toISOString()): Promise<{ due: number; sent: number; failed: number; expired: number }> {
  const config = await getRuntimeConfig(env);
  if (!config.notificationsEnabled) return { due: 0, sent: 0, failed: 0, expired: 0 };
  const preferences = await getOwnerPreferences(env.DB);
  if (quietHoursActive(now, config.appTimezone, preferences.quietHoursStart, preferences.quietHoursEnd)) {
    log("info", "notifications_suppressed_quiet_hours", { now, timeZone: config.appTimezone }, env);
    return { due: 0, sent: 0, failed: 0, expired: 0 };
  }
  const expired = await expireOldDeliveries(env.DB, now, 3);
  await releaseStaleSending(env.DB, now, 10);
  const due = (await findDueDeliveries(env.DB, now, 3, config.eventImpactFilter))
    .filter((delivery) => config.enabledProviders.includes(delivery.event.provider) && config.notificationChannels.includes(delivery.channel));
  const adapters = createNotificationAdapters(env);
  let sent = 0;
  let failed = 0;
  for (const delivery of due) {
    if (!await claimDelivery(env.DB, delivery.id, now)) continue;
    try {
      const adapter = adapters.get(delivery.channel);
      if (!adapter?.configured) throw new Error(`${delivery.channel} is not configured`);
      const response = await adapter.sendEvent(delivery.event, delivery.reminderMinutes);
      await markSent(env.DB, delivery.id, new Date().toISOString(), response.externalMessageId);
      sent += 1;
      log("info", "notification_sent", { deliveryId: delivery.id, eventId: delivery.event.id, channel: delivery.channel, reminderMinutes: delivery.reminderMinutes }, env);
    } catch (error) {
      const retryable = error instanceof DiscordHttpError
        ? error.retryable
        : error instanceof NotificationHttpError
          ? error.retryable
          : !(error instanceof Error && /not configured|HTTP 400|HTTP 401|HTTP 403|HTTP 404/.test(error.message));
      const failedAt = new Date();
      const retryMinutes = Math.min(30, 2 ** Math.max(0, delivery.attempts));
      const retryAt = new Date(failedAt.getTime() + retryMinutes * 60_000).toISOString();
      await markFailure(env.DB, delivery.id, failedAt.toISOString(), error instanceof Error ? error.message : "notification failed", retryable, retryAt);
      failed += 1;
      logError("notification_send", error, { deliveryId: delivery.id, eventId: delivery.event.id, channel: delivery.channel }, env);
    }
  }
  return { due: due.length, sent, failed, expired };
}

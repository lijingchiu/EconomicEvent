import type { Env } from "../types";
import { getRuntimeConfig } from "../config";
import { listEvents } from "../repositories/events";
import { getOwnerPreferences } from "../repositories/personalization";
import { createNotificationAdapters } from "../providers/notifications";
import { logError } from "../utils/logger";

function localParts(now: Date, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function clockMinutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

export function digestWindowActive(current: string, scheduled: string, windowMinutes = 15): boolean {
  const elapsed = (clockMinutes(current) - clockMinutes(scheduled) + 24 * 60) % (24 * 60);
  return elapsed <= windowMinutes;
}

function channelResults(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function eventLine(event: Record<string, unknown>, timeZone: string): string {
  const time = new Intl.DateTimeFormat("zh-TW", { timeZone, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(String(event.eventTimeUtc)));
  return `• ${time} · ${String(event.name)} · ${String(event.impact).toUpperCase()}`;
}

export function digestMessage(events: Array<Record<string, unknown>>, timeZone: string): string {
  if (!events.length) return "未來 24 小時沒有符合通知條件的美國經濟事件。";
  return [`未來 24 小時共有 ${events.length} 項事件：`, ...events.slice(0, 15).map((event) => eventLine(event, timeZone))].join("\n");
}

export async function maybeSendDailyDigest(env: Env, now = new Date()): Promise<{ sent: number; skipped: boolean }> {
  const [config, preferences] = await Promise.all([getRuntimeConfig(env), getOwnerPreferences(env.DB)]);
  if (!config.notificationsEnabled || !preferences.digestEnabled || !config.notificationChannels.length) return { sent: 0, skipped: true };
  const local = localParts(now, config.appTimezone);
  if (!digestWindowActive(local.time, preferences.digestTime)) return { sent: 0, skipped: true };
  const existing = await env.DB.prepare("SELECT status, scheduled_at AS scheduledAt, channel_results_json AS channelResultsJson FROM daily_digest_runs WHERE digest_date = ?")
    .bind(local.date).first<{ status: string; scheduledAt: string; channelResultsJson: string | null }>();
  if (existing?.status === "success") return { sent: 0, skipped: true };
  const staleBefore = new Date(now.getTime() - 2 * 60_000).toISOString();
  const claim = existing
    ? await env.DB.prepare(`UPDATE daily_digest_runs SET scheduled_at=?, completed_at=NULL, status='running', error_message=NULL
        WHERE digest_date=? AND (status IN ('partial','failed') OR (status='running' AND scheduled_at<=?))`)
      .bind(now.toISOString(), local.date, staleBefore).run()
    : await env.DB.prepare("INSERT OR IGNORE INTO daily_digest_runs (digest_date, scheduled_at, status) VALUES (?, ?, 'running')")
      .bind(local.date, now.toISOString()).run();
  if (Number(claim.meta.changes ?? 0) !== 1) return { sent: 0, skipped: true };
  const impacts = config.eventImpactFilter === "high" ? ["high"] : config.eventImpactFilter === "medium" ? ["high", "medium"] : ["high", "medium", "low"];
  const events = (await listEvents(env.DB, { fromUtc: now.toISOString(), toUtc: new Date(now.getTime() + 24 * 60 * 60_000).toISOString(), limit: 100 })).filter((event) => impacts.includes(String(event.impact)));
  const message = digestMessage(events, config.appTimezone);
  const adapters = createNotificationAdapters(env);
  const results = channelResults(existing?.channelResultsJson);
  let sent = 0;
  for (const channel of config.notificationChannels) {
    if (results[channel] === "sent") continue;
    const adapter = adapters.get(channel);
    if (!adapter?.configured) {
      results[channel] = "not_configured";
      continue;
    }
    try {
      await adapter.sendMessage("Macro Pulse 每日經濟事件摘要", message);
      results[channel] = "sent";
      sent += 1;
    } catch (error) {
      results[channel] = "failed";
      logError("daily_digest_send", error, { channel }, env);
    }
  }
  const completed = config.notificationChannels.filter((channel) => results[channel] === "sent").length;
  const status = completed === config.notificationChannels.length ? "success" : completed ? "partial" : "failed";
  await env.DB.prepare("UPDATE daily_digest_runs SET completed_at=?, status=?, channel_results_json=?, error_message=? WHERE digest_date=?")
    .bind(new Date().toISOString(), status, JSON.stringify(results), status === "success" ? null : "one or more configured channels failed", local.date).run();
  return { sent, skipped: false };
}

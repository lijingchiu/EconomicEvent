import type { Env, ProviderName } from "../types";
import { getRuntimeConfig, publicSettings, settingsToRows, validateSettingsPatch } from "../config";
import { requireAdmin, json } from "../utils/auth";
import { listEvents } from "../repositories/events";
import { listProviderHealth } from "../repositories/provider-health";
import { lastSuccessfulSync } from "../repositories/sync-runs";
import { deliveryChannelSummary, deliverySummary } from "../repositories/deliveries";
import { saveSettings } from "../repositories/settings";
import { syncProviders } from "../services/provider-sync";
import { refreshDueEventValues } from "../services/value-refresh";
import { checkDueNotifications } from "../services/notification-checker";
import { DiscordWebhookClient } from "../providers/discord";
import { createNotificationAdapters, notificationChannelStatus } from "../providers/notifications";
import type { NotificationChannel } from "../types";
import { deleteFilter, getOwnerPreferences, listFavorites, listSavedFilters, saveFilter, saveOwnerPreferences, saveWebPushSubscription, setFavorite, type OwnerPreferences } from "../repositories/personalization";
import { listAuditLog, writeAuditLog } from "../repositories/audit";
import { listSourceSnapshots } from "../repositories/source-records";
import { listScheduledTaskHealth } from "../repositories/scheduled-tasks";
import { getEvent } from "../repositories/events";
import { listEventValueHistory } from "../repositories/value-history";

function dateParam(value: string | null, fallback: Date): string { const date = value ? new Date(value) : fallback; return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString(); }

function clockValue(value: unknown, nullable = false): string | null {
  if (nullable && (value == null || value === "")) return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("time must use HH:MM");
  return value;
}

function preferencesInput(value: unknown, current: OwnerPreferences): OwnerPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("preferences payload must be an object");
  const input = value as Record<string, unknown>;
  const language = input.language ?? current.language;
  const theme = input.theme ?? current.theme;
  if (language !== "zh-Hant" && language !== "en") throw new Error("language is invalid");
  if (theme !== "light" && theme !== "dark" && theme !== "system") throw new Error("theme is invalid");
  if (input.digestEnabled !== undefined && typeof input.digestEnabled !== "boolean") throw new Error("digestEnabled must be boolean");
  return {
    language,
    theme,
    quietHoursStart: input.quietHoursStart === undefined ? current.quietHoursStart : clockValue(input.quietHoursStart, true),
    quietHoursEnd: input.quietHoursEnd === undefined ? current.quietHoursEnd : clockValue(input.quietHoursEnd, true),
    digestEnabled: input.digestEnabled === undefined ? current.digestEnabled : input.digestEnabled,
    digestTime: input.digestTime === undefined ? current.digestTime : clockValue(input.digestTime) as string,
  };
}

export async function adminRoute(request: Request, env: Env, path: string): Promise<Response> {
  const auth = await requireAdmin(request, env); if (auth) return auth;
  try {
    if (request.method === "GET" && path === "/admin/settings") return json({ settings: publicSettings(await getRuntimeConfig(env)) });
    if (request.method === "PUT" && path === "/admin/settings") {
      const patch = validateSettingsPatch(await request.json().catch(() => ({})));
      await saveSettings(env.DB, settingsToRows(patch));
      await writeAuditLog(env.DB, "settings.updated", "settings", "runtime", patch);
      return json({ settings: publicSettings(await getRuntimeConfig(env)) });
    }
    if (request.method === "GET" && path === "/admin/overview") {
      const now = new Date();
      const config = await getRuntimeConfig(env);
      return json({
        nowUtc: now.toISOString(),
        settings: publicSettings(config),
        events: await listEvents(env.DB, { fromUtc: new Date(now.getTime() - 86_400_000).toISOString(), toUtc: new Date(now.getTime() + 30 * 86_400_000).toISOString(), limit: 100 }),
        providers: await listProviderHealth(env.DB),
        scheduledTasks: await listScheduledTaskHealth(env.DB, now),
        lastSuccessfulSync: await lastSuccessfulSync(env.DB),
        deliverySummary: await deliverySummary(env.DB),
        deliveryChannelSummary: await deliveryChannelSummary(env.DB),
        notificationChannels: notificationChannelStatus(env),
        preferences: await getOwnerPreferences(env.DB),
        favorites: await listFavorites(env.DB),
        savedFilters: await listSavedFilters(env.DB),
      });
    }
    if (request.method === "GET" && path === "/admin/events") {
      const url = new URL(request.url); const now = new Date();
      return json({ events: await listEvents(env.DB, { fromUtc: dateParam(url.searchParams.get("from"), now), toUtc: dateParam(url.searchParams.get("to"), new Date(now.getTime() + 30 * 86_400_000)), provider: url.searchParams.get("provider") ?? undefined, category: url.searchParams.get("category") ?? undefined, impact: url.searchParams.get("impact") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 30) }) });
    }
    if (request.method === "GET" && /^\/admin\/events\/[^/]+\/history$/.test(path)) {
      const id = decodeURIComponent(path.split("/")[3]);
      const event = await getEvent(env.DB, id);
      if (!event) return json({ error: "event_not_found" }, 404);
      return json({ event, history: await listEventValueHistory(env.DB, id) });
    }
    if (request.method === "GET" && path === "/admin/providers") return json({ providers: await listProviderHealth(env.DB), enabledProviders: (await getRuntimeConfig(env)).enabledProviders });
    if (request.method === "GET" && path === "/admin/preferences") return json({ preferences: await getOwnerPreferences(env.DB), favorites: await listFavorites(env.DB), savedFilters: await listSavedFilters(env.DB) });
    if (request.method === "PUT" && path === "/admin/preferences") {
      const preferences = preferencesInput(await request.json().catch(() => ({})), await getOwnerPreferences(env.DB));
      await saveOwnerPreferences(env.DB, preferences);
      await writeAuditLog(env.DB, "preferences.updated", "preferences", "owner", preferences);
      return json({ preferences });
    }
    if (/^\/admin\/favorites\/[^/]+$/.test(path) && (request.method === "PUT" || request.method === "DELETE")) {
      const id = decodeURIComponent(path.split("/")[3]);
      if (!await getEvent(env.DB, id)) return json({ error: "event_not_found" }, 404);
      const favorite = request.method === "PUT";
      await setFavorite(env.DB, id, favorite);
      await writeAuditLog(env.DB, favorite ? "favorite.added" : "favorite.removed", "event", id);
      return json({ eventId: id, favorite });
    }
    if (request.method === "GET" && path === "/admin/saved-filters") return json({ savedFilters: await listSavedFilters(env.DB) });
    if (request.method === "POST" && path === "/admin/saved-filters") {
      const body = await request.json().catch(() => ({})) as { id?: unknown; name?: unknown; filter?: unknown };
      if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80 || !body.filter || typeof body.filter !== "object" || Array.isArray(body.filter)) return json({ error: "invalid_saved_filter" }, 400);
      const id = typeof body.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(body.id) ? body.id : crypto.randomUUID();
      await saveFilter(env.DB, id, body.name.trim(), body.filter as Record<string, unknown>);
      await writeAuditLog(env.DB, "saved_filter.updated", "saved_filter", id, { name: body.name.trim() });
      return json({ id, savedFilters: await listSavedFilters(env.DB) });
    }
    if (request.method === "DELETE" && /^\/admin\/saved-filters\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split("/")[3]);
      await deleteFilter(env.DB, id);
      await writeAuditLog(env.DB, "saved_filter.deleted", "saved_filter", id);
      return json({ id, deleted: true });
    }
    if (request.method === "POST" && path === "/admin/web-push/subscribe") {
      const body = await request.json().catch(() => ({})) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
      if (typeof body.endpoint !== "string" || !body.endpoint.startsWith("https://") || body.endpoint.length > 2048 || typeof body.keys?.p256dh !== "string" || typeof body.keys.auth !== "string") return json({ error: "invalid_push_subscription" }, 400);
      await saveWebPushSubscription(env.DB, { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: request.headers.get("user-agent") ?? undefined });
      await writeAuditLog(env.DB, "web_push.subscribed", "web_push", undefined, { endpointHost: new URL(body.endpoint).host });
      return json({ subscribed: true });
    }
    if (request.method === "GET" && path === "/admin/audit") return json({ audit: await listAuditLog(env.DB, Number(new URL(request.url).searchParams.get("limit") ?? 100)) });
    if (request.method === "GET" && path === "/admin/source-snapshots") {
      const url = new URL(request.url);
      return json({ snapshots: await listSourceSnapshots(env.DB, url.searchParams.get("provider") ?? undefined, Number(url.searchParams.get("limit") ?? 50)) });
    }
    if (request.method === "POST" && path === "/admin/sync") {
      const body = await request.json().catch(() => ({})) as { providers?: unknown };
      const allowed = new Set(["bls", "bea", "federal_reserve", "eia", "census", "ism", "umich"]);
      const providers = Array.isArray(body.providers)
        ? body.providers.filter((provider): provider is ProviderName => typeof provider === "string" && allowed.has(provider))
        : undefined;
      const result = { summaries: await syncProviders(env, providers), valueRefresh: await refreshDueEventValues(env, new Date(), { force: true }) };
      await writeAuditLog(env.DB, "sync.manual", "provider", providers?.join(",") || "all", result);
      return json(result);
    }
    if (request.method === "POST" && path === "/admin/refresh-values") {
      const result = await refreshDueEventValues(env, new Date(), { force: true });
      await writeAuditLog(env.DB, "values.refresh", "event", "due", result);
      return json({ result });
    }
    if (request.method === "POST" && path === "/admin/check") return json({ result: await checkDueNotifications(env) });
    if (request.method === "POST" && path === "/admin/test-discord") return json({ result: await new DiscordWebhookClient(env).sendTest() });
    if (request.method === "GET" && path === "/admin/notification-channels") return json({ channels: notificationChannelStatus(env), enabled: (await getRuntimeConfig(env)).notificationChannels });
    if (request.method === "POST" && path === "/admin/test-notification") {
      const body = await request.json().catch(() => ({})) as { channel?: unknown };
      if (typeof body.channel !== "string") return json({ error: "channel_required" }, 400);
      const channel = body.channel as NotificationChannel;
      const adapter = createNotificationAdapters(env).get(channel);
      if (!adapter) return json({ error: "unknown_channel" }, 400);
      if (!adapter.configured) return json({ error: "channel_not_configured" }, 409);
      const result = await adapter.sendTest();
      await writeAuditLog(env.DB, "notification.test", "channel", channel);
      return json({ result });
    }
    return json({ error: "not_found" }, 404);
  } catch (error) { return json({ error: "admin_operation_failed", message: error instanceof Error ? error.message : "unknown error" }, 500); }
}

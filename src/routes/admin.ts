import type { Env, ProviderName } from "../types";
import { getRuntimeConfig, publicSettings, settingsToRows, validateSettingsPatch } from "../config";
import { requireAdmin, json } from "../utils/auth";
import { listEvents } from "../repositories/events";
import { listProviderHealth } from "../repositories/provider-health";
import { lastSuccessfulSync } from "../repositories/sync-runs";
import { deliverySummary } from "../repositories/deliveries";
import { saveSettings } from "../repositories/settings";
import { syncProviders } from "../services/provider-sync";
import { refreshDueEventValues } from "../services/value-refresh";
import { checkDueNotifications } from "../services/notification-checker";
import { DiscordWebhookClient } from "../providers/discord";

function dateParam(value: string | null, fallback: Date): string { const date = value ? new Date(value) : fallback; return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString(); }

export async function adminRoute(request: Request, env: Env, path: string): Promise<Response> {
  const auth = await requireAdmin(request, env); if (auth) return auth;
  try {
    if (request.method === "GET" && path === "/admin/settings") return json({ settings: publicSettings(await getRuntimeConfig(env)) });
    if (request.method === "PUT" && path === "/admin/settings") {
      const patch = validateSettingsPatch(await request.json().catch(() => ({})));
      await saveSettings(env.DB, settingsToRows(patch));
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
        lastSuccessfulSync: await lastSuccessfulSync(env.DB),
        deliverySummary: await deliverySummary(env.DB),
      });
    }
    if (request.method === "GET" && path === "/admin/events") {
      const url = new URL(request.url); const now = new Date();
      return json({ events: await listEvents(env.DB, { fromUtc: dateParam(url.searchParams.get("from"), now), toUtc: dateParam(url.searchParams.get("to"), new Date(now.getTime() + 30 * 86_400_000)), provider: url.searchParams.get("provider") ?? undefined, category: url.searchParams.get("category") ?? undefined, impact: url.searchParams.get("impact") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 30) }) });
    }
    if (request.method === "GET" && path === "/admin/providers") return json({ providers: await listProviderHealth(env.DB), enabledProviders: (await getRuntimeConfig(env)).enabledProviders });
    if (request.method === "POST" && path === "/admin/sync") {
      const body = await request.json().catch(() => ({})) as { providers?: unknown };
      const allowed = new Set(["bls", "bea", "federal_reserve", "eia", "census", "ism", "umich"]);
      const providers = Array.isArray(body.providers)
        ? body.providers.filter((provider): provider is ProviderName => typeof provider === "string" && allowed.has(provider))
        : undefined;
      return json({ summaries: await syncProviders(env, providers), valueRefresh: await refreshDueEventValues(env, new Date(), { force: true }) });
    }
    if (request.method === "POST" && path === "/admin/refresh-values") return json({ result: await refreshDueEventValues(env, new Date(), { force: true }) });
    if (request.method === "POST" && path === "/admin/check") return json({ result: await checkDueNotifications(env) });
    if (request.method === "POST" && path === "/admin/test-discord") return json({ result: await new DiscordWebhookClient(env).sendTest() });
    return json({ error: "not_found" }, 404);
  } catch (error) { return json({ error: "admin_operation_failed", message: error instanceof Error ? error.message : "unknown error" }, 500); }
}

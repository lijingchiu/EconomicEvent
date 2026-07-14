import type { AppConfig, Env, ProviderName, ProviderSyncSummary } from "../types";
import { getRuntimeConfig } from "../config";
import { createProviders } from "../providers";
import { upsertEconomicEvent } from "../repositories/events";
import { completeSyncRun, startSyncRun } from "../repositories/sync-runs";
import { recordProviderFailure, recordProviderSuccess } from "../repositories/provider-health";
import { log, logError } from "../utils/logger";

export async function syncProviders(env: Env, requestedProviders?: ProviderName[], options: { now?: Date; full?: boolean } = {}): Promise<ProviderSyncSummary[]> {
  const config = await getRuntimeConfig(env);
  const now = options.now ?? new Date();
  const fromUtc = now;
  const toUtc = new Date(now.getTime() + config.syncDaysAhead * 86_400_000);
  const allowed = new Set(requestedProviders?.length ? requestedProviders : config.enabledProviders);
  const providers = createProviders().filter((provider) => config.enabledProviders.includes(provider.name) && allowed.has(provider.name));
  const summaries: ProviderSyncSummary[] = [];
  for (const provider of providers) {
    const startedAt = new Date().toISOString();
    const runId = await startSyncRun(env.DB, provider.name, provider.sourceUrl, startedAt);
    try {
      const result = await provider.fetchEvents({ fromUtc, toUtc }, env, config);
      let insertedCount = 0;
      let updatedCount = 0;
      for (const event of result.events) {
        const change = await upsertEconomicEvent(env.DB, event, config);
        if (change === "inserted") insertedCount += 1; else updatedCount += 1;
      }
      const sourceFailed = result.warnings.some((warning) => warning.code === "source_fetch_failed");
      const summary: ProviderSyncSummary = {
        provider: provider.name, sourceUrl: result.sourceUrl, status: sourceFailed && result.events.length === 0 ? "failed" : result.warnings.length ? "partial" : "success",
        receivedCount: result.events.length, acceptedCount: result.events.length, skippedCount: result.warnings.filter((warning) => warning.code === "missing_required_field" || warning.code === "invalid_event_time").length,
        insertedCount, updatedCount, warningCount: result.warnings.length,
        errorMessage: sourceFailed ? result.warnings.find((warning) => warning.code === "source_fetch_failed")?.message : undefined,
      };
      await completeSyncRun(env.DB, runId, summary, new Date().toISOString());
      if (summary.status === "failed") await recordProviderFailure(env.DB, provider.name, new Date().toISOString(), summary.errorMessage ?? "provider source failed", result.events.length);
      else await recordProviderSuccess(env.DB, provider.name, new Date().toISOString(), result.events.length);
      summaries.push(summary);
      log(summary.status === "failed" ? "error" : "info", "provider_sync", { provider: provider.name, message: "sync completed", receivedCount: summary.receivedCount, acceptedCount: summary.acceptedCount, warningCount: summary.warningCount, sourceUrl: provider.sourceUrl }, env);
    } catch (error) {
      const summary: ProviderSyncSummary = { provider: provider.name, sourceUrl: provider.sourceUrl, status: "failed", receivedCount: 0, acceptedCount: 0, skippedCount: 0, insertedCount: 0, updatedCount: 0, warningCount: 1, errorMessage: error instanceof Error ? error.message : "provider sync failed" };
      await completeSyncRun(env.DB, runId, summary, new Date().toISOString());
      await recordProviderFailure(env.DB, provider.name, new Date().toISOString(), summary.errorMessage ?? "provider sync failed");
      summaries.push(summary);
      logError("provider_sync", error, { provider: provider.name, sourceUrl: provider.sourceUrl }, env);
    }
  }
  return summaries;
}

export async function cleanupDatabase(env: Env, now = new Date().toISOString()): Promise<void> {
  const eventThreshold = new Date(new Date(now).getTime() - 120 * 86_400_000).toISOString();
  const syncThreshold = new Date(new Date(now).getTime() - 180 * 86_400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM economic_events WHERE event_time_utc < ?").bind(eventThreshold),
    env.DB.prepare("DELETE FROM provider_sync_runs WHERE started_at < ?").bind(syncThreshold),
  ]);
}

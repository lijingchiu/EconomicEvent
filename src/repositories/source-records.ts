import type { EconomicEvent, ProviderFetchResult, ProviderName } from "../types";
import { sha256Hex } from "../utils/crypto";

type ExclusionRule = { id: number; provider: string | null; namePattern: string; reason: string };

export async function listExclusionRules(db: D1Database, provider: ProviderName): Promise<ExclusionRule[]> {
  const result = await db.prepare(`SELECT id, provider, name_pattern AS namePattern, reason
    FROM event_exclusion_rules WHERE enabled = 1 AND (provider IS NULL OR provider = ?) ORDER BY id`).bind(provider).all<ExclusionRule>();
  return result.results;
}

export async function applyExclusionRules(db: D1Database, provider: ProviderName, events: EconomicEvent[]): Promise<{ accepted: EconomicEvent[]; excluded: Array<{ event: EconomicEvent; rule: ExclusionRule }> }> {
  const rules = await listExclusionRules(db, provider);
  const accepted: EconomicEvent[] = [];
  const excluded: Array<{ event: EconomicEvent; rule: ExclusionRule }> = [];
  for (const event of events) {
    const rule = rules.find((candidate) => {
      try { return new RegExp(candidate.namePattern, "i").test(event.name) || new RegExp(candidate.namePattern, "i").test(event.normalizedName); } catch { return false; }
    });
    if (rule) excluded.push({ event, rule }); else accepted.push(event);
  }
  return { accepted, excluded };
}

export async function recordSourceSnapshot(db: D1Database, result: ProviderFetchResult, parserVersion: string, status: "success" | "partial" | "failed", errorMessage?: string): Promise<void> {
  const snapshot = JSON.stringify({
    provider: result.provider,
    fetchedAtUtc: result.fetchedAtUtc,
    sourceUrl: result.sourceUrl,
    events: result.events.map((event) => ({ id: event.id, name: event.name, eventTimeUtc: event.eventTimeUtc, rawHash: event.rawHash })),
    warnings: result.warnings,
  });
  const contentHash = await sha256Hex(snapshot);
  await db.prepare(`INSERT OR IGNORE INTO source_snapshots
      (provider, source_url, content_hash, parser_version, response_status, content_type, content_excerpt, fetched_at, parse_status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(result.provider, result.sourceUrl, contentHash, parserVersion, status === "failed" ? null : 200, "application/json", snapshot.slice(0, 12_000), result.fetchedAtUtc, status, errorMessage?.slice(0, 1000) ?? null).run();
}

export async function listSourceSnapshots(db: D1Database, provider?: string, limit = 50): Promise<Record<string, unknown>[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const result = provider
    ? await db.prepare(`SELECT id, provider, source_url AS sourceUrl, content_hash AS contentHash, parser_version AS parserVersion,
        response_status AS responseStatus, content_type AS contentType, fetched_at AS fetchedAt, parse_status AS parseStatus,
        error_message AS errorMessage FROM source_snapshots WHERE provider = ? ORDER BY id DESC LIMIT ?`).bind(provider, safeLimit).all<Record<string, unknown>>()
    : await db.prepare(`SELECT id, provider, source_url AS sourceUrl, content_hash AS contentHash, parser_version AS parserVersion,
        response_status AS responseStatus, content_type AS contentType, fetched_at AS fetchedAt, parse_status AS parseStatus,
        error_message AS errorMessage FROM source_snapshots ORDER BY id DESC LIMIT ?`).bind(safeLimit).all<Record<string, unknown>>();
  return result.results;
}

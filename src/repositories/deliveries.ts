import type { DeliveryStatus, EconomicEvent, Impact, NotificationChannel } from "../types";

export type DueDelivery = { id: number; eventId: string; kind: string; channel: NotificationChannel; reminderMinutes: number; attempts: number; event: EconomicEvent };

function rowToEvent(row: Record<string, unknown>): EconomicEvent {
  return { id: String(row.eventId), provider: row.provider as EconomicEvent["provider"], providerEventId: row.providerEventId ? String(row.providerEventId) : undefined, sourceUrl: String(row.sourceUrl), name: String(row.name), normalizedName: String(row.normalizedName), category: row.category as EconomicEvent["category"], country: "US", currency: "USD", eventTimeUtc: String(row.eventTimeUtc), localDisplayTimezone: String(row.localDisplayTimezone), impact: row.impact as EconomicEvent["impact"], affectedMarkets: JSON.parse(String(row.affectedMarketsJson)) as EconomicEvent["affectedMarkets"], description: row.description ? String(row.description) : null, actualValue: row.actualValue ? String(row.actualValue) : null, forecastValue: row.forecastValue ? String(row.forecastValue) : null, previousValue: row.previousValue ? String(row.previousValue) : null, valueUnit: row.valueUnit ? String(row.valueUnit) : null, valueSourceUrl: row.valueSourceUrl ? String(row.valueSourceUrl) : null, sourceUpdatedAt: row.sourceUpdatedAt ? String(row.sourceUpdatedAt) : null, lifecycleStatus: row.lifecycleStatus ? String(row.lifecycleStatus) as EconomicEvent["lifecycleStatus"] : undefined, dataQuality: row.dataQuality ? String(row.dataQuality) as EconomicEvent["dataQuality"] : undefined, releasePeriod: row.releasePeriod ? String(row.releasePeriod) : null, valueRevision: Number(row.valueRevision ?? 0), rawHash: String(row.rawHash) };
}

export async function expireOldDeliveries(db: D1Database, now: string, windowMinutes = 3): Promise<number> {
  const threshold = new Date(new Date(now).getTime() - windowMinutes * 60_000).toISOString();
  const resultThreshold = new Date(new Date(now).getTime() - 60 * 60_000).toISOString();
  const result = await db.prepare("UPDATE notification_outbox SET status='expired', updated_at=? WHERE status IN ('pending','retry') AND ((kind IN ('result','revision') AND scheduled_for_utc <= ?) OR (kind='reminder' AND scheduled_for_utc <= ?))").bind(now, resultThreshold, threshold).run();
  return result.meta.changes;
}

export async function releaseStaleSending(db: D1Database, now: string, staleMinutes = 10): Promise<number> {
  const threshold = new Date(new Date(now).getTime() - staleMinutes * 60_000).toISOString();
  const result = await db.prepare("UPDATE notification_outbox SET status=CASE WHEN attempts < 5 THEN 'retry' ELSE 'failed' END, next_attempt_at=?, updated_at=?, last_error=COALESCE(last_error, 'stale sending lock recovered') WHERE status='sending' AND updated_at < ?").bind(now, now, threshold).run();
  return result.meta.changes;
}

export async function findDueDeliveries(db: D1Database, now: string, windowMinutes = 3, impactFilter: Impact = "high"): Promise<DueDelivery[]> {
  const threshold = new Date(new Date(now).getTime() - windowMinutes * 60_000).toISOString();
  const resultThreshold = new Date(new Date(now).getTime() - 60 * 60_000).toISOString();
  const impacts: Impact[] = impactFilter === "high" ? ["high"] : impactFilter === "medium" ? ["high", "medium"] : ["high", "medium", "low"];
  const result = await db.prepare(`SELECT o.id, o.event_id AS eventId, o.kind, o.channel, o.reminder_minutes AS reminderMinutes, o.attempts, e.provider, e.provider_event_id AS providerEventId, e.source_url AS sourceUrl, e.name, e.normalized_name AS normalizedName, e.category, e.event_time_utc AS eventTimeUtc, e.local_display_timezone AS localDisplayTimezone, e.impact, e.affected_markets_json AS affectedMarketsJson, e.description, e.actual_value AS actualValue, e.forecast_value AS forecastValue, e.previous_value AS previousValue, e.value_unit AS valueUnit, e.value_source_url AS valueSourceUrl, e.source_updated_at AS sourceUpdatedAt, e.lifecycle_status AS lifecycleStatus, e.data_quality AS dataQuality, e.release_period AS releasePeriod, e.value_revision AS valueRevision, e.raw_hash AS rawHash
    FROM notification_outbox o JOIN economic_events e ON e.id=o.event_id
    WHERE o.status IN ('pending','retry') AND o.scheduled_for_utc <= ? AND o.next_attempt_at <= ?
      AND ((o.kind IN ('result','revision') AND o.scheduled_for_utc > ?) OR (o.kind='reminder' AND o.scheduled_for_utc > ? AND e.event_time_utc > ?))
      AND e.impact IN (${impacts.map(() => "?").join(",")}) ORDER BY o.scheduled_for_utc ASC LIMIT 100`).bind(now, now, resultThreshold, threshold, now, ...impacts).all<Record<string, unknown>>();
  return result.results.map((row) => ({ id: Number(row.id), eventId: String(row.eventId), kind: String(row.kind), channel: String(row.channel) as NotificationChannel, reminderMinutes: row.reminderMinutes == null ? -1 : Number(row.reminderMinutes), attempts: Number(row.attempts), event: rowToEvent(row) }));
}

export async function claimDelivery(db: D1Database, id: number, now: string): Promise<boolean> { const result = await db.prepare("UPDATE notification_outbox SET status='sending', attempts=attempts+1, updated_at=? WHERE id=? AND status IN ('pending','retry') AND attempts < 5").bind(now, id).run(); return result.meta.changes === 1; }
export async function markSent(db: D1Database, id: number, now: string, messageId?: string): Promise<void> { await db.prepare("UPDATE notification_outbox SET status='sent', sent_at=?, external_message_id=?, last_error=NULL, updated_at=? WHERE id=? AND status='sending'").bind(now, messageId ?? null, now, id).run(); }
export async function markFailure(db: D1Database, id: number, now: string, error: string, retryable: boolean, retryAt?: string): Promise<void> { await db.prepare("UPDATE notification_outbox SET status=CASE WHEN ?=1 AND attempts < 5 THEN 'retry' ELSE 'failed' END, next_attempt_at=?, last_error=?, updated_at=? WHERE id=? AND status='sending'").bind(retryable ? 1 : 0, retryAt ?? now, error.slice(0, 500), now, id).run(); }
export async function deliveryStatus(db: D1Database, id: number): Promise<DeliveryStatus | null> { const row = await db.prepare("SELECT status FROM notification_outbox WHERE id=?").bind(id).first<{ status: DeliveryStatus }>(); return row?.status ?? null; }

export async function deliverySummary(db: D1Database): Promise<Record<string, number>> {
  const result = await db.prepare("SELECT status, COUNT(*) AS count FROM notification_outbox GROUP BY status").all<{ status: string; count: number }>();
  return Object.fromEntries(result.results.map((row) => [row.status, Number(row.count)]));
}

export async function deliveryChannelSummary(db: D1Database): Promise<Record<string, Record<string, number>>> {
  const result = await db.prepare("SELECT channel, status, COUNT(*) AS count FROM notification_outbox GROUP BY channel, status").all<{ channel: string; status: string; count: number }>();
  const summary: Record<string, Record<string, number>> = {};
  for (const row of result.results) (summary[row.channel] ??= {})[row.status] = Number(row.count);
  return summary;
}

import type { AppConfig } from "../types";
import type { EconomicEvent } from "../types";
import { reminderSchedule } from "../domain/reminder";

export type EventFilter = { fromUtc: string; toUtc: string; provider?: string; category?: string; impact?: string; limit?: number };

export type EventValueCandidate = Pick<EconomicEvent, "id" | "provider" | "name" | "eventTimeUtc">;

export type EventValueUpdate = {
  actualValue: string;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
};

export async function upsertEconomicEvent(db: D1Database, event: EconomicEvent, config: AppConfig): Promise<"inserted" | "updated"> {
  const existing = await db.prepare("SELECT id, created_at, event_time_utc FROM economic_events WHERE id = ?").bind(event.id).first<{ id: string; created_at: string; event_time_utc: string }>();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO economic_events (id, provider, provider_event_id, source_url, name, normalized_name, category, country, currency, event_time_utc, local_display_timezone, impact, affected_markets_json, description, actual_value, forecast_value, previous_value, value_unit, value_source_url, source_updated_at, raw_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET provider=excluded.provider, provider_event_id=excluded.provider_event_id, source_url=excluded.source_url, name=excluded.name, normalized_name=excluded.normalized_name, category=excluded.category, country=excluded.country, currency=excluded.currency, event_time_utc=excluded.event_time_utc, local_display_timezone=excluded.local_display_timezone, impact=excluded.impact, affected_markets_json=excluded.affected_markets_json, description=excluded.description, actual_value=COALESCE(excluded.actual_value, economic_events.actual_value), forecast_value=COALESCE(excluded.forecast_value, economic_events.forecast_value), previous_value=COALESCE(excluded.previous_value, economic_events.previous_value), value_unit=COALESCE(excluded.value_unit, economic_events.value_unit), value_source_url=COALESCE(excluded.value_source_url, economic_events.value_source_url), source_updated_at=excluded.source_updated_at, raw_hash=excluded.raw_hash, updated_at=excluded.updated_at`).bind(
    event.id, event.provider, event.providerEventId ?? null, event.sourceUrl, event.name, event.normalizedName, event.category, event.country, event.currency, event.eventTimeUtc, event.localDisplayTimezone, event.impact, JSON.stringify(event.affectedMarkets), event.description ?? null, event.actualValue ?? null, event.forecastValue ?? null, event.previousValue ?? null, event.valueUnit ?? null, event.valueSourceUrl ?? null, event.sourceUpdatedAt ?? null, event.rawHash, existing?.created_at ?? now, now,
  ).run();
  await ensureReminderDeliveries(db, event, config.reminderMinutes, now);
  return existing ? "updated" : "inserted";
}

export async function ensureReminderDeliveries(db: D1Database, event: EconomicEvent, reminderMinutes: number[], now = new Date().toISOString()): Promise<void> {
  const schedule = reminderSchedule(event.eventTimeUtc, reminderMinutes);
  for (const item of schedule) {
    await db.prepare(`INSERT INTO notification_deliveries (event_id, reminder_minutes, scheduled_for_utc, status, attempts, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', 0, ?, ?)
      ON CONFLICT(event_id, reminder_minutes) DO UPDATE SET scheduled_for_utc=excluded.scheduled_for_utc, updated_at=excluded.updated_at
      WHERE notification_deliveries.status IN ('pending', 'retry')`).bind(event.id, item.reminderMinutes, item.scheduledForUtc, now, now).run();
  }
}

export async function listEvents(db: D1Database, filter: EventFilter): Promise<Record<string, unknown>[]> {
  const conditions = ["event_time_utc >= ?", "event_time_utc <= ?"];
  const values: (string | number)[] = [filter.fromUtc, filter.toUtc];
  if (filter.provider) { conditions.push("provider = ?"); values.push(filter.provider); }
  if (filter.category) { conditions.push("category = ?"); values.push(filter.category); }
  if (filter.impact) { conditions.push("impact = ?"); values.push(filter.impact); }
  const limit = Math.min(Math.max(filter.limit ?? 30, 1), 200);
  const result = await db.prepare(`SELECT id, provider, provider_event_id AS providerEventId, source_url AS sourceUrl, name, normalized_name AS normalizedName, category, country, currency, event_time_utc AS eventTimeUtc, local_display_timezone AS localDisplayTimezone, impact, affected_markets_json AS affectedMarketsJson, description, actual_value AS actualValue, forecast_value AS forecastValue, previous_value AS previousValue, value_unit AS valueUnit, value_source_url AS valueSourceUrl, source_updated_at AS sourceUpdatedAt, raw_hash AS rawHash, created_at AS createdAt, updated_at AS updatedAt FROM economic_events WHERE ${conditions.join(" AND ")} ORDER BY event_time_utc ASC LIMIT ?`).bind(...values, limit).all<Record<string, unknown>>();
  return result.results;
}

export async function getEvent(db: D1Database, id: string): Promise<EconomicEvent | null> {
  const row = await db.prepare("SELECT * FROM economic_events WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  return { id: String(row.id), provider: row.provider as EconomicEvent["provider"], providerEventId: row.provider_event_id ? String(row.provider_event_id) : undefined, sourceUrl: String(row.source_url), name: String(row.name), normalizedName: String(row.normalized_name), category: row.category as EconomicEvent["category"], country: "US", currency: "USD", eventTimeUtc: String(row.event_time_utc), localDisplayTimezone: String(row.local_display_timezone), impact: row.impact as EconomicEvent["impact"], affectedMarkets: JSON.parse(String(row.affected_markets_json)) as EconomicEvent["affectedMarkets"], description: row.description ? String(row.description) : null, actualValue: row.actual_value ? String(row.actual_value) : null, forecastValue: row.forecast_value ? String(row.forecast_value) : null, previousValue: row.previous_value ? String(row.previous_value) : null, valueUnit: row.value_unit ? String(row.value_unit) : null, valueSourceUrl: row.value_source_url ? String(row.value_source_url) : null, sourceUpdatedAt: row.source_updated_at ? String(row.source_updated_at) : null, rawHash: String(row.raw_hash) };
}

export async function listEventsMissingValues(db: D1Database, fromUtc: string, toUtc: string): Promise<EventValueCandidate[]> {
  const result = await db.prepare(`SELECT id, provider, name, event_time_utc AS eventTimeUtc
    FROM economic_events
    WHERE actual_value IS NULL
      AND (
        (provider = 'bls' AND name IN ('Inflation Rate MoM', 'Core Inflation Rate MoM', 'Inflation Rate YoY', 'Core Inflation Rate YoY', 'PPI MoM', 'Non Farm Payrolls', 'Unemployment Rate'))
        OR provider = 'umich'
      )
      AND event_time_utc >= ?
      AND event_time_utc <= ?
    ORDER BY event_time_utc ASC`).bind(fromUtc, toUtc).all<EventValueCandidate>();
  return result.results;
}

export async function setOfficialEventValues(db: D1Database, id: string, update: EventValueUpdate): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE economic_events
    SET actual_value = ?, previous_value = COALESCE(?, previous_value), value_unit = ?, value_source_url = ?, source_updated_at = ?, updated_at = ?
    WHERE id = ? AND actual_value IS NULL`).bind(
    update.actualValue,
    update.previousValue,
    update.valueUnit,
    update.valueSourceUrl,
    update.sourceUpdatedAt,
    now,
    id,
  ).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function upcomingCount(db: D1Database, now: string): Promise<number> { const result = await db.prepare("SELECT COUNT(*) AS count FROM economic_events WHERE event_time_utc > ?").bind(now).first<{ count: number }>(); return Number(result?.count ?? 0); }

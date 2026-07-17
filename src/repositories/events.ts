import type { AppConfig, NotificationChannel } from "../types";
import type { EconomicEvent } from "../types";
import { reminderSchedule } from "../domain/reminder";
import { explainEvent } from "../domain/event-explanation";
import { recordOfficialPrior, recordOfficialValue } from "./value-history";
import { deriveEventMetrics } from "../domain/derived-metrics";

export type EventFilter = { fromUtc: string; toUtc: string; provider?: string; category?: string; impact?: string; limit?: number };

export type EventValueCandidate = Pick<EconomicEvent, "id" | "provider" | "name" | "eventTimeUtc" | "description">;

export type EventValueUpdate = {
  actualValue: string;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
  releasePeriod?: string | null;
};

export type EventPriorUpdate = {
  previousValue: string;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
  releasePeriod?: string | null;
};

export async function latestOfficialActual(db: D1Database, event: EventValueCandidate): Promise<EventPriorUpdate | null> {
  const compatibleNames = event.provider === "eia" && event.name === "Crude Oil Inventories"
    ? [event.name, "Weekly Petroleum Status Report"]
    : [event.name];
  const row = await db.prepare(`SELECT actual_value AS previousValue, value_unit AS valueUnit,
      COALESCE(value_source_url, source_url) AS valueSourceUrl,
      COALESCE(source_updated_at, event_time_utc) AS sourceUpdatedAt
    FROM economic_events
    WHERE provider = ? AND name IN (${compatibleNames.map(() => "?").join(",")}) AND event_time_utc < ? AND actual_value IS NOT NULL
    ORDER BY event_time_utc DESC LIMIT 1`).bind(event.provider, ...compatibleNames, event.eventTimeUtc).first<Record<string, unknown>>();
  if (!row?.previousValue) return null;
  return {
    previousValue: String(row.previousValue),
    valueUnit: row.valueUnit == null ? null : String(row.valueUnit),
    valueSourceUrl: String(row.valueSourceUrl),
    sourceUpdatedAt: String(row.sourceUpdatedAt),
  };
}

export async function upsertEconomicEvent(db: D1Database, event: EconomicEvent, config: AppConfig): Promise<"inserted" | "updated"> {
  const existing = await db.prepare("SELECT id, created_at, event_time_utc, raw_hash FROM economic_events WHERE id = ?").bind(event.id).first<{ id: string; created_at: string; event_time_utc: string; raw_hash: string }>();
  const now = new Date().toISOString();
  if (existing && existing.event_time_utc !== event.eventTimeUtc) {
    await db.prepare(`INSERT INTO event_schedule_history
      (event_id, previous_time_utc, new_time_utc, previous_raw_hash, new_raw_hash, changed_at)
      VALUES (?, ?, ?, ?, ?, ?)`).bind(event.id, existing.event_time_utc, event.eventTimeUtc, existing.raw_hash, event.rawHash, now).run();
  }
  await db.prepare(`INSERT INTO economic_events (id, provider, provider_event_id, source_url, name, normalized_name, category, country, currency, event_time_utc, local_display_timezone, impact, affected_markets_json, description, actual_value, forecast_value, previous_value, value_unit, value_source_url, source_updated_at, raw_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET provider=excluded.provider, provider_event_id=excluded.provider_event_id, source_url=excluded.source_url, name=excluded.name, normalized_name=excluded.normalized_name, category=excluded.category, country=excluded.country, currency=excluded.currency, event_time_utc=excluded.event_time_utc, local_display_timezone=excluded.local_display_timezone, impact=excluded.impact, affected_markets_json=excluded.affected_markets_json, description=excluded.description, actual_value=COALESCE(excluded.actual_value, economic_events.actual_value), forecast_value=COALESCE(excluded.forecast_value, economic_events.forecast_value), previous_value=COALESCE(excluded.previous_value, economic_events.previous_value), value_unit=COALESCE(excluded.value_unit, economic_events.value_unit), value_source_url=COALESCE(excluded.value_source_url, economic_events.value_source_url), source_updated_at=excluded.source_updated_at, raw_hash=excluded.raw_hash, updated_at=excluded.updated_at`).bind(
    event.id, event.provider, event.providerEventId ?? null, event.sourceUrl, event.name, event.normalizedName, event.category, event.country, event.currency, event.eventTimeUtc, event.localDisplayTimezone, event.impact, JSON.stringify(event.affectedMarkets), event.description ?? null, null, event.forecastValue ?? null, null, event.valueUnit ?? null, event.valueSourceUrl ?? null, event.sourceUpdatedAt ?? null, event.rawHash, existing?.created_at ?? now, now,
  ).run();
  if (existing && existing.event_time_utc !== event.eventTimeUtc) {
    await db.prepare("UPDATE economic_events SET lifecycle_status='rescheduled', data_quality='pending', updated_at=? WHERE id=? AND actual_value IS NULL").bind(now, event.id).run();
  }
  if (event.actualValue != null) {
    await setOfficialEventValues(db, event.id, {
      actualValue: event.actualValue,
      previousValue: event.previousValue ?? null,
      valueUnit: event.valueUnit ?? null,
      valueSourceUrl: event.valueSourceUrl ?? event.sourceUrl,
      sourceUpdatedAt: event.sourceUpdatedAt ?? now,
      releasePeriod: event.releasePeriod ?? null,
    }, config.notificationChannels);
  } else if (event.previousValue != null) {
    await setOfficialEventPrior(db, event.id, {
      previousValue: event.previousValue,
      valueUnit: event.valueUnit ?? null,
      valueSourceUrl: event.valueSourceUrl ?? event.sourceUrl,
      sourceUpdatedAt: event.sourceUpdatedAt ?? now,
      releasePeriod: event.releasePeriod ?? null,
    });
  }
  await ensureReminderDeliveries(db, event, config.reminderMinutes, now, config.notificationChannels);
  return existing ? "updated" : "inserted";
}

export async function ensureReminderDeliveries(db: D1Database, event: EconomicEvent, reminderMinutes: number[], now = new Date().toISOString(), channels: NotificationChannel[] = ["discord"]): Promise<void> {
  if (!channels.length) return;
  if (reminderMinutes.length) {
    await db.prepare(`DELETE FROM notification_outbox
      WHERE event_id = ? AND kind = 'reminder' AND status IN ('pending','retry')
        AND (reminder_minutes NOT IN (${reminderMinutes.map(() => "?").join(",")})
          OR channel NOT IN (${channels.map(() => "?").join(",")}))`).bind(event.id, ...reminderMinutes, ...channels).run();
  }
  const schedule = reminderSchedule(event.eventTimeUtc, reminderMinutes);
  for (const item of schedule) {
    if (item.scheduledForUtc <= now) continue;
    for (const channel of channels) {
      const key = `${event.id}:reminder:${item.reminderMinutes}:${channel}`;
      await db.prepare(`INSERT INTO notification_outbox
        (idempotency_key, event_id, kind, channel, reminder_minutes, scheduled_for_utc, next_attempt_at, status, attempts, created_at, updated_at)
        VALUES (?, ?, 'reminder', ?, ?, ?, ?, 'pending', 0, ?, ?)
        ON CONFLICT(idempotency_key) DO UPDATE SET scheduled_for_utc=excluded.scheduled_for_utc,
          next_attempt_at=excluded.next_attempt_at, updated_at=excluded.updated_at
        WHERE notification_outbox.status IN ('pending', 'retry')`).bind(key, event.id, channel, item.reminderMinutes, item.scheduledForUtc, item.scheduledForUtc, now, now).run();
    }
  }
}

export async function listEvents(db: D1Database, filter: EventFilter): Promise<Record<string, unknown>[]> {
  const conditions = ["event_time_utc >= ?", "event_time_utc <= ?"];
  const values: (string | number)[] = [filter.fromUtc, filter.toUtc];
  if (filter.provider) { conditions.push("provider = ?"); values.push(filter.provider); }
  if (filter.category) { conditions.push("category = ?"); values.push(filter.category); }
  if (filter.impact) { conditions.push("impact = ?"); values.push(filter.impact); }
  const requestedLimit = Number(filter.limit ?? 30);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 200) : 30;
  const result = await db.prepare(`SELECT id, provider, provider_event_id AS providerEventId, source_url AS sourceUrl, name, normalized_name AS normalizedName, category, country, currency, event_time_utc AS eventTimeUtc, local_display_timezone AS localDisplayTimezone, impact, affected_markets_json AS affectedMarketsJson, description, actual_value AS actualValue, forecast_value AS forecastValue, previous_value AS previousValue, value_unit AS valueUnit, value_source_url AS valueSourceUrl, source_updated_at AS sourceUpdatedAt, lifecycle_status AS lifecycleStatus, data_quality AS dataQuality, release_period AS releasePeriod, value_revision AS valueRevision, raw_hash AS rawHash, created_at AS createdAt, updated_at AS updatedAt FROM economic_events WHERE ${conditions.join(" AND ")} ORDER BY event_time_utc ASC LIMIT ?`).bind(...values, limit).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    ...row,
    eventExplanation: explainEvent(rowToEconomicEvent(row)),
    derivedMetrics: deriveEventMetrics(rowToEconomicEvent(row)),
  }));
}

const BLS_VALUE_NAMES = [
  "Inflation Rate MoM", "Core Inflation Rate MoM", "Inflation Rate YoY", "Core Inflation Rate YoY",
  "PPI MoM", "Non Farm Payrolls", "Unemployment Rate", "JOLTs Job Openings",
  "Employment Cost Index QoQ", "Nonfarm Productivity QoQ Prel", "Unit Labor Costs QoQ Prel",
  "Nonfarm Productivity QoQ Revised", "Unit Labor Costs QoQ Revised",
];
const EIA_VALUE_NAMES = ["Weekly Petroleum Status Report", "Crude Oil Inventories", "Gasoline Inventories", "Distillate Inventories", "Natural Gas Storage"];
const ISM_VALUE_NAMES = ["ISM Manufacturing PMI", "ISM Services PMI"];
const CENSUS_VALUE_NAMES = ["Retail Sales MoM", "Building Permits Prel", "Housing Starts", "Durable Goods Orders MoM"];
const BEA_VALUE_NAMES = ["GDP Growth Rate QoQ Adv", "GDP Growth Rate QoQ", "Core PCE Price Index MoM", "Personal Income MoM", "Personal Spending MoM"];
const FEDERAL_RESERVE_VALUE_NAMES = ["FOMC Interest Rate Decision"];

export async function listEventsMissingValues(db: D1Database, fromUtc: string, toUtc: string): Promise<EventValueCandidate[]> {
  const result = await db.prepare(`SELECT id, provider, name, event_time_utc AS eventTimeUtc, description
    FROM economic_events
    WHERE actual_value IS NULL
      AND (
        (provider = 'bls' AND name IN (${BLS_VALUE_NAMES.map(() => "?").join(", ")}))
        OR provider = 'umich'
        OR (provider = 'eia' AND name IN (${EIA_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'ism' AND name IN (${ISM_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'census' AND name IN (${CENSUS_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'bea' AND name IN (${BEA_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'federal_reserve' AND name IN (${FEDERAL_RESERVE_VALUE_NAMES.map(() => "?").join(", ")}))
      )
      AND event_time_utc >= ?
      AND event_time_utc <= ?
    ORDER BY event_time_utc ASC`).bind(...BLS_VALUE_NAMES, ...EIA_VALUE_NAMES, ...ISM_VALUE_NAMES, ...CENSUS_VALUE_NAMES, ...BEA_VALUE_NAMES, ...FEDERAL_RESERVE_VALUE_NAMES, fromUtc, toUtc).all<EventValueCandidate>();
  return result.results;
}

export async function listEventsMissingPriors(db: D1Database, fromUtc: string, toUtc: string): Promise<EventValueCandidate[]> {
  const result = await db.prepare(`SELECT id, provider, name, event_time_utc AS eventTimeUtc, description
    FROM economic_events
    WHERE previous_value IS NULL
      AND (
        (provider = 'bls' AND name IN (${BLS_VALUE_NAMES.map(() => "?").join(", ")}))
        OR provider = 'umich'
        OR (provider = 'eia' AND name IN (${EIA_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'ism' AND name IN (${ISM_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'census' AND name IN (${CENSUS_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'bea' AND name IN (${BEA_VALUE_NAMES.map(() => "?").join(", ")}))
        OR (provider = 'federal_reserve' AND name IN (${FEDERAL_RESERVE_VALUE_NAMES.map(() => "?").join(", ")}))
      )
      AND event_time_utc >= ?
      AND event_time_utc <= ?
    ORDER BY event_time_utc ASC`).bind(...BLS_VALUE_NAMES, ...EIA_VALUE_NAMES, ...ISM_VALUE_NAMES, ...CENSUS_VALUE_NAMES, ...BEA_VALUE_NAMES, ...FEDERAL_RESERVE_VALUE_NAMES, fromUtc, toUtc).all<EventValueCandidate>();
  return result.results;
}

export async function setOfficialEventValues(db: D1Database, id: string, update: EventValueUpdate, channels: NotificationChannel[] = ["discord"]): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await recordOfficialValue(db, id, update, now);
  const updated = result.changed;
  if (updated) {
    for (const channel of channels) {
      const key = `${id}:${result.revised ? "revision" : "result"}:${result.revisionNumber}:${channel}`;
      await db.prepare(`INSERT INTO notification_outbox
        (idempotency_key, event_id, kind, channel, reminder_minutes, scheduled_for_utc, next_attempt_at, status, attempts, created_at, updated_at)
        VALUES (?, ?, ?, ?, -1, ?, ?, 'pending', 0, ?, ?)
        ON CONFLICT(idempotency_key) DO NOTHING`).bind(key, id, result.revised ? "revision" : "result", channel, now, now, now, now).run();
    }
  }
  return updated;
}

export async function setOfficialEventPrior(db: D1Database, id: string, update: EventPriorUpdate): Promise<boolean> {
  return recordOfficialPrior(db, id, update);
}

export async function markEventsValuePending(db: D1Database, ids: string[], now = new Date().toISOString()): Promise<void> {
  if (!ids.length) return;
  await db.prepare(`UPDATE economic_events SET lifecycle_status = 'value_pending', data_quality = 'pending', updated_at = ?
    WHERE id IN (${ids.map(() => "?").join(",")}) AND actual_value IS NULL AND lifecycle_status NOT IN ('cancelled','source_error')`)
    .bind(now, ...ids).run();
}

export async function markEventsSourceError(db: D1Database, ids: string[], now = new Date().toISOString()): Promise<void> {
  if (!ids.length) return;
  await db.prepare(`UPDATE economic_events SET lifecycle_status = 'source_error', data_quality = 'source_error', updated_at = ?
    WHERE id IN (${ids.map(() => "?").join(",")}) AND actual_value IS NULL AND lifecycle_status != 'cancelled'`)
    .bind(now, ...ids).run();
}

export async function markMissingProviderEventsCancelled(db: D1Database, provider: string, fromUtc: string, toUtc: string, acceptedIds: string[], now = new Date().toISOString()): Promise<number> {
  const conditions = ["provider = ?", "event_time_utc >= ?", "event_time_utc <= ?", "event_time_utc > ?", "lifecycle_status NOT IN ('cancelled','value_available','revised')"];
  const values: string[] = [provider, fromUtc, toUtc, now];
  if (acceptedIds.length) {
    conditions.push(`id NOT IN (${acceptedIds.map(() => "?").join(",")})`);
    values.push(...acceptedIds);
  }
  const ids = await db.prepare(`SELECT id FROM economic_events WHERE ${conditions.join(" AND ")}`).bind(...values).all<{ id: string }>();
  if (!ids.results.length) return 0;
  const eventIds = ids.results.map((row) => row.id);
  await db.batch([
    db.prepare(`UPDATE economic_events SET lifecycle_status='cancelled', data_quality='pending', updated_at=? WHERE id IN (${eventIds.map(() => "?").join(",")})`).bind(now, ...eventIds),
    db.prepare(`UPDATE notification_outbox SET status='expired', last_error='event cancelled or removed from official schedule', updated_at=? WHERE event_id IN (${eventIds.map(() => "?").join(",")}) AND status IN ('pending','retry')`).bind(now, ...eventIds),
  ]);
  return eventIds.length;
}

function rowToEconomicEvent(row: Record<string, unknown>): EconomicEvent {
  return {
    id: String(row.id),
    provider: row.provider as EconomicEvent["provider"],
    providerEventId: row.providerEventId ? String(row.providerEventId) : undefined,
    sourceUrl: String(row.sourceUrl),
    name: String(row.name),
    normalizedName: String(row.normalizedName),
    category: row.category as EconomicEvent["category"],
    country: "US",
    currency: "USD",
    eventTimeUtc: String(row.eventTimeUtc),
    localDisplayTimezone: String(row.localDisplayTimezone),
    impact: row.impact as EconomicEvent["impact"],
    affectedMarkets: JSON.parse(String(row.affectedMarketsJson)) as EconomicEvent["affectedMarkets"],
    description: row.description ? String(row.description) : null,
    actualValue: row.actualValue ? String(row.actualValue) : null,
    forecastValue: row.forecastValue ? String(row.forecastValue) : null,
    previousValue: row.previousValue ? String(row.previousValue) : null,
    valueUnit: row.valueUnit ? String(row.valueUnit) : null,
    valueSourceUrl: row.valueSourceUrl ? String(row.valueSourceUrl) : null,
    sourceUpdatedAt: row.sourceUpdatedAt ? String(row.sourceUpdatedAt) : null,
    lifecycleStatus: row.lifecycleStatus ? String(row.lifecycleStatus) as EconomicEvent["lifecycleStatus"] : undefined,
    dataQuality: row.dataQuality ? String(row.dataQuality) as EconomicEvent["dataQuality"] : undefined,
    releasePeriod: row.releasePeriod ? String(row.releasePeriod) : null,
    valueRevision: Number(row.valueRevision ?? 0),
    rawHash: String(row.rawHash),
  };
}

export async function getEvent(db: D1Database, id: string): Promise<EconomicEvent | null> {
  const row = await db.prepare("SELECT * FROM economic_events WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  const event = { id: String(row.id), provider: row.provider as EconomicEvent["provider"], providerEventId: row.provider_event_id ? String(row.provider_event_id) : undefined, sourceUrl: String(row.source_url), name: String(row.name), normalizedName: String(row.normalized_name), category: row.category as EconomicEvent["category"], country: "US" as const, currency: "USD" as const, eventTimeUtc: String(row.event_time_utc), localDisplayTimezone: String(row.local_display_timezone), impact: row.impact as EconomicEvent["impact"], affectedMarkets: JSON.parse(String(row.affected_markets_json)) as EconomicEvent["affectedMarkets"], description: row.description ? String(row.description) : null, actualValue: row.actual_value ? String(row.actual_value) : null, forecastValue: row.forecast_value ? String(row.forecast_value) : null, previousValue: row.previous_value ? String(row.previous_value) : null, valueUnit: row.value_unit ? String(row.value_unit) : null, valueSourceUrl: row.value_source_url ? String(row.value_source_url) : null, sourceUpdatedAt: row.source_updated_at ? String(row.source_updated_at) : null, lifecycleStatus: row.lifecycle_status ? String(row.lifecycle_status) as EconomicEvent["lifecycleStatus"] : undefined, dataQuality: row.data_quality ? String(row.data_quality) as EconomicEvent["dataQuality"] : undefined, releasePeriod: row.release_period ? String(row.release_period) : null, valueRevision: Number(row.value_revision ?? 0), rawHash: String(row.raw_hash) };
  return { ...event, derivedMetrics: deriveEventMetrics(event) };
}

export async function upcomingCount(db: D1Database, now: string): Promise<number> { const result = await db.prepare("SELECT COUNT(*) AS count FROM economic_events WHERE event_time_utc > ?").bind(now).first<{ count: number }>(); return Number(result?.count ?? 0); }

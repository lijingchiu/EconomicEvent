import type { EventValueRevision } from "../types";
import { sha256Hex } from "../utils/crypto";

export type OfficialValueInput = {
  actualValue: string;
  forecastValue?: string | null;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
  releasePeriod?: string | null;
};

type CurrentValueRow = {
  actualValue: string | null;
  forecastValue: string | null;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string | null;
  sourceUpdatedAt: string | null;
  releasePeriod: string | null;
  valueRevision: number;
};

function text(value: unknown): string | null {
  return value == null ? null : String(value);
}

export async function recordOfficialValue(db: D1Database, eventId: string, value: OfficialValueInput, now = new Date().toISOString()): Promise<{ changed: boolean; revised: boolean; revisionNumber: number }> {
  const current = await db.prepare(`SELECT actual_value AS actualValue, forecast_value AS forecastValue,
      previous_value AS previousValue, value_unit AS valueUnit, value_source_url AS valueSourceUrl,
      source_updated_at AS sourceUpdatedAt, release_period AS releasePeriod, value_revision AS valueRevision
    FROM economic_events WHERE id = ?`).bind(eventId).first<CurrentValueRow>();
  if (!current) return { changed: false, revised: false, revisionNumber: 0 };

  const next = {
    actualValue: value.actualValue,
    forecastValue: value.forecastValue ?? current.forecastValue,
    previousValue: value.previousValue ?? current.previousValue,
    valueUnit: value.valueUnit ?? current.valueUnit,
    valueSourceUrl: value.valueSourceUrl,
    sourceUpdatedAt: value.sourceUpdatedAt,
    releasePeriod: value.releasePeriod ?? current.releasePeriod,
  };
  const changed = current.actualValue !== next.actualValue
    || current.forecastValue !== next.forecastValue
    || current.previousValue !== next.previousValue
    || current.valueUnit !== next.valueUnit
    || current.valueSourceUrl !== next.valueSourceUrl
    || current.releasePeriod !== next.releasePeriod;
  if (!changed) return { changed: false, revised: false, revisionNumber: Number(current.valueRevision ?? 0) };

  const revised = current.actualValue != null && current.actualValue !== next.actualValue;
  const revisionNumber = Number(current.valueRevision ?? 0) + 1;
  const rawHash = await sha256Hex(JSON.stringify([eventId, next.actualValue, next.forecastValue, next.previousValue, next.valueUnit, next.valueSourceUrl, next.sourceUpdatedAt, next.releasePeriod]));
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO event_value_history
      (event_id, actual_value, forecast_value, previous_value, value_unit, value_source_url, source_updated_at, release_period, revision_number, is_revision, raw_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      eventId, next.actualValue, next.forecastValue, next.previousValue, next.valueUnit,
      next.valueSourceUrl, next.sourceUpdatedAt, next.releasePeriod, revisionNumber, revised ? 1 : 0, rawHash, now,
    ),
    db.prepare(`UPDATE economic_events SET actual_value = ?, forecast_value = COALESCE(?, forecast_value),
      previous_value = COALESCE(?, previous_value), value_unit = COALESCE(?, value_unit),
      value_source_url = ?, source_updated_at = ?, release_period = COALESCE(?, release_period),
      value_revision = ?, lifecycle_status = ?, data_quality = ?, updated_at = ? WHERE id = ?`).bind(
      next.actualValue, next.forecastValue, next.previousValue, next.valueUnit, next.valueSourceUrl,
      next.sourceUpdatedAt, next.releasePeriod, revisionNumber, revised ? "revised" : "value_available",
      revised ? "revised" : "official", now, eventId,
    ),
  ]);
  return { changed: true, revised, revisionNumber };
}

export async function recordOfficialPrior(db: D1Database, eventId: string, value: Omit<OfficialValueInput, "actualValue">, now = new Date().toISOString()): Promise<boolean> {
  if (value.previousValue == null) return false;
  const current = await db.prepare(`SELECT actual_value AS actualValue, forecast_value AS forecastValue,
      previous_value AS previousValue, value_unit AS valueUnit, value_source_url AS valueSourceUrl,
      source_updated_at AS sourceUpdatedAt, release_period AS releasePeriod, value_revision AS valueRevision
    FROM economic_events WHERE id = ?`).bind(eventId).first<CurrentValueRow>();
  if (!current || current.previousValue != null) return false;
  const result = await db.prepare(`UPDATE economic_events
    SET previous_value = ?, value_unit = COALESCE(?, value_unit), value_source_url = ?,
      source_updated_at = ?, release_period = COALESCE(?, release_period), updated_at = ?
    WHERE id = ? AND previous_value IS NULL`).bind(
    value.previousValue, value.valueUnit, value.valueSourceUrl, value.sourceUpdatedAt,
    value.releasePeriod ?? null, now, eventId,
  ).run();
  if (Number(result.meta.changes ?? 0) !== 1) return false;

  const revisionNumber = Number(current.valueRevision ?? 0) + 1;
  const nextUnit = value.valueUnit ?? current.valueUnit;
  const nextPeriod = value.releasePeriod ?? current.releasePeriod;
  const rawHash = await sha256Hex(JSON.stringify([
    eventId, current.actualValue, current.forecastValue, value.previousValue, nextUnit,
    value.valueSourceUrl, value.sourceUpdatedAt, nextPeriod,
  ]));
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO event_value_history
      (event_id, actual_value, forecast_value, previous_value, value_unit, value_source_url, source_updated_at, release_period, revision_number, is_revision, raw_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(
      eventId, current.actualValue, current.forecastValue, value.previousValue, nextUnit,
      value.valueSourceUrl, value.sourceUpdatedAt, nextPeriod, revisionNumber, rawHash, now,
    ),
    db.prepare("UPDATE economic_events SET value_revision = ? WHERE id = ? AND value_revision < ?")
      .bind(revisionNumber, eventId, revisionNumber),
  ]);
  return true;
}

export async function listEventValueHistory(db: D1Database, eventId: string, limit = 50): Promise<EventValueRevision[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const result = await db.prepare(`SELECT id, event_id AS eventId, actual_value AS actualValue,
      forecast_value AS forecastValue, previous_value AS previousValue, value_unit AS valueUnit,
      value_source_url AS valueSourceUrl, source_updated_at AS sourceUpdatedAt,
      release_period AS releasePeriod, revision_number AS revisionNumber, is_revision AS isRevision,
      raw_hash AS rawHash, created_at AS createdAt
    FROM event_value_history WHERE event_id = ? ORDER BY revision_number DESC, created_at DESC LIMIT ?`)
    .bind(eventId, safeLimit).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: Number(row.id),
    eventId: String(row.eventId),
    actualValue: text(row.actualValue),
    forecastValue: text(row.forecastValue),
    previousValue: text(row.previousValue),
    valueUnit: text(row.valueUnit),
    valueSourceUrl: String(row.valueSourceUrl),
    sourceUpdatedAt: String(row.sourceUpdatedAt),
    releasePeriod: text(row.releasePeriod),
    revisionNumber: Number(row.revisionNumber),
    isRevision: Number(row.isRevision) === 1,
    rawHash: String(row.rawHash),
    createdAt: String(row.createdAt),
  }));
}

import type { ScheduledTaskHealth, ScheduledTaskStatus } from "../types";

export async function startScheduledTask(db: D1Database, taskName: string, cron: string, startedAt: string): Promise<number> {
  const result = await db.prepare(`INSERT INTO scheduled_task_runs (task_name, cron, started_at, status)
    VALUES (?, ?, ?, 'running')`).bind(taskName, cron, startedAt).run();
  return Number(result.meta.last_row_id);
}

export async function finishScheduledTask(db: D1Database, id: number, status: Exclude<ScheduledTaskStatus, "running">, completedAt: string, details?: unknown, errorMessage?: string): Promise<void> {
  await db.prepare(`UPDATE scheduled_task_runs SET completed_at = ?, status = ?, details_json = ?, error_message = ? WHERE id = ?`)
    .bind(completedAt, status, details == null ? null : JSON.stringify(details), errorMessage?.slice(0, 1000) ?? null, id).run();
}

export async function acquireTaskLock(db: D1Database, taskName: string, owner: string, now: string, ttlSeconds = 240): Promise<boolean> {
  const lockedUntil = new Date(new Date(now).getTime() + ttlSeconds * 1000).toISOString();
  await db.prepare(`INSERT INTO scheduled_task_locks (task_name, lock_owner, locked_until, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(task_name) DO UPDATE SET lock_owner = excluded.lock_owner,
      locked_until = excluded.locked_until, updated_at = excluded.updated_at
    WHERE scheduled_task_locks.locked_until <= ? OR scheduled_task_locks.lock_owner = ?`)
    .bind(taskName, owner, lockedUntil, now, now, owner).run();
  const row = await db.prepare("SELECT lock_owner AS lockOwner FROM scheduled_task_locks WHERE task_name = ?")
    .bind(taskName).first<{ lockOwner: string }>();
  return row?.lockOwner === owner;
}

export async function releaseTaskLock(db: D1Database, taskName: string, owner: string): Promise<void> {
  await db.prepare("DELETE FROM scheduled_task_locks WHERE task_name = ? AND lock_owner = ?").bind(taskName, owner).run();
}

const TASK_STALE_AFTER_MINUTES: Record<string, number> = {
  notifications: 5,
  event_values: 5,
  daily_digest: 5,
  provider_sync: 390,
  provider_health: 390,
  database_cleanup: 26 * 60,
};

export function taskStaleAfterMinutes(taskName: string, fallback = 15): number {
  return TASK_STALE_AFTER_MINUTES[taskName] ?? fallback;
}

export async function listScheduledTaskHealth(db: D1Database, now = new Date(), fallbackStaleAfterMinutes = 15): Promise<ScheduledTaskHealth[]> {
  const result = await db.prepare(`SELECT r.task_name AS taskName, r.status, r.cron, r.started_at AS startedAt,
      r.completed_at AS completedAt, r.error_message AS errorMessage
    FROM scheduled_task_runs r
    INNER JOIN (SELECT task_name, MAX(id) AS id FROM scheduled_task_runs GROUP BY task_name) latest ON latest.id = r.id
    ORDER BY r.task_name`).all<Record<string, unknown>>();
  return result.results.map((row) => {
    const completedAt = row.completedAt == null ? null : String(row.completedAt);
    const reference = completedAt ?? String(row.startedAt);
    return {
      taskName: String(row.taskName),
      status: String(row.status) as ScheduledTaskHealth["status"],
      cron: String(row.cron),
      startedAt: String(row.startedAt),
      completedAt,
      errorMessage: row.errorMessage == null ? null : String(row.errorMessage),
      stale: now.getTime() - new Date(reference).getTime() > taskStaleAfterMinutes(String(row.taskName), fallbackStaleAfterMinutes) * 60_000,
    };
  });
}

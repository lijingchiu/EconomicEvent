export async function writeAuditLog(db: D1Database, action: string, targetType?: string, targetId?: string, details?: unknown, actor = "admin", now = new Date().toISOString()): Promise<void> {
  await db.prepare(`INSERT INTO audit_log (action, actor, target_type, target_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).bind(action, actor, targetType ?? null, targetId ?? null, details == null ? null : JSON.stringify(details), now).run();
}

export async function listAuditLog(db: D1Database, limit = 100): Promise<Record<string, unknown>[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const result = await db.prepare(`SELECT id, action, actor, target_type AS targetType, target_id AS targetId,
      details_json AS detailsJson, created_at AS createdAt FROM audit_log ORDER BY id DESC LIMIT ?`).bind(safeLimit).all<Record<string, unknown>>();
  return result.results.map((row) => ({ ...row, details: row.detailsJson ? JSON.parse(String(row.detailsJson)) : null, detailsJson: undefined }));
}

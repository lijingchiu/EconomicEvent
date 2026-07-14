export async function listSettings(db: D1Database): Promise<Record<string, string>> {
  const result = await db.prepare("SELECT setting_key, setting_value FROM app_settings").all<{ setting_key: string; setting_value: string }>();
  return Object.fromEntries(result.results.map((row) => [row.setting_key, row.setting_value]));
}

export async function saveSettings(db: D1Database, rows: Record<string, string>, now = new Date().toISOString()): Promise<void> {
  const statements = Object.entries(rows).map(([key, value]) => db.prepare(`INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`).bind(key, value, now));
  if (statements.length) await db.batch(statements);
}

export type OwnerPreferences = {
  language: "zh-Hant" | "en";
  theme: "light" | "dark" | "system";
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  digestEnabled: boolean;
  digestTime: string;
};

export type SavedFilter = { id: string; name: string; filter: Record<string, unknown>; createdAt: string; updatedAt: string };

const DEFAULT_PREFERENCES: OwnerPreferences = {
  language: "zh-Hant",
  theme: "system",
  quietHoursStart: null,
  quietHoursEnd: null,
  digestEnabled: false,
  digestTime: "08:00",
};

export async function getOwnerPreferences(db: D1Database): Promise<OwnerPreferences> {
  const row = await db.prepare(`SELECT language, theme, quiet_hours_start AS quietHoursStart,
      quiet_hours_end AS quietHoursEnd, digest_enabled AS digestEnabled, digest_time AS digestTime
    FROM owner_preferences WHERE owner_id = 'owner'`).first<Record<string, unknown>>();
  if (!row) return DEFAULT_PREFERENCES;
  return {
    language: row.language === "en" ? "en" : "zh-Hant",
    theme: row.theme === "light" || row.theme === "dark" ? row.theme : "system",
    quietHoursStart: row.quietHoursStart == null ? null : String(row.quietHoursStart),
    quietHoursEnd: row.quietHoursEnd == null ? null : String(row.quietHoursEnd),
    digestEnabled: Number(row.digestEnabled) === 1,
    digestTime: String(row.digestTime ?? "08:00"),
  };
}

export async function saveOwnerPreferences(db: D1Database, preferences: OwnerPreferences, now = new Date().toISOString()): Promise<void> {
  await db.prepare(`INSERT INTO owner_preferences
      (owner_id, language, theme, quiet_hours_start, quiet_hours_end, digest_enabled, digest_time, updated_at)
    VALUES ('owner', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_id) DO UPDATE SET language=excluded.language, theme=excluded.theme,
      quiet_hours_start=excluded.quiet_hours_start, quiet_hours_end=excluded.quiet_hours_end,
      digest_enabled=excluded.digest_enabled, digest_time=excluded.digest_time, updated_at=excluded.updated_at`)
    .bind(preferences.language, preferences.theme, preferences.quietHoursStart, preferences.quietHoursEnd, preferences.digestEnabled ? 1 : 0, preferences.digestTime, now).run();
}

export async function listFavorites(db: D1Database): Promise<string[]> {
  const result = await db.prepare("SELECT event_id AS eventId FROM event_favorites ORDER BY created_at DESC").all<{ eventId: string }>();
  return result.results.map((row) => row.eventId);
}

export async function setFavorite(db: D1Database, eventId: string, favorite: boolean, now = new Date().toISOString()): Promise<void> {
  if (favorite) await db.prepare("INSERT OR IGNORE INTO event_favorites (event_id, created_at) VALUES (?, ?)").bind(eventId, now).run();
  else await db.prepare("DELETE FROM event_favorites WHERE event_id = ?").bind(eventId).run();
}

export async function listSavedFilters(db: D1Database): Promise<SavedFilter[]> {
  const result = await db.prepare("SELECT id, name, filter_json AS filterJson, created_at AS createdAt, updated_at AS updatedAt FROM saved_filters ORDER BY updated_at DESC").all<Record<string, unknown>>();
  return result.results.map((row) => ({ id: String(row.id), name: String(row.name), filter: JSON.parse(String(row.filterJson)) as Record<string, unknown>, createdAt: String(row.createdAt), updatedAt: String(row.updatedAt) }));
}

export async function saveFilter(db: D1Database, id: string, name: string, filter: Record<string, unknown>, now = new Date().toISOString()): Promise<void> {
  await db.prepare(`INSERT INTO saved_filters (id, name, filter_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, filter_json=excluded.filter_json, updated_at=excluded.updated_at`)
    .bind(id, name, JSON.stringify(filter), now, now).run();
}

export async function deleteFilter(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM saved_filters WHERE id = ?").bind(id).run();
}

export async function saveWebPushSubscription(db: D1Database, subscription: { endpoint: string; p256dh: string; auth: string; userAgent?: string }, now = new Date().toISOString()): Promise<void> {
  await db.prepare(`INSERT INTO web_push_subscriptions (endpoint, p256dh_key, auth_key, user_agent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh_key=excluded.p256dh_key, auth_key=excluded.auth_key,
      user_agent=excluded.user_agent, updated_at=excluded.updated_at`)
    .bind(subscription.endpoint, subscription.p256dh, subscription.auth, subscription.userAgent ?? null, now, now).run();
}

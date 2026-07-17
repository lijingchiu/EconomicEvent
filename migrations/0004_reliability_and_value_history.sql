ALTER TABLE economic_events ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE economic_events ADD COLUMN data_quality TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE economic_events ADD COLUMN release_period TEXT;
ALTER TABLE economic_events ADD COLUMN value_revision INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS event_value_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES economic_events(id) ON DELETE CASCADE,
  actual_value TEXT,
  forecast_value TEXT,
  previous_value TEXT,
  value_unit TEXT,
  value_source_url TEXT NOT NULL,
  source_updated_at TEXT NOT NULL,
  release_period TEXT,
  revision_number INTEGER NOT NULL DEFAULT 1,
  is_revision INTEGER NOT NULL DEFAULT 0 CHECK (is_revision IN (0, 1)),
  raw_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(event_id, raw_hash)
);

CREATE INDEX IF NOT EXISTS idx_value_history_event_created
  ON event_value_history(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_history_source_updated
  ON event_value_history(source_updated_at DESC);

CREATE TABLE IF NOT EXISTS event_schedule_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES economic_events(id) ON DELETE CASCADE,
  previous_time_utc TEXT NOT NULL,
  new_time_utc TEXT NOT NULL,
  previous_raw_hash TEXT,
  new_raw_hash TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedule_history_event_changed
  ON event_schedule_history(event_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_task_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_name TEXT NOT NULL,
  cron TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'skipped')),
  details_json TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_runs_name_started
  ON scheduled_task_runs(task_name, started_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_task_locks (
  task_name TEXT PRIMARY KEY,
  lock_owner TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS owner_preferences (
  owner_id TEXT PRIMARY KEY DEFAULT 'owner',
  language TEXT NOT NULL DEFAULT 'zh-Hant',
  theme TEXT NOT NULL DEFAULT 'light',
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  digest_enabled INTEGER NOT NULL DEFAULT 0 CHECK (digest_enabled IN (0, 1)),
  digest_time TEXT NOT NULL DEFAULT '08:00',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_favorites (
  event_id TEXT PRIMARY KEY REFERENCES economic_events(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_filters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filter_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO event_value_history
  (event_id, actual_value, forecast_value, previous_value, value_unit, value_source_url,
   source_updated_at, release_period, revision_number, is_revision, raw_hash, created_at)
SELECT id, actual_value, forecast_value, previous_value, value_unit,
  COALESCE(value_source_url, source_url), COALESCE(source_updated_at, event_time_utc),
  NULL, 1, 0, id || ':legacy:' || COALESCE(source_updated_at, event_time_utc), updated_at
FROM economic_events
WHERE actual_value IS NOT NULL OR previous_value IS NOT NULL;

UPDATE economic_events SET value_revision = 1
WHERE (actual_value IS NOT NULL OR previous_value IS NOT NULL) AND value_revision = 0;

CREATE TABLE IF NOT EXISTS notification_channel_settings (
  channel TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  settings_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES economic_events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('reminder', 'result', 'revision', 'digest', 'health', 'test')),
  channel TEXT NOT NULL,
  reminder_minutes INTEGER,
  scheduled_for_utc TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'retry', 'failed', 'expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  external_message_id TEXT,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_due
  ON notification_outbox(status, next_attempt_at, scheduled_for_utc);
CREATE INDEX IF NOT EXISTS idx_outbox_event
  ON notification_outbox(event_id, channel);

INSERT OR IGNORE INTO notification_outbox
  (idempotency_key, event_id, kind, channel, reminder_minutes, scheduled_for_utc, next_attempt_at,
   status, attempts, external_message_id, last_error, sent_at, created_at, updated_at)
SELECT 'legacy-discord-' || id, event_id,
  CASE WHEN reminder_minutes = -1 THEN 'result' ELSE 'reminder' END,
  'discord', reminder_minutes, scheduled_for_utc, scheduled_for_utc,
  status, attempts, discord_message_id, last_error, sent_at, created_at, updated_at
FROM notification_deliveries;

UPDATE economic_events
SET lifecycle_status = CASE
      WHEN actual_value IS NOT NULL THEN 'value_available'
      WHEN datetime(event_time_utc) <= CURRENT_TIMESTAMP THEN 'value_pending'
      ELSE 'scheduled'
    END,
    data_quality = CASE
      WHEN actual_value IS NOT NULL THEN 'official'
      WHEN datetime(event_time_utc) <= CURRENT_TIMESTAMP THEN 'pending'
      ELSE 'pending'
    END;

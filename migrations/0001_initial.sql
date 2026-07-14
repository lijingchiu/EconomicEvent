CREATE TABLE IF NOT EXISTS economic_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  source_url TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  event_time_utc TEXT NOT NULL,
  local_display_timezone TEXT NOT NULL,
  impact TEXT NOT NULL,
  affected_markets_json TEXT NOT NULL,
  description TEXT,
  source_updated_at TEXT,
  raw_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_time ON economic_events(event_time_utc);
CREATE INDEX IF NOT EXISTS idx_events_provider_time ON economic_events(provider, event_time_utc);
CREATE INDEX IF NOT EXISTS idx_events_impact_time ON economic_events(impact, event_time_utc);
CREATE INDEX IF NOT EXISTS idx_events_category_time ON economic_events(category, event_time_utc);
CREATE INDEX IF NOT EXISTS idx_events_provider_event_id ON economic_events(provider, provider_event_id);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES economic_events(id) ON DELETE CASCADE,
  reminder_minutes INTEGER NOT NULL,
  scheduled_for_utc TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'retry', 'failed', 'expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  discord_message_id TEXT,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, reminder_minutes)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_due ON notification_deliveries(status, scheduled_for_utc);
CREATE INDEX IF NOT EXISTS idx_deliveries_event ON notification_deliveries(event_id);

CREATE TABLE IF NOT EXISTS provider_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  source_url TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  received_count INTEGER,
  accepted_count INTEGER,
  skipped_count INTEGER,
  inserted_count INTEGER,
  updated_count INTEGER,
  warning_count INTEGER,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_provider_started ON provider_sync_runs(provider, started_at);

CREATE TABLE IF NOT EXISTS provider_source_health (
  provider TEXT PRIMARY KEY,
  last_success_at TEXT,
  last_failure_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_received_count INTEGER,
  last_alert_at TEXT,
  updated_at TEXT NOT NULL
);

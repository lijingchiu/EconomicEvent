CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  source_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  response_status INTEGER,
  content_type TEXT,
  content_excerpt TEXT,
  fetched_at TEXT NOT NULL,
  parse_status TEXT NOT NULL CHECK (parse_status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  UNIQUE(provider, source_url, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_source_snapshots_provider_fetched
  ON source_snapshots(provider, fetched_at DESC);

CREATE TABLE IF NOT EXISTS event_exclusion_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT,
  name_pattern TEXT NOT NULL,
  reason TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exclusion_rules_provider
  ON event_exclusion_rules(provider, enabled);

CREATE TABLE IF NOT EXISTS daily_digest_runs (
  digest_date TEXT PRIMARY KEY,
  scheduled_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  channel_results_json TEXT,
  error_message TEXT
);

INSERT INTO event_exclusion_rules (provider, name_pattern, reason, enabled, created_at, updated_at)
SELECT 'bls', '^state job openings and labor turnover', 'State-level JOLTS is not the national market-moving release', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM event_exclusion_rules
  WHERE provider = 'bls' AND name_pattern = '^state job openings and labor turnover'
);

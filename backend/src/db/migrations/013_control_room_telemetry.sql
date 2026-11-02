-- Migration 013: Control Room Telemetry & Error Ledger (PRD A Category 11)
-- 1. Create system_errors table for centralized diagnostic logging
CREATE TABLE IF NOT EXISTS system_errors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT NOT NULL,
  subsystem   TEXT NOT NULL, -- 'fetcher' | 'ai' | 'scheduler' | 'db' | 'tv' | 'system'
  level       TEXT NOT NULL DEFAULT 'error', -- 'error' | 'warn' | 'info'
  message     TEXT NOT NULL,
  details     TEXT, -- JSON or diagnostic context
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_errors_timestamp ON system_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_subsystem ON system_errors(subsystem);
CREATE INDEX IF NOT EXISTS idx_system_errors_level ON system_errors(level);

-- 2. Add telemetry columns to sources table for source freshness matrix
ALTER TABLE sources ADD COLUMN last_latency_ms INTEGER DEFAULT NULL;
ALTER TABLE sources ADD COLUMN error_count INTEGER DEFAULT 0;
ALTER TABLE sources ADD COLUMN last_error TEXT DEFAULT NULL;
ALTER TABLE sources ADD COLUMN last_error_at TEXT DEFAULT NULL;
ALTER TABLE sources ADD COLUMN last_status TEXT DEFAULT 'ok';

-- 3. Seed initial informational log entry
INSERT INTO system_errors (timestamp, subsystem, level, message, details)
VALUES (
  datetime('now'),
  'system',
  'info',
  'Control Room Telemetry initialized (Migration 013 applied)',
  '{"version": 13, "feature": "category_11_control_room"}'
);


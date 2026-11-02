-- Migration 007: Real-Time Foundation (PRD A Category 1B)
-- Adds app_sessions table for recording heartbeat, crash detection, and downtime tracking.

CREATE TABLE IF NOT EXISTS app_sessions (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at                  TEXT NOT NULL, -- UTC ISO-8601 with 'Z'
  last_heartbeat_at           TEXT NOT NULL, -- UTC ISO-8601 with 'Z' (written every 30s)
  ended_at                    TEXT,          -- UTC ISO-8601 with 'Z'
  clean_shutdown              INTEGER NOT NULL DEFAULT 0,
  end_reason                  TEXT,          -- 'clean' | 'unclean' | 'crash' | 'interrupted'
  missed_window_start         TEXT,          -- Start of downtime gap if >5 minutes
  missed_window_end           TEXT,          -- End of downtime gap (when restarted)
  articles_ingested_in_session INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON app_sessions(started_at DESC);


-- Migration 010: tv_channel_health table for multi-method playback tracking (PRD A Category 6)

CREATE TABLE IF NOT EXISTS tv_channel_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES tv_channels(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK(method IN ('hls', 'youtube', 'vlc')),
  last_checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_worked_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(channel_id, method)
);

CREATE INDEX IF NOT EXISTS idx_tv_channel_health_channel ON tv_channel_health(channel_id);
CREATE INDEX IF NOT EXISTS idx_tv_channel_health_method ON tv_channel_health(method);

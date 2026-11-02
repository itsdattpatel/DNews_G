-- Migration 012: Two-Pass AI Processing & Quota Telemetry (PRD A Category 10)
-- Pass 1: Lightweight Batched Scoring (Urgency / Categories)
-- Pass 2: In-Depth Enrichment (Summaries, Verbatim Anchor Phrases, Entity Tags)
-- Quota Telemetry: Track Pass 1 / Pass 2 counts and calculate estimated tokens saved.

-- 1. Add Pass 1 & Pass 2 timestamps to articles
ALTER TABLE articles ADD COLUMN pass1_completed_at TEXT;
ALTER TABLE articles ADD COLUMN pass2_completed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_pass1 ON articles(pass1_completed_at);
CREATE INDEX IF NOT EXISTS idx_articles_pass2 ON articles(pass2_completed_at);

-- 2. Two-Pass Telemetry Table (Single-row table id=1)
CREATE TABLE IF NOT EXISTS two_pass_stats (
  id                      INTEGER PRIMARY KEY CHECK (id = 1),
  pass1_count             INTEGER NOT NULL DEFAULT 0,
  pass2_count             INTEGER NOT NULL DEFAULT 0,
  pass2_skipped_count     INTEGER NOT NULL DEFAULT 0,
  estimated_tokens_saved  INTEGER NOT NULL DEFAULT 0,
  last_updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed initial row
INSERT OR IGNORE INTO two_pass_stats (id, pass1_count, pass2_count, pass2_skipped_count, estimated_tokens_saved, last_updated_at)
VALUES (1, 0, 0, 0, 0, datetime('now'));

-- 3. Settings for Two-Pass AI Ingestion
INSERT OR IGNORE INTO settings (key, value) VALUES ('two_pass_ai_enabled', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('pass2_threshold', '75');

-- 4. Backfill existing completed articles
UPDATE articles
SET pass1_completed_at = COALESCE(ai_processed_at, fetched_at)
WHERE status = 'done';

UPDATE articles
SET pass2_completed_at = COALESCE(ai_processed_at, fetched_at)
WHERE status = 'done' AND summary IS NOT NULL AND length(trim(summary)) > 0;

-- 5. Seed two_pass_stats metrics from existing database records
UPDATE two_pass_stats
SET 
  pass1_count = (SELECT COUNT(*) FROM articles WHERE pass1_completed_at IS NOT NULL),
  pass2_count = (SELECT COUNT(*) FROM articles WHERE pass2_completed_at IS NOT NULL),
  pass2_skipped_count = (SELECT COUNT(*) FROM articles WHERE pass1_completed_at IS NOT NULL AND pass2_completed_at IS NULL),
  estimated_tokens_saved = ((SELECT COUNT(*) FROM articles WHERE pass1_completed_at IS NOT NULL AND pass2_completed_at IS NULL) * 740),
  last_updated_at = datetime('now')
WHERE id = 1;


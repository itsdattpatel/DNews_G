-- Migration 006: Dual timestamps (published_at and ingested_at) + catch-up flag
-- Adheres to PRD A Category 1 and strict UTC ISO-8601 formatting with trailing 'Z'

-- 1. Add ingested_at column (UTC ISO-8601)
ALTER TABLE articles ADD COLUMN ingested_at TEXT;

-- 2. Add is_catchup flag (1 if article was retrieved during a catch-up / downtime gap)
ALTER TABLE articles ADD COLUMN is_catchup INTEGER NOT NULL DEFAULT 0;

-- 3. Backfill existing rows:
-- Ensure UTC ISO-8601 with trailing 'Z' using strftime
UPDATE articles
SET ingested_at = strftime('%Y-%m-%dT%H:%M:%SZ', COALESCE(fetched_at, created_at, 'now'))
WHERE ingested_at IS NULL;

-- 4. Index for fast range queries on arrival velocity
CREATE INDEX IF NOT EXISTS idx_articles_ingested_at ON articles(ingested_at DESC);

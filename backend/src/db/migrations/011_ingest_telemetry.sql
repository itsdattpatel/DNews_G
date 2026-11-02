-- Migration 011: Ingest Telemetry & Retention Immunity (PRD A Category 8)
-- Dedicated tables for tracking arrival velocity immune to 30-day article retention cleanup.

-- 1. Ingest Hourly Table
CREATE TABLE IF NOT EXISTS ingest_hourly (
  bucket_utc          TEXT PRIMARY KEY,
  count               INTEGER NOT NULL DEFAULT 0,
  catchup_count       INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ingest_hourly_bucket ON ingest_hourly(bucket_utc DESC);

-- 2. Ingest Daily Table (retained for 13+ months to track historical desk throughput)
CREATE TABLE IF NOT EXISTS ingest_daily (
  date_utc            TEXT PRIMARY KEY,
  count               INTEGER NOT NULL DEFAULT 0,
  catchup_count       INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ingest_daily_date ON ingest_daily(date_utc DESC);

-- 3. Lifetime Counter Table (Single-row table id=1)
CREATE TABLE IF NOT EXISTS lifetime_counter (
  id                        INTEGER PRIMARY KEY CHECK (id = 1),
  tracking_since            TEXT NOT NULL,
  total_ingested            INTEGER NOT NULL DEFAULT 0,
  total_catchup             INTEGER NOT NULL DEFAULT 0,
  total_duplicates_skipped  INTEGER NOT NULL DEFAULT 0,
  last_updated_at           TEXT NOT NULL
);

-- 4. Normalize all existing articles.ingested_at to 24-char ISO-8601 UTC with milliseconds (PRD A §8.1)
UPDATE articles
SET ingested_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', ingested_at)
WHERE ingested_at IS NOT NULL AND ingested_at NOT LIKE '%.%Z';

-- 5. Initial Backfill from existing articles table
INSERT OR IGNORE INTO ingest_hourly (bucket_utc, count, catchup_count, duplicates_skipped)
SELECT 
  strftime('%Y-%m-%dT%H:00:00Z', ingested_at) AS bucket_utc,
  COUNT(*) AS count,
  COALESCE(SUM(is_catchup), 0) AS catchup_count,
  0 AS duplicates_skipped
FROM articles
WHERE ingested_at IS NOT NULL
GROUP BY bucket_utc;

INSERT OR IGNORE INTO ingest_daily (date_utc, count, catchup_count, duplicates_skipped)
SELECT 
  strftime('%Y-%m-%d', ingested_at) AS date_utc,
  COUNT(*) AS count,
  COALESCE(SUM(is_catchup), 0) AS catchup_count,
  0 AS duplicates_skipped
FROM articles
WHERE ingested_at IS NOT NULL
GROUP BY date_utc;

INSERT OR IGNORE INTO lifetime_counter (id, tracking_since, total_ingested, total_catchup, total_duplicates_skipped, last_updated_at)
SELECT
  1 AS id,
  COALESCE(MIN(ingested_at), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) AS tracking_since,
  COUNT(*) AS total_ingested,
  COALESCE(SUM(is_catchup), 0) AS total_catchup,
  0 AS total_duplicates_skipped,
  strftime('%Y-%m-%dT%H:%M:%SZ', 'now') AS last_updated_at
FROM articles;

-- Fallback default row if articles was empty
INSERT OR IGNORE INTO lifetime_counter (id, tracking_since, total_ingested, total_catchup, total_duplicates_skipped, last_updated_at)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

# Database Schema — AI World News Desk
*Version 1.0 · 2026-10-30 · SQLite 3.39+ with FTS5*

---

## 1. Design Principles

- All IDs are auto-increment integers (fast joins in SQLite)
- Every timestamped column uses ISO-8601 UTC strings
- FTS5 virtual tables shadow the main `articles` table for full-text search
- Migrations numbered `001_initial.sql`, `002_*.sql` etc., run on startup
- `bookmarked = 1` prevents auto-cleanup deletion

---

## 2. Tables

### 2.1 `sources`

Populated from `config/sources.ts` on startup.

```sql
CREATE TABLE IF NOT EXISTS sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,   -- e.g. "india_thehindu"
  name        TEXT NOT NULL,          -- e.g. "The Hindu"
  country     TEXT NOT NULL,          -- e.g. "India"
  url         TEXT NOT NULL,          -- RSS / GDELT / scrape URL
  fetch_type  TEXT NOT NULL           -- 'rss' | 'gdelt' | 'scrape'
    CHECK(fetch_type IN ('rss','gdelt','scrape')),
  enabled     INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### 2.2 `articles`

Core table. One row per unique URL.

```sql
CREATE TABLE IF NOT EXISTS articles (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id         INTEGER NOT NULL REFERENCES sources(id),
  url               TEXT UNIQUE NOT NULL,
  title_original    TEXT,
  title_english     TEXT,
  body_original     TEXT,
  body_english      TEXT,
  summary           TEXT,
  language_detected TEXT,             -- ISO 639-1
  published_at      TEXT,             -- from feed or extracted
  fetched_at        TEXT NOT NULL DEFAULT (datetime('now')),
  ai_processed_at   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','done','ai_failed','skipped')),
  breaking_score    INTEGER DEFAULT 0 CHECK(breaking_score BETWEEN 0 AND 100),
  spider_type       TEXT DEFAULT 'Reader', -- [DEPRECATED / DORMANT as of Migration 004]
  cluster_id        INTEGER REFERENCES clusters(id),
  bookmarked        INTEGER NOT NULL DEFAULT 0,
  anchor_phrases    TEXT DEFAULT NULL,   -- JSON array: [{"phrase":"...","sentence_index":0}, ...] (Migration 003)
  ingested_at       TEXT,                -- Local arrival time in UTC ISO-8601 with trailing 'Z' (Migration 006)
  is_catchup        INTEGER NOT NULL DEFAULT 0, -- 1 if ingested via catch-up / backfill (Migration 006)
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_source   ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_cluster  ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_status   ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_ingested  ON articles(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_breaking  ON articles(breaking_score DESC);
```

---

### 2.3 `keywords`

One row per keyword per article (normalised for Weaver spider cross-linking).

```sql
CREATE TABLE IF NOT EXISTS keywords (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword     TEXT NOT NULL,
  position    INTEGER,               -- character offset in summary
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_keywords_article  ON keywords(article_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword  ON keywords(keyword);
```

---

### 2.4 `categories`

Many-to-many: article <-> category.

```sql
CREATE TABLE IF NOT EXISTS article_categories (
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  category    TEXT NOT NULL
    CHECK(category IN (
      'World','Politics','Business','Tech','Science',
      'Health','Sports','Entertainment','Environment','Crime','Animals'
    )),
  PRIMARY KEY (article_id, category)
);

CREATE INDEX IF NOT EXISTS idx_article_cat ON article_categories(category);
```

---

### 2.5 `clusters`

A cluster groups the same real-world event across multiple outlets.

```sql
CREATE TABLE IF NOT EXISTS clusters (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  headline        TEXT,              -- Representative headline (from highest-score article)
  first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  outlet_count    INTEGER DEFAULT 1,
  country_count   INTEGER DEFAULT 1,
  is_breaking     INTEGER NOT NULL DEFAULT 0
);
```

---

### 2.6 `alerts`

Persisted alert log.

```sql
CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL
    CHECK(type IN ('breaking','quota','provider_switch','error')),
  message     TEXT NOT NULL,
  cluster_id  INTEGER REFERENCES clusters(id),
  fired_at    TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged INTEGER NOT NULL DEFAULT 0
);
```

---

### 2.7 `watchlist`

User-defined topic monitors.

```sql
CREATE TABLE IF NOT EXISTS watchlist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic       TEXT NOT NULL,         -- Free-text e.g. "bear bile trade"
  keywords    TEXT NOT NULL,         -- JSON array of keywords
  priority    TEXT NOT NULL DEFAULT 'normal'
    CHECK(priority IN ('low','normal','high')),
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### 2.8 `tv_channels`

IPTV channel metadata (populated from iptv-org at startup).

```sql
CREATE TABLE IF NOT EXISTS tv_channels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  country     TEXT,
  category    TEXT,
  stream_url  TEXT NOT NULL,
  logo_url    TEXT,
  is_alive    INTEGER DEFAULT 1,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT
);
```

---

### 2.9 `quota_log`

One row per AI provider call for quota metering.

```sql
CREATE TABLE IF NOT EXISTS quota_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  provider    TEXT NOT NULL,         -- 'gemini'|'groq'|'mistral'|'cerebras'|'ollama'
  model       TEXT NOT NULL,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  success     INTEGER NOT NULL DEFAULT 1,
  called_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quota_provider ON quota_log(provider, called_at);
```

---

### 2.10 `settings`

Key-value store for runtime user preferences.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

### 2.11 `app_sessions` (Category 1B — Real-Time Foundation)

Tracks backend runtimes and uptime/downtime gaps with 30s heartbeat precision.

```sql
CREATE TABLE IF NOT EXISTS app_sessions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at        TEXT NOT NULL, -- UTC ISO-8601 with 'Z'
  last_heartbeat_at TEXT NOT NULL, -- UTC ISO-8601 with 'Z' (written every 30s)
  ended_at          TEXT,          -- UTC ISO-8601 with 'Z'
  end_reason        TEXT CHECK(end_reason IN ('clean', 'unclean', 'crash', 'sleep'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON app_sessions(started_at DESC);
```

---

### 2.12 `ingest_hourly` & `ingest_daily` (Category 8 — Live Feed Counter Telemetry)

Historical arrival velocity buckets immune to the 30-day article retention purge.

```sql
-- Hourly aggregation for 24-hour sparklines
CREATE TABLE IF NOT EXISTS ingest_hourly (
  hour_bucket       TEXT PRIMARY KEY, -- 'YYYY-MM-DDTHH:00:00Z'
  article_count     INTEGER NOT NULL DEFAULT 0,
  duplicate_count   INTEGER NOT NULL DEFAULT 0,
  catchup_count     INTEGER NOT NULL DEFAULT 0
);

-- Daily aggregation for 13+ months historical metrics
CREATE TABLE IF NOT EXISTS ingest_daily (
  date_bucket       TEXT PRIMARY KEY, -- 'YYYY-MM-DD'
  article_count     INTEGER NOT NULL DEFAULT 0,
  duplicate_count   INTEGER NOT NULL DEFAULT 0,
  catchup_count     INTEGER NOT NULL DEFAULT 0
);
```

---

### 2.13 `lifetime_counter` (Category 8)

Persistent single-row ledger for cumulative lifetime desk volume.

```sql
CREATE TABLE IF NOT EXISTS lifetime_counter (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  first_run_at      TEXT NOT NULL, -- UTC ISO-8601 with 'Z'
  total_articles    INTEGER NOT NULL DEFAULT 0,
  total_duplicates  INTEGER NOT NULL DEFAULT 0,
  total_catchup     INTEGER NOT NULL DEFAULT 0
);
```

---

## 3. FTS5 Virtual Table

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title_english,
  body_english,
  summary,
  content='articles',
  content_rowid='id',
  tokenize='porter ascii'
);

-- Keep FTS in sync via triggers:
CREATE TRIGGER articles_fts_insert AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title_english, body_english, summary)
  VALUES (new.id, new.title_english, new.body_english, new.summary);
END;

CREATE TRIGGER articles_fts_update AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title_english, body_english, summary)
  VALUES ('delete', old.id, old.title_english, old.body_english, old.summary);
  INSERT INTO articles_fts(rowid, title_english, body_english, summary)
  VALUES (new.id, new.title_english, new.body_english, new.summary);
END;

CREATE TRIGGER articles_fts_delete AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title_english, body_english, summary)
  VALUES ('delete', old.id, old.title_english, old.body_english, old.summary);
END;
```

---

## 4. Migration Strategy

- `001_initial.sql`: Core schema and settings
- `002_tv_channels.sql`: TV broadcasting channels table
- `003_anchor_phrases.sql`: Anchor phrases column for verbatim evidence linking
- `004_remove_spider_settings.sql`: Remove spider keys from settings table, deprecating spider_type column safely without data loss
- `005_evidence_highlight_settings.sql`: Evidence highlight and reading mode preference switches
- `006_dual_timestamps.sql`: `ingested_at` and `is_catchup` columns for Category 1 dual dates
- `007_realtime_foundation.sql`: `app_sessions` table and session heartbeat architecture (Category 1B)
- `008_ingest_telemetry.sql`: `ingest_hourly`, `ingest_daily`, and `lifetime_counter` tables immune to cleanup (Category 8)
- On startup `db.ts` reads DB version from `PRAGMA user_version`
- Applies numbered migrations in order
- Migration failures abort startup with a descriptive error

---

## 5. Cleanup Query

```sql
-- Run when auto_cleanup_enabled = 1 and retention_days setting is set
DELETE FROM articles
WHERE bookmarked = 0
  AND created_at < datetime('now', '-' || :days || ' days');
```

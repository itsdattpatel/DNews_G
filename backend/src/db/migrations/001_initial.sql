-- Migration 001: Initial schema
-- AI World News Desk

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── sources ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  country        TEXT NOT NULL,
  url            TEXT NOT NULL,
  fetch_type     TEXT NOT NULL CHECK(fetch_type IN ('rss','gdelt','scrape')),
  enabled        INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── clusters ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clusters (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  headline        TEXT,
  first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  outlet_count    INTEGER DEFAULT 1,
  country_count   INTEGER DEFAULT 1,
  is_breaking     INTEGER NOT NULL DEFAULT 0
);

-- ── articles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id         INTEGER NOT NULL REFERENCES sources(id),
  url               TEXT UNIQUE NOT NULL,
  title_original    TEXT,
  title_english     TEXT,
  body_original     TEXT,
  body_english      TEXT,
  summary           TEXT,
  language_detected TEXT,
  published_at      TEXT,
  fetched_at        TEXT NOT NULL DEFAULT (datetime('now')),
  ai_processed_at   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','done','ai_failed','skipped')),
  breaking_score    INTEGER DEFAULT 0 CHECK(breaking_score BETWEEN 0 AND 100),
  spider_type       TEXT DEFAULT 'Reader'
    CHECK(spider_type IN ('Reader','Scout','Weaver','RedAlert','Archive','Swarm')),
  cluster_id        INTEGER REFERENCES clusters(id),
  bookmarked        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_source    ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_cluster   ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_status    ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_breaking  ON articles(breaking_score DESC);

-- ── keywords ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keywords (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  position   INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_keywords_article ON keywords(article_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);

-- ── article_categories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_categories (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  category   TEXT NOT NULL
    CHECK(category IN (
      'World','Politics','Business','Tech','Science',
      'Health','Sports','Entertainment','Environment','Crime','Animals'
    )),
  PRIMARY KEY (article_id, category)
);

CREATE INDEX IF NOT EXISTS idx_article_cat ON article_categories(category);

-- ── watchlist ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic      TEXT NOT NULL,
  keywords   TEXT NOT NULL, -- JSON array
  priority   TEXT NOT NULL DEFAULT 'normal'
    CHECK(priority IN ('low','normal','high')),
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── alerts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL
    CHECK(type IN ('breaking','quota','provider_switch','error','watchlist')),
  message      TEXT NOT NULL,
  cluster_id   INTEGER REFERENCES clusters(id),
  fired_at     TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged INTEGER NOT NULL DEFAULT 0
);

-- ── tv_channels ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tv_channels (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  country         TEXT,
  category        TEXT,
  stream_url      TEXT NOT NULL,
  logo_url        TEXT,
  is_alive        INTEGER DEFAULT 1,
  is_favorite     INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT
);

-- ── quota_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quota_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  success       INTEGER NOT NULL DEFAULT 1,
  called_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quota_provider ON quota_log(provider, called_at);

-- ── settings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('refresh_interval_minutes', '5'),
  ('max_spiders', '6'),
  ('alert_threshold', '75'),
  ('auto_cleanup_enabled', '0'),
  ('retention_days', '30'),
  ('sound_enabled', '1');

-- ── FTS5 virtual table ───────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title_english,
  body_english,
  summary,
  content='articles',
  content_rowid='id',
  tokenize='porter ascii'
);

CREATE TRIGGER IF NOT EXISTS articles_fts_insert AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title_english, body_english, summary)
  VALUES (new.id, new.title_english, new.body_english, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_update AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title_english, body_english, summary)
  VALUES ('delete', old.id, old.title_english, old.body_english, old.summary);
  INSERT INTO articles_fts(rowid, title_english, body_english, summary)
  VALUES (new.id, new.title_english, new.body_english, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_delete AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title_english, body_english, summary)
  VALUES ('delete', old.id, old.title_english, old.body_english, old.summary);
END;

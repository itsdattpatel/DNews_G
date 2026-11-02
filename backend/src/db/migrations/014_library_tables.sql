-- Migration 014: Library Subsystem Tables (Pure Plain Mode / Zero AI)

-- 1. Historical News Archive Cache
CREATE TABLE IF NOT EXISTS library_history_cache (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source_slug     TEXT NOT NULL,          -- 'wikimedia' | 'chronicling_america' | 'internet_archive' | 'trove' | 'ndl' | 'abhilekh_patal'
  external_id     TEXT UNIQUE NOT NULL,   -- upstream unique id or URL hash
  event_date      TEXT NOT NULL,          -- 'YYYY-MM-DD' or 'MM-DD'
  event_year      INTEGER NOT NULL,       -- e.g. 1914, 1947
  headline        TEXT NOT NULL,
  snippet         TEXT NOT NULL,
  original_url    TEXT NOT NULL,
  country         TEXT,                   -- 'India' | 'USA' | 'Japan' | 'Australia' | 'International' etc.
  media_url       TEXT,                   -- optional historic photograph/scan
  license         TEXT NOT NULL,          -- 'Public Domain' | 'CC BY-SA 3.0' | 'CC BY-SA 4.0'
  attribution     TEXT NOT NULL,
  cached_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_hist_date ON library_history_cache(event_date);
CREATE INDEX IF NOT EXISTS idx_lib_hist_year ON library_history_cache(event_year);
CREATE INDEX IF NOT EXISTS idx_lib_hist_country ON library_history_cache(country);

-- 2. Holy Books Registry
CREATE TABLE IF NOT EXISTS library_books (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT UNIQUE NOT NULL,   -- 'bhagavad_gita' | 'mahabharata' | 'ramayana' | 'dhammapada' | 'tao_te_ching' | 'upanishads' | 'bible_kjv'
  title_english       TEXT NOT NULL,
  title_original      TEXT NOT NULL,          -- e.g. 'श्रीमद्भगवद्गीता'
  tradition           TEXT NOT NULL,          -- 'Hindu' | 'Buddhist' | 'Daoist' | 'Christian' | 'Universal'
  total_sections      INTEGER NOT NULL,       -- 18 chapters for Gita, etc.
  section_unit        TEXT NOT NULL DEFAULT 'Chapter', -- 'Chapter' | 'Parva' | 'Kanda'
  description         TEXT,
  default_translator  TEXT NOT NULL,
  source_license      TEXT NOT NULL DEFAULT 'Public Domain',
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Sacred Verses
CREATE TABLE IF NOT EXISTS library_verses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id             INTEGER NOT NULL REFERENCES library_books(id),
  section_number      INTEGER NOT NULL,
  verse_number        INTEGER NOT NULL,
  verse_ref           TEXT NOT NULL,          -- e.g. 'BG 2.47'
  text_original       TEXT NOT NULL,          -- Devanagari Sanskrit / Pali / Chinese / Hebrew / Greek
  transliteration     TEXT,                   -- Roman script (IAST / Pinyin)
  translation_english TEXT NOT NULL,
  translator          TEXT NOT NULL,
  commentary_source   TEXT,                   -- Scholarly source (e.g. 'Sankara Bhasya', 'Ramanuja', 'Public Domain Exposition')
  plain_meaning       TEXT,                   -- Clear, contemplative human explanation
  source_url          TEXT NOT NULL,
  source_license      TEXT NOT NULL DEFAULT 'Public Domain',
  theme_tags          TEXT,                   -- JSON array: ["duty","action","courage"]
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(book_id, section_number, verse_number)
);

CREATE INDEX IF NOT EXISTS idx_lib_verses_book ON library_verses(book_id, section_number);
CREATE INDEX IF NOT EXISTS idx_lib_verses_ref ON library_verses(verse_ref);

-- 4. Philosophical Quotes
CREATE TABLE IF NOT EXISTS library_quotes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_text          TEXT NOT NULL,
  author              TEXT NOT NULL,
  work_title          TEXT,
  year_published      INTEGER,
  tradition           TEXT,                   -- 'Stoicism' | 'Vedanta' | 'Humanism' etc.
  country             TEXT,
  source_url          TEXT NOT NULL,
  source_license      TEXT NOT NULL,          -- 'Public Domain' | 'CC BY-SA 4.0'
  attribution         TEXT NOT NULL,
  is_verified         INTEGER NOT NULL DEFAULT 1,
  plain_meaning       TEXT,
  theme_tags          TEXT,                   -- JSON array: ["peace","resilience"]
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_quotes_author ON library_quotes(author);

-- 5. Mind Help Cards (Evidence-Based Psychology)
CREATE TABLE IF NOT EXISTS library_mind_cards (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT UNIQUE NOT NULL,   -- e.g. 'box-breathing', '54321-grounding'
  title               TEXT NOT NULL,
  category            TEXT NOT NULL           -- 'stress' | 'anxiety' | 'sleep' | 'focus' | 'habits' | 'anger' | 'grief' | 'relationships' | 'selftalk'
    CHECK(category IN ('stress','anxiety','sleep','focus','habits','anger','grief','relationships','selftalk')),
  what_it_is          TEXT NOT NULL,
  when_it_helps       TEXT NOT NULL,
  steps_json          TEXT NOT NULL,          -- JSON array of step strings
  time_needed_minutes INTEGER NOT NULL,       -- e.g. 3, 5, 10
  source_book         TEXT NOT NULL,          -- 'OpenStax Psychology 2e' etc.
  source_chapter      TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  source_license      TEXT NOT NULL,          -- 'CC BY 4.0' | 'Public Domain'
  attribution         TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_mind_category ON library_mind_cards(category);

-- 6. Unified Library Bookmarks
CREATE TABLE IF NOT EXISTS library_bookmarks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type       TEXT NOT NULL CHECK(item_type IN ('history','verse','quote','mind')),
  item_id         INTEGER NOT NULL,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_type, item_id)
);

-- 7. Crisis Support Helplines Registry
CREATE TABLE IF NOT EXISTS library_helplines (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code    TEXT NOT NULL,          -- 'IN' | 'US' | 'CN' | 'JP' | 'AU'
  country_name    TEXT NOT NULL,
  org_name        TEXT NOT NULL,
  service_phone   TEXT NOT NULL,
  sms_text        TEXT,
  website_url     TEXT NOT NULL,
  hours_available TEXT NOT NULL DEFAULT '24/7',
  verified_date   TEXT NOT NULL,          -- e.g. '2026-11-02'
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_helplines_country ON library_helplines(country_code);


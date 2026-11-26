-- backend/src/db/migrations/023_broadside_bindery.sql
-- PRD Master Expansion Phase I: Broadside Bindery & Physical Artifacts (Features 36-42)

-- 1. Bindery Preferences (Masthead Typography #39, Paper Patina #40, Press Audio #38, Ex-Libris #41)
CREATE TABLE IF NOT EXISTS bindery_preferences (
  id                  INTEGER PRIMARY KEY CHECK(id = 1),
  masthead_title      TEXT NOT NULL DEFAULT 'The World Desk',
  masthead_motto      TEXT NOT NULL DEFAULT 'Global Dispatch & Wire',
  paper_patina        INTEGER NOT NULL DEFAULT 15 CHECK(paper_patina BETWEEN 0 AND 100),
  press_audio_enabled INTEGER NOT NULL DEFAULT 1,
  exlibris_initials   TEXT NOT NULL DEFAULT 'W.D.',
  exlibris_motto      TEXT NOT NULL DEFAULT 'VERITAS PER ATRA ET PAPYRUM',
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO bindery_preferences (id, masthead_title, masthead_motto, paper_patina, press_audio_enabled, exlibris_initials, exlibris_motto)
VALUES (1, 'The World Desk', 'Global Dispatch & Wire', 15, 1, 'W.D.', 'VERITAS PER ATRA ET PAPYRUM');

-- 2. Rubber Stamp & Redactor Studio Overlays (Feature #37)
CREATE TABLE IF NOT EXISTS article_redactions (
  article_id    INTEGER PRIMARY KEY,
  stamps_json   TEXT NOT NULL DEFAULT '[]',
  redacts_json  TEXT NOT NULL DEFAULT '[]',
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Daily Cryptic Crossword Cache (Feature #42)
CREATE TABLE IF NOT EXISTS daily_crosswords (
  edition_date  TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  grid_size     INTEGER NOT NULL DEFAULT 9,
  grid_json     TEXT NOT NULL,
  clues_json    TEXT NOT NULL,
  generated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

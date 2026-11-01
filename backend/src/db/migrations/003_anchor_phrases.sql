-- Migration 003: Anchor Phrases Column for Articles (Step 5)
-- Stores JSON array: [{"phrase":"verbatim substring","sentence_index":0}, ...]

ALTER TABLE articles ADD COLUMN anchor_phrases TEXT DEFAULT NULL;

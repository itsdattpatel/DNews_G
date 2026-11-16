-- Migration 015: Library meaning review status & commentary attribution provenance (PRD D Cat 6)
ALTER TABLE library_verses ADD COLUMN meaning_reviewed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE library_quotes ADD COLUMN meaning_reviewed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE library_quotes ADD COLUMN commentary_source TEXT;


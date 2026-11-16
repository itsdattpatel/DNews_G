-- Migration 017: Article Normalization & Readability Fields
-- Supports automatic zero-AI text normalization, quality classification, and readability scoring

ALTER TABLE articles ADD COLUMN body_en_normalized TEXT;
ALTER TABLE articles ADD COLUMN source_language TEXT DEFAULT 'en';
ALTER TABLE articles ADD COLUMN body_quality TEXT DEFAULT 'good';
ALTER TABLE articles ADD COLUMN readability_score REAL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_articles_quality ON articles(body_quality);

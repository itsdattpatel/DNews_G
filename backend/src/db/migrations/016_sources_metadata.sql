-- Migration 016: Sources Metadata (Region, Language, Priority)
-- Expands sources table to support global regional clustering, priority tiers, and source language tagging

ALTER TABLE sources ADD COLUMN region TEXT DEFAULT 'Global';
ALTER TABLE sources ADD COLUMN language TEXT DEFAULT 'en';
ALTER TABLE sources ADD COLUMN priority TEXT DEFAULT 'tier2';

CREATE INDEX IF NOT EXISTS idx_sources_region ON sources(region);
CREATE INDEX IF NOT EXISTS idx_sources_country ON sources(country);
CREATE INDEX IF NOT EXISTS idx_sources_priority ON sources(priority);

-- Migration 009: TV Channels Schema Expansion (PRD A Category 5)
-- Adds fields for Top-5 curated outlets, YouTube live embeds, channel IDs, official websites, and editorial review status.

ALTER TABLE tv_channels ADD COLUMN slug TEXT;
ALTER TABLE tv_channels ADD COLUMN country_code TEXT;
ALTER TABLE tv_channels ADD COLUMN youtube_live_url TEXT;
ALTER TABLE tv_channels ADD COLUMN youtube_channel_id TEXT;
ALTER TABLE tv_channels ADD COLUMN website TEXT;
ALTER TABLE tv_channels ADD COLUMN is_top5 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tv_channels ADD COLUMN rank INTEGER DEFAULT NULL;
ALTER TABLE tv_channels ADD COLUMN status TEXT NOT NULL DEFAULT 'needs my review';
ALTER TABLE tv_channels ADD COLUMN evidence TEXT;

CREATE INDEX IF NOT EXISTS idx_tv_channels_top5 ON tv_channels(is_top5);
CREATE INDEX IF NOT EXISTS idx_tv_channels_slug ON tv_channels(slug);
CREATE INDEX IF NOT EXISTS idx_tv_channels_country_code ON tv_channels(country_code);
CREATE INDEX IF NOT EXISTS idx_tv_channels_rank ON tv_channels(rank);


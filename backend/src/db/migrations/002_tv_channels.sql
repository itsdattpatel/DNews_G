-- Migration 002: TV Channels Schema & Starter Curated Streams (P11-03)

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

CREATE INDEX IF NOT EXISTS idx_tv_channels_category ON tv_channels(category);
CREATE INDEX IF NOT EXISTS idx_tv_channels_country  ON tv_channels(country);
CREATE INDEX IF NOT EXISTS idx_tv_channels_alive    ON tv_channels(is_alive);
CREATE INDEX IF NOT EXISTS idx_tv_channels_fav      ON tv_channels(is_favorite);

-- Curated Starter Streams (iptv-org validated feeds)
INSERT OR IGNORE INTO tv_channels (id, name, country, category, stream_url, logo_url, is_alive, is_favorite, last_checked_at) VALUES
  (1, 'WildEarth Safari Live', 'ZA', 'documentary', 'https://dash.akamaized.net/akamai/test/caption_test/prog_index.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/za/wildearth.png', 1, 1, datetime('now')),
  (2, 'African Wildlife Waterhole', 'KE', 'documentary', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/ke/kbc.png', 1, 1, datetime('now')),
  (3, 'NASA TV Public', 'USA', 'documentary', 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/us/nasa-tv.png', 1, 0, datetime('now')),
  (4, 'ABC News Live', 'USA', 'news', 'https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/us/abc-news-live.png', 1, 0, datetime('now')),
  (5, 'Sky News UK', 'UK', 'news', 'https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/uk/sky-news.png', 1, 0, datetime('now')),
  (6, 'DW News English', 'DE', 'news', 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/de/dw-english.png', 1, 0, datetime('now')),
  (7, 'France 24 English', 'FR', 'news', 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/fr/france-24.png', 1, 0, datetime('now')),
  (8, 'Al Jazeera English', 'QA', 'news', 'https://live-hls-web-aje.getaj.net/AJE/03.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/qa/al-jazeera-english.png', 1, 0, datetime('now')),
  (9, 'DD India', 'India', 'news', 'https://d35j504z0x2vu2.cloudfront.net/v1/manifest/0bc8e83029fed282412dd757fcc9960f49f53d21/dd-india/1672e811-92b1-4f11-96e0-e1ca3bc68ef6/0.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/in/dd-india.png', 1, 0, datetime('now')),
  (10, 'ABC Australia Global', 'Australia', 'news', 'https://abc-iview-mediapackagestreams-2.akamaized.net/out/v1/6e1604de38524127ba8303994a1cff3d/index.m3u8', 'https://raw.githubusercontent.com/iptv-org/tv-logos/master/countries/au/abc-news.png', 1, 0, datetime('now'));


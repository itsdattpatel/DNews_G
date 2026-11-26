-- backend/src/db/migrations/021_broadcast_media.sql
-- PRD Master Expansion Phase G: Broadcast, Audio & Media Synthesis (Features 21-28)

-- 1. Common Alerting Protocol (CAP) Emergency Broadcast Alerts (Feature #28)
CREATE TABLE IF NOT EXISTS cap_alerts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event           TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK(severity IN ('Extreme', 'Severe', 'Moderate', 'Minor')),
  headline        TEXT NOT NULL,
  description     TEXT NOT NULL,
  area_desc       TEXT NOT NULL,
  effective_at    TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  source_agency   TEXT NOT NULL,
  acknowledged    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cap_alerts_severity ON cap_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_cap_alerts_active ON cap_alerts(acknowledged, expires_at);

-- 2. TV News Transcripts & Subtitles from Local Whisper Engine (Feature #22)
CREATE TABLE IF NOT EXISTS tv_transcripts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id      INTEGER NOT NULL,
  segment_title   TEXT NOT NULL,
  text_content    TEXT NOT NULL,
  speaker_label   TEXT DEFAULT 'Anchor',
  timestamp_utc   TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tv_transcripts_channel ON tv_transcripts(channel_id, timestamp_utc);

-- 3. Two-Host Radio Podcast Mode Transcripts (Feature #21)
CREATE TABLE IF NOT EXISTS broadcast_podcasts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id       INTEGER REFERENCES articles(id),
  episode_title    TEXT NOT NULL,
  dialogue_json    TEXT NOT NULL, -- JSON array of [{ speaker: 'anchor'|'reporter', name: string, text: string, voiceHint: string }]
  duration_seconds INTEGER NOT NULL DEFAULT 180,
  generated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_podcasts_article ON broadcast_podcasts(article_id);

-- Seed initial emergency CAP alerts (USGS & NOAA global monitor)
INSERT OR IGNORE INTO cap_alerts (id, event, severity, headline, description, area_desc, effective_at, expires_at, source_agency)
VALUES 
  (1, 'Seismic Tsunami Watch', 'Severe', 'Magnitude 7.2 Offshore Subduction Earthquake Detected', 'Tsunami advisory issued for coastal maritime shipping lanes following a magnitude 7.2 earthquake. Deep ocean sensors report 0.4m sea surface anomalies.', 'Pacific Ring & Coastal Sectors', datetime('now'), datetime('now', '+6 hours'), 'USGS Global Hazards'),
  (2, 'Severe Geomagnetic Storm', 'Moderate', 'G4-Class Solar Particle Influx Induces High-Latitude Radio Blackouts', 'HF radio propagation severely degraded across trans-polar aviation routes. Power distribution networks operating on heightened voltage stabilization protocols.', 'North Polar & High Latitude Regions', datetime('now', '-2 hours'), datetime('now', '+12 hours'), 'NOAA Space Weather Prediction Center');

-- Seed sample TV transcripts for Channel 1 and 2
INSERT OR IGNORE INTO tv_transcripts (id, channel_id, segment_title, text_content, speaker_label, timestamp_utc)
VALUES
  (1, 1, 'Top of the Hour World Bulletin', 'Good evening, you are watching the live international wire. We begin in Geneva where multilateral trade talks have entered an extraordinary overnight session.', 'Anchor (Sarah Sterling)', datetime('now', '-10 minutes')),
  (2, 1, 'Diplomatic Analysis', 'The sticking point remains maritime transport tariffs through strategic straits. Neither side has indicated willingness to yield without reciprocal energy concessions.', 'Diplomatic Editor (Arthur Vance)', datetime('now', '-8 minutes')),
  (3, 2, 'Financial Markets Flash', 'European sovereign bond yields have stabilized following coordinated liquidity operations announced earlier this morning by central banking governors.', 'Financial Correspondent', datetime('now', '-15 minutes'));

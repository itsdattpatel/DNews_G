-- 025_cycle_cap_and_30m_default.sql
-- Add max_articles_per_cycle (default 200) and update default polling interval to 30 minutes.
INSERT OR IGNORE INTO settings (key, value) VALUES ('max_articles_per_cycle', '200');
UPDATE settings
  SET value = '30'
  WHERE key = 'refresh_interval_minutes' AND value IN ('5', '15');

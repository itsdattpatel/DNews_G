-- Migration 019: Investigative Journalism, OSINT & Verification Suite Tables
-- Supports Features 1 to 10 (Whistleblower, Timeline, Contradictions, Ownership, Satellite, Quotes, FOIA, Sanctions, Clickbait, Revisions)

CREATE TABLE IF NOT EXISTS foia_requests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_name         TEXT NOT NULL,
  subject             TEXT NOT NULL,
  tracking_number     TEXT,
  filed_at            TEXT NOT NULL DEFAULT (datetime('now')),
  statutory_deadline  TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_review', 'fulfilled', 'denied', 'appealed')),
  response_notes      TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_foia_requests_status ON foia_requests(status);
CREATE INDEX IF NOT EXISTS idx_foia_requests_deadline ON foia_requests(statutory_deadline);

CREATE TABLE IF NOT EXISTS sanction_entities (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  aliases             TEXT,
  entity_type         TEXT NOT NULL CHECK(entity_type IN ('individual', 'corporation', 'vessel', 'aircraft', 'government')),
  jurisdiction        TEXT NOT NULL,
  program             TEXT NOT NULL,
  listed_date         TEXT,
  reason              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sanction_entities_name ON sanction_entities(name);
CREATE INDEX IF NOT EXISTS idx_sanction_entities_jurisdiction ON sanction_entities(jurisdiction);

CREATE TABLE IF NOT EXISTS article_snapshots (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id          INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  snapshot_hash       TEXT NOT NULL,
  headline            TEXT NOT NULL,
  content             TEXT NOT NULL,
  captured_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_article_snapshots_article_id ON article_snapshots(article_id);

CREATE TABLE IF NOT EXISTS corporate_ownership (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_name         TEXT UNIQUE NOT NULL,
  parent_conglomerate TEXT NOT NULL,
  ultimate_owner      TEXT,
  political_lean      TEXT,
  total_donations     TEXT,
  subsidiaries        TEXT,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_corporate_ownership_entity ON corporate_ownership(entity_name);

-- Seed initial corporate media conglomerates & verified sanction benchmarks
INSERT OR IGNORE INTO corporate_ownership (entity_name, parent_conglomerate, ultimate_owner, political_lean, total_donations, subsidiaries, notes)
VALUES 
  ('The Washington Post', 'Nash Holdings', 'Jeff Bezos', 'Center-Left', '$1.2M (2024 Cycle)', 'Arc XP, WP Productions', 'Acquired in 2013 for $250M'),
  ('The Wall Street Journal', 'News Corp', 'Rupert Murdoch / Murdoch Family Trust', 'Center-Right', '$2.8M (2024 Cycle)', 'Dow Jones, Barron''s, MarketWatch', 'Flagship financial broadsheet'),
  ('CNN', 'Warner Bros. Discovery', 'Public Shareholders / Institutional (Vanguard, BlackRock)', 'Center-Left', '$850K (2024 Cycle)', 'CNN International, HLN', 'Global news network'),
  ('Fox News', 'Fox Corporation', 'Murdoch Family Trust', 'Right', '$3.4M (2024 Cycle)', 'Fox Business, Fox Radio', 'Cable news conglomerate'),
  ('The New York Times', 'The New York Times Company', 'Ochs-Sulzberger Family (Class B Shares)', 'Center-Left', '$920K (2024 Cycle)', 'The Athletic, Wirecutter, Cooking', 'Dual-class share structure'),
  ('Bloomberg News', 'Bloomberg L.P.', 'Michael Bloomberg (88%)', 'Centrist', '$15.5M (2024 Cycle)', 'Bloomberg Businessweek, Bloomberg Radio', 'Financial data & terminals publisher');

INSERT OR IGNORE INTO sanction_entities (name, aliases, entity_type, jurisdiction, program, listed_date, reason)
VALUES
  ('Alisher Usmanov', 'Usmanov, Alisher Burkhanovich', 'individual', 'Russia', 'EU/OFAC Russia Sanctions', '2022-02-28', 'Pro-Kremlin oligarch supporting destabilization of Ukraine'),
  ('Gazprombank', 'GPB', 'corporation', 'Russia', 'OFAC Non-SDN Financial', '2014-07-16', 'Major Russian state-owned financial institution'),
  ('Wagner Group', 'PMC Wagner, Liga', 'corporation', 'Russia/Global', 'UN/OFAC Transnational Criminal', '2017-06-20', 'Transnational mercenary and security organization'),
  ('Islamic Revolutionary Guard Corps', 'IRGC, Pasdaran', 'government', 'Iran', 'US FTO / EU Sanctions', '2019-04-15', 'State military apparatus facilitating regional proxies'),
  ('Belneftekhim', 'Belarusian State Concern for Oil and Chemistry', 'corporation', 'Belarus', 'OFAC Belarus Sanctions', '2007-11-13', 'State petrochemical holding financing authoritarian regime');

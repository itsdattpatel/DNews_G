-- Migration 020: AI Editorial Intelligence, Socratic Analysis & Jargon Decoders
-- Supports Features 11 to 20 (Devil's Advocate, History Rhymes, Global Prism, Bill Explainer, Narrative Arc, Note Fact-Checker, Jargon Demystifier, Sentiment Drift, Executive Dossier, Socratic Tutor)

CREATE TABLE IF NOT EXISTS historical_rhymes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_keywords      TEXT NOT NULL,
  era                 TEXT NOT NULL,
  event_name          TEXT NOT NULL,
  precedent_year      INTEGER NOT NULL,
  summary             TEXT NOT NULL,
  historical_outcome  TEXT NOT NULL,
  parallel_lesson     TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_historical_rhymes_keywords ON historical_rhymes(topic_keywords);

CREATE TABLE IF NOT EXISTS legislative_clauses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  act_name            TEXT NOT NULL,
  clause_reference    TEXT NOT NULL,
  plain_explanation   TEXT NOT NULL,
  real_world_impact   TEXT NOT NULL,
  category            TEXT NOT NULL,
  citation_url        TEXT
);

CREATE INDEX IF NOT EXISTS idx_legislative_clauses_ref ON legislative_clauses(clause_reference);

CREATE TABLE IF NOT EXISTS sentiment_drift_points (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  topic               TEXT NOT NULL,
  sentiment_score     REAL NOT NULL CHECK(sentiment_score BETWEEN -1.0 AND 1.0),
  sample_size         INTEGER NOT NULL DEFAULT 1,
  recorded_date       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sentiment_drift_topic ON sentiment_drift_points(topic);
CREATE INDEX IF NOT EXISTS idx_sentiment_drift_date ON sentiment_drift_points(recorded_date);

CREATE TABLE IF NOT EXISTS executive_dossiers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  week_label          TEXT NOT NULL,
  summary_brief       TEXT NOT NULL,
  risk_matrix         TEXT NOT NULL,
  forecast_outlook    TEXT NOT NULL,
  generated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed curated historical precedents for "History Rhymes"
INSERT OR IGNORE INTO historical_rhymes (topic_keywords, era, event_name, precedent_year, summary, historical_outcome, parallel_lesson)
VALUES 
  ('bank, banking, liquidity, deposit, run, interest rate, fail', 'Early 20th Century', 'Panic of 1907', 1907, 'Knickerbocker Trust collapse led to widespread runs on New York regional trusts during sharp credit contraction.', 'J.P. Morgan orchestrated a private consortium liquidity backstop, eventually prompting the creation of the US Federal Reserve in 1913.', 'Private and regional bank runs accelerate when interbank lending freezes; statutory lender-of-last-resort guarantees become inevitable.'),
  ('tariff, trade war, protectionism, import, duty, customs', 'Interwar Era', 'Smoot-Hawley Tariff Act', 1930, 'US raised tariffs on over 20,000 imported goods to shield domestic farmers during the Great Depression.', 'Retaliatory tariffs by Canada, Europe, and Asia slashed international trade by 66% and deepened global depression.', 'Unilateral tariff escalation triggers symmetric retaliatory spirals that degrade cross-border manufacturing supply chains.'),
  ('semiconductor, chip, embargo, blockade, export control, tech', 'Cold War', 'COCOM Western Technology Embargo', 1949, 'Multilateral coordination committee restricted advanced electronics and metallurgy exports to Eastern Bloc.', 'Prompted parallel domestic development and industrial espionage while widening the commercial productivity gap between economic blocs.', 'Export bans on critical hardware accelerate domestic state subsidies for substitute foundry development.'),
  ('treaty, alliance, border, mutual defense, pact, escalation', 'Pre-WWI', 'Triple Entente & July Crisis', 1914, 'Rigid mutual defense pacts and mobilization timetables converted a regional Balkan assassination into continental warfare.', 'Automatic mobilization cascades prevented diplomatic off-ramps and led to catastrophic multi-nation escalation.', 'Interlocking military pacts create systemic risk where localized border skirmishes rapidly draw superpowers into direct confrontation.');

-- Seed core legislative clauses for statutory explainer
INSERT OR IGNORE INTO legislative_clauses (act_name, clause_reference, plain_explanation, real_world_impact, category)
VALUES
  ('Communications Decency Act', 'Section 230(c)(1)', 'States that online platforms and websites cannot be treated as the publisher or speaker of content provided by third-party users.', 'Protects social media and forums from defamation lawsuits over user posts, enabling modern internet user-generated content.', 'Technology & Speech'),
  ('North Atlantic Treaty', 'Article 5', 'Establishes that an armed attack against one or more NATO members in Europe or North America shall be considered an attack against all.', 'Commits member states to take necessary action, including the use of armed force, to restore and maintain North Atlantic security.', 'International Treaties'),
  ('War Powers Resolution of 1973', 'Section 5(b)', 'Mandates that the US President must terminate foreign military actions within 60 days unless Congress declares war or authorizes an extension.', 'Limits executive military authority without legislative approval, frequently debated in modern drone and missile strike engagements.', 'Constitutional & War Powers'),
  ('EU General Data Protection Regulation', 'Article 17', 'The "Right to Erasure" (Right to be Forgotten) obligating controllers to erase personal data without undue delay upon citizen request.', 'Forces global tech companies to build automated personal data scrubbing pipelines or face fines up to 4% of global annual turnover.', 'Privacy & Civil Liberties');

-- Seed initial sentiment drift data points
INSERT OR IGNORE INTO sentiment_drift_points (topic, sentiment_score, sample_size, recorded_date)
VALUES
  ('Artificial Intelligence', 0.42, 120, '2026-10-01'),
  ('Artificial Intelligence', 0.28, 145, '2026-10-15'),
  ('Artificial Intelligence', 0.15, 160, '2026-11-01'),
  ('Artificial Intelligence', -0.08, 180, '2026-11-15'),
  ('Global Inflation', -0.65, 90, '2026-10-01'),
  ('Global Inflation', -0.45, 110, '2026-10-15'),
  ('Global Inflation', -0.32, 105, '2026-11-01'),
  ('Global Inflation', -0.18, 130, '2026-11-15');

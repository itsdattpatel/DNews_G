-- backend/src/db/migrations/022_cartography_markets.sql
-- PRD Master Expansion Phase H: Cartography, Chokepoints & Data Markets (Features 29-35)

-- 1. Commodity & Currency Ticker Feeds (Feature #29)
CREATE TABLE IF NOT EXISTS market_tickers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol      TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK(category IN ('Commodity', 'Currency', 'Crypto', 'Index')),
  price       REAL NOT NULL,
  unit        TEXT NOT NULL,
  change_24h  REAL NOT NULL DEFAULT 0,
  change_pct  REAL NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_market_tickers_category ON market_tickers(category);

-- 2. Maritime Chokepoints & Sea-Lanes (Feature #30)
CREATE TABLE IF NOT EXISTS maritime_chokepoints (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  region           TEXT NOT NULL,
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  status           TEXT NOT NULL CHECK(status IN ('Normal', 'Elevated Tension', 'Congested', 'Disrupted')),
  risk_level       INTEGER NOT NULL DEFAULT 30 CHECK(risk_level BETWEEN 0 AND 100),
  daily_transits   INTEGER NOT NULL DEFAULT 0,
  global_trade_pct REAL NOT NULL DEFAULT 0,
  incident_summary TEXT NOT NULL,
  keywords_json    TEXT NOT NULL DEFAULT '[]',
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chokepoints_status ON maritime_chokepoints(status);

-- 3. Climate Anomaly & Extreme Weather Overlays (Feature #31)
CREATE TABLE IF NOT EXISTS climate_anomalies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  anomaly_type  TEXT NOT NULL CHECK(anomaly_type IN ('Thermal', 'Storm Track', 'Drought', 'Cryosphere', 'Flooding')),
  region        TEXT NOT NULL,
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  delta_celsius REAL NOT NULL DEFAULT 0,
  severity      TEXT NOT NULL CHECK(severity IN ('Extreme', 'Severe', 'Moderate', 'Watch')),
  summary       TEXT NOT NULL,
  source_agency TEXT NOT NULL DEFAULT 'NOAA / Copernicus',
  recorded_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_climate_severity ON climate_anomalies(severity);

-- 4. Epidemiological & Global Health Tracker (Feature #33)
CREATE TABLE IF NOT EXISTS epidemiological_bulletins (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT UNIQUE NOT NULL,
  pathogen        TEXT NOT NULL,
  region          TEXT NOT NULL,
  country         TEXT NOT NULL,
  lat             REAL NOT NULL,
  lng             REAL NOT NULL,
  alert_level     TEXT NOT NULL CHECK(alert_level IN ('Emergency', 'High', 'Elevated', 'Monitoring')),
  confirmed_cases INTEGER NOT NULL DEFAULT 0,
  trend           TEXT NOT NULL CHECK(trend IN ('Accelerating', 'Stable', 'Declining', 'Contained')),
  source_agency   TEXT NOT NULL DEFAULT 'WHO DON / CDC',
  summary         TEXT NOT NULL,
  reported_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_epidemic_alert ON epidemiological_bulletins(alert_level);

-- 5. VIP Air Traffic & Diplomatic Flight Tracker (Feature #35)
CREATE TABLE IF NOT EXISTS diplomatic_flights (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  callsign     TEXT UNIQUE NOT NULL,
  icao24       TEXT NOT NULL,
  operator     TEXT NOT NULL,
  aircraft_type TEXT NOT NULL,
  origin       TEXT NOT NULL,
  destination  TEXT NOT NULL,
  origin_lat   REAL NOT NULL,
  origin_lng   REAL NOT NULL,
  dest_lat     REAL NOT NULL,
  dest_lng     REAL NOT NULL,
  cur_lat      REAL NOT NULL,
  cur_lng      REAL NOT NULL,
  altitude_ft  INTEGER NOT NULL DEFAULT 38000,
  speed_kts    INTEGER NOT NULL DEFAULT 475,
  mission_type TEXT NOT NULL CHECK(mission_type IN ('Diplomatic Envoy', 'Head of State', 'Humanitarian Relief', 'Treaty Observer')),
  status       TEXT NOT NULL DEFAULT 'In Flight',
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Electoral & Parliament Presets (Feature #34)
CREATE TABLE IF NOT EXISTS electoral_presets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL,
  total_seats   INTEGER NOT NULL,
  threshold_pct REAL NOT NULL DEFAULT 5.0,
  parties_json  TEXT NOT NULL
);

-- Seed Feature #29: Masthead Commodities & Currencies
INSERT OR IGNORE INTO market_tickers (symbol, name, category, price, unit, change_24h, change_pct)
VALUES
  ('XAU/USD', 'Gold Spot', 'Commodity', 2684.50, 'USD/oz', 18.40, 0.69),
  ('CL=F', 'WTI Crude Oil', 'Commodity', 71.85, 'USD/bbl', -1.12, -1.53),
  ('BZ=F', 'Brent Crude', 'Commodity', 75.40, 'USD/bbl', -0.95, -1.24),
  ('ZW=F', 'CBOT Wheat', 'Commodity', 562.25, 'USc/bu', 9.75, 1.76),
  ('BTC/USD', 'Bitcoin Index', 'Crypto', 94210.00, 'USD', 1420.00, 1.53),
  ('EUR/USD', 'Euro / Dollar', 'Currency', 1.0584, 'FX', -0.0028, -0.26),
  ('GBP/USD', 'Sterling / Dollar', 'Currency', 1.2642, 'FX', 0.0019, 0.15),
  ('USD/JPY', 'Dollar / Yen', 'Currency', 153.65, 'FX', 0.48, 0.31);

-- Seed Feature #30: Maritime Chokepoints
INSERT OR IGNORE INTO maritime_chokepoints (slug, name, region, lat, lng, status, risk_level, daily_transits, global_trade_pct, incident_summary, keywords_json)
VALUES
  ('hormuz', 'Strait of Hormuz', 'Persian Gulf / Arabian Sea', 26.5667, 56.2500, 'Elevated Tension', 78, 84, 21.0, 'Increased naval patrol escorts and AIS spoofing advisories issued for VLCC energy tankers.', '["hormuz","tanker","oil","iran","gulf","naval"]'),
  ('bab_el_mandeb', 'Bab-el-Mandeb Strait', 'Red Sea / Gulf of Aden', 12.5833, 43.3333, 'Disrupted', 89, 42, 12.0, 'Commercial container traffic diverted around Cape of Good Hope due to maritime security advisories.', '["red sea","bab-el-mandeb","houthi","shipping","container","freight"]'),
  ('suez', 'Suez Canal Corridor', 'Egypt / Eastern Mediterranean', 30.5852, 32.2654, 'Congested', 64, 58, 12.5, 'Queue backlog of northbound bulk carriers awaiting scheduled convoy transit slots.', '["suez","egypt","canal","shipping","maritime"]'),
  ('malacca', 'Strait of Malacca', 'Southeast Asia / Indian Ocean', 2.5000, 101.2000, 'Normal', 32, 245, 30.0, 'High-density LNG and semiconductor freight flow operating within nominal vessel separation lanes.', '["malacca","singapore","indopacific","trade","shipping"]'),
  ('panama', 'Panama Canal Locks', 'Central America', 9.0800, -79.6800, 'Congested', 58, 31, 5.0, 'Draft depth restrictions following Gatun Lake dry-season hydrological balancing.', '["panama","canal","drought","freight","trade"]'),
  ('bosporus', 'Bosporus Strait', 'Black Sea / Turkey', 41.1190, 29.0750, 'Elevated Tension', 61, 112, 4.5, 'Grain corridor inspection protocol delays reported for agricultural bulk carriers.', '["bosporus","black sea","grain","wheat","turkey","ukraine"]');

-- Seed Feature #31: Climate Anomalies
INSERT OR IGNORE INTO climate_anomalies (slug, title, anomaly_type, region, lat, lng, delta_celsius, severity, summary)
VALUES
  ('nino_pacific', 'Equatorial Pacific Thermal Anomaly', 'Thermal', 'Eastern Equatorial Pacific', -2.5, -110.0, 1.85, 'Severe', 'Sustained sea-surface warming altering atmospheric jet streams and tropical cyclone formation zones.'),
  ('arctic_albedo', 'Svalbard & Kara Sea Ice Deficit', 'Cryosphere', 'High Arctic Basin', 78.2, 42.0, 3.40, 'Extreme', 'Sea ice extent tracking 18% below 1981-2010 median, accelerating northern coastal permafrost thaw.'),
  ('mediterranean_dome', 'Central Mediterranean Marine Heatwave', 'Thermal', 'Mediterranean Basin', 36.5, 16.0, 2.60, 'Severe', 'Elevated upper-ocean heat content intensifying convective coastal storm risk across southern Europe.'),
  ('horn_africa_rain', 'East African Monsoon Surge', 'Flooding', 'Horn of Africa', 3.5, 42.5, 0.90, 'Moderate', 'Anomalous Indian Ocean Dipole moisture transport causing river basin overflow along the Juba-Shabelle.');

-- Seed Feature #33: Epidemiological Surveillance Bulletins
INSERT OR IGNORE INTO epidemiological_bulletins (slug, pathogen, region, country, lat, lng, alert_level, confirmed_cases, trend, source_agency, summary)
VALUES
  ('h5n1_cattle', 'Avian Influenza A (H5N1)', 'North America & Flyways', 'United States', 39.8, -98.5, 'Elevated', 54, 'Stable', 'CDC / USDA Surveillance', 'Cross-species agricultural biosecurity monitoring across dairy herds and migratory waterfowl flyways.'),
  ('dengue_americas', 'Dengue Serotype 3 Surge', 'South America', 'Brazil', -14.2, -51.9, 'High', 184200, 'Accelerating', 'PAHO / WHO DON', 'Vector-borne surge linked to urban precipitation anomalies; municipal clinic triage capacity expanded.'),
  ('mpox_kivu', 'Mpox Clade Ib Cluster', 'Central Africa', 'DR Congo', -2.5, 28.8, 'Emergency', 6120, 'Accelerating', 'WHO Africa / Africa CDC', 'Cross-border genomic sequencing teams deployed to monitor transmission dynamics along transit corridors.'),
  ('cholera_bay', 'Vibrio cholerae O1', 'South Asia', 'Bangladesh', 23.7, 90.4, 'Monitoring', 1420, 'Declining', 'ICDDR,B / WHO', 'Oral rehydration depot activation and potable water chlorination stabilizing deltaic districts.');

-- Seed Feature #35: VIP Diplomatic & Relief Flights
INSERT OR IGNORE INTO diplomatic_flights (callsign, icao24, operator, aircraft_type, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng, cur_lat, cur_lng, altitude_ft, speed_kts, mission_type, status)
VALUES
  ('SAM280', 'ADFEB8', 'US Dept of State Air Wing', 'Boeing C-32A (757)', 'Andrews AFB (ADW)', 'Geneva (GVA)', 38.81, -76.86, 46.23, 6.10, 49.40, -34.20, 39000, 488, 'Diplomatic Envoy', 'En Route North Atlantic'),
  ('RRR9102', '43C6F2', 'Royal Air Force Air Mobility', 'Airbus KC2 Voyager', 'RAF Brize Norton (BZZ)', 'Amman (AMM)', 51.75, -1.58, 31.72, 35.99, 41.20, 18.40, 37000, 472, 'Diplomatic Envoy', 'Transiting Adriatic'),
  ('UNHAS44', '4D201A', 'UN Humanitarian Air Service', 'Lockheed L-100 Hercules', 'Brindisi UNHRD (BDS)', 'Port Sudan (PZU)', 40.65, 17.94, 19.43, 37.23, 29.80, 29.10, 24000, 310, 'Humanitarian Relief', 'Medical Relief Cargo'),
  ('CTM0001', '3B76B1', 'French Republic Escadron', 'Airbus A330-200', 'Paris Villacoublay (VIY)', 'Tokyo Haneda (HND)', 48.77, 2.19, 35.55, 139.78, 54.10, 78.30, 41000, 495, 'Head of State', 'Siberian/Polar Corridor'),
  ('OSCE71', '44019C', 'OSCE Treaty Verification', 'Dash 8-Q400', 'Vienna (VIE)', 'Chisinau (RMO)', 48.11, 16.56, 46.92, 28.93, 47.60, 22.80, 25000, 345, 'Treaty Observer', 'Monitoring Patrol');

-- Seed Feature #34: Electoral Presets
INSERT OR IGNORE INTO electoral_presets (slug, name, country, total_seats, threshold_pct, parties_json)
VALUES
  ('bundestag', 'German Bundestag (Simulated PR)', 'Germany', 630, 5.0, '[{"id":"cdu","name":"CDU/CSU","color":"#1A1208","votePct":31.5},{"id":"spd","name":"SPD","color":"#C0392B","votePct":16.5},{"id":"grune","name":"Greens","color":"#1D6B38","votePct":12.5},{"id":"fdp","name":"FDP","color":"#B7950B","votePct":4.8},{"id":"afd","name":"AfD","color":"#2C4A7C","votePct":18.5},{"id":"linke","name":"Die Linke / BSW","color":"#6C3483","votePct":10.2}]'),
  ('eu_council', 'European Parliament Chamber Blend', 'European Union', 720, 4.0, '[{"id":"epp","name":"EPP (Center-Right)","color":"#2C4A7C","votePct":26.2},{"id":"sd","name":"S&D (Socialists)","color":"#C0392B","votePct":19.0},{"id":"renew","name":"Renew Europe","color":"#D4AC0D","votePct":10.8},{"id":"greens","name":"Greens/EFA","color":"#1D6B38","votePct":7.4},{"id":"ecr","name":"ECR","color":"#1F618D","votePct":11.5},{"id":"pfe","name":"Patriots / Non-Inscrits","color":"#5C4E3A","votePct":14.2},{"id":"left","name":"The Left","color":"#7B241C","votePct":6.4}]'),
  ('nordic_coalition', 'Nordic Multi-Party Riksdag', 'Sweden', 349, 4.0, '[{"id":"soc","name":"Social Democrats","color":"#C0392B","votePct":33.4},{"id":"mod","name":"Moderates","color":"#2C4A7C","votePct":19.8},{"id":"sd_nat","name":"Sweden Democrats","color":"#7D6608","votePct":18.6},{"id":"left","name":"Left Party","color":"#922B21","votePct":7.8},{"id":"center","name":"Centre Party","color":"#1D6B38","votePct":6.1},{"id":"lib","name":"Liberals","color":"#2874A6","votePct":4.5},{"id":"mp","name":"Green Party","color":"#196F3D","votePct":5.2}]');

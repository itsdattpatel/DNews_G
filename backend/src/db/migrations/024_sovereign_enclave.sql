-- backend/src/db/migrations/024_sovereign_enclave.sql
-- PRD Master Expansion Phase J & K: Mobile OS Integration & Archival Sovereignty (Features 43-50)

-- 1. Sovereign & Mobile Power-User Settings (Features #45, #46, #47, #49)
CREATE TABLE IF NOT EXISTS sovereign_settings (
  id                  INTEGER PRIMARY KEY CHECK(id = 1),
  e_ink_mode          INTEGER NOT NULL DEFAULT 0,
  volume_key_nav      INTEGER NOT NULL DEFAULT 0,
  enclave_locked      INTEGER NOT NULL DEFAULT 0,
  mesh_node_id        TEXT NOT NULL DEFAULT 'dnews-node-alpha',
  mesh_sync_enabled   INTEGER NOT NULL DEFAULT 1,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO sovereign_settings (id, e_ink_mode, volume_key_nav, enclave_locked, mesh_node_id, mesh_sync_enabled)
VALUES (1, 0, 0, 0, 'dnews-node-alpha', 1);

-- 2. Wayback Machine & Internet Archive Auto-Mirror Docket (Feature #48)
CREATE TABLE IF NOT EXISTS wayback_mirrors (
  article_id          INTEGER PRIMARY KEY,
  original_url        TEXT NOT NULL,
  archive_url         TEXT NOT NULL,
  status              TEXT NOT NULL CHECK(status IN ('Mirrored', 'Queued', 'Offline Cached')),
  snapshot_timestamp  TEXT NOT NULL,
  content_sha256      TEXT NOT NULL,
  checked_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. FIDO2 / WebAuthn Hardware Security Key Registry (Feature #49)
CREATE TABLE IF NOT EXISTS fido2_credentials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id   TEXT UNIQUE NOT NULL,
  label           TEXT NOT NULL,
  public_key_spki TEXT NOT NULL,
  algorithm       TEXT NOT NULL DEFAULT 'ES256',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at    TEXT
);

-- 4. Local Peer-to-Peer Mesh Sync Event Ledger (Feature #47)
CREATE TABLE IF NOT EXISTS mesh_sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  peer_id       TEXT NOT NULL,
  peer_label    TEXT NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  synced_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO mesh_sync_log (id, peer_id, peer_label, bundle_sha256, article_count, synced_at)
VALUES (1, 'peer-field-unit-02', 'Correspondent Tablet (mDNS)', '9f84b2c71a0e64f2d11b8f09c3a7e4d12a6b90c8f22a74c89031b57d2c88e01f', 12, datetime('now', '-25 minutes'));

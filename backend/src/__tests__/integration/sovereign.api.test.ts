/**
 * backend/src/__tests__/integration/sovereign.api.test.ts
 * Integration tests for Phase J & K: Mobile OS Integration & Sovereign Archival Enclave (Features 43-50).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
}));

import { createApp } from '../../app';

function setupSchema(db: Database.Database) {
  const mig001 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/001_initial.sql'), 'utf8');
  db.exec(mig001);
  const mig024 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/024_sovereign_enclave.sql'), 'utf8');
  db.exec(mig024);
}

describe('Mobile Power-User & Archival Sovereignty (Phase J & K, Features 43-50)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'reuters', 'Reuters', 'UK', 'https://reuters.com/rss', 'rss')
    `).run();

    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status, breaking_score, bookmarked, published_at)
      VALUES (601, 1, 'https://example.org/dispatches/arctic-cable',
              'Subsea communications cable repair vessel reaches Svalbard sector',
              'Specialized marine engineering vessel commenced fiber splicing operations along the polar trunk line.',
              'Full technical assessment reveals intact armor sheathing along 94 percent of the Arctic cable corridor.',
              'done',
              84,
              1,
              '2026-11-25T10:00:00Z')
    `).run();
  });

  // Feature #43: Android Home Screen Broadside Widget Payload
  it('Feature #43: supplies formatted 4x2 Android Home Screen widget snapshot', async () => {
    const res = await request(app).get('/api/sovereign/android-widget');
    expect(res.status).toBe(200);
    expect(res.body.masthead).toBeDefined();
    expect(res.body.leadHeadline).toContain('Svalbard');
    expect(res.body.unreadWireCount).toBeGreaterThanOrEqual(1);
  });

  // Features #45 & #46: E-Ink Mode & Volume Button Page Turning Settings
  it('Features #45-46: persists E-Ink mode and hardware volume button page-turning preferences', async () => {
    const patchRes = await request(app)
      .patch('/api/sovereign/settings')
      .send({ e_ink_mode: true, volume_key_nav: true });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.e_ink_mode).toBe(1);
    expect(patchRes.body.volume_key_nav).toBe(1);
  });

  // Feature #47: Local Peer-to-Peer Mesh News Sync
  it('Feature #47: computes cryptographic SHA-256 mesh bundle and logs peer sync', async () => {
    const bundleRes = await request(app).get('/api/sovereign/mesh/bundle');
    expect(bundleRes.status).toBe(200);
    expect(bundleRes.body.bundleSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(bundleRes.body.articles.length).toBeGreaterThanOrEqual(1);

    const syncRes = await request(app)
      .post('/api/sovereign/mesh/sync')
      .send({
        peerId: 'peer-laptop-09',
        peerLabel: 'Newsroom Desk Node',
        bundleSha256: bundleRes.body.bundleSha256,
        articleCount: bundleRes.body.articles.length,
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.peers.length).toBeGreaterThanOrEqual(2);
  });

  // Feature #48: Wayback Machine & Internet Archive Auto-Mirroring
  it('Feature #48: snapshots article URL integrity hash and Wayback mirror status', async () => {
    const snapRes = await request(app).post('/api/sovereign/wayback/601/snapshot');
    expect(snapRes.status).toBe(200);
    expect(snapRes.body.mirror.article_id).toBe(601);
    expect(snapRes.body.mirror.content_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(snapRes.body.mirror.archive_url).toContain('web.archive.org');
  });

  // Feature #49: Hardware Security Key (FIDO2 / YubiKey) Lock
  it('Feature #49: binds hardware FIDO2 credential and locks/unlocks investigative enclave', async () => {
    const regRes = await request(app)
      .post('/api/sovereign/fido2/register')
      .send({ label: 'YubiKey 5C NFC', credentialId: 'cred-yubi-001', publicKeySpki: 'MFkwEwYHKoZIzj0CAQY' });

    expect(regRes.status).toBe(200);
    expect(regRes.body.credential.label).toBe('YubiKey 5C NFC');

    const lockRes = await request(app).post('/api/sovereign/fido2/lock');
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.enclaveLocked).toBe(true);

    const unlockRes = await request(app)
      .post('/api/sovereign/fido2/unlock')
      .send({ credentialId: 'cred-yubi-001' });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.enclaveLocked).toBe(false);
  });

  // Feature #50: Self-Contained Single-File HTML Dossier Export
  it('Feature #50: compiles a self-contained single-file HTML archival dossier with inline search', async () => {
    const res = await request(app)
      .post('/api/sovereign/export-html')
      .send({ title: 'Arctic Infrastructure Dossier', bookmarkedOnly: true });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('Arctic Infrastructure Dossier');
    expect(res.text).toContain('Subsea communications cable repair vessel reaches Svalbard sector');
    expect(res.text).toContain('<script>');
  });
});

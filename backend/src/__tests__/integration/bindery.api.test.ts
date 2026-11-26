/**
 * backend/src/__tests__/integration/bindery.api.test.ts
 * Integration tests for Phase I: Broadside Bindery & Physical Artifacts (Features 36-42).
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
  const mig023 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/023_broadside_bindery.sql'), 'utf8');
  db.exec(mig023);
}

describe('Broadside Bindery & Physical Artifacts (Phase I, Features 36-42)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'guardian', 'The Guardian', 'UK', 'https://guardian.com/rss', 'rss')
    `).run();

    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status, breaking_score, published_at)
      VALUES (501, 1, 'https://test.com/bindery-lead',
              'Maritime treaty signed at Geneva summit amid tariff dispute',
              'Diplomats from twelve maritime nations ratified an accord governing port tariffs and cargo inspection.',
              'The Geneva treaty establishes clear protocols for diplomatic vessels, maritime trade, and treasury audits.',
              'done',
              86,
              '2026-11-25T08:00:00Z')
    `).run();
  });

  // Feature #36: Authentic Printable Broadsheet PDF Generator
  it('Feature #36: generates a multi-column PDFKit broadsheet supporting Letter & A4 with custom masthead', async () => {
    const res = await request(app)
      .post('/api/bindery/broadsheet-pdf')
      .send({ articleId: 501, pageSize: 'LETTER', mastheadTitle: 'The London Bugle' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  // Feature #37: Rubber Stamp & Redactor Studio
  it('Feature #37: saves and retrieves rubber ink stamps and black marker redactions per article', async () => {
    const stamps = [{ id: 's1', label: 'DECLASSIFIED', color: '#C0392B', xPct: 68, yPct: 18, rotation: -12 }];
    const redactions = [{ id: 'r1', xPct: 12, yPct: 45, widthPct: 35, heightPct: 6 }];

    const postRes = await request(app)
      .post('/api/bindery/stamps/501')
      .send({ stamps, redactions });

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);

    const getRes = await request(app).get('/api/bindery/stamps/501');
    expect(getRes.status).toBe(200);
    expect(getRes.body.stamps.length).toBe(1);
    expect(getRes.body.stamps[0].label).toBe('DECLASSIFIED');
    expect(getRes.body.redactions.length).toBe(1);
  });

  // Features #38, #39, #40: Press Audio, Masthead Typography Studio & Paper Patina Engine
  it('Features #38-40: persists and updates masthead identity, patina level, and press audio flags', async () => {
    const getInit = await request(app).get('/api/bindery/preferences');
    expect(getInit.status).toBe(200);
    expect(getInit.body.masthead_title).toBe('The World Desk');

    const patchRes = await request(app)
      .patch('/api/bindery/preferences')
      .send({
        masthead_title: 'The Chicago Dispatch',
        masthead_motto: 'LUX ET VERITAS',
        paper_patina: 72,
        press_audio_enabled: false,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.masthead_title).toBe('The Chicago Dispatch');
    expect(patchRes.body.paper_patina).toBe(72);
    expect(patchRes.body.press_audio_enabled).toBe(0);
  });

  // Feature #41: Ex-Libris Bookplate Bookmarks
  it('Feature #41: generates heraldic Ex-Libris bookplate SVG with custom initials and bat insignia', async () => {
    const res = await request(app)
      .get('/api/bindery/bookplate-svg?initials=E.R.&motto=SCIENTIA+EST+POTENTIA');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    const svgText = res.text || res.body.toString('utf8');
    expect(svgText).toContain('<svg');
    expect(svgText).toContain('E.R.');
    expect(svgText).toContain('SCIENTIA EST POTENTIA');
  });

  // Feature #42: Daily Cryptic Crossword & Editorial Acrostic
  it('Feature #42: builds an intersecting broadsheet crossword grid with Across and Down clues', async () => {
    const res = await request(app).get('/api/bindery/crossword');
    expect(res.status).toBe(200);
    expect(res.body.gridSize).toBe(9);
    expect(Array.isArray(res.body.grid)).toBe(true);
    expect(res.body.grid.length).toBe(9);
    expect(res.body.clues.across.length).toBeGreaterThanOrEqual(2);
    expect(res.body.clues.down.length).toBeGreaterThanOrEqual(2);
  });
});

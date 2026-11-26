/**
 * backend/src/__tests__/integration/investigative.api.test.ts
 * Integration tests for Investigative Journalism, OSINT & Verification Suite (Phase E, Features 1-10).
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
  // Run initial migration
  const mig001 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/001_initial.sql'), 'utf8');
  db.exec(mig001);
  // Run investigative migration
  const mig019 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/019_investigative_suite.sql'), 'utf8');
  db.exec(mig019);
}

describe('Investigative Journalism & Verification Suite (Phase E, Features 1-10)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'thehindu', 'The Hindu', 'India', 'https://thehindu.com/rss', 'rss')
    `).run();

    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status, published_at)
      VALUES (101, 1, 'https://test.com/investigative-lead', 
              'Diplomatic summit convenes as border tensions ease', 
              'At 08:30 GMT Monday, ambassadors gathered in Geneva.', 
              'At 08:30 GMT Monday, delegates initiated negotiations. Two hours later, a joint ceasefire protocol was outlined.', 
              'done', 
              '2026-11-20T10:00:00Z')
    `).run();
  });

  // Feature #1: "Deep Throat" Whistleblower Drop Desk - Metadata Scrubber
  it('Feature #1: strips metadata from uploaded documents without telemetry', async () => {
    const rawPdf = '%PDF-1.4\n/Author (Secret Source)\n/Creator (Word 2024)\nstream\nwhistleblower text\nendstream';
    const base64 = Buffer.from(rawPdf).toString('base64');

    const res = await request(app)
      .post('/api/investigate/scrub-document')
      .send({
        filename: 'leak_evidence.pdf',
        fileContentBase64: base64,
        mimeType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.scrubbedFields.length).toBeGreaterThan(0);
    expect(res.body.vaultStatus).toBe('ENCRYPTED_LOCAL_STORAGE_ONLY');

    const decoded = Buffer.from(res.body.cleanBase64, 'base64').toString('binary');
    expect(decoded).not.toContain('/Author (Secret Source)');
  });

  // Feature #2: Chronological Conflict Timeline Builder
  it('Feature #2: extracts chronological indicators from article body', async () => {
    const res = await request(app).get('/api/investigate/timeline/101');
    expect(res.status).toBe(200);
    expect(res.body.articleId).toBe(101);
    expect(res.body.milestones.length).toBeGreaterThan(0);
    expect(res.body.milestones[0].event).toContain('negotiations');
  });

  // Feature #3: Contradiction Matrix Engine
  it('Feature #3: detects direct contradictions and differing estimates between claims', async () => {
    const res = await request(app)
      .post('/api/investigate/cross-compare')
      .send({
        claimA: 'Ministry confirms 45 casualties reported in the blast.',
        claimB: 'Independent observers deny casualties occurred in the perimeter.',
        sourceA: 'State Cable',
        sourceB: 'Human Rights Monitor',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('contradiction');
    expect(res.body.contradictionScore).toBeGreaterThan(70);
  });

  // Feature #4: Corporate Ownership & Conglomerate Overlay
  it('Feature #4: queries conglomerate and ultimate owner records', async () => {
    const res = await request(app).get('/api/investigate/ownership/The%20Washington%20Post');
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.ultimateOwner).toBe('Jeff Bezos');
    expect(res.body.parentConglomerate).toBe('Nash Holdings');
  });

  // Feature #5: Satellite & Geolocation OSINT Viewer
  it('Feature #5: returns Copernicus/Sentinel OSINT observation comparison data', async () => {
    const res = await request(app).get('/api/investigate/satellite-compare?lat=31.5&lon=34.46');
    expect(res.status).toBe(200);
    expect(res.body.satelliteConstellation).toContain('Sentinel-2');
    expect(res.body.detectedChangeIndex).toBeGreaterThan(0);
  });

  // Feature #6: Quote Authenticator & Transcript Matcher
  it('Feature #6: verifies quote context fidelity against public transcripts', async () => {
    const res = await request(app)
      .post('/api/investigate/verify-quote')
      .send({
        quote: 'We will abide by all international maritime transit protocols',
        speaker: 'Foreign Minister',
      });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.fidelityScore).toBeGreaterThanOrEqual(80);
    expect(res.body.contextStatus).toBe('VERIFIED_IN_CONTEXT');
  });

  // Feature #7: FOIA Request Docket & Statutory Tracker
  it('Feature #7: supports logging and retrieving FOIA statutory requests', async () => {
    const createRes = await request(app)
      .post('/api/investigate/foia')
      .send({
        agencyName: 'Department of Commerce',
        subject: 'Semiconductor export licenses 2026',
        statutoryDeadlineDays: 20,
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    const listRes = await request(app).get('/api/investigate/foia');
    expect(listRes.status).toBe(200);
    expect(listRes.body.requests.length).toBeGreaterThan(0);
    expect(listRes.body.requests[0].agency_name).toBe('Department of Commerce');
  });

  // Feature #8: Sanctions & Global Watchlist Cross-Reference
  it('Feature #8: screens text against UN/OFAC/EU sanctions watchlist', async () => {
    const res = await request(app)
      .post('/api/investigate/sanctions/screen')
      .send({ text: 'Alisher Usmanov assets frozen' });

    expect(res.status).toBe(200);
    expect(res.body.hasMatch).toBe(true);
    expect(res.body.matches[0].name).toBe('Alisher Usmanov');
    expect(res.body.matches[0].entity_type).toBe('individual');
  });

  // Feature #9: Tabloid Clickbait De-Sensationalizer
  it('Feature #9: de-sensationalizes hyperbolic headlines into calm AP prose', async () => {
    const res = await request(app)
      .post('/api/investigate/desensationalize')
      .send({ headline: 'SHOCKING: Minister Slams Trade Partner in Meltdown!!' });

    expect(res.status).toBe(200);
    expect(res.body.calmHeadline).toContain('Criticizes');
    expect(res.body.calmHeadline).not.toContain('SHOCKING');
    expect(res.body.sensationalismScore).toBeGreaterThan(50);
  });

  // Feature #10: Article Revision & Silent-Correction Diff Tracker
  it('Feature #10: captures article revision snapshots and returns integrity hash', async () => {
    const snapRes = await request(app)
      .post('/api/investigate/revisions/101/snapshot');

    expect(snapRes.status).toBe(200);
    expect(snapRes.body.success).toBe(true);

    const getRes = await request(app).get('/api/investigate/revisions/101');
    expect(getRes.status).toBe(200);
    expect(getRes.body.snapshotCount).toBe(1);
    expect(getRes.body.snapshots[0].hash).toBeDefined();
  });
});

/**
 * backend/src/__tests__/integration/export.api.test.ts
 * Integration tests for PDF newspaper export and morning radio briefing (Phase 10).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';

describe('Export API (Phase 10 — P10-01, P10-02, P10-04, P10-05)', () => {
  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    const db = getDb();

    db.prepare(`
      INSERT OR IGNORE INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (999, 'test_reuters', 'Reuters', 'USA', 'http://example.com', 'rss')
    `).run();

    db.prepare(`
      INSERT OR REPLACE INTO articles (id, source_id, url, title_english, summary, breaking_score, status, published_at, fetched_at)
      VALUES (901, 999, 'http://example.com/lead', 'Global Accord Finalized on Carbon Cap', 'Diplomats from 190 nations reach milestone pact.', 92, 'done', datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT OR REPLACE INTO articles (id, source_id, url, title_english, summary, breaking_score, status, published_at, fetched_at)
      VALUES (902, 999, 'http://example.com/sec', 'Wildlife Sanctuaries Report Rising Tiger Population', 'Rangers celebrate recovery after strict anti-poaching measures.', 74, 'done', datetime('now'), datetime('now'))
    `).run();
  });

  afterEach(() => {
    closeDb();
    delete process.env.DB_PATH;
    vi.restoreAllMocks();
  });

  it('POST /api/export/pdf generates a valid PDF buffer with newspaper headers (P10-02)', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/export/pdf')
      .send({ date: new Date().toISOString().slice(0, 10) })
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('AI_World_News_Desk_');

    // Verify PDF magic header bytes "%PDF"
    const buffer = res.body as Buffer;
    expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('GET /api/export/briefing returns a structured executive morning briefing (P10-05)', async () => {
    const app = createApp();
    const res = await request(app).get('/api/export/briefing').expect(200);

    expect(res.body).toHaveProperty('text');
    expect(res.body).toHaveProperty('generated_at');
    expect(typeof res.body.text).toBe('string');
    expect(res.body.text.length).toBeGreaterThan(50);
    expect(res.body.text).toContain('morning');
  });
});

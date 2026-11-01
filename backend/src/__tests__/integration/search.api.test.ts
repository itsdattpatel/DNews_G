/**
 * backend/src/__tests__/integration/search.api.test.ts
 * Integration tests for Search and Archive Chat API (P8-04).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
}));

vi.mock('../../ai/router', () => ({
  routeAIRequest: vi.fn().mockResolvedValue({
    text: 'Synthesis: Authorities in China and Vietnam clamped down on illegal bear bile extraction facilities throughout 2026.',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
  }),
}));

import { createApp } from '../../app';

function setupSchema(db: Database.Database) {
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
}

describe('Search & Archive Chat API (P8-04)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'thehindu', 'The Hindu', 'India', 'https://thehindu.com/rss', 'rss')
    `).run();

    // Insert test articles
    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status)
      VALUES
      (10, 1, 'https://test.com/1', 'Bear bile farming banned in cross-border crackdown', 'Police shut down illicit bear bile farms.', 'Full report on bear bile trade operations.', 'done'),
      (20, 1, 'https://test.com/2', 'Solar capacity expansion announced', 'Renewable solar grids online.', 'Green energy solar expansion.', 'done')
    `).run();
  });

  afterEach(() => {
    testDb.close();
  });

  it('POST /api/search returns matched articles via full-text search', async () => {
    const res = await request(app).post('/api/search').send({
      query: 'bear bile',
      use_ai: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe('bear bile');
    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.results[0].title_english).toContain('Bear bile');
    expect(res.body.ai_answer).toBeNull();
  });

  it('POST /api/search with use_ai: true synthesizes AI answer over citations', async () => {
    const res = await request(app).post('/api/search').send({
      query: 'bear bile farming',
      use_ai: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.ai_answer).toContain('Authorities in China and Vietnam');
  });

  it('POST /api/search returns 400 when query is missing', async () => {
    const res = await request(app).post('/api/search').send({ query: '' });
    expect(res.status).toBe(400);
  });
});


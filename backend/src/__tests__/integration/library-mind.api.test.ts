/**
 * backend/src/__tests__/integration/library-mind.api.test.ts
 * Integration tests for Mind Helps REST API (Category B5).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_lib_mind_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import request from 'supertest';
import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';

describe('Library Mind Helps REST API (Category B5)', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    getDb();
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('GET /api/library/mind/cards returns evidence-based psychology cards', async () => {
    const res = await request(app).get('/api/library/mind/cards');
    expect(res.status).toBe(200);
    expect(res.body.cards).toBeInstanceOf(Array);
    expect(res.body.cards.length).toBeGreaterThanOrEqual(10);

    const first = res.body.cards[0];
    expect(first.title).toBeDefined();
    expect(first.what_it_is).toBeDefined();
    expect(first.steps).toBeInstanceOf(Array);
    expect(first.time_needed_minutes).toBeGreaterThan(0);
    expect(first.source_book).toBeDefined();
    expect(first.source_license).toBeDefined();
  });

  it('GET /api/library/mind/cards?category=anxiety filters by category', async () => {
    const res = await request(app).get('/api/library/mind/cards?category=anxiety');
    expect(res.status).toBe(200);
    expect(res.body.cards.length).toBeGreaterThan(0);
    expect(res.body.cards.every((c: any) => c.category === 'anxiety')).toBe(true);
  });

  it('GET /api/library/mind/cards/:id returns specific card and 404 for invalid ID', async () => {
    const res = await request(app).get('/api/library/mind/cards/1');
    expect(res.status).toBe(200);
    expect(res.body.card).toBeDefined();
    expect(res.body.card.id).toBe(1);

    const notFound = await request(app).get('/api/library/mind/cards/9999');
    expect(notFound.status).toBe(404);
  });

  it('GET /api/library/mind/helplines returns verified crisis directory with safety notice', async () => {
    const res = await request(app).get('/api/library/mind/helplines');
    expect(res.status).toBe(200);
    expect(res.body.helplines).toBeInstanceOf(Array);
    expect(res.body.helplines.length).toBeGreaterThanOrEqual(9);
    expect(res.body.notice).toContain('Not medical advice');
    expect(res.body.verified_date).toBe('2026-11-02');

    const inHelplines = res.body.helplines.filter((h: any) => h.country_code === 'IN');
    expect(inHelplines.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/library/mind/helplines?country=US filters by country', async () => {
    const res = await request(app).get('/api/library/mind/helplines?country=US');
    expect(res.status).toBe(200);
    expect(res.body.helplines.length).toBeGreaterThan(0);
    expect(res.body.helplines.every((h: any) => h.country_code === 'US')).toBe(true);
  });
});

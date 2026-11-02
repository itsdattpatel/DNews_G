/**
 * backend/src/__tests__/integration/library-wisdom.api.test.ts
 * Integration tests for Wisdom REST endpoints (Category B4: Scriptures & Quotes).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_lib_wisdom_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import request from 'supertest';
import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';

describe('Library Wisdom REST API (Category B4)', () => {
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

  it('GET /api/library/wisdom/books returns canonical holy books registry', async () => {
    const res = await request(app).get('/api/library/wisdom/books');
    console.log('Wisdom response:', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('books');
    expect(Array.isArray(res.body.books)).toBe(true);
    expect(res.body.books.length).toBeGreaterThanOrEqual(3);

    const gita = res.body.books.find((b: any) => b.slug === 'bhagavad_gita');
    expect(gita).toBeDefined();
    expect(gita.title_english).toBe('Bhagavad Gita');
    expect(gita.source_license).toBe('Public Domain');
  });

  it('GET /api/library/wisdom/verses returns filtered verses with Sanskrit and translation', async () => {
    const res = await request(app).get('/api/library/wisdom/verses?book=bhagavad_gita&section=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('verses');
    expect(res.body.verses.length).toBeGreaterThan(0);

    const v47 = res.body.verses.find((v: any) => v.verse_number === 47);
    expect(v47).toBeDefined();
    expect(v47.text_sanskrit).toContain('कर्मण्येवाधिकारस्ते');
    expect(v47.translator).toContain('Edwin Arnold');
    expect(v47.license).toBe('Public Domain');
  });

  it('GET /api/library/wisdom/verses/today returns a deterministic Verse of the Day', async () => {
    const res = await request(app).get('/api/library/wisdom/verses/today');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('verse');
    expect(res.body.verse).toHaveProperty('translation');
    expect(res.body.verse).toHaveProperty('meaning');
  });

  it('GET /api/library/wisdom/quotes returns filtered quotes with author and source work', async () => {
    const res = await request(app).get('/api/library/wisdom/quotes?author=Marcus Aurelius');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('quotes');
    expect(res.body.quotes.length).toBeGreaterThan(0);
    expect(res.body.quotes[0].author).toBe('Marcus Aurelius');
    expect(res.body.quotes[0].source_work).toContain('Meditations');
  });

  it('GET /api/library/wisdom/quotes/today returns Quote of the Day', async () => {
    const res = await request(app).get('/api/library/wisdom/quotes/today');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('quote');
    expect(res.body.quote).toHaveProperty('quote_text');
    expect(res.body.quote).toHaveProperty('attribution');
  });

  it('GET /api/library/wisdom/quotes/random returns a random quote', async () => {
    const res = await request(app).get('/api/library/wisdom/quotes/random');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('quote');
    expect(res.body.quote.quote_text.length).toBeGreaterThan(5);
  });
});

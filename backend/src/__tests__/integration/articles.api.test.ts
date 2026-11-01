import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_articles_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { syncSources } from '../../pipeline/dedup';
import { app } from '../../app';

describe('Articles API (T1-06)', () => {
  let createdArticleId: number;

  beforeAll(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    const db = getDb();
    syncSources();

    // Insert dummy source and articles for testing
    const source = db.prepare('SELECT id FROM sources LIMIT 1').get() as { id: number };
    const insert = db.prepare(`
      INSERT INTO articles (source_id, url, title_original, title_english, summary, status, breaking_score)
      VALUES (?, ?, ?, ?, ?, 'done', 80)
    `);
    const res = insert.run(
      source.id,
      'https://example.com/api-test-article',
      'Original Headline',
      'English Headline for Testing',
      'This is a summary of the news article for integration testing.',
    );
    createdArticleId = Number(res.lastInsertRowid);
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('GET /api/articles returns 200 with total and items array', async () => {
    const res = await request(app).get('/api/articles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0]).toHaveProperty('title_english');
  });

  it('GET /api/articles/:id returns single article details', async () => {
    const res = await request(app).get(`/api/articles/${createdArticleId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdArticleId);
    expect(res.body.title_english).toBe('English Headline for Testing');
  });

  it('PATCH /api/articles/:id/bookmark toggles bookmark status', async () => {
    const res = await request(app).patch(`/api/articles/${createdArticleId}/bookmark`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(true);

    const res2 = await request(app).patch(`/api/articles/${createdArticleId}/bookmark`);
    expect(res2.status).toBe(200);
    expect(res2.body.bookmarked).toBe(false);
  });

  it('verifies source country and categories for India and Animals (T2-02, T2-03)', () => {
    const db = getDb();
    const indiaSource = db.prepare('SELECT id, country FROM sources WHERE slug = ?').get('india_thehindu') as {
      id: number;
      country: string;
    };
    expect(indiaSource.country).toBe('India');

    // Insert article with categories and keywords
    const artRes = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status)
      VALUES (?, 'https://example.com/india-article', 'India Monsoon Update', 'Monsoon arrives.', 'done')
    `).run(indiaSource.id);
    const artId = Number(artRes.lastInsertRowid);

    db.prepare('INSERT INTO article_categories (article_id, category) VALUES (?, ?)').run(artId, 'World');
    db.prepare('INSERT INTO article_categories (article_id, category) VALUES (?, ?)').run(artId, 'Environment');
    db.prepare('INSERT INTO keywords (article_id, keyword) VALUES (?, ?)').run(artId, 'monsoon');

    const cats = db.prepare('SELECT category FROM article_categories WHERE article_id = ?').all(artId) as {
      category: string;
    }[];
    expect(cats.length).toBe(2);
    expect(cats.map((c) => c.category)).toContain('World');
  });

  it('GET /api/articles?country=Japan returns only Japanese sources (T2-07)', async () => {
    const db = getDb();
    const japanSource = db.prepare('SELECT id FROM sources WHERE slug = ?').get('japan_nhkworld') as { id: number };
    db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status)
      VALUES (?, 'https://example.com/japan-art', 'Tokyo Tech Expo Opens', 'Exhibits open.', 'done')
    `).run(japanSource.id);

    const res = await request(app).get('/api/articles?country=Japan');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of res.body.items) {
      expect(item.source.country).toBe('Japan');
    }
  });

  it('GET /api/articles?category=Animals returns wildlife articles (T2-06)', async () => {
    const db = getDb();
    const animalSource = db.prepare('SELECT id FROM sources WHERE slug = ?').get('animals_mongabay') as { id: number };
    const artRes = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status)
      VALUES (?, 'https://example.com/animal-art', 'Rare Tiger Conservation Success', 'Tiger numbers double.', 'done')
    `).run(animalSource.id);
    const artId = Number(artRes.lastInsertRowid);
    db.prepare('INSERT INTO article_categories (article_id, category) VALUES (?, ?)').run(artId, 'Animals');

    const res = await request(app).get('/api/articles?category=Animals');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of res.body.items) {
      expect(item.categories).toContain('Animals');
    }
  });
});

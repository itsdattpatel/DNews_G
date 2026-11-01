import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_clusters_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { syncSources } from '../../pipeline/dedup';
import { app } from '../../app';

describe('Clusters API (P2-09)', () => {
  let createdClusterId: number;

  beforeAll(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    const db = getDb();
    syncSources();

    const clusterRes = db.prepare(`
      INSERT INTO clusters (headline, outlet_count, country_count, is_breaking)
      VALUES ('Historic Summit on Ocean Preservation', 3, 2, 1)
    `).run();
    createdClusterId = Number(clusterRes.lastInsertRowid);

    const source = db.prepare('SELECT id FROM sources LIMIT 1').get() as { id: number };
    const artRes = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, cluster_id, breaking_score)
      VALUES (?, ?, ?, ?, 'done', ?, 85)
    `).run(
      source.id,
      'https://example.com/cluster-article-1',
      'Nations agree to create vast ocean sanctuary network',
      'Delegates signed landmark treaty protecting high seas marine life.',
      createdClusterId,
    );
    const artId = Number(artRes.lastInsertRowid);
    db.prepare('INSERT INTO keywords (article_id, keyword) VALUES (?, ?)').run(artId, 'ocean');
    db.prepare('INSERT INTO article_categories (article_id, category) VALUES (?, ?)').run(artId, 'Environment');
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('GET /api/clusters returns list of story clusters', async () => {
    const res = await request(app).get('/api/clusters');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('items');
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    const item = res.body.items[0];
    expect(item).toHaveProperty('headline');
    expect(item).toHaveProperty('articles');
    expect(Array.isArray(item.articles)).toBe(true);
  });

  it('GET /api/clusters/:id returns single cluster details with articles', async () => {
    const res = await request(app).get(`/api/clusters/${createdClusterId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdClusterId);
    expect(res.body.headline).toContain('Ocean Preservation');
    expect(res.body.is_breaking).toBe(true);
    expect(res.body.articles.length).toBeGreaterThanOrEqual(1);

    // Verify enriched fields for Compare Coverage and Timeline (P7-03)
    const firstArt = res.body.articles[0];
    expect(firstArt.breaking_score).toBe(85);
    expect(firstArt.keywords).toContain('ocean');
    expect(firstArt.categories).toContain('Environment');
  });

  it('GET /api/clusters?breaking=true filters to breaking clusters only', async () => {
    const res = await request(app).get('/api/clusters?breaking=true');
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.is_breaking).toBe(true);
    }
  });
});

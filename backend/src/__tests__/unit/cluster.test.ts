import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_cluster');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { syncSources } from '../../pipeline/dedup';
import { cosineSimilarity, clusterArticle } from '../../pipeline/cluster';

describe('Story Clustering & Cosine Similarity (T2-04, T2-05)', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    getDb();
    syncSources();
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('computes high similarity for near-identical event summaries (T2-04)', () => {
    const textA =
      'Heavy torrential rains trigger devastating landslides in southern Kerala, killing at least 40 people and displacing hundreds.';
    const textB =
      'Heavy torrential rains trigger devastating landslides in southern Kerala, killing at least 40 people and displacing hundreds of residents.';

    const similarity = cosineSimilarity(textA, textB);
    expect(similarity).toBeGreaterThan(0.85);
  });

  it('computes low similarity for completely unrelated articles (T2-05)', () => {
    const textA = 'Heavy torrential rains trigger devastating landslides in southern Kerala.';
    const textB = 'Tokyo tech summit showcases advanced quantum computing breakthrough and AI robotics.';

    const similarity = cosineSimilarity(textA, textB);
    expect(similarity).toBeLessThan(0.3);
  });

  it('groups related articles into the same cluster in the database', () => {
    const db = getDb();
    const source1 = db.prepare('SELECT id FROM sources WHERE country = ? LIMIT 1').get('India') as { id: number };
    const source2 = db.prepare('SELECT id FROM sources WHERE country = ? LIMIT 1').get('USA') as { id: number };

    // Insert article 1
    const res1 = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score)
      VALUES (?, ?, ?, ?, 'done', 80)
    `).run(
      source1.id,
      'https://example.com/story-a',
      'Historic space mission successfully lands rover on icy moon',
      'Global space agency lands rover on icy moon surface to search for subsurface oceans.',
    );
    const id1 = Number(res1.lastInsertRowid);
    const cluster1 = clusterArticle(id1);

    // Insert related article 2 from another outlet
    const res2 = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score)
      VALUES (?, ?, ?, ?, 'done', 75)
    `).run(
      source2.id,
      'https://example.com/story-b',
      'Rover touches down on icy moon in historic exploration milestone',
      'Space probe lands rover on distant icy moon surface in landmark search for extraterrestrial oceans.',
    );
    const id2 = Number(res2.lastInsertRowid);
    const cluster2 = clusterArticle(id2);

    expect(cluster1).toBe(cluster2);

    // Check cluster metadata
    const clusterRow = db.prepare('SELECT * FROM clusters WHERE id = ?').get(cluster1) as {
      outlet_count: number;
      is_breaking: number;
    };
    expect(clusterRow.outlet_count).toBe(2);
    expect(clusterRow.is_breaking).toBe(1);
  });

  it('assigns separate cluster for an unrelated news story', () => {
    const db = getDb();
    const source = db.prepare('SELECT id FROM sources LIMIT 1').get() as { id: number };

    const res3 = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score)
      VALUES (?, ?, ?, ?, 'done', 20)
    `).run(
      source.id,
      'https://example.com/story-c',
      'Archaeologists uncover pristine medieval fresco in Italian village cellar',
      'Art historians celebrate discovery of 14th century fresco intact behind plaster walls.',
    );
    const id3 = Number(res3.lastInsertRowid);
    const cluster3 = clusterArticle(id3);

    const prevCluster = db.prepare('SELECT cluster_id FROM articles WHERE url = ?').get('https://example.com/story-a') as { cluster_id: number };
    expect(cluster3).not.toBe(prevCluster.cluster_id);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_dedup');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { syncSources, insertPendingArticles, isKnownUrl } from '../../pipeline/dedup';
import type { ArticleRaw } from '../../fetch/rss';

describe('Deduplication & DB Ingestion (T1-02)', () => {
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

  it('inserts new article as pending and ignores duplicates', async () => {
    const rawArticle: ArticleRaw = {
      url: 'https://example.com/unique-story-1',
      titleOriginal: 'Test Headline 1',
      bodyOriginal: 'Content of test article 1',
      publishedAt: new Date().toISOString(),
      sourceSlug: 'india_thehindu',
      sourceName: 'The Hindu',
      country: 'India',
    };

    // First insert
    const insertedCount1 = await insertPendingArticles([rawArticle]);
    expect(insertedCount1).toBe(1);
    expect(isKnownUrl(rawArticle.url)).toBe(true);

    // Second insert of same URL
    const insertedCount2 = await insertPendingArticles([rawArticle]);
    expect(insertedCount2).toBe(0);

    // Verify DB count
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM articles WHERE url = ?').get(rawArticle.url) as { count: number };
    expect(row.count).toBe(1);
  });
});

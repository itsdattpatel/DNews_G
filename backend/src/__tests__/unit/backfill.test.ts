import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_backfill');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { syncSources } from '../../pipeline/dedup';
import { backfillMissedWindow } from '../../fetch/backfill';
import * as gdeltModule from '../../fetch/gdelt';
import type { ArticleRaw } from '../../fetch/rss';

describe('GDELT Date-Range Backfill & Honest Fallback (P5-03)', () => {
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
    vi.restoreAllMocks();
  });

  it('returns 0 articles and no warning when missedMinutes is 0', async () => {
    const res = await backfillMissedWindow({ missedMinutes: 0 });
    expect(res.coveredMinutes).toBe(0);
    expect(res.totalMissedMinutes).toBe(0);
    expect(res.articlesFetched).toBe(0);
    expect(res.articlesInserted).toBe(0);
  });

  it('queries GDELT for missed window and inserts articles with honest warning', async () => {
    const mockArticles: ArticleRaw[] = [
      {
        url: 'https://example.com/gdelt-backfill-1',
        titleOriginal: 'Missed Breaking Event 1',
        bodyOriginal: 'Missed Breaking Event 1 body text',
        publishedAt: '2026-10-30T10:30:00.000Z',
        sourceSlug: 'usa_npr',
        sourceName: 'NPR News',
        country: 'USA',
      },
      {
        url: 'https://example.com/gdelt-backfill-2',
        titleOriginal: 'Missed Breaking Event 2',
        bodyOriginal: 'Missed Breaking Event 2 body text',
        publishedAt: '2026-10-30T11:00:00.000Z',
        sourceSlug: 'india_thehindu',
        sourceName: 'The Hindu',
        country: 'India',
      },
    ];

    const fetchGdeltSpy = vi.spyOn(gdeltModule, 'fetchGdelt').mockResolvedValue(mockArticles);

    const res = await backfillMissedWindow({ missedMinutes: 120 });

    expect(fetchGdeltSpy).toHaveBeenCalled();
    expect(res.totalMissedMinutes).toBe(120);
    expect(res.coveredMinutes).toBe(120);
    expect(res.gdeltCoverage).toBe(true);
    expect(res.rssCoverage).toBe(false); // Honest: RSS cannot backfill ranges
    expect(res.articlesFetched).toBeGreaterThan(0);
    expect(res.articlesInserted).toBe(2);
    expect(res.warning).toContain('RSS has no backfill; GDELT covered 120 of 120 minutes');

    // Verify articles were inserted into DB
    const db = getDb();
    const row = db
      .prepare('SELECT COUNT(*) as count FROM articles WHERE url IN (?, ?)')
      .get('https://example.com/gdelt-backfill-1', 'https://example.com/gdelt-backfill-2') as {
      count: number;
    };
    expect(row.count).toBe(2);

    fetchGdeltSpy.mockRestore();
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_scheduler');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { syncSources } from '../../pipeline/dedup';
import {
  updateSourceLastFetched,
  getSourceLastFetched,
  detectStartupGap,
  computeMissedWindow,
  initStartupGap,
  getStartupGap,
  resetStartupGap,
} from '../../fetch/scheduler';

describe('Scheduler & Startup Gap (P5-01, P5-02)', () => {
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

  describe('last_fetched_at Persistence (P5-01)', () => {
    it('initially has null last_fetched_at for sources', () => {
      const lastFetched = getSourceLastFetched('india_thehindu');
      expect(lastFetched).toBeNull();
    });

    it('persists ISO-8601 UTC timestamp in DB for a specific source', () => {
      const timestamp = '2026-10-30T10:00:00.000Z';
      updateSourceLastFetched('india_thehindu', timestamp);

      const fetched = getSourceLastFetched('india_thehindu');
      expect(fetched).toBe(timestamp);

      // Verify directly in sqlite database
      const db = getDb();
      const row = db.prepare('SELECT last_fetched_at FROM sources WHERE slug = ?').get('india_thehindu') as {
        last_fetched_at: string;
      };
      expect(row.last_fetched_at).toBe(timestamp);
    });

    it('maintains independent timestamps across different sources', () => {
      const ts1 = '2026-10-30T11:00:00.000Z';
      const ts2 = '2026-10-30T11:30:00.000Z';

      updateSourceLastFetched('india_thehindu', ts1);
      updateSourceLastFetched('usa_npr', ts2);

      expect(getSourceLastFetched('india_thehindu')).toBe(ts1);
      expect(getSourceLastFetched('usa_npr')).toBe(ts2);
    });

    it('detects startup gap correctly from latest last_fetched_at timestamp', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      updateSourceLastFetched('usa_npr', thirtyMinsAgo);

      const gap = detectStartupGap();
      expect(gap.lastFetchedAt).toBe(thirtyMinsAgo);
      expect(gap.missedMinutes).toBeGreaterThanOrEqual(29);
      expect(gap.missedMinutes).toBeLessThanOrEqual(31);
    });
  });

  describe('Startup Gap Detection & Missed Window Computation (P5-02)', () => {
    it('computes missed window for zero/null last_fetched_at', () => {
      const window = computeMissedWindow(null, new Date('2026-10-30T12:00:00.000Z'));
      expect(window.detected).toBe(false);
      expect(window.missedMinutes).toBe(0);
      expect(window.lastFetchedAt).toBeNull();
      expect(window.windowStart).toBeNull();
      expect(window.windowEnd).toBe('2026-10-30T12:00:00.000Z');
      expect(window.canBackfill).toBe(false);
    });

    it('computes missed window for small gap (< 5 minutes) as not detected', () => {
      const lastFetched = '2026-10-30T11:58:00.000Z';
      const now = new Date('2026-10-30T12:00:00.000Z'); // 2 min gap
      const window = computeMissedWindow(lastFetched, now);
      expect(window.detected).toBe(false);
      expect(window.missedMinutes).toBe(2);
      expect(window.windowStart).toBe(lastFetched);
      expect(window.canBackfill).toBe(false);
    });

    it('computes missed window for large gap (120 minutes) as detected with canBackfill', () => {
      const lastFetched = '2026-10-30T10:00:00.000Z';
      const now = new Date('2026-10-30T12:00:00.000Z'); // 120 min gap
      const window = computeMissedWindow(lastFetched, now, true);
      expect(window.detected).toBe(true);
      expect(window.missedMinutes).toBe(120);
      expect(window.windowStart).toBe(lastFetched);
      expect(window.windowEnd).toBe('2026-10-30T12:00:00.000Z');
      expect(window.canBackfill).toBe(true);
    });

    it('initStartupGap stores gap and remains persistent until reset', () => {
      resetStartupGap();
      // Set all sources to 2 hours ago so the MAX(last_fetched_at) is twoHoursAgo
      const db = getDb();
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      db.prepare('UPDATE sources SET last_fetched_at = ?').run(twoHoursAgo);

      const initialGap = initStartupGap();
      expect(initialGap.detected).toBe(true);
      expect(initialGap.missedMinutes).toBeGreaterThanOrEqual(119);

      // Subsequent getStartupGap call returns the same preserved startup gap
      const cachedGap = getStartupGap();
      expect(cachedGap.missedMinutes).toBe(initialGap.missedMinutes);
      expect(cachedGap.windowStart).toBe(initialGap.windowStart);
    });
  });
});

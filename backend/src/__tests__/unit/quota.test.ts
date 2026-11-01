import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_quota');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { recordCall, getTodayStats, getAllProviderStats } from '../../ai/quota';

describe('AI Quota Tracking (T1-05)', () => {
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

  it('increments provider call count and tokens on calls', () => {
    recordCall('gemini', 'gemini-2.5-flash', 100, 50, true);
    recordCall('gemini', 'gemini-2.5-flash', 200, 100, true);
    recordCall('gemini', 'gemini-2.5-flash', 50, 0, false);

    const stats = getTodayStats('gemini');
    expect(stats.callsToday).toBe(3);
    expect(stats.tokensToday).toBe(500);
    expect(stats.errorsToday).toBe(1);

    const allStats = getAllProviderStats();
    expect(allStats['gemini']?.callsToday).toBe(3);
    expect(allStats['groq']?.callsToday).toBe(0);
  });
});

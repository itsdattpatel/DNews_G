/**
 * backend/src/__tests__/integration/library-history.api.test.ts
 * Integration tests for /api/library/history endpoints.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_lib_history_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import request from 'supertest';
import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';

describe('Library Historical News REST API (Category B3)', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    getDb();

    // Stub global fetch so integration tests run deterministically offline
    const mockWikimediaData = {
      events: [
        {
          text: 'The BBC begins regular television broadcasting from Alexandra Palace in London.',
          year: 1936,
          pages: [
            {
              title: 'BBC_Television_Service',
              normalizedtitle: 'BBC Television Service',
              content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/BBC_Television_Service' } },
            },
          ],
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockWikimediaData,
    }));
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('GET /api/library/history/today returns formatted historical events', async () => {
    const res = await request(app)
      .get('/api/library/history/today?month=11&day=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('date', '11-02');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);

    const first = res.body.items[0];
    expect(first).toHaveProperty('headline');
    expect(first).toHaveProperty('snippet');
    expect(first).toHaveProperty('original_url');
    expect(first).toHaveProperty('license');
    expect(first).toHaveProperty('attribution');
  });

  it('GET /api/library/history/search filters by keyword and decade', async () => {
    const res = await request(app)
      .get('/api/library/history/search?decade=1930')
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items[0].event_year).toBeGreaterThanOrEqual(1930);
      expect(res.body.items[0].event_year).toBeLessThanOrEqual(1939);
    }
  });

  it('GET /api/library/history/today validates invalid dates', async () => {
    await request(app)
      .get('/api/library/history/today?month=13&day=40')
      .expect(400);
  });
});

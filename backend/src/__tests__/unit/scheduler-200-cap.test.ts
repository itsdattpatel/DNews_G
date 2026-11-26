/**
 * backend/src/__tests__/unit/scheduler-200-cap.test.ts
 * TDD tests for 200-article cycle cap, 30-minute default polling interval,
 * rotating source cursor, and manual batch fetching.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_scheduler_cap');
process.env['NODE_ENV'] = 'test';
process.env['DATA_DIR'] = TEST_DATA_DIR;
process.env['DB_PATH'] = path.join(TEST_DATA_DIR, 'news.sqlite');

import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';
import { syncSources } from '../../pipeline/dedup';
import { stopScheduler, triggerManualFetchCycle } from '../../fetch/scheduler';
import * as rssModule from '../../fetch/rss';

describe('Backend 200-Article Cycle Cap & 30m Default', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    getDb();
    syncSources();
  });

  afterEach(() => {
    stopScheduler();
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('defaults refresh_interval_minutes to 30 and max_articles_per_cycle to 200', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.refresh_interval_minutes).toBe(30);
    expect(res.body.max_articles_per_cycle).toBe(200);
  });

  it('validates and persists max_articles_per_cycle via PATCH /api/settings', async () => {
    const bad = await request(app).patch('/api/settings').send({ max_articles_per_cycle: 5 });
    expect(bad.status).toBe(400);

    const good = await request(app).patch('/api/settings').send({ max_articles_per_cycle: 200 });
    expect(good.status).toBe(200);
    expect(good.body.max_articles_per_cycle).toBe(200);
  });

  it('stops fetching once cycle cap is reached and rotates source cursor for next batch', async () => {
    let seq = 0;
    const calledSlugs: string[] = [];
    const fetchSpy = vi
      .spyOn(rssModule, 'fetchRss')
      .mockImplementation(async (_url, slug, name, country) => {
        calledSlugs.push(slug);
        seq += 1;
        return [
          {
            url: `https://wire.test/${slug}/${seq}-a`,
            titleOriginal: `Story A from ${slug} #${seq}`,
            bodyOriginal: 'Body A',
            publishedAt: new Date().toISOString(),
            sourceSlug: slug,
            sourceName: name,
            country,
          },
          {
            url: `https://wire.test/${slug}/${seq}-b`,
            titleOriginal: `Story B from ${slug} #${seq}`,
            bodyOriginal: 'Body B',
            publishedAt: new Date().toISOString(),
            sourceSlug: slug,
            sourceName: name,
            country,
          },
        ];
      });

    const first = await (triggerManualFetchCycle as any)(true, {
      maxArticles: 8,
      advanceCursor: true,
    });
    expect(first.status).toBe('completed');
    expect(first.newCount).toBeLessThanOrEqual(8);
    expect(first.newCount).toBeGreaterThan(0);
    expect(first.cappedAt).toBe(8);
    expect(fetchSpy).toHaveBeenCalled();

    const firstRunSlugs = [...calledSlugs];
    calledSlugs.length = 0;

    const second = await (triggerManualFetchCycle as any)(true, {
      maxArticles: 8,
      advanceCursor: true,
    });
    expect(second.status).toBe('completed');
    expect(second.newCount).toBeLessThanOrEqual(8);
    expect(second.newCount).toBeGreaterThan(0);
    expect(calledSlugs.length).toBeGreaterThan(0);
    expect(calledSlugs[0]).not.toBe(firstRunSlugs[0]);
  });

  it('exposes POST /api/control-room/fetch-cycle as an alias of trigger-fetch', async () => {
    vi.spyOn(rssModule, 'fetchRss').mockResolvedValue([]);
    const res = await request(app)
      .post('/api/control-room/fetch-cycle')
      .send({ force: true, maxArticles: 200, advanceCursor: true });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cappedAt', 200);
  });
});

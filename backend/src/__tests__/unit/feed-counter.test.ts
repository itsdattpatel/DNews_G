/**
 * backend/src/__tests__/unit/feed-counter.test.ts
 * Unit tests for Live Feed Counter & Retention Immunity (PRD A Category 8).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';
import { recordFeedIngestion, getFeedCounterMetrics } from '../../services/feedCounter';

describe('Category 8: Live Feed Counter & Retention Immunity', () => {
  const testDataDir = path.resolve('backend/data_test_feed_counter');

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['DATA_DIR'] = testDataDir;
    process.env['DB_PATH'] = path.join(testDataDir, 'news.sqlite');

    if (fs.existsSync(testDataDir)) {
      try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch {}
    }

    const db = getDb();
    // Clear test tables
    try {
      db.prepare('DELETE FROM articles').run();
      db.prepare('DELETE FROM ingest_hourly').run();
      db.prepare('DELETE FROM ingest_daily').run();
      db.prepare('DELETE FROM app_sessions').run();
      db.prepare(`
        UPDATE lifetime_counter SET
          total_ingested = 0,
          total_catchup = 0,
          total_duplicates_skipped = 0
        WHERE id = 1
      `).run();
    } catch {}

    // Seed test source
    db.prepare(`
      INSERT OR IGNORE INTO sources (id, slug, name, country, url, fetch_type, enabled)
      VALUES (1, 'reuters', 'Reuters', 'USA', 'https://reuters.com/rss', 'rss', 1)
    `).run();
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(testDataDir)) {
      try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('Migration 011 creates ingest_hourly, ingest_daily, and lifetime_counter tables', () => {
    const db = getDb();
    const hourly = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ingest_hourly'").get();
    const daily = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ingest_daily'").get();
    const lifetime = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lifetime_counter'").get();

    expect(hourly).toBeDefined();
    expect(daily).toBeDefined();
    expect(lifetime).toBeDefined();

    const lifetimeRow = db.prepare('SELECT * FROM lifetime_counter WHERE id = 1').get() as any;
    expect(lifetimeRow).toBeDefined();
    expect(lifetimeRow.id).toBe(1);
    expect(lifetimeRow.total_ingested).toBeGreaterThanOrEqual(0);
  });

  it('recordFeedIngestion atomically increments hourly, daily, and lifetime counters', () => {
    const db = getDb();
    const timestamp = '2026-11-02T10:15:30.000Z';
    recordFeedIngestion({
      inserted: 12,
      catchup: 3,
      duplicatesSkipped: 5,
      timestampIso: timestamp,
    });

    const hourly = db.prepare('SELECT * FROM ingest_hourly WHERE bucket_utc = ?').get('2026-11-02T10:00:00Z') as any;
    expect(hourly).toBeDefined();
    expect(hourly.count).toBe(12);
    expect(hourly.catchup_count).toBe(3);
    expect(hourly.duplicates_skipped).toBe(5);

    const daily = db.prepare('SELECT * FROM ingest_daily WHERE date_utc = ?').get('2026-11-02') as any;
    expect(daily).toBeDefined();
    expect(daily.count).toBe(12);
    expect(daily.catchup_count).toBe(3);
    expect(daily.duplicates_skipped).toBe(5);

    const lifetime = db.prepare('SELECT * FROM lifetime_counter WHERE id = 1').get() as any;
    expect(lifetime.total_ingested).toBe(12);
    expect(lifetime.total_catchup).toBe(3);
    expect(lifetime.total_duplicates_skipped).toBe(5);
  });

  it('computes 24-hour rolling window strictly by ingested_at UTC (never published_at)', () => {
    const db = getDb();
    const now = new Date('2026-11-02T12:00:00.000Z');

    // Article 1: Ingested 2 hours ago (within 24h)
    db.prepare(`
      INSERT INTO articles (source_id, url, title_original, published_at, ingested_at, is_catchup, status)
      VALUES (1, 'https://reuters.com/art1', 'Art 1', '2026-10-15T00:00:00.000Z', '2026-11-02T10:00:00.000Z', 0, 'done')
    `).run();

    // Article 2: Ingested 10 hours ago, marked catchup (within 24h)
    db.prepare(`
      INSERT INTO articles (source_id, url, title_original, published_at, ingested_at, is_catchup, status)
      VALUES (1, 'https://reuters.com/art2', 'Art 2', '2026-10-16T00:00:00.000Z', '2026-11-02T02:00:00.000Z', 1, 'done')
    `).run();

    // Article 3: Ingested 26 hours ago (outside 24h window)
    db.prepare(`
      INSERT INTO articles (source_id, url, title_original, published_at, ingested_at, is_catchup, status)
      VALUES (1, 'https://reuters.com/art3', 'Art 3', '2026-11-02T11:00:00.000Z', '2026-11-01T10:00:00.000Z', 0, 'done')
    `).run();

    const metrics = getFeedCounterMetrics(now);
    expect(metrics.rolling24h.total).toBe(2); // Only Art 1 & Art 2
    expect(metrics.rolling24h.catchup).toBe(1); // Art 2
  });

  it('guarantees retention immunity: purging old articles leaves daily and lifetime stats intact', () => {
    const db = getDb();
    // Record historical intake on 2026-10-01
    recordFeedIngestion({
      inserted: 150,
      catchup: 10,
      duplicatesSkipped: 25,
      timestampIso: '2026-10-01T08:00:00.000Z',
    });

    // Record today's intake
    recordFeedIngestion({
      inserted: 50,
      catchup: 0,
      duplicatesSkipped: 5,
      timestampIso: '2026-11-02T08:00:00.000Z',
    });

    // Verify daily totals
    const metricsBefore = getFeedCounterMetrics(new Date('2026-11-02T12:00:00.000Z'));
    expect(metricsBefore.lifetime.total).toBe(200);

    // Simulate 30-day retention cleanup purging articles
    db.prepare('DELETE FROM articles').run();

    // The dedicated telemetry tables MUST retain historical volume
    const metricsAfter = getFeedCounterMetrics(new Date('2026-11-02T12:00:00.000Z'));
    expect(metricsAfter.lifetime.total).toBe(200);
    expect(metricsAfter.lifetime.duplicates_skipped).toBe(30);
  });

  it('accurately identifies app off hours in hourly sparkline based on app_sessions', () => {
    const db = getDb();
    const now = new Date('2026-11-02T12:00:00.000Z');

    // Create session that was active from 08:00 to 12:00
    db.prepare(`
      INSERT INTO app_sessions (id, started_at, last_heartbeat_at, ended_at, clean_shutdown, articles_ingested_in_session)
      VALUES (1, '2026-11-02T08:00:00.000Z', '2026-11-02T12:00:00.000Z', '2026-11-02T12:00:00.000Z', 1, 10)
    `).run();

    const metrics = getFeedCounterMetrics(now);
    expect(metrics.rolling24h.hourly).toHaveLength(24);

    // Hour 02:00 was when app was completely OFF (no session)
    const hour2 = metrics.rolling24h.hourly.find((h) => h.hour_utc === '2026-11-02T02:00:00Z');
    expect(hour2).toBeDefined();
    expect(hour2?.is_app_off).toBe(true);

    // Hour 10:00 was when app was running
    const hour10 = metrics.rolling24h.hourly.find((h) => h.hour_utc === '2026-11-02T10:00:00Z');
    expect(hour10).toBeDefined();
    expect(hour10?.is_app_off).toBe(false);
  });

  it('GET /api/feed/counter returns 200 with complete metrics payload', async () => {
    const app = createApp();
    const res = await request(app).get('/api/feed/counter');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rolling24h).toBeDefined();
    expect(res.body.rolling24h.hourly).toHaveLength(24);
    expect(typeof res.body.seven_day_total).toBe('number');
    expect(typeof res.body.thirty_day_total).toBe('number');
    expect(res.body.lifetime).toBeDefined();
    expect(res.body.session_stats).toBeDefined();
  });
});

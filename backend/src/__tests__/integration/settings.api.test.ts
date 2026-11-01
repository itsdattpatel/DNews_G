import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_settings_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';
import { stopScheduler, initStartupGap } from '../../fetch/scheduler';
import { syncSources } from '../../pipeline/dedup';

describe('Settings API (T1-08)', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    getDb();
    syncSources();
  });

  afterAll(() => {
    stopScheduler();
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('GET /api/settings returns current settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('refresh_interval_minutes');
    expect(res.body).toHaveProperty('sound_enabled');
    expect(res.body).toHaveProperty('evidence_highlight_enabled', true);
    expect(res.body).toHaveProperty('reading_mode_enabled', true);
  });

  it('PATCH /api/settings validates range and rejects out-of-bounds (T1-08)', async () => {
    // 0 is below minimum of 1
    const res = await request(app)
      .patch('/api/settings')
      .send({ refresh_interval_minutes: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('refresh_interval_minutes min is 1');
  });

  it('PATCH /api/settings updates valid settings', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ refresh_interval_minutes: 10, alert_threshold: 65, evidence_highlight_enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.refresh_interval_minutes).toBe(10);
    expect(res.body.alert_threshold).toBe(65);
    expect(res.body.evidence_highlight_enabled).toBe(false);
  });

  it('GET /api/startup-status returns gap and backfill capability (P5-02)', async () => {
    const res = await request(app).get('/api/startup-status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('missed_minutes');
    expect(res.body).toHaveProperty('can_backfill');
    expect(res.body).toHaveProperty('window_end');
  });

  it('POST /api/backfill triggers backfill and returns report (P5-03)', async () => {
    const res = await request(app).post('/api/backfill');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('covered_minutes');
    expect(res.body).toHaveProperty('total_missed_minutes');
  });

  it('GET /api/startup-status returns missed_minutes ~120 and can_backfill: true for 2h gap (T5-01, P5-04)', async () => {
    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    const db = getDb();
    db.prepare('UPDATE sources SET last_fetched_at = ?').run(twoHoursAgo);
    initStartupGap();

    const res = await request(app).get('/api/startup-status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.missed_minutes).toBeGreaterThanOrEqual(119);
    expect(res.body.missed_minutes).toBeLessThanOrEqual(121);
    expect(res.body.can_backfill).toBe(true);
    expect(res.body.detected).toBe(true);
  });
});

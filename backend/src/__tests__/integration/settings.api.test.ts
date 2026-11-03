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

  describe('PRD C Category 3: Unified Settings Keys & Validation', () => {
    it('GET /api/settings returns new PRD C defaults across sections', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('timezone_mode', 'local');
      expect(res.body).toHaveProperty('strip_follow_enabled', true);
      expect(res.body).toHaveProperty('strip_follow_grace_sec', 4);
      expect(res.body).toHaveProperty('ticker_speed', 'normal');
      expect(res.body).toHaveProperty('tv_method_order', 'youtube,hls,vlc');
      expect(res.body).toHaveProperty('tv_autoplay_muted', true);
      expect(res.body).toHaveProperty('tv_volume', 0.8);
      expect(res.body).toHaveProperty('tv_health_interval_min', 30);
      expect(res.body).toHaveProperty('map_engine', 'globe');
      expect(res.body).toHaveProperty('layout_density', 'comfortable');
      expect(res.body).toHaveProperty('library_citation_format', 'apa');
    });

    it('PATCH /api/settings validates strip_follow_grace_sec range (2 to 15s)', async () => {
      const lowRes = await request(app).patch('/api/settings').send({ strip_follow_grace_sec: 1 });
      expect(lowRes.status).toBe(400);
      expect(lowRes.body.error).toContain('strip_follow_grace_sec min is 2');

      const highRes = await request(app).patch('/api/settings').send({ strip_follow_grace_sec: 20 });
      expect(highRes.status).toBe(400);
      expect(highRes.body.error).toContain('strip_follow_grace_sec max is 15');

      const validRes = await request(app).patch('/api/settings').send({ strip_follow_grace_sec: 6 });
      expect(validRes.status).toBe(200);
      expect(validRes.body.strip_follow_grace_sec).toBe(6);
    });

    it('PATCH /api/settings validates tv_volume bounds (0.0 to 1.0)', async () => {
      const invalidRes = await request(app).patch('/api/settings').send({ tv_volume: 1.5 });
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toContain('tv_volume max is 1');

      const validRes = await request(app).patch('/api/settings').send({ tv_volume: 0.65 });
      expect(validRes.status).toBe(200);
      expect(validRes.body.tv_volume).toBe(0.65);
    });

    it('GET /api/settings/export strictly redacts sensitive keys and API tokens', async () => {
      const res = await request(app).get('/api/settings/export');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('app', 'ai-world-news-desk');
      expect(res.body).toHaveProperty('settings');
      const exportedKeys = Object.keys(res.body.settings);
      for (const k of exportedKeys) {
        expect(k).not.toMatch(/api[_-]?key/i);
        expect(k).not.toMatch(/secret/i);
        expect(k).not.toMatch(/token/i);
        expect(k).not.toMatch(/password/i);
      }
    });
  });
});

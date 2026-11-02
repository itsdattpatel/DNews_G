/**
 * backend/src/__tests__/unit/auto-advance-settings.test.ts
 * Category 2 Auto-Advance Settings API validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';

describe('Category 2: Auto-Advance Settings API (PRD A 2.2)', () => {
  const app = createApp();

  beforeEach(() => {
    process.env['DATA_DIR'] = './data_test_autoadvance';
    const db = getDb();
    db.prepare("DELETE FROM settings WHERE key LIKE 'auto_advance_%'").run();
  });

  it('returns default auto-advance settings in GET /api/settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.auto_advance_enabled).toBe(false);
    expect(res.body.auto_advance_interval_sec).toBe(7);
    expect(res.body.auto_advance_pause_on_hover).toBe(true);
  });

  it('updates auto-advance interval within valid bounds (3 to 60 seconds)', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({
        auto_advance_enabled: true,
        auto_advance_interval_sec: 15,
        auto_advance_pause_on_hover: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.auto_advance_enabled).toBe(true);
    expect(res.body.auto_advance_interval_sec).toBe(15);
    expect(res.body.auto_advance_pause_on_hover).toBe(false);
  });

  it('rejects auto-advance interval below 3 or above 60 with 400 VALIDATION_ERROR', async () => {
    const lowRes = await request(app)
      .patch('/api/settings')
      .send({ auto_advance_interval_sec: 2 });
    expect(lowRes.status).toBe(400);
    expect(lowRes.body.error).toContain('auto_advance_interval_sec min is 3');

    const highRes = await request(app)
      .patch('/api/settings')
      .send({ auto_advance_interval_sec: 65 });
    expect(highRes.status).toBe(400);
    expect(highRes.body.error).toContain('auto_advance_interval_sec max is 60');
  });
});

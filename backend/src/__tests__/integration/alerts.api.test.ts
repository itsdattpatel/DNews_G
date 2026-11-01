/**
 * backend/src/__tests__/integration/alerts.api.test.ts
 * Integration tests for Alerts API endpoints (P6-09).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
}));

import { createApp } from '../../app';

function setupSchema(db: Database.Database) {
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
}

describe('Alerts API (P6-09)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();
  });

  afterEach(() => {
    testDb.close();
  });

  it('GET /api/alerts returns alert history with acknowledged filter', async () => {
    testDb.prepare(`
      INSERT INTO alerts (type, message, fired_at, acknowledged) VALUES
      ('breaking', 'Alert 1 Unack', datetime('now', '-5 minutes'), 0),
      ('breaking', 'Alert 2 Ack', datetime('now', '-10 minutes'), 1)
    `).run();

    const resUnack = await request(app).get('/api/alerts?acknowledged=false');
    expect(resUnack.status).toBe(200);
    expect(resUnack.body.items).toHaveLength(1);
    expect(resUnack.body.items[0].message).toBe('Alert 1 Unack');
    expect(resUnack.body.items[0].acknowledged).toBe(false);

    const resAll = await request(app).get('/api/alerts');
    expect(resAll.status).toBe(200);
    expect(resAll.body.items).toHaveLength(2);
  });

  it('PATCH /api/alerts/:id/acknowledge marks alert acknowledged', async () => {
    const res = testDb.prepare(`
      INSERT INTO alerts (type, message, fired_at, acknowledged) VALUES
      ('breaking', 'Alert to acknowledge', datetime('now'), 0)
    `).run();
    const id = Number(res.lastInsertRowid);

    const patchRes = await request(app).patch(`/api/alerts/${id}/acknowledge`);
    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toEqual({ acknowledged: true });

    const updated = testDb.prepare('SELECT acknowledged FROM alerts WHERE id = ?').get(id) as { acknowledged: number };
    expect(updated.acknowledged).toBe(1);
  });

  it('PATCH /api/alerts/:id/acknowledge returns 404 for nonexistent alert', async () => {
    const patchRes = await request(app).patch('/api/alerts/99999/acknowledge');
    expect(patchRes.status).toBe(404);
  });
});

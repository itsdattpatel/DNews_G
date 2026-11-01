/**
 * backend/src/__tests__/integration/watchlist.api.test.ts
 * Integration tests for Watchlist API (P8-01).
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

describe('Watchlist API (P8-01)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();
  });

  afterEach(() => {
    testDb.close();
  });

  it('GET /api/watchlist returns list of tracked topics', async () => {
    testDb.prepare(`
      INSERT INTO watchlist (topic, keywords, priority, enabled)
      VALUES ('bear bile trade', '["bear","bile","trade"]', 'high', 1)
    `).run();

    const res = await request(app).get('/api/watchlist');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual({
      id: 1,
      topic: 'bear bile trade',
      keywords: ['bear', 'bile', 'trade'],
      priority: 'high',
      enabled: true,
      created_at: expect.any(String),
    });
  });

  it('POST /api/watchlist creates a new topic monitor', async () => {
    const payload = {
      topic: 'Pangolin Poaching',
      keywords: ['pangolin', 'scales', 'trafficking'],
      priority: 'high',
    };

    const res = await request(app).post('/api/watchlist').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.topic).toBe('Pangolin Poaching');
    expect(res.body.keywords).toEqual(['pangolin', 'scales', 'trafficking']);
    expect(res.body.enabled).toBe(true);

    const saved = testDb.prepare('SELECT * FROM watchlist WHERE id = ?').get(res.body.id) as { topic: string };
    expect(saved.topic).toBe('Pangolin Poaching');
  });

  it('POST /api/watchlist returns 400 on missing or invalid payload', async () => {
    const res = await request(app).post('/api/watchlist').send({ topic: '' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/watchlist/:id updates enabled and priority flags', async () => {
    const ins = testDb.prepare(`
      INSERT INTO watchlist (topic, keywords, priority, enabled)
      VALUES ('Coral Bleaching', '["coral","reef"]', 'normal', 1)
    `).run();
    const id = Number(ins.lastInsertRowid);

    const res = await request(app).patch(`/api/watchlist/${id}`).send({
      enabled: false,
      priority: 'high',
    });

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.priority).toBe('high');

    const updated = testDb.prepare('SELECT enabled, priority FROM watchlist WHERE id = ?').get(id) as {
      enabled: number;
      priority: string;
    };
    expect(updated.enabled).toBe(0);
    expect(updated.priority).toBe('high');
  });

  it('DELETE /api/watchlist/:id deletes the topic monitor', async () => {
    const ins = testDb.prepare(`
      INSERT INTO watchlist (topic, keywords, priority, enabled)
      VALUES ('Illegal Timber', '["timber","logging"]', 'low', 1)
    `).run();
    const id = Number(ins.lastInsertRowid);

    const res = await request(app).delete(`/api/watchlist/${id}`);
    expect([200, 204]).toContain(res.status);

    const count = testDb.prepare('SELECT COUNT(*) as count FROM watchlist WHERE id = ?').get(id) as { count: number };
    expect(count.count).toBe(0);
  });
});

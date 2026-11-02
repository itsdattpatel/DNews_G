/**
 * backend/src/__tests__/unit/session-manager.test.ts
 * Real-Time Foundation Unit Tests (PRD A Category 1B)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';
import {
  initAppSession,
  closeAppSession,
  recordSessionArticlesIngested,
  getCurrentSession,
  getDowntimeGap,
} from '../../services/sessionManager';

describe('Real-Time Foundation & Session Manager (PRD A Category 1B)', () => {
  beforeEach(() => {
    // Ensure clean in-memory or fresh DB for tests
    process.env['DATA_DIR'] = './data_test_session';
    const db = getDb();
    db.prepare('DELETE FROM app_sessions').run();
  });

  afterEach(() => {
    closeAppSession('clean');
    closeDb();
  });

  it('initializes a new app session with heartbeat and started_at', () => {
    const res = initAppSession();
    expect(res.sessionId).toBeGreaterThan(0);
    expect(res.gapDetected).toBe(false);

    const session = getCurrentSession();
    expect(session).not.toBeNull();
    expect(session?.id).toBe(res.sessionId);
    expect(session?.clean_shutdown).toBe(0);
    expect(session?.ended_at).toBeNull();
    expect(session?.started_at).toMatch(/Z$/);
    expect(session?.last_heartbeat_at).toMatch(/Z$/);
  });

  it('increments articles_ingested_in_session on recordSessionArticlesIngested', () => {
    initAppSession();
    recordSessionArticlesIngested(5);
    recordSessionArticlesIngested(3);

    const session = getCurrentSession();
    expect(session?.articles_ingested_in_session).toBe(8);
  });

  it('closes session cleanly with clean_shutdown = 1 and end_reason = "clean"', () => {
    const res = initAppSession();
    closeAppSession('clean');

    const db = getDb();
    const row = db
      .prepare('SELECT * FROM app_sessions WHERE id = ?')
      .get(res.sessionId) as any;

    expect(row.clean_shutdown).toBe(1);
    expect(row.end_reason).toBe('clean');
    expect(row.ended_at).toMatch(/Z$/);
  });

  it('detects unclean exit / crash from previous session with gap >= 5 minutes', () => {
    const db = getDb();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    // Simulate a crashed previous session: ended_at is null
    db.prepare(`
      INSERT INTO app_sessions
        (started_at, last_heartbeat_at, ended_at, clean_shutdown, end_reason, articles_ingested_in_session)
      VALUES
        (?, ?, NULL, 0, NULL, 12)
    `).run(tenMinutesAgo, tenMinutesAgo);

    const res = initAppSession();
    expect(res.gapDetected).toBe(true);
    expect(res.missedMinutes).toBeGreaterThanOrEqual(9);
    expect(res.missedWindowStart).toBe(tenMinutesAgo);

    const gap = getDowntimeGap();
    expect(gap.detected).toBe(true);
    expect(gap.previousClean).toBe(false);

    // Verify previous session was reconciled to unclean
    const prev = db.prepare('SELECT * FROM app_sessions ORDER BY id ASC LIMIT 1').get() as any;
    expect(prev.clean_shutdown).toBe(0);
    expect(prev.end_reason).toBe('unclean');
    expect(prev.ended_at).toBe(tenMinutesAgo);
  });

  it('serves /api/time and /api/session/current correctly via Express', async () => {
    initAppSession();
    const app = createApp();

    const timeRes = await request(app).get('/api/time');
    expect(timeRes.status).toBe(200);
    expect(timeRes.body.utc).toMatch(/Z$/);
    expect(typeof timeRes.body.timestamp).toBe('number');

    const sessionRes = await request(app).get('/api/session/current');
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.status).toBe('ok');
    expect(sessionRes.body.session).toBeDefined();
    expect(sessionRes.body.downtime).toBeDefined();
  });
});


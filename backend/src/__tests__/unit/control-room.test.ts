/**
 * backend/src/__tests__/unit/control-room.test.ts
 * Unit tests for Control Room Telemetry, Error Ledger & Scheduler Metrics (PRD A Category 11).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';
import {
  logSystemError,
  getSystemErrors,
  clearSystemErrors,
  updateSourceTelemetry,
  getControlRoomTelemetry,
} from '../../services/controlRoom';
import * as scheduler from '../../fetch/scheduler';
import * as aiRouter from '../../ai/router';

describe('Category 11: Control Room Telemetry & Error Ledger', () => {
  const testDataDir = path.resolve('backend/data_test_control_room');

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['DATA_DIR'] = testDataDir;
    process.env['DB_PATH'] = path.join(testDataDir, 'news.sqlite');

    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {}
    }

    const db = getDb();
    try {
      db.prepare('DELETE FROM system_errors').run();
      db.prepare('DELETE FROM articles').run();
      db.prepare('DELETE FROM sources').run();
    } catch {}

    // Seed test source
    db.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type, enabled, last_fetched_at, last_latency_ms, error_count, last_status)
      VALUES (1, 'in_hindu', 'The Hindu', 'India', 'https://thehindu.com/rss', 'rss', 1, datetime('now'), 120, 0, 'ok'),
             (2, 'us_reuters', 'Reuters', 'USA', 'https://reuters.com/rss', 'rss', 1, datetime('now', '-2 hours'), 350, 0, 'ok'),
             (3, 'uk_bbc', 'BBC News', 'UK', 'https://bbc.com/rss', 'rss', 1, datetime('now', '-10 hours'), 450, 3, 'failing')
    `).run();
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {}
    }
    vi.restoreAllMocks();
  });

  describe('1. Error Ledger (System Errors)', () => {
    it('logs system errors with timestamp, subsystem, level and details', () => {
      const err = logSystemError(
        'fetcher',
        'Timeout connecting to upstream RSS feed',
        'error',
        { code: 'ETIMEDOUT', source: 'uk_bbc' }
      );

      expect(err).toBeDefined();
      expect(err.id).toBeGreaterThan(0);
      expect(err.subsystem).toBe('fetcher');
      expect(err.level).toBe('error');
      expect(err.message).toBe('Timeout connecting to upstream RSS feed');
      expect(err.details).toContain('ETIMEDOUT');
      expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('filters system errors by subsystem, level, and search term', () => {
      logSystemError('ai', 'AI rate limit encountered', 'warn', { provider: 'groq' });
      logSystemError('fetcher', 'DNS resolution failed', 'error');
      logSystemError('tv', 'HLS proxy playlist empty', 'error');
      logSystemError('system', 'Backup snapshot saved', 'info');

      // Filter by subsystem
      const aiErrors = getSystemErrors({ subsystem: 'ai' });
      expect(aiErrors.total).toBe(1);
      expect(aiErrors.items[0]?.subsystem).toBe('ai');

      // Filter by level
      const warnErrors = getSystemErrors({ level: 'warn' });
      expect(warnErrors.total).toBe(1);
      expect(warnErrors.items[0]?.level).toBe('warn');

      // Search term
      const searchErrors = getSystemErrors({ q: 'resolution' });
      expect(searchErrors.total).toBe(1);
      expect(searchErrors.items[0]?.message).toContain('DNS resolution');

      // Pagination
      const page1 = getSystemErrors({ limit: 2, offset: 0 });
      expect(page1.items.length).toBe(2);
      expect(page1.total).toBe(4);
    });

    it('clears system errors correctly', () => {
      logSystemError('ai', 'Error 1', 'error');
      logSystemError('tv', 'Error 2', 'error');
      expect(getSystemErrors().total).toBe(2);

      const cleared = clearSystemErrors();
      expect(cleared).toBe(2);
      expect(getSystemErrors().total).toBe(0);
    });
  });

  describe('2. Source Freshness & Telemetry', () => {
    it('updates source latency and clears error status on successful fetch', () => {
      updateSourceTelemetry('in_hindu', 185, null);

      const db = getDb();
      const row = db.prepare('SELECT last_latency_ms, last_status, error_count, last_error FROM sources WHERE slug = ?')
        .get('in_hindu') as any;

      expect(row.last_latency_ms).toBe(185);
      expect(row.last_status).toBe('ok');
      expect(row.last_error).toBeNull();
    });

    it('records error count and error message on failed fetch', () => {
      updateSourceTelemetry('in_hindu', 520, 'HTTP 503 Service Unavailable');

      const db = getDb();
      const row = db.prepare('SELECT last_latency_ms, last_status, error_count, last_error FROM sources WHERE slug = ?')
        .get('in_hindu') as any;

      expect(row.last_latency_ms).toBe(520);
      expect(row.last_status).toBe('failing');
      expect(row.error_count).toBe(1);
      expect(row.last_error).toBe('HTTP 503 Service Unavailable');
    });
  });

  describe('3. Telemetry Aggregator (getControlRoomTelemetry)', () => {
    it('aggregates sources, scheduler, queues, storage, and error statistics', () => {
      const db = getDb();
      // Insert sample articles across different queues
      db.prepare(`
        INSERT INTO articles (source_id, url, title_english, status, breaking_score, pass1_completed_at, pass2_completed_at)
        VALUES (1, 'https://example.com/1', 'Pending Article', 'pending', 0, NULL, NULL),
               (1, 'https://example.com/2', 'Pass 1 Triaged', 'done', 55, datetime('now'), NULL),
               (1, 'https://example.com/3', 'Pass 2 Enriched', 'done', 85, datetime('now'), datetime('now')),
               (1, 'https://example.com/4', 'AI Failed Article', 'ai_failed', 0, NULL, NULL)
      `).run();

      logSystemError('scheduler', 'Cycle delay alert', 'warn');

      const telemetry = getControlRoomTelemetry();

      expect(telemetry.server_time).toBeDefined();
      expect(telemetry.sources.length).toBe(3);
      expect(telemetry.source_summary.total).toBe(3);
      expect(telemetry.source_summary.enabled).toBe(3);

      // Verify Queues
      expect(telemetry.queues.pending).toBe(1);
      expect(telemetry.queues.done).toBe(2);
      expect(telemetry.queues.ai_failed).toBe(1);
      expect(telemetry.queues.pass1_triaged).toBe(2);
      expect(telemetry.queues.pass2_enriched).toBe(1);
      expect(telemetry.queues.pass2_deferred).toBe(1);

      // Verify Scheduler & AI Providers
      expect(telemetry.scheduler.interval_minutes).toBeGreaterThanOrEqual(1);
      expect(telemetry.ai_providers.chain.length).toBeGreaterThan(0);
      expect(telemetry.ai_providers.current_provider).toBeDefined();

      // Verify Storage & DB thresholds
      expect(telemetry.storage.db_path).toBeDefined();
      expect(telemetry.storage.warning_threshold_mb).toBe(1536);
      expect(telemetry.storage.limit_threshold_mb).toBe(2048);
      expect(telemetry.storage.total_articles).toBe(4);

      // Verify Error Summary
      expect(telemetry.error_summary.total_24h).toBe(1);
      expect(telemetry.error_summary.by_subsystem.scheduler).toBe(1);
      expect(telemetry.error_summary.by_level.warn).toBe(1);
    });
  });

  describe('4. REST API Endpoints', () => {
    it('GET /api/control-room/telemetry returns 200 with full telemetry structure', async () => {
      const app = createApp();
      const res = await request(app).get('/api/control-room/telemetry');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('server_time');
      expect(res.body).toHaveProperty('sources');
      expect(res.body).toHaveProperty('source_summary');
      expect(res.body).toHaveProperty('scheduler');
      expect(res.body).toHaveProperty('ai_providers');
      expect(res.body).toHaveProperty('queues');
      expect(res.body).toHaveProperty('storage');
      expect(res.body).toHaveProperty('modes');
      expect(res.body).toHaveProperty('error_summary');
    });

    it('GET /api/control-room/errors returns paginated list and supports filters', async () => {
      logSystemError('tv', 'Test TV Error', 'error');
      logSystemError('ai', 'Test AI Warn', 'warn');

      const app = createApp();
      const res = await request(app).get('/api/control-room/errors?subsystem=tv');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].message).toBe('Test TV Error');
    });

    it('POST /api/control-room/errors/clear deletes records', async () => {
      logSystemError('db', 'Test DB Error', 'error');

      const app = createApp();
      const res = await request(app).post('/api/control-room/errors/clear').send({});

      expect(res.status).toBe(200);
      expect(res.body.cleared).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('POST /api/control-room/trigger-fetch triggers manual cycle', async () => {
      vi.spyOn(scheduler, 'triggerManualFetchCycle').mockResolvedValueOnce({
        status: 'completed',
        fetched: 15,
        newCount: 4,
        durationMs: 420,
      });

      const app = createApp();
      const res = await request(app).post('/api/control-room/trigger-fetch').send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.fetched).toBe(15);
      expect(res.body.newCount).toBe(4);
    });
  });
});


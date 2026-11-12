import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_sse_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';
import { syncSources } from '../../pipeline/dedup';
import { stopScheduler } from '../../fetch/scheduler';
import {
  emitSseEvent,
  getLatestSseEventId,
  __resetSseForTests,
} from '../../routes/sse';

interface ParsedFrame {
  id?: number;
  event?: string;
  data: any;
}

function collectSseFrames(
  baseUrl: string,
  opts: { since?: number; headers?: Record<string, string>; expectedFrames: number; timeoutMs?: number },
): Promise<{ frames: ParsedFrame[]; close: () => void }> {
  return new Promise((resolve, reject) => {
    const query = opts.since !== undefined ? `?since=${opts.since}` : '';
    const url = new URL(`${baseUrl}/api/sse${query}`);
    const frames: ParsedFrame[] = [];
    let buffer = '';
    let settled = false;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(opts.headers ?? {}),
        },
      },
      (res) => {
        res.setEncoding('utf8');
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve({ frames, close: () => req.destroy() });
          }
        };

        res.on('data', (chunk: string) => {
          buffer += chunk.replace(/\r\n/g, '\n');
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const rawBlock of parts) {
            if (!rawBlock.trim()) continue;
            let id: number | undefined;
            let event: string | undefined;
            const dataLines: string[] = [];
            for (const line of rawBlock.split('\n')) {
              if (line.startsWith('id:')) {
                const parsed = parseInt(line.slice(3).trim(), 10);
                if (!Number.isNaN(parsed)) id = parsed;
              } else if (line.startsWith('event:')) {
                event = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }
            const rawData = dataLines.join('\n');
            let parsedData: any = rawData;
            try {
              parsedData = rawData ? JSON.parse(rawData) : {};
            } catch {
              // leave raw
            }
            frames.push({ ...(id !== undefined ? { id } : {}), ...(event ? { event } : {}), data: parsedData });
          }

          if (frames.length >= opts.expectedFrames) {
            clearTimeout(timer);
            finish();
          }
        });

        const timer = setTimeout(() => {
          finish();
        }, opts.timeoutMs ?? 800);
      },
    );

    req.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    req.end();
  });
}

describe('SSE Replay Buffer, Live Producers & Categories Counts API (PRD D Cat 4)', () => {
  let server: http.Server;
  let baseUrl: string;
  let sampleArticleId: number;
  let sampleChannelId: number;
  let sampleAlertId: number;
  let sampleSourceId: number;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    const db = getDb();
    syncSources();

    const source = db.prepare('SELECT id FROM sources LIMIT 1').get() as { id: number };
    sampleSourceId = source.id;

    const artRes = db.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score)
      VALUES (?, 'https://example.com/sse-test-1', 'Initial SSE Title', 'Initial Summary', 'done', 60)
    `).run(sampleSourceId);
    sampleArticleId = Number(artRes.lastInsertRowid);
    db.prepare('INSERT INTO article_categories (article_id, category) VALUES (?, ?)').run(sampleArticleId, 'World');
    db.prepare('INSERT INTO article_categories (article_id, category) VALUES (?, ?)').run(sampleArticleId, 'Tech');

    const chRes = db.prepare(`
      INSERT INTO tv_channels (name, country, country_code, stream_url, category, is_alive)
      VALUES ('SSE Probe TV', 'India', 'IN', 'https://example.com/live.m3u8', 'News', 1)
    `).run();
    sampleChannelId = Number(chRes.lastInsertRowid);

    const alRes = db.prepare(`
      INSERT INTO alerts (type, message, acknowledged)
      VALUES ('breaking', 'Test SSE Alert Row', 0)
    `).run();
    sampleAlertId = Number(alRes.lastInsertRowid);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    __resetSseForTests();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    stopScheduler();
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('assigns monotonic numeric IDs to domain events and omits id on connected frame', async () => {
    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 3, timeoutMs: 600 });
    await new Promise((r) => setTimeout(r, 60));

    const id1 = emitSseEvent('new_article', { article_id: sampleArticleId });
    const id2 = emitSseEvent('cluster_update', { cluster_id: 1, outlet_count: 2 });

    const { frames, close } = await connPromise;
    close();

    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(getLatestSseEventId()).toBe(2);

    expect(frames[0]?.event).toBe('connected');
    expect(frames[0]?.id).toBeUndefined();
    expect(frames[1]?.event).toBe('new_article');
    expect(frames[1]?.id).toBe(1);
    expect(frames[2]?.event).toBe('cluster_update');
    expect(frames[2]?.id).toBe(2);
  });

  it('replays missed events when reconnecting with ?since= or Last-Event-ID', async () => {
    const id1 = emitSseEvent('new_article', { article_id: 101 });
    emitSseEvent('cluster_update', { cluster_id: 7, outlet_count: 3 });
    emitSseEvent('alert', { id: 9, message: 'Missed Breaking' });

    const { frames: queryFrames, close: close1 } = await collectSseFrames(baseUrl, {
      since: id1,
      expectedFrames: 3,
      timeoutMs: 400,
    });
    close1();

    expect(queryFrames.map((f) => f.event)).toEqual(['connected', 'cluster_update', 'alert']);
    expect(queryFrames[1]?.id).toBe(2);
    expect(queryFrames[2]?.id).toBe(3);

    const { frames: headerFrames, close: close2 } = await collectSseFrames(baseUrl, {
      headers: { 'Last-Event-ID': String(id1) },
      expectedFrames: 3,
      timeoutMs: 400,
    });
    close2();

    expect(headerFrames.map((f) => f.event)).toEqual(['connected', 'cluster_update', 'alert']);
  });

  it('emits resync_required when client cursor fell behind ring buffer or server restarted', async () => {
    for (let i = 0; i < 1005; i++) {
      emitSseEvent('feed_counter_update', { seq: i });
    }

    const { frames: expiredFrames, close: close1 } = await collectSseFrames(baseUrl, {
      since: 1,
      expectedFrames: 2,
      timeoutMs: 400,
    });
    close1();

    const expiredResync = expiredFrames.find((f) => f.event === 'resync_required');
    expect(expiredResync).toBeDefined();
    expect(expiredResync?.data.reason).toBe('cursor_expired');

    const { frames: restartFrames, close: close2 } = await collectSseFrames(baseUrl, {
      since: 999999,
      expectedFrames: 2,
      timeoutMs: 400,
    });
    close2();

    const restartResync = restartFrames.find((f) => f.event === 'resync_required');
    expect(restartResync).toBeDefined();
    expect(restartResync?.data.reason).toBe('server_restarted');
  });

  it('validates live_refresh_interval_sec (2-30, default 5) and emits settings_update', async () => {
    const initialRes = await request(app).get('/api/settings');
    expect(initialRes.status).toBe(200);
    expect(initialRes.body.live_refresh_interval_sec).toBe(5);

    const lowRes = await request(app).patch('/api/settings').send({ live_refresh_interval_sec: 1 });
    expect(lowRes.status).toBe(400);

    const highRes = await request(app).patch('/api/settings').send({ live_refresh_interval_sec: 31 });
    expect(highRes.status).toBe(400);

    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 2, timeoutMs: 500 });
    await new Promise((r) => setTimeout(r, 50));

    const okRes = await request(app).patch('/api/settings').send({ live_refresh_interval_sec: 9 });
    expect(okRes.status).toBe(200);
    expect(okRes.body.live_refresh_interval_sec).toBe(9);

    const { frames, close } = await connPromise;
    close();
    const evt = frames.find((f) => f.event === 'settings_update');
    expect(evt).toBeDefined();
    expect(evt?.data.settings.live_refresh_interval_sec).toBe(9);
  });

  it('emits live SSE events for article update, bookmark, alert ack, watchlist, tv, and source toggle', async () => {
    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 9, timeoutMs: 900 });
    await new Promise((r) => setTimeout(r, 60));

    await request(app)
      .patch(`/api/articles/${sampleArticleId}`)
      .send({ title_english: 'Updated Headline Live' })
      .expect(200);

    await request(app)
      .patch(`/api/articles/${sampleArticleId}/bookmark`)
      .send({ bookmarked: true })
      .expect(200);

    await request(app)
      .patch(`/api/alerts/${sampleAlertId}/acknowledge`)
      .expect(200);

    const wlRes = await request(app)
      .post('/api/watchlist')
      .send({ topic: 'Quantum Diplomacy', keywords: ['quantum', 'diplomacy'], priority: 'high' })
      .expect(201);

    await request(app)
      .patch('/api/tv/channels/' + sampleChannelId + '/favorite')
      .send({ is_favorite: true })
      .expect(200);

    await request(app)
      .post(`/api/tv/health/${sampleChannelId}/record`)
      .send({ method: 'hls', success: true, latency_ms: 42 })
      .expect(200);

    await request(app)
      .patch(`/api/sources/${sampleSourceId}`)
      .send({ enabled: true })
      .expect(200);

    await request(app)
      .delete(`/api/watchlist/${wlRes.body.id}`)
      .expect(200);

    const { frames, close } = await connPromise;
    close();

    const eventNames = frames.map((f) => f.event);
    expect(eventNames).toContain('article_updated');
    expect(eventNames).toContain('bookmark_update');
    expect(eventNames).toContain('alert_acknowledged');
    expect(eventNames).toContain('watchlist_update');
    expect(eventNames).toContain('tv_health_update');
    expect(eventNames).toContain('control_room_update');
  });

  it('returns accurate category counts from GET /api/articles/categories/counts', async () => {
    const res = await request(app).get('/api/articles/categories/counts');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.categories).toMatchObject({
      World: 1,
      Tech: 1,
    });
  });
});

/**
 * backend/src/__tests__/integration/library-realtime.api.test.ts
 * TDD Red-Green-Refactor integration suite for PRD D Category 6:
 * Library live-update REST mutations, SSE event emission, replay cursor,
 * background refresh status, and live source/license provenance (L1-L7).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

const TEST_DATA_DIR = path.join(__dirname, '../../../data_test_lib_realtime_api');
process.env['DATA_DIR'] = TEST_DATA_DIR;

import { getDb, closeDb } from '../../db/db';
import { app } from '../../app';
import { stopScheduler } from '../../fetch/scheduler';
import { __resetSseForTests } from '../../routes/sse';

interface ParsedFrame {
  id?: number;
  event?: string;
  data: any;
}

function collectSseFrames(
  baseUrl: string,
  opts: { since?: number; expectedFrames: number; timeoutMs?: number },
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
        headers: { Accept: 'text/event-stream' },
      },
      (res) => {
        res.setEncoding('utf8');
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve({ frames, close: () => req.destroy() });
          }
        };

        const timer = setTimeout(finish, opts.timeoutMs ?? 900);

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
              // ignore non-json comments
            }
            frames.push({
              ...(id !== undefined ? { id } : {}),
              ...(event ? { event } : {}),
              data: parsedData,
            });
          }

          if (frames.length >= opts.expectedFrames) {
            clearTimeout(timer);
            finish();
          }
        });
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

describe('Library Real-Time API & SSE Integration (PRD D Cat 6)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    getDb();

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
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    stopScheduler();
    closeDb();
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('includes migration 015 meaning_reviewed and commentary_source columns', () => {
    const db = getDb();
    const verseCols = (db.prepare('PRAGMA table_info(library_verses)').all() as Array<{ name: string }>).map(
      (c) => c.name,
    );
    const quoteCols = (db.prepare('PRAGMA table_info(library_quotes)').all() as Array<{ name: string }>).map(
      (c) => c.name,
    );

    expect(verseCols).toContain('meaning_reviewed');
    expect(quoteCols).toContain('meaning_reviewed');
    expect(quoteCols).toContain('commentary_source');
  });

  it('L1/L2/L6: POST & PATCH /api/library/history persist records and emit library_history_update SSE frames', async () => {
    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 3, timeoutMs: 1000 });
    await new Promise((r) => setTimeout(r, 60));

    const createRes = await request(app)
      .post('/api/library/history')
      .send({
        source_slug: 'wikimedia_onthisday',
        event_date: '11-12',
        event_year: 1928,
        headline: 'Archival Telegraph Standardization Treaty Signed',
        snippet: 'Delegates adopt uniform maritime wire protocols across twelve ports.',
        original_url: 'https://en.wikipedia.org/wiki/Telegraph_Treaty_1928',
        license: 'CC BY-SA 4.0',
        attribution: 'Wikimedia Community Contributors',
      });

    expect(createRes.status).toBe(201);
    const createdId = createRes.body.record.id;
    expect(createdId).toBeGreaterThan(0);

    const patchRes = await request(app)
      .patch(`/api/library/history/${createdId}`)
      .send({
        headline: 'Archival Telegraph Standardization Treaty Signed (Revised)',
        license: 'CC BY 4.0',
        attribution: 'Wikimedia History Archive & UN ITU Registry',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.record.license).toBe('CC BY 4.0');

    const { frames, close } = await connPromise;
    close();

    const historyFrames = frames.filter((f) => f.event === 'library_history_update');
    expect(historyFrames.length).toBe(2);
    expect(historyFrames[0]?.data.action).toBe('created');
    expect(historyFrames[0]?.data.record.id).toBe(createdId);
    expect(historyFrames[1]?.data.action).toBe('updated');
    expect(historyFrames[1]?.data.record.attribution).toContain('UN ITU Registry');
  });

  it('L3/L6: POST & PATCH /api/library/wisdom/verses and quotes support meaning review, provenance updates, and SSE', async () => {
    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 5, timeoutMs: 1200 });
    await new Promise((r) => setTimeout(r, 60));

    const verseCreate = await request(app)
      .post('/api/library/wisdom/verses')
      .send({
        book_slug: 'bhagavad_gita',
        section_number: 2,
        verse_number: 99,
        verse_ref: 'BG 2.99',
        text_original: 'स्थिरः कर्मणि तिष्ठति',
        translation_english: 'Steadiness in action outlasts fevered attachment to outcomes.',
        translator: 'Public Domain Desk Translation',
        plain_meaning: 'Draft plain-language note.',
        source_url: 'https://sacred-texts.example.test/gita/2/99',
        source_license: 'Public Domain',
        theme_tags: 'duty,focus',
      });

    expect(verseCreate.status).toBe(201);
    const verseId = verseCreate.body.record.id;

    const versePatch = await request(app)
      .patch(`/api/library/wisdom/verses/${verseId}`)
      .send({
        plain_meaning: 'Approved reflection: Act cleanly with steady attention, untethered from anxious outcomes.',
        meaning_reviewed: 1,
        source_license: 'CC0 1.0 Public Domain',
        source_url: 'https://sacred-texts.example.test/gita/2/99',
      });

    expect(versePatch.status).toBe(200);
    expect(versePatch.body.record.meaning_reviewed).toBe(1);
    expect(versePatch.body.record.source_license).toBe('CC0 1.0 Public Domain');

    const quoteCreate = await request(app)
      .post('/api/library/wisdom/quotes')
      .send({
        quote_text: 'Measured ink steadies a hurried mind.',
        author: 'Marcus Aurelius Desk Folio',
        work_title: 'Meditations (Test Import)',
        tradition: 'Stoic',
        source_url: 'https://en.wikisource.org/wiki/Meditations',
        source_license: 'Public Domain',
        attribution: 'Loeb Archival Reprint',
        plain_meaning: 'Initial quote gloss.',
        is_verified: 1,
      });

    expect(quoteCreate.status).toBe(201);
    const quoteId = quoteCreate.body.record.id;

    const quotePatch = await request(app)
      .patch(`/api/library/wisdom/quotes/${quoteId}`)
      .send({
        plain_meaning: 'Approved commentary: Slow deliberate review prevents reactive errors.',
        meaning_reviewed: 1,
        commentary_source: 'Editorial Wisdom Review Board',
        source_license: 'CC BY 4.0',
        attribution: 'Loeb & Stanford Stoic Archive',
      });

    expect(quotePatch.status).toBe(200);
    expect(quotePatch.body.record.meaning_reviewed).toBe(1);
    expect(quotePatch.body.record.commentary_source).toBe('Editorial Wisdom Review Board');

    const { frames, close } = await connPromise;
    close();

    const wisdomFrames = frames.filter((f) => f.event === 'library_wisdom_update');
    expect(wisdomFrames.length).toBe(4);
    expect(wisdomFrames.map((f) => `${f.data.kind}:${f.data.action}`)).toEqual([
      'verse:created',
      'verse:updated',
      'quote:created',
      'quote:updated',
    ]);
    expect(wisdomFrames[1]?.data.record.meaning_reviewed).toBe(1);
    expect(wisdomFrames[3]?.data.record.source_license).toBe('CC BY 4.0');
  });

  it('L4/L6: POST & PATCH /api/library/mind/cards create/update cards and emit library_mind_update SSE frames', async () => {
    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 3, timeoutMs: 1000 });
    await new Promise((r) => setTimeout(r, 60));

    const createCard = await request(app)
      .post('/api/library/mind/cards')
      .send({
        slug: 'test-anchor-breathing-446',
        title: '4-4-6 Anchoring Breath',
        category: 'stress',
        what_it_is: 'Paced exhalation technique to settle acute tension.',
        when_it_helps: 'Between heavy reading blocks or breaking wire alerts.',
        steps: ['Inhale 4 seconds', 'Hold 4 seconds', 'Exhale 6 seconds'],
        time_needed_minutes: 3,
        source_book: 'APA Clinical Evidence Digest',
        source_chapter: 'Autonomic Downregulation',
        source_url: 'https://openstax.org/books/psychology-2e/pages/14-5-the-pursuit-of-happiness',
        source_license: 'CC BY 4.0',
        attribution: 'Open Clinical Mind Archive',
      });

    expect(createCard.status).toBe(201);
    const cardId = createCard.body.card.id;

    const patchCard = await request(app)
      .patch(`/api/library/mind/cards/${cardId}`)
      .send({
        source_license: 'CC0 1.0 Public Domain',
        attribution: 'Verified Psychology Commons',
      });

    expect(patchCard.status).toBe(200);
    expect(patchCard.body.card.source_license).toBe('CC0 1.0 Public Domain');

    const { frames, close } = await connPromise;
    close();

    const mindFrames = frames.filter((f) => f.event === 'library_mind_update');
    expect(mindFrames.length).toBe(2);
    expect(mindFrames[0]?.data.action).toBe('created');
    expect(mindFrames[1]?.data.action).toBe('updated');
    expect(mindFrames[1]?.data.record.attribution).toBe('Verified Psychology Commons');
  });

  it('L5: POST /api/library/bookmarks/toggle and DELETE /api/library/bookmarks/:id emit library_bookmark_update SSE events', async () => {
    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 4, timeoutMs: 1000 });
    await new Promise((r) => setTimeout(r, 60));

    const addRes = await request(app)
      .post('/api/library/bookmarks/toggle')
      .send({
        item_type: 'verse',
        item_id: 1,
        note: 'BG 1.1 Saved',
      });
    expect(addRes.status).toBe(200);
    expect(addRes.body.bookmarked).toBe(true);
    const bmId = addRes.body.bookmark.id;

    const delRes = await request(app).delete(`/api/library/bookmarks/${bmId}`);
    expect(delRes.status).toBe(200);

    const toggleOn = await request(app)
      .post('/api/library/bookmarks/toggle')
      .send({ item_type: 'history', item_id: 2 });
    expect(toggleOn.status).toBe(200);

    const { frames, close } = await connPromise;
    close();

    const bmFrames = frames.filter((f) => f.event === 'library_bookmark_update');
    expect(bmFrames.length).toBe(3);
    expect(bmFrames[0]?.data.action).toBe('created');
    expect(bmFrames[0]?.data.bookmark.item_id).toBe(1);
    expect(bmFrames[1]?.data.action).toBe('deleted');
    expect(bmFrames[1]?.data.bookmark_id).toBe(bmId);
    expect(bmFrames[2]?.data.action).toBe('created');
    expect(bmFrames[2]?.data.item_type).toBe('history');
  });

  it('L6 & L7: GET /api/library/refresh/status, POST /api/library/refresh/history, and GET /api/library/provenance work and replay via SSE cursor', async () => {
    const statusBefore = await request(app).get('/api/library/refresh/status');
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body).toHaveProperty('status');

    const connPromise = collectSseFrames(baseUrl, { expectedFrames: 2, timeoutMs: 1000 });
    await new Promise((r) => setTimeout(r, 60));

    const refreshRes = await request(app)
      .post('/api/library/refresh/history')
      .send({ monthDay: '11-12' });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.month_day).toBe('11-12');

    const { frames, close } = await connPromise;
    close();

    const statusFrames = frames.filter((f) => f.event === 'library_refresh_status');
    expect(statusFrames.length).toBeGreaterThanOrEqual(1);
    const frameId = statusFrames[0]?.id;
    expect(typeof frameId).toBe('number');

    const provRes = await request(app).get('/api/library/provenance');
    expect(provRes.status).toBe(200);
    expect(provRes.body.summary).toBeDefined();
    expect(Array.isArray(provRes.body.licenses)).toBe(true);

    // Replay check via ?since=
    const { frames: replayFrames, close: closeReplay } = await collectSseFrames(baseUrl, {
      since: Math.max(0, (frameId ?? 1) - 1),
      expectedFrames: 2,
      timeoutMs: 600,
    });
    closeReplay();
    expect(replayFrames.some((f) => f.event === 'library_refresh_status')).toBe(true);
  });
});

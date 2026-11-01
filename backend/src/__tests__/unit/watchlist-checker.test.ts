/**
 * backend/src/__tests__/unit/watchlist-checker.test.ts
 * Unit tests for Watchlist matching engine (P8-02).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
}));

const mockEmitSseEvent = vi.fn();
vi.mock('../../routes/sse', () => ({
  emitSseEvent: (...args: unknown[]) => mockEmitSseEvent(...args),
}));

import { checkWatchlistMatches } from '../../alerts/watchlist-checker';

function setupSchema(db: Database.Database) {
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
}

describe('Watchlist Checker Engine (P8-02)', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    mockEmitSseEvent.mockClear();

    // Insert source
    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'reuters', 'Reuters', 'United States', 'https://reuters.com/rss', 'rss')
    `).run();

    // Insert Watchlist monitor
    testDb.prepare(`
      INSERT INTO watchlist (id, topic, keywords, priority, enabled)
      VALUES (1, 'bear bile trade', '["bear","bile","poaching"]', 'high', 1)
    `).run();
  });

  afterEach(() => {
    testDb.close();
  });

  it('triggers alert when newly enriched article matches watchlist keywords', () => {
    const artRes = testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status)
      VALUES (1, 'https://reuters.com/bear-raid', 'Authorities seize illegal bear bile shipment', 'Customs intercepted bear bile products.', 'done')
    `).run();
    const articleId = Number(artRes.lastInsertRowid);

    const alerts = checkWatchlistMatches([articleId]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe('watchlist');
    expect(alerts[0]?.message).toContain('bear bile trade');

    // Verify DB alert inserted
    const dbAlert = testDb.prepare('SELECT * FROM alerts WHERE type = ?').get('watchlist') as { message: string; acknowledged: number };
    expect(dbAlert).toBeDefined();
    expect(dbAlert.acknowledged).toBe(0);

    // Verify SSE emitted
    expect(mockEmitSseEvent).toHaveBeenCalledWith('alert', expect.objectContaining({
      type: 'watchlist',
      article_id: articleId,
    }));
  });

  it('ignores disabled watchlist monitors', () => {
    testDb.prepare('UPDATE watchlist SET enabled = 0 WHERE id = 1').run();

    const artRes = testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status)
      VALUES (1, 'https://reuters.com/bear-2', 'Wildlife rescue team frees captive bear', 'Rescuers save sun bear.', 'done')
    `).run();
    const articleId = Number(artRes.lastInsertRowid);

    const alerts = checkWatchlistMatches([articleId]);
    expect(alerts).toHaveLength(0);
    expect(mockEmitSseEvent).not.toHaveBeenCalled();
  });

  it('does not re-alert if alert already logged for the same article and watchlist monitor', () => {
    const artRes = testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status)
      VALUES (1, 'https://reuters.com/bear-3', 'Undercover probe exposes bear bile market', 'Investigators uncover trafficking ring.', 'done')
    `).run();
    const articleId = Number(artRes.lastInsertRowid);

    const first = checkWatchlistMatches([articleId]);
    expect(first).toHaveLength(1);

    const second = checkWatchlistMatches([articleId]);
    expect(second).toHaveLength(0);
  });
});


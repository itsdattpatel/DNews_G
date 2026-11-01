/**
 * backend/src/__tests__/unit/cleanup.test.ts
 * Unit tests for 30-Day Auto-Cleanup & Storage Monitor (P8-06, P8-07, P8-08).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
  getDbPath: () => '/mock/news.sqlite',
}));

const mockEmitSseEvent = vi.fn();
vi.mock('../../routes/sse', () => ({
  emitSseEvent: (...args: unknown[]) => mockEmitSseEvent(...args),
}));

import { runDataCleanup, checkDatabaseSize } from '../../pipeline/cleanup';

function setupSchema(db: Database.Database) {
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
}

describe('Retention Auto-Cleanup & DB Size Monitor (P8-06, P8-07, P8-08)', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    mockEmitSseEvent.mockClear();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'source_a', 'Source A', 'USA', 'https://a.com/rss', 'rss')
    `).run();
  });

  afterEach(() => {
    testDb.close();
  });

  it('purges unbookmarked articles older than retention_days when enabled (P8-07)', () => {
    // Enable cleanup and set retention to 30 days
    testDb.prepare("UPDATE settings SET value = '1' WHERE key = 'auto_cleanup_enabled'").run();
    testDb.prepare("UPDATE settings SET value = '30' WHERE key = 'retention_days'").run();

    // Insert 1 old unbookmarked article (45 days old) -> should be deleted
    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, status, bookmarked, fetched_at)
      VALUES (1, 1, 'https://old.com', 'Old News', 'done', 0, datetime('now', '-45 days'))
    `).run();

    // Insert 1 old bookmarked article (45 days old, bookmarked=1) -> must survive
    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, status, bookmarked, fetched_at)
      VALUES (2, 1, 'https://bookmarked.com', 'Saved History', 'done', 1, datetime('now', '-45 days'))
    `).run();

    // Insert 1 fresh article (2 days old) -> must survive
    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, status, bookmarked, fetched_at)
      VALUES (3, 1, 'https://recent.com', 'Fresh Dispatch', 'done', 0, datetime('now', '-2 days'))
    `).run();

    const result = runDataCleanup();

    expect(result.deletedArticles).toBe(1);

    const remaining = testDb.prepare('SELECT id, title_english, bookmarked FROM articles ORDER BY id ASC').all() as Array<{
      id: number;
      title_english: string;
      bookmarked: number;
    }>;

    expect(remaining).toHaveLength(2);
    expect(remaining[0]?.id).toBe(2); // Bookmarked survived
    expect(remaining[1]?.id).toBe(3); // Fresh survived
  });

  it('skips cleanup when auto_cleanup_enabled is 0 (P8-06)', () => {
    testDb.prepare("UPDATE settings SET value = '0' WHERE key = 'auto_cleanup_enabled'").run();
    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, status, bookmarked, fetched_at)
      VALUES (10, 1, 'https://old2.com', 'Old Dispatch', 'done', 0, datetime('now', '-50 days'))
    `).run();

    const result = runDataCleanup();
    expect(result.deletedArticles).toBe(0);

    const article = testDb.prepare('SELECT id FROM articles WHERE id = 10').get();
    expect(article).toBeDefined();
  });

  it('warns when database file size reaches 1.5 GB limit (P8-08)', () => {
    // Mock fs.existsSync and fs.statSync to simulate 1.6 GB
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const statSpy = vi.spyOn(fs, 'statSync').mockReturnValue({
      size: 1.6 * 1024 * 1024 * 1024, // 1.6 GB
    } as fs.Stats);

    const warnResult = checkDatabaseSize();

    expect(warnResult.isWarning).toBe(true);
    expect(warnResult.sizeBytes).toBeGreaterThan(1.5 * 1024 * 1024 * 1024);

    // Verify warning alert recorded in alerts table
    const alert = testDb.prepare("SELECT * FROM alerts WHERE type = 'error'").get() as { message: string };
    expect(alert).toBeDefined();
    expect(alert.message).toContain('Database storage warning');

    statSpy.mockRestore();
    existsSpy.mockRestore();
  });
});

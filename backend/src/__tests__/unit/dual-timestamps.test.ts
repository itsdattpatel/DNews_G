import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

describe('Category 1: Dual Timestamps & Migration 006', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Run migrations 001 through 006
    const migrationsDir = path.resolve(__dirname, '../../db/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => /^\d+.*\.sql$/.test(f)).sort();

    for (const f of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      db.exec(sql);
    }
  });

  it('adds ingested_at and is_catchup columns via migration 006', () => {
    const tableInfo = db.prepare("PRAGMA table_info('articles')").all() as Array<{ name: string; type: string }>;
    const columnNames = tableInfo.map(c => c.name);

    expect(columnNames).toContain('published_at');
    expect(columnNames).toContain('ingested_at');
    expect(columnNames).toContain('is_catchup');
  });

  it('backfills ingested_at in UTC ISO-8601 with trailing Z for rows missing it', () => {
    // Insert source
    db.prepare("INSERT INTO sources (slug, name, country, url, fetch_type) VALUES ('test_src', 'Test Source', 'India', 'https://example.com/rss', 'rss')").run();

    // Insert article with fetched_at but null ingested_at
    db.prepare(`
      INSERT INTO articles (source_id, url, title_original, fetched_at, created_at, status)
      VALUES (1, 'https://example.com/test-1', 'Test Title', '2026-11-01 10:00:00', '2026-11-01 10:00:00', 'done')
    `).run();

    // Run backfill logic
    db.prepare(`
      UPDATE articles
      SET ingested_at = strftime('%Y-%m-%dT%H:%M:%SZ', COALESCE(fetched_at, created_at, 'now'))
      WHERE ingested_at IS NULL
    `).run();

    const row = db.prepare("SELECT ingested_at, is_catchup FROM articles WHERE url = 'https://example.com/test-1'").get() as { ingested_at: string; is_catchup: number };

    expect(row.ingested_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(row.is_catchup).toBe(0);
  });

  it('supports marking articles as catchup (is_catchup = 1)', () => {
    db.prepare("INSERT INTO sources (slug, name, country, url, fetch_type) VALUES ('test_src_2', 'Test Source 2', 'USA', 'https://example.com/rss2', 'rss')").run();

    db.prepare(`
      INSERT INTO articles (source_id, url, title_original, ingested_at, is_catchup, status)
      VALUES (1, 'https://example.com/catchup-1', 'Catchup Title', '2026-11-01T15:00:00Z', 1, 'done')
    `).run();

    const row = db.prepare("SELECT is_catchup FROM articles WHERE url = 'https://example.com/catchup-1'").get() as { is_catchup: number };
    expect(row.is_catchup).toBe(1);
  });
});

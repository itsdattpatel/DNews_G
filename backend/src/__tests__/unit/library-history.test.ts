/**
 * backend/src/__tests__/unit/library-history.test.ts
 * Tests for Historical News Archives Service and REST endpoints.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  HistoryService,
  type HistoryItem,
  type HistorySearchParams,
} from '../../library/services/historyService';

describe('Library Historical News Service (Category B3)', () => {
  let db: Database.Database;
  let service: HistoryService;

  beforeEach(() => {
    // Isolated in-memory database with library schema
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS library_history_cache (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        source_slug     TEXT NOT NULL,
        external_id     TEXT UNIQUE NOT NULL,
        event_date      TEXT NOT NULL,
        event_year      INTEGER NOT NULL,
        headline        TEXT NOT NULL,
        snippet         TEXT NOT NULL,
        original_url    TEXT NOT NULL,
        country         TEXT,
        media_url       TEXT,
        license         TEXT NOT NULL,
        attribution     TEXT NOT NULL,
        cached_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS library_bookmarks (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        item_type       TEXT NOT NULL,
        item_id         INTEGER NOT NULL,
        note            TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_type, item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_lib_hist_date ON library_history_cache(event_date);
      CREATE INDEX IF NOT EXISTS idx_lib_hist_year ON library_history_cache(event_year);
      CREATE INDEX IF NOT EXISTS idx_lib_hist_country ON library_history_cache(country);
    `);

    service = new HistoryService(db, { maxCacheEntries: 5 });
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('normalizes and caches Wikimedia On-This-Day entries', async () => {
    // Mock upstream Wikimedia API response
    const mockWikimediaData = {
      events: [
        {
          text: 'The Indian Independence Act 1947 receives royal assent.',
          year: 1947,
          pages: [
            {
              title: 'Indian_Independence_Act_1947',
              normalizedtitle: 'Indian Independence Act 1947',
              content_urls: {
                desktop: { page: 'https://en.wikipedia.org/wiki/Indian_Independence_Act_1947' },
              },
              thumbnail: { source: 'https://upload.wikimedia.org/thumb/sample.jpg' },
            },
          ],
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockWikimediaData,
    });
    vi.stubGlobal('fetch', mockFetch);

    const items = await service.getTodayInHistory(7, 18);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source_slug: 'wikimedia_onthisday',
      event_year: 1947,
      headline: 'Indian Independence Act 1947',
      country: 'India',
      license: 'CC BY-SA 3.0 / 4.0',
      attribution: 'Wikimedia Foundation contributors under CC BY-SA',
    });
    expect(items[0].snippet).toContain('Indian Independence Act 1947 receives royal assent');

    // Verify it was stored in the SQLite cache
    const cachedRows = db.prepare('SELECT * FROM library_history_cache').all() as any[];
    expect(cachedRows).toHaveLength(1);
    expect(cachedRows[0].external_id).toContain('wikimedia_1947_07_18');

    // Second call should return from cache without calling fetch
    mockFetch.mockClear();
    const cachedItems = await service.getTodayInHistory(7, 18);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(cachedItems).toHaveLength(1);
  });

  it('searches cached history by decade, country, and keyword', async () => {
    // Insert seed records
    const insert = db.prepare(`
      INSERT INTO library_history_cache (
        source_slug, external_id, event_date, event_year, headline, snippet, original_url, country, license, attribution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('wikimedia_onthisday', 'wiki_1', '1947-08-15', 1947, 'India Gains Independence', 'India attains independence from the British Empire.', 'https://en.wikipedia.org/wiki/Independence_Day_(India)', 'India', 'CC BY-SA 3.0', 'Wikimedia');
    insert.run('wikimedia_onthisday', 'wiki_2', '1969-07-20', 1969, 'Apollo 11 Moon Landing', 'Neil Armstrong and Buzz Aldrin walk on the Moon.', 'https://en.wikipedia.org/wiki/Apollo_11', 'USA', 'CC BY-SA 3.0', 'Wikimedia');
    insert.run('chronicling_america', 'loc_1', '1918-11-11', 1918, 'Armistice Signed Ending War', 'World War I comes to an end with signed armistice.', 'https://chroniclingamerica.loc.gov', 'International', 'Public Domain', 'Library of Congress');

    // Search by decade
    const result1940s = service.searchHistory({ decade: 1940 });
    expect(result1940s.items).toHaveLength(1);
    expect(result1940s.items[0].event_year).toBe(1947);

    // Search by country
    const resultUSA = service.searchHistory({ country: 'USA' });
    expect(resultUSA.items).toHaveLength(1);
    expect(resultUSA.items[0].headline).toBe('Apollo 11 Moon Landing');

    // Search by keyword
    const resultMoon = service.searchHistory({ query: 'Moon' });
    expect(resultMoon.items).toHaveLength(1);
    expect(resultMoon.items[0].headline).toBe('Apollo 11 Moon Landing');
  });

  it('enforces size-capped LRU eviction preserving bookmarked records', () => {
    // Capacity configured to 5
    const insert = db.prepare(`
      INSERT INTO library_history_cache (
        source_slug, external_id, event_date, event_year, headline, snippet, original_url, country, license, attribution, cached_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    for (let i = 1; i <= 6; i++) {
      insert.run(
        'wikimedia_onthisday',
        `item_${i}`,
        `19${i}0-01-01`,
        1900 + i * 10,
        `Headline ${i}`,
        `Snippet ${i}`,
        `https://example.com/${i}`,
        'International',
        'Public Domain',
        'Archive',
        `-${7 - i} days`
      );
    }

    // Bookmark item_1 so it cannot be evicted even if old
    db.prepare('INSERT INTO library_bookmarks (item_type, item_id) VALUES (?, ?)').run('history', 1);

    expect(db.prepare('SELECT COUNT(*) as count FROM library_history_cache').get()).toEqual({ count: 6 });

    // Enforce capacity of 5
    const prunedCount = service.enforceCacheCap();
    expect(prunedCount).toBe(1);

    // Total rows should now be 5
    expect(db.prepare('SELECT COUNT(*) as count FROM library_history_cache').get()).toEqual({ count: 5 });

    // Item 1 (bookmarked) must still exist
    const item1 = db.prepare('SELECT * FROM library_history_cache WHERE id = 1').get();
    expect(item1).toBeDefined();

    // Item 2 (unbookmarked and oldest) should have been evicted
    const item2 = db.prepare('SELECT * FROM library_history_cache WHERE id = 2').get();
    expect(item2).toBeUndefined();
  });

  it('provides graceful fallback to cached records if upstream API fails', async () => {
    // Seed one cached item for date
    db.prepare(`
      INSERT INTO library_history_cache (
        source_slug, external_id, event_date, event_year, headline, snippet, original_url, country, license, attribution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('wikimedia_onthisday', 'wiki_seed', '1920-10-02', 1920, 'Historical Milestone', 'Seeded record', 'https://en.wikipedia.org', 'India', 'CC BY-SA 3.0', 'Wikimedia');

    // Upstream network failure
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network timeout')));

    // Requesting date with cached item should succeed gracefully
    const items = await service.getTodayInHistory(10, 2);
    expect(items).toHaveLength(1);
    expect(items[0].headline).toBe('Historical Milestone');
  });
});

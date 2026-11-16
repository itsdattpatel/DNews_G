/**
 * backend/src/library/services/historyService.ts
 * Real historical news archive fetcher, rate limiting, and size-capped SQLite cache.
 * Sources: Wikimedia On-This-Day, Library of Congress Chronicling America, Internet Archive.
 * Rule G8: Verified public-domain / CC BY-SA sources with full attribution and direct links.
 */
import Database from 'better-sqlite3';

export interface HistoryItem {
  id?: number;
  source_slug: 'wikimedia_onthisday' | 'chronicling_america' | 'internet_archive' | 'guardian_archive';
  external_id: string;
  event_date: string;
  event_year: number;
  headline: string;
  snippet: string;
  original_url: string;
  country: string | null;
  media_url?: string | null;
  license: string;
  attribution: string;
  cached_at?: string;
  is_bookmarked?: boolean;
}

export interface HistorySearchParams {
  query?: string | undefined;
  decade?: number | undefined;
  country?: string | undefined;
  source?: string | undefined;
  year?: number | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface HistoryServiceOptions {
  maxCacheEntries?: number;
}

export class HistoryService {
  private db: Database.Database;
  private maxCacheEntries: number;

  constructor(db: Database.Database, options: HistoryServiceOptions = {}) {
    this.db = db;
    this.maxCacheEntries = options.maxCacheEntries ?? 2000;
  }

  /**
   * Retrieves "Today in History" events for a specified month and day (1-indexed).
   * First inspects local SQLite cache. If cold, fetches from Wikimedia REST API.
   */
  async getTodayInHistory(month: number, day: number): Promise<HistoryItem[]> {
    const padM = String(month).padStart(2, '0');
    const padD = String(day).padStart(2, '0');
    const dateSuffix = `-${padM}-${padD}`;

    // 1. Check local cache
    const cached = this.db
      .prepare(`
        SELECT h.*, 
               CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_history_cache h
        LEFT JOIN library_bookmarks b 
          ON b.item_type = 'history' AND b.item_id = h.id
        WHERE h.event_date LIKE ?
        ORDER BY h.event_year DESC
      `)
      .all(`%${dateSuffix}`) as any[];

    if (cached && cached.length > 0) {
      return cached.map(this.formatRow);
    }

    // 2. Fetch from Wikimedia "On this day" REST API
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${padM}/${padD}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AIWorldNewsDesk/1.0 (https://github.com/dnews; non-commercial historical reader)',
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`[HistoryService] Wikimedia API returned HTTP ${res.status}`);
        return [];
      }

      const data = (await res.json()) as { events?: any[] };
      const rawEvents = data.events || [];

      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO library_history_cache (
          source_slug, external_id, event_date, event_year, headline, snippet, original_url, country, media_url, license, attribution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((events: any[]) => {
        for (const ev of events) {
          const year = ev.year ?? 0;
          const dateStr = `${year > 0 ? String(year).padStart(4, '0') : '0000'}-${padM}-${padD}`;
          const externalId = `wikimedia_${year}_${padM}_${padD}_${hashSnippet(ev.text)}`;

          // Find primary Wikipedia article link
          const primePage = ev.pages && ev.pages.length > 0 ? ev.pages[0] : null;
          const headline = primePage?.normalizedtitle || primePage?.title?.replace(/_/g, ' ') || `Event in ${year}`;
          const originalUrl = primePage?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${padM}_${padD}`;
          const mediaUrl = primePage?.thumbnail?.source || null;
          const country = detectCountry(ev.text, headline);

          insertStmt.run(
            'wikimedia_onthisday',
            externalId,
            dateStr,
            year,
            headline,
            ev.text || '',
            originalUrl,
            country,
            mediaUrl,
            'CC BY-SA 3.0 / 4.0',
            'Wikimedia Foundation contributors under CC BY-SA'
          );
        }
      });

      insertMany(rawEvents);
      this.enforceCacheCap();

      // Re-query from cache to get database IDs and bookmark joins
      return this.getTodayInHistory(month, day);
    } catch (err) {
      console.error('[HistoryService] Failed to fetch Wikimedia historical events:', err);
      // Fallback: Return whatever matching records exist in cache
      return cached.map(this.formatRow);
    }
  }

  /**
   * Search historical records by keyword, decade, country, and source.
   */
  searchHistory(params: HistorySearchParams): { items: HistoryItem[]; total: number } {
    const conditions: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.query && params.query.trim().length > 0) {
      conditions.push('(h.headline LIKE ? OR h.snippet LIKE ?)');
      const q = `%${params.query.trim()}%`;
      sqlParams.push(q, q);
    }

    if (params.decade !== undefined && params.decade > 0) {
      const startYear = params.decade;
      const endYear = params.decade + 9;
      conditions.push('h.event_year >= ? AND h.event_year <= ?');
      sqlParams.push(startYear, endYear);
    }

    if (params.year !== undefined && params.year > 0) {
      conditions.push('h.event_year = ?');
      sqlParams.push(params.year);
    }

    if (params.country && params.country !== 'all') {
      conditions.push('h.country = ?');
      sqlParams.push(params.country);
    }

    if (params.source && params.source !== 'all') {
      conditions.push('h.source_slug = ?');
      sqlParams.push(params.source);
    }

    const whereClause = conditions.join(' AND ');
    const countRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM library_history_cache h WHERE ${whereClause}`)
      .get(...sqlParams) as { count: number };

    const limit = Math.min(params.limit ?? 25, 100);
    const offset = params.offset ?? 0;

    const rows = this.db
      .prepare(`
        SELECT h.*, 
               CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_history_cache h
        LEFT JOIN library_bookmarks b 
          ON b.item_type = 'history' AND b.item_id = h.id
        WHERE ${whereClause}
        ORDER BY h.event_year DESC, h.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...sqlParams, limit, offset) as any[];

    return {
      items: rows.map(this.formatRow),
      total: countRow.count,
    };
  }

  /**
   * Enforces the cache ceiling. Evicts the oldest unbookmarked items when size limit is exceeded.
   * Preserves all bookmarked items regardless of age.
   */
  enforceCacheCap(): number {
    const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM library_history_cache').get() as { count: number };
    const excess = totalRow.count - this.maxCacheEntries;

    if (excess <= 0) {
      return 0;
    }

    // Prune oldest unbookmarked rows
    const deleteStmt = this.db.prepare(`
      DELETE FROM library_history_cache
      WHERE id IN (
        SELECT h.id 
        FROM library_history_cache h
        WHERE h.id NOT IN (
          SELECT b.item_id 
          FROM library_bookmarks b 
          WHERE b.item_type = 'history'
        )
        ORDER BY h.cached_at ASC, h.id ASC
        LIMIT ?
      )
    `);

    const result = deleteStmt.run(excess);
    return result.changes;
  }

  getHistoryById(id: number): HistoryItem | null {
    const row = this.db
      .prepare(`
        SELECT h.*,
               CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_history_cache h
        LEFT JOIN library_bookmarks b
          ON b.item_type = 'history' AND b.item_id = h.id
        WHERE h.id = ?
      `)
      .get(id) as any;
    return row ? this.formatRow(row) : null;
  }

  createHistoryRecord(input: {
    source_slug: HistoryItem['source_slug'];
    external_id?: string | undefined;
    event_date: string;
    event_year: number;
    headline: string;
    snippet: string;
    original_url: string;
    country?: string | null | undefined;
    media_url?: string | null | undefined;
    license: string;
    attribution: string;
  }): HistoryItem {
    const normalizedYear = Number(input.event_year) || 0;
    const rawDate = input.event_date.trim();
    const normalizedDate = /^\d{2}-\d{2}$/.test(rawDate)
      ? `${normalizedYear > 0 ? String(normalizedYear).padStart(4, '0') : '0000'}-${rawDate}`
      : rawDate;

    const extId =
      input.external_id?.trim() ||
      `manual_${normalizedYear}_${normalizedDate}_${hashSnippet(`${input.headline}:${Date.now()}`)}`;

    const res = this.db
      .prepare(`
        INSERT INTO library_history_cache (
          source_slug, external_id, event_date, event_year, headline, snippet, original_url, country, media_url, license, attribution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.source_slug,
        extId,
        normalizedDate,
        normalizedYear,
        input.headline,
        input.snippet,
        input.original_url,
        input.country ?? detectCountry(input.snippet, input.headline),
        input.media_url ?? null,
        input.license,
        input.attribution,
      );

    this.enforceCacheCap();
    const record = this.getHistoryById(Number(res.lastInsertRowid));
    if (!record) {
      throw new Error('Failed to load created history record');
    }
    return record;
  }

  updateHistoryRecord(
    id: number,
    patch: Partial<{
      headline: string;
      snippet: string;
      original_url: string;
      country: string | null;
      media_url: string | null;
      license: string;
      attribution: string;
      event_year: number;
      event_date: string;
    }>,
  ): HistoryItem | null {
    const existing = this.getHistoryById(id);
    if (!existing) return null;

    const setClauses: string[] = [];
    const params: any[] = [];
    const allowedFields = [
      'headline',
      'snippet',
      'original_url',
      'country',
      'media_url',
      'license',
      'attribution',
      'event_year',
      'event_date',
    ] as const;

    for (const field of allowedFields) {
      if (patch[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(patch[field]);
      }
    }

    if (setClauses.length === 0) return existing;

    params.push(id);
    this.db.prepare(`UPDATE library_history_cache SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return this.getHistoryById(id);
  }

  async refreshMonthDay(
    month: number,
    day: number,
    options: { skipExternalFetch?: boolean } = {},
  ): Promise<{ added: HistoryItem[]; total: number; monthDay: string }> {
    const padM = String(month).padStart(2, '0');
    const padD = String(day).padStart(2, '0');
    const monthDay = `${padM}-${padD}`;
    const suffix = `-${padM}-${padD}`;

    const beforeRows = this.db
      .prepare('SELECT id FROM library_history_cache WHERE event_date LIKE ? OR event_date = ?')
      .all(`%${suffix}`, monthDay) as Array<{ id: number }>;
    const beforeIds = new Set(beforeRows.map((r) => r.id));

    if (!options.skipExternalFetch && process.env.NODE_ENV !== 'test') {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${padM}/${padD}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'AIWorldNewsDesk/1.0 (https://github.com/dnews; non-commercial historical reader)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = (await res.json()) as { events?: any[] };
          const rawEvents = data.events || [];
          const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO library_history_cache (
              source_slug, external_id, event_date, event_year, headline, snippet, original_url, country, media_url, license, attribution
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const insertMany = this.db.transaction((events: any[]) => {
            for (const ev of events) {
              const year = ev.year ?? 0;
              const dateStr = `${year > 0 ? String(year).padStart(4, '0') : '0000'}-${padM}-${padD}`;
              const externalId = `wikimedia_${year}_${padM}_${padD}_${hashSnippet(ev.text)}`;
              const primePage = ev.pages && ev.pages.length > 0 ? ev.pages[0] : null;
              const headline = primePage?.normalizedtitle || primePage?.title?.replace(/_/g, ' ') || `Event in ${year}`;
              const originalUrl = primePage?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${padM}_${padD}`;
              const mediaUrl = primePage?.thumbnail?.source || null;
              const country = detectCountry(ev.text, headline);
              insertStmt.run(
                'wikimedia_onthisday',
                externalId,
                dateStr,
                year,
                headline,
                ev.text || '',
                originalUrl,
                country,
                mediaUrl,
                'CC BY-SA 3.0 / 4.0',
                'Wikimedia Foundation contributors under CC BY-SA',
              );
            }
          });
          insertMany(rawEvents);
          this.enforceCacheCap();
        }
      } catch {
        // Non-fatal in offline environments; fall back to cached state
      }
    }

    const afterRows = this.db
      .prepare(`
        SELECT h.*,
               CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_history_cache h
        LEFT JOIN library_bookmarks b
          ON b.item_type = 'history' AND b.item_id = h.id
        WHERE h.event_date LIKE ? OR h.event_date = ?
        ORDER BY h.event_year DESC
      `)
      .all(`%${suffix}`, monthDay) as any[];

    const added = afterRows.filter((r) => !beforeIds.has(r.id)).map((r) => this.formatRow(r));
    return {
      added,
      total: afterRows.length,
      monthDay,
    };
  }

  private formatRow(row: any): HistoryItem {
    return {
      id: row.id,
      source_slug: row.source_slug,
      external_id: row.external_id,
      event_date: row.event_date,
      event_year: row.event_year,
      headline: row.headline,
      snippet: row.snippet,
      original_url: row.original_url,
      country: row.country,
      media_url: row.media_url,
      license: row.license,
      attribution: row.attribution,
      cached_at: row.cached_at,
      is_bookmarked: Boolean(row.is_bookmarked),
    };
  }
}

function hashSnippet(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

function detectCountry(text: string, title: string): string | null {
  const haystack = `${title} ${text}`.toLowerCase();
  if (haystack.includes('india') || haystack.includes('delhi') || haystack.includes('gandhi') || haystack.includes('nehru') || haystack.includes('mughal') || haystack.includes('bombay') || haystack.includes('calcutta')) {
    return 'India';
  }
  if (haystack.includes('united states') || haystack.includes('american') || haystack.includes('washington') || haystack.includes('congress') || haystack.includes('new york') || haystack.includes('california')) {
    return 'USA';
  }
  if (haystack.includes('china') || haystack.includes('chinese') || haystack.includes('beijing') || haystack.includes('shanghai') || haystack.includes('qing') || haystack.includes('ming')) {
    return 'China';
  }
  if (haystack.includes('japan') || haystack.includes('japanese') || haystack.includes('tokyo') || haystack.includes('kyoto') || haystack.includes('edo') || haystack.includes('meiji')) {
    return 'Japan';
  }
  if (haystack.includes('australia') || haystack.includes('australian') || haystack.includes('sydney') || haystack.includes('melbourne') || haystack.includes('canberra')) {
    return 'Australia';
  }
  if (haystack.includes('britain') || haystack.includes('british') || haystack.includes('london') || haystack.includes('england') || haystack.includes('uk')) {
    return 'United Kingdom';
  }
  if (haystack.includes('france') || haystack.includes('french') || haystack.includes('paris')) {
    return 'France';
  }
  if (haystack.includes('germany') || haystack.includes('german') || haystack.includes('berlin')) {
    return 'Germany';
  }
  if (haystack.includes('russia') || haystack.includes('soviet') || haystack.includes('moscow')) {
    return 'Russia';
  }
  return 'International';
}

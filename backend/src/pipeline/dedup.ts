/**
 * backend/src/pipeline/dedup.ts
 * Deduplicates articles by URL and inserts new ones as pending.
 * Also seeds the sources table from config on startup.
 */
import { getDb } from '../db/db';
import { SOURCES } from '../../../config/sources';
import type { ArticleRaw } from '../fetch/rss';

/** Sync sources config into DB on startup */
export function syncSources(): void {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO sources (slug, name, country, url, fetch_type, enabled)
    VALUES (@slug, @name, @country, @url, @fetchType, @enabled)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      url = excluded.url,
      fetch_type = excluded.fetch_type,
      enabled = excluded.enabled
  `);

  const syncAll = db.transaction(() => {
    for (const s of SOURCES) {
      upsert.run({
        slug: s.slug,
        name: s.name,
        country: s.country,
        url: s.url,
        fetchType: s.fetchType,
        enabled: s.enabled ? 1 : 0,
      });
    }
  });
  syncAll();
  console.log(`[Dedup] Synced ${SOURCES.length} sources`);
}

/**
 * Insert articles that are not already in the DB (by URL).
 * Returns count of newly inserted articles.
 */
export async function insertPendingArticles(articles: ArticleRaw[]): Promise<number> {
  if (articles.length === 0) return 0;
  const db = getDb();

  const getSourceId = db.prepare<string, { id: number }>(
    'SELECT id FROM sources WHERE slug = ?',
  );

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles
      (source_id, url, title_original, body_original, published_at, status)
    VALUES
      (@sourceId, @url, @titleOriginal, @bodyOriginal, @publishedAt, 'pending')
  `);

  let inserted = 0;
  const insertAll = db.transaction(() => {
    for (const a of articles) {
      const sourceRow = getSourceId.get(a.sourceSlug);
      if (!sourceRow) continue;

      const result = insertArticle.run({
        sourceId: sourceRow.id,
        url: a.url,
        titleOriginal: a.titleOriginal,
        bodyOriginal: a.bodyOriginal,
        publishedAt: a.publishedAt,
      });
      if (result.changes > 0) inserted++;
    }
  });
  insertAll();
  return inserted;
}

/** Check if a URL already exists in the DB */
export function isKnownUrl(url: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT 1 FROM articles WHERE url = ? LIMIT 1')
    .get(url);
  return row !== undefined;
}

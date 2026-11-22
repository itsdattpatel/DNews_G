/**
 * backend/src/pipeline/dedup.ts
 * Deduplicates articles by URL and inserts new ones as pending.
 * Also seeds the sources table from config on startup.
 */
import { getDb } from '../db/db';
import { SOURCES } from '../../../config/sources';
import type { ArticleRaw } from '../fetch/rss';
import { recordSessionArticlesIngested } from '../services/sessionManager';
import { recordFeedIngestion } from '../services/feedCounter';
import { normalizeArticleText } from './textNormalizer';

/** Sync sources config into DB on startup */
export function syncSources(): void {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO sources (slug, name, country, region, url, fetch_type, language, priority, enabled)
    VALUES (@slug, @name, @country, @region, @url, @fetchType, @language, @priority, @enabled)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      region = excluded.region,
      url = excluded.url,
      fetch_type = excluded.fetch_type,
      language = excluded.language,
      priority = excluded.priority,
      enabled = excluded.enabled
  `);

  const syncAll = db.transaction(() => {
    for (const s of SOURCES) {
      upsert.run({
        slug: s.slug,
        name: s.name,
        country: s.country,
        region: s.region ?? 'Global',
        url: s.url,
        fetchType: s.fetchType,
        language: s.language ?? 'en',
        priority: s.priority ?? 'tier2',
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
export async function insertPendingArticles(
  articles: ArticleRaw[],
  isCatchup: boolean = false,
): Promise<number> {
  if (articles.length === 0) return 0;
  const db = getDb();
  const nowIso = new Date().toISOString(); // UTC ISO-8601 with trailing 'Z'

  const getSourceId = db.prepare<string, { id: number }>(
    'SELECT id FROM sources WHERE slug = ?',
  );

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles
      (source_id, url, title_original, title_english, body_original, body_english, body_en_normalized, body_quality, readability_score, source_language, published_at, ingested_at, is_catchup, status)
    VALUES
      (@sourceId, @url, @titleOriginal, @titleEnglish, @bodyOriginal, @bodyEnglish, @bodyEnNormalized, @bodyQuality, @readabilityScore, @sourceLanguage, @publishedAt, @ingestedAt, @isCatchup, 'pending')
  `);

  let inserted = 0;
  let evaluated = 0;
  const insertAll = db.transaction(() => {
    for (const a of articles) {
      const sourceRow = getSourceId.get(a.sourceSlug);
      if (!sourceRow) continue;
      evaluated++;

      const norm = normalizeArticleText(a.titleOriginal, a.bodyOriginal);

      // Future-date clamp (PRD_FRESH_NEWS_PIPELINE): Prevent embargoed/future-dated dispatches from hiding breaking news
      let safePublishedAt = a.publishedAt;
      if (safePublishedAt) {
        const parsedMs = new Date(safePublishedAt).getTime();
        const maxFutureMs = Date.now() + 15 * 60 * 1000;
        if (isNaN(parsedMs) || parsedMs > maxFutureMs) {
          safePublishedAt = nowIso;
        }
      } else {
        safePublishedAt = nowIso;
      }

      const result = insertArticle.run({
        sourceId: sourceRow.id,
        url: a.url,
        titleOriginal: a.titleOriginal,
        titleEnglish: norm.titleEnglish,
        bodyOriginal: a.bodyOriginal,
        bodyEnglish: norm.bodyEnglishNormalized,
        bodyEnNormalized: norm.bodyEnglishNormalized,
        bodyQuality: norm.quality,
        readabilityScore: norm.readabilityScore,
        sourceLanguage: norm.sourceLanguage,
        publishedAt: safePublishedAt,
        ingestedAt: nowIso,
        isCatchup: isCatchup ? 1 : 0,
      });
      if (result.changes > 0) inserted++;
    }
  });
  insertAll();
  const duplicatesSkipped = Math.max(0, evaluated - inserted);
  if (inserted > 0) {
    recordSessionArticlesIngested(inserted);
  }
  recordFeedIngestion({
    inserted,
    catchup: isCatchup ? inserted : 0,
    duplicatesSkipped,
    timestampIso: nowIso,
  });
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

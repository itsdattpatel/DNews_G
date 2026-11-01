/**
 * backend/src/scripts/reprocess-news.ts
 * Purges dummy/mock test records and reprocesses real news articles
 * from status = 'ai_failed' into status = 'done' using the honest editorial fallback.
 */
import { getDb } from '../db/db';
import { createEditorialFallback, type ArticleRow } from '../pipeline/enricher';
import { validateAnchorPhrases } from '../ai/schema';
import { runClusteringPass } from '../pipeline/cluster';
import { detectAlerts } from '../alerts/detector';

export function reprocessNewsDatabase(): { purged: number; processed: number; failed: number } {
  const db = getDb();

  console.log('[Reprocess] Starting database cleanup and live news enrichment...');

  // 1. Purge dummy test records
  const purgeResult = db.prepare(`
    DELETE FROM articles
    WHERE url LIKE '%example.com%' OR id IN (1, 901, 902)
  `).run();

  // Clean up any orphaned keywords or categories
  db.prepare(`
    DELETE FROM keywords WHERE article_id NOT IN (SELECT id FROM articles)
  `).run();
  db.prepare(`
    DELETE FROM article_categories WHERE article_id NOT IN (SELECT id FROM articles)
  `).run();

  console.log(`[Reprocess] Purged ${purgeResult.changes} test/seed dummy article(s).`);

  // 2. Fetch all real articles currently marked as ai_failed
  const failedArticles = db.prepare(`
    SELECT a.*, s.country AS source_country, s.name AS source_name
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.status = 'ai_failed'
    ORDER BY a.fetched_at DESC
  `).all() as ArticleRow[];

  console.log(`[Reprocess] Found ${failedArticles.length} failed articles to enrich.`);

  const updateArticle = db.prepare(`
    UPDATE articles SET
      title_english = @title_english,
      body_english  = @body_english,
      summary       = @summary,
      breaking_score = @breaking_score,
      anchor_phrases = @anchor_phrases,
      ai_processed_at = datetime('now'),
      status        = 'done'
    WHERE id = @id
  `);

  const insertKeyword = db.prepare(`
    INSERT OR IGNORE INTO keywords (article_id, keyword) VALUES (?, ?)
  `);

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO article_categories (article_id, category) VALUES (?, ?)
  `);

  let processedCount = 0;
  let skippedCount = 0;

  // Process in batches within transactions
  const chunkSize = 200;
  for (let i = 0; i < failedArticles.length; i += chunkSize) {
    const chunk = failedArticles.slice(i, i + chunkSize);

    const tx = db.transaction(() => {
      for (const a of chunk) {
        const textLen = (a.title_original?.length || 0) + (a.body_original?.length || 0);
        if (textLen < 15) {
          skippedCount++;
          continue;
        }

        const fallback = createEditorialFallback(a, 0);
        const summarySentences = (fallback.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length;
        const validAnchors = validateAnchorPhrases(
          fallback.anchor_phrases || [],
          fallback.body_english,
          summarySentences,
        );

        updateArticle.run({
          id: a.id,
          title_english: fallback.title_english,
          body_english: fallback.body_english,
          summary: fallback.summary,
          breaking_score: fallback.breaking_score,
          anchor_phrases: validAnchors.length > 0 ? JSON.stringify(validAnchors) : null,
        });

        for (const kw of fallback.keywords) {
          insertKeyword.run(a.id, kw);
        }

        for (const cat of fallback.categories) {
          insertCategory.run(a.id, cat);
        }

        processedCount++;
      }
    });

    tx();
    console.log(`[Reprocess] Progress: ${processedCount}/${failedArticles.length} enriched...`);
  }

  // 3. Run clustering pass
  try {
    console.log('[Reprocess] Re-running story clustering pass...');
    runClusteringPass();
  } catch (err) {
    console.warn('[Reprocess] Clustering warning:', err);
  }

  // 4. Run alert detection for top breaking articles
  try {
    console.log('[Reprocess] Checking breaking alerts for enriched articles...');
    const topIds = db.prepare(`
      SELECT id FROM articles WHERE status = 'done' AND breaking_score >= 70 LIMIT 50
    `).all() as Array<{ id: number }>;
    if (topIds.length > 0) {
      detectAlerts(topIds.map((r) => r.id));
    }
  } catch (err) {
    console.warn('[Reprocess] Alert detection warning:', err);
  }

  console.log(`[Reprocess] COMPLETE: Purged ${purgeResult.changes}, Enriched ${processedCount}, Skipped ${skippedCount}`);

  return {
    purged: purgeResult.changes,
    processed: processedCount,
    failed: skippedCount,
  };
}

if (process.argv[1] && process.argv[1].endsWith('reprocess-news.ts')) {
  reprocessNewsDatabase();
}


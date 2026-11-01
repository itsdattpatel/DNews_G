/**
 * backend/src/pipeline/enricher.ts
 * Orchestrates the AI pass: batches pending articles, calls the router,
 * validates the JSON response, and writes results back to the DB.
 */
import { getDb } from '../db/db';
import { FEATURES } from '../../../config/features';
import { PROVIDER_CHAIN } from '../../../config/ai-providers';
import { routeAIRequest } from '../ai/router';
import { buildEnrichmentPrompt, type EnrichmentInput } from '../ai/prompts';
import { parseEnrichmentResponse, type EnrichmentResult } from '../ai/schema';
import type { DbArticle } from '../db/types';
import { emitSseEvent } from '../routes/sse';
import { runClusteringPass } from './cluster';
import { detectAlerts } from '../alerts/detector';
import { checkWatchlistMatches } from '../alerts/watchlist-checker';

type ArticleRow = DbArticle & { source_country: string; source_name: string };

export async function runEnrichmentPass(): Promise<void> {
  if (!FEATURES.ai_translation) return;

  const db = getDb();
  const pending = db.prepare(`
    SELECT a.*, s.country AS source_country, s.name AS source_name
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.status = 'pending'
    ORDER BY a.fetched_at DESC
    LIMIT 100
  `).all() as ArticleRow[];

  if (pending.length === 0) return;

  // Mark them as processing to avoid double-processing
  const ids = pending.map((a) => a.id);
  db.prepare(
    `UPDATE articles SET status = 'processing' WHERE id IN (${ids.map(() => '?').join(',')})`,
  ).run(...ids);

  // Determine batch size from primary provider config
  const primaryConfig = PROVIDER_CHAIN[0];
  const batchSize = primaryConfig?.batchSize ?? 20;

  console.log(`[Enricher] Processing ${pending.length} articles in batches of ${batchSize}`);

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    await processBatch(batch);
  }
}

async function processBatch(batch: ArticleRow[]): Promise<void> {
  const db = getDb();
  const inputs: EnrichmentInput[] = batch.map((a, idx) => ({
    article_index: idx,
    title_original: a.title_original ?? '',
    body_original: (a.body_original ?? '').slice(0, 4000), // cap per article
    language: a.language_detected ?? 'unknown',
    source_country: a.source_country,
    source_name: a.source_name,
  }));

  const prompt = buildEnrichmentPrompt(inputs);

  let rawText: string;
  try {
    const result = await routeAIRequest(prompt);
    rawText = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Enricher] All providers failed: ${msg}`);
    // Mark batch as ai_failed
    const ids = batch.map((a) => a.id);
    db.prepare(
      `UPDATE articles SET status = 'ai_failed' WHERE id IN (${ids.map(() => '?').join(',')})`,
    ).run(...ids);
    return;
  }

  const { results, errors } = parseEnrichmentResponse(rawText, batch.length);

  if (errors.length > 0) {
    console.warn(`[Enricher] Validation errors: ${errors.join('; ')}`);
  }

  // Write validated results back to DB
  const updateArticle = db.prepare(`
    UPDATE articles SET
      title_english = @title_english,
      body_english  = @body_english,
      summary       = @summary,
      breaking_score = @breaking_score,
      spider_type   = @spider_type,
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

  const writeAll = db.transaction((validResults: EnrichmentResult[]) => {
    for (const r of validResults) {
      const article = batch[r.article_index];
      if (!article) continue;

      updateArticle.run({
        id: article.id,
        title_english: r.title_english,
        body_english: r.body_english,
        summary: r.summary,
        breaking_score: r.breaking_score,
        spider_type: r.spider_type,
      });

      for (const kw of r.keywords) {
        insertKeyword.run(article.id, kw);
      }

      for (const cat of r.categories) {
        insertCategory.run(article.id, cat);
      }

      // Emit SSE new_article event
      emitSseEvent('new_article', { article_id: article.id });
    }

    // Mark any article not in results as ai_failed
    const succeededIds = new Set(validResults.map((r) => batch[r.article_index]?.id));
    for (const a of batch) {
      if (!succeededIds.has(a.id)) {
        db.prepare("UPDATE articles SET status = 'ai_failed' WHERE id = ?").run(a.id);
      }
    }
  });

  writeAll(results);
  console.log(`[Enricher] Batch done — ${results.length}/${batch.length} succeeded`);

  // Group newly enriched articles into story clusters
  try {
    runClusteringPass();
  } catch (err) {
    console.warn('[Enricher] Clustering pass warning:', err);
  }

  // Detect breaking news and cluster alerts (Phase 6: P6-01, P6-02, P6-03)
  try {
    const batchIds = batch.map((a) => a.id);
    const triggered = detectAlerts(batchIds);
    if (triggered.length > 0) {
      console.log(`[Enricher] Detected ${triggered.length} new breaking alert(s)`);
    }

    // Check user-defined watchlist monitors (Phase 8: P8-02)
    const watchlistAlerts = checkWatchlistMatches(batchIds);
    if (watchlistAlerts.length > 0) {
      console.log(`[Enricher] Triggered ${watchlistAlerts.length} watchlist monitor alert(s)`);
    }
  } catch (err) {
    console.warn('[Enricher] Alert detection warning:', err);
  }
}

/**
 * backend/src/pipeline/enricher.ts
 * Orchestrates the AI pass: batches pending articles, calls the router,
 * validates the JSON response, and writes results back to the DB.
 * Provides an honest editorial fallback when external AI providers are unavailable
 * so real global news flows without blocking on third-party API keys.
 */
import { getDb } from '../db/db';
import { FEATURES } from '../../../config/features';
import { PROVIDER_CHAIN } from '../../../config/ai-providers';
import { routeAIRequest } from '../ai/router';
import { buildEnrichmentPrompt, type EnrichmentInput } from '../ai/prompts';
import { parseEnrichmentResponse, validateAnchorPhrases, type EnrichmentResult } from '../ai/schema';
import type { DbArticle } from '../db/types';
import { emitSseEvent } from '../routes/sse';
import { runClusteringPass } from './cluster';
import { detectAlerts } from '../alerts/detector';
import { checkWatchlistMatches } from '../alerts/watchlist-checker';

export type ArticleRow = DbArticle & { source_country: string; source_name: string };

/**
 * Creates an honest editorial fallback for an article when AI providers are unavailable.
 * Extracts a coherent lead summary, tags, categories, and verbatim anchor phrases
 * directly from the raw article text.
 */
export function createEditorialFallback(article: ArticleRow, articleIndex: number = 0): EnrichmentResult {
  const title = (article.title_original || 'World News Dispatch').trim();
  const rawBody = (article.body_original || article.title_original || '').trim();

  // Strip residual HTML tags and normalize whitespace
  const cleanBody = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract candidate sentences
  const sentences = cleanBody
    .match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)
    ?.map((s) => s.trim())
    .filter(Boolean) || [];

  let summary = '';
  if (sentences.length >= 3) {
    summary = sentences.slice(0, 3).join(' ');
  } else if (sentences.length > 0) {
    summary = sentences.join(' ');
  } else {
    summary = title;
  }

  if (summary.length < 30 && cleanBody.length >= 30) {
    summary = cleanBody.slice(0, 200).trim() + '...';
  }

  // Common English stopwords for editorial keyword extraction
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'has', 'had', 'not', 'are', 'was', 'were',
    'been', 'will', 'would', 'could', 'should', 'about', 'after', 'into', 'more', 'their', 'they', 'what',
    'which', 'when', 'where', 'who', 'whom', 'whose', 'why', 'how', 'being', 'does', 'done', 'doing',
    'than', 'then', 'also', 'just', 'some', 'any', 'over', 'such', 'take', 'them', 'very', 'news',
    'said', 'says', 'reuters', 'hindu', 'times', 'post', 'press', 'associated', 'report', 'reports',
    'today', 'yesterday', 'first', 'second', 'years', 'month', 'week', 'amid', 'both', 'between',
  ]);

  const words = `${title} ${summary}`.toLowerCase().match(/[a-z]{4,}/g) || [];
  const keywordFreq = new Map<string, number>();
  for (const w of words) {
    if (!stopWords.has(w)) {
      keywordFreq.set(w, (keywordFreq.get(w) || 0) + 1);
    }
  }

  const keywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([w]) => w);

  if (keywords.length === 0) {
    keywords.push('world', 'news');
  }

  // Category heuristics based on content
  const textLower = `${title} ${summary}`.toLowerCase();
  const categories: Array<'World' | 'Politics' | 'Business' | 'Tech' | 'Science' | 'Health' | 'Sports' | 'Entertainment' | 'Environment' | 'Crime' | 'Animals'> = [];

  if (textLower.match(/finance|economy|market|bank|stock|trade|business|dollar|euro|inflation|rate|gdp|yield|invest/)) {
    categories.push('Business');
  }
  if (textLower.match(/politic|minister|president|election|parliament|government|party|vote|law|court|senate|diplomat/)) {
    categories.push('Politics');
  }
  if (textLower.match(/ai|tech|software|cyber|chip|device|apple|google|meta|digital|telecom|algorithm|semiconductor/)) {
    categories.push('Tech');
  }
  if (textLower.match(/space|nasa|science|biology|physics|research|study|discovery|telescope|astronomy|quantum/)) {
    categories.push('Science');
  }
  if (textLower.match(/climate|warming|flood|storm|quake|rain|wildfire|forest|pollution|environment|carbon|cyclone|monsoon/)) {
    categories.push('Environment');
  }
  if (textLower.match(/animal|species|wildlife|bird|fish|tiger|elephant|dog|cat|bear|endangered|leopard|habitat/)) {
    categories.push('Animals');
  }
  if (textLower.match(/health|virus|vaccine|disease|hospital|doctor|cancer|medical|drug|outbreak|flu|pandemic/)) {
    categories.push('Health');
  }
  if (textLower.match(/police|arrest|court|crime|murder|suspect|fraud|prison|investigat|prosecut|smuggl/)) {
    categories.push('Crime');
  }
  if (textLower.match(/sport|football|cricket|tennis|match|game|olympic|championship|win|player|tournament/)) {
    categories.push('Sports');
  }
  if (textLower.match(/film|movie|music|actor|cinema|song|album|festival|art|entertainment|theatre/)) {
    categories.push('Entertainment');
  }

  if (categories.length === 0) {
    categories.push('World');
  }

  // Breaking score heuristic
  let breaking_score = 40;
  if (textLower.match(/breaking|urgent|crisis|alert|dead|fatal|toll|disaster|war|missile|emergency|explosion|blast/)) {
    breaking_score = 75;
  } else if (textLower.match(/summit|accord|finalized|treaty|historic|record|victory|milestone|unveils/)) {
    breaking_score = 60;
  }

  // Anchor phrases: must appear verbatim in body_english and match sentence index
  const anchor_phrases: Array<{ phrase: string; sentence_index: number }> = [];
  const summarySentences = (summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);

  summarySentences.forEach((sent, idx) => {
    let target = sent;
    // Cap phrase length to 75 chars to satisfy AnchorPhraseSchema (max 80)
    if (target.length > 75) {
      const parts = target.split(' ');
      target = parts.slice(0, 8).join(' ');
    }
    if (target.length >= 4 && target.length <= 80 && cleanBody.includes(target)) {
      anchor_phrases.push({ phrase: target, sentence_index: idx });
    }
  });

  return {
    article_index: articleIndex,
    title_english: title,
    body_english: cleanBody || title,
    summary,
    keywords,
    categories,
    breaking_score,
    species_tags: [],
    location_tags: article.source_country ? [article.source_country] : [],
    anchor_phrases,
  };
}

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

  let rawText: string | null = null;
  let useFallback = false;

  try {
    const result = await routeAIRequest(prompt);
    rawText = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Enricher] AI providers unavailable (${msg}). Applying honest editorial fallback.`);
    useFallback = true;
  }

  let results: EnrichmentResult[] = [];

  if (useFallback || !rawText) {
    // Generate editorial fallback for each article with sufficient content
    results = batch
      .map((a, idx) => {
        const textLen = (a.title_original?.length || 0) + (a.body_original?.length || 0);
        if (textLen < 15) return null;
        return createEditorialFallback(a, idx);
      })
      .filter((r): r is EnrichmentResult => r !== null);
  } else {
    const parsed = parseEnrichmentResponse(rawText, batch.length);
    if (parsed.errors.length > 0) {
      console.warn(`[Enricher] Validation warnings: ${parsed.errors.join('; ')}`);
    }

    const aiResultsByIndex = new Map(parsed.results.map((r) => [r.article_index, r]));

    // Fill in any missing or failed items with editorial fallback if content exists
    results = batch
      .map((a, idx) => {
        const fromAi = aiResultsByIndex.get(idx);
        if (fromAi) return fromAi;
        const textLen = (a.title_original?.length || 0) + (a.body_original?.length || 0);
        if (textLen >= 15) {
          return createEditorialFallback(a, idx);
        }
        return null;
      })
      .filter((r): r is EnrichmentResult => r !== null);
  }

  // Write validated results back to DB
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

  const writeAll = db.transaction((validResults: EnrichmentResult[]) => {
    for (const r of validResults) {
      const article = batch[r.article_index];
      if (!article) continue;

      // Count summary sentences and validate anchor phrases verbatim
      const summarySentences = (r.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length;
      const validAnchors = validateAnchorPhrases(r.anchor_phrases || [], r.body_english, summarySentences);

      updateArticle.run({
        id: article.id,
        title_english: r.title_english,
        body_english: r.body_english,
        summary: r.summary,
        breaking_score: r.breaking_score,
        anchor_phrases: validAnchors.length > 0 ? JSON.stringify(validAnchors) : null,
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
  console.log(`[Enricher] Batch completed — ${results.length}/${batch.length} enriched (status: done)`);

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

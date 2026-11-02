/**
 * backend/src/pipeline/enricher.ts
 * Orchestrates the AI pass: batches pending articles, calls the router,
 * validates the JSON response, and writes results back to the DB.
 * Provides an honest editorial fallback when external AI providers are unavailable
 * so real global news flows without blocking on third-party API keys.
 */
import { getDb, getSetting } from '../db/db';
import { FEATURES } from '../../../config/features';
import { PROVIDER_CHAIN } from '../../../config/ai-providers';
import { routeAIRequest } from '../ai/router';
import {
  buildEnrichmentPrompt,
  buildPass1Prompt,
  buildPass2Prompt,
  type EnrichmentInput,
  type Pass1Input,
  type Pass2Input,
} from '../ai/prompts';
import {
  parseEnrichmentResponse,
  parsePass1Response,
  validateAnchorPhrases,
  type EnrichmentResult,
  type Pass1Result,
} from '../ai/schema';
import type { DbArticle } from '../db/types';
import { emitSseEvent } from '../routes/sse';
import { runClusteringPass } from './cluster';
import { detectAlerts } from '../alerts/detector';
import { checkWatchlistMatches } from '../alerts/watchlist-checker';

export type ArticleRow = DbArticle & { source_country: string; source_name: string };

/**
 * Deterministic rule-based categorization engine for Plain Mode (PRD A Category 3).
 * Classifies articles using lexical patterns, outlet context, and broadsheet categories.
 */
export function applyRuleBasedCategorization(
  title: string,
  body: string,
  _sourceCountry?: string,
  _sourceName?: string
): Array<'World' | 'Politics' | 'Business' | 'Tech' | 'Science' | 'Health' | 'Sports' | 'Entertainment' | 'Environment' | 'Crime' | 'Animals'> {
  const text = `${title} ${body}`.toLowerCase();
  const categories: Array<'World' | 'Politics' | 'Business' | 'Tech' | 'Science' | 'Health' | 'Sports' | 'Entertainment' | 'Environment' | 'Crime' | 'Animals'> = [];

  if (text.match(/\b(politic|minister|president|election|parliament|government|party|vote|law|court|senate|diplomat|treaty|embassy|legislation)\b/i)) {
    categories.push('Politics');
  }
  if (text.match(/\b(finance|economy|market|bank|stock|trade|business|dollar|euro|inflation|rate|gdp|yield|invest|shares|nasdaq|dow)\b/i)) {
    categories.push('Business');
  }
  if (text.match(/\b(ai|tech|technology|software|cyber|chip|device|apple|google|meta|digital|telecom|algorithm|semiconductor|hardware|robot)\b/i)) {
    categories.push('Tech');
  }
  if (text.match(/\b(space|nasa|science|biology|physics|research|study|discovery|telescope|astronomy|quantum|galaxy|fossil)\b/i)) {
    categories.push('Science');
  }
  if (text.match(/\b(health|medical|virus|disease|hospital|doctor|vaccine|cancer|drug|surgery|patient|outbreak|who)\b/i)) {
    categories.push('Health');
  }
  if (text.match(/\b(football|soccer|cricket|tennis|basketball|olympic|fifa|tournament|champion|league|stadium|match|race)\b/i)) {
    categories.push('Sports');
  }
  if (text.match(/\b(film|movie|cinema|actor|actress|music|album|song|hollywood|theatre|concert|festival|award)\b/i)) {
    categories.push('Entertainment');
  }
  if (text.match(/\b(climate|warming|flood|storm|quake|rain|wildfire|forest|pollution|environment|carbon|cyclone|monsoon|emission)\b/i)) {
    categories.push('Environment');
  }
  if (text.match(/\b(animal|species|wildlife|bird|fish|tiger|elephant|dog|cat|bear|endangered|leopard|habitat|fauna|flora)\b/i)) {
    categories.push('Animals');
  }
  if (text.match(/\b(crime|police|arrest|murder|theft|court|trial|prison|gang|fraud|investigation|robbery|scam)\b/i)) {
    categories.push('Crime');
  }

  // Fallback to World if no specific category matches
  if (categories.length === 0) {
    categories.push('World');
  }

  return categories;
}

/**
 * Deterministic breaking score calculation for Plain Mode (PRD A Category 3.2.4).
 * Combines cross-outlet cluster rules and urgent headline lexicons.
 */
export function calculateDeterministicBreakingScore(
  title: string,
  body: string,
  clusterOutletsCount?: number,
  clusterCountriesCount?: number
): number {
  if (clusterOutletsCount !== undefined && clusterCountriesCount !== undefined) {
    if (clusterOutletsCount >= 3 && clusterCountriesCount >= 2) {
      return 90;
    }
    if (clusterOutletsCount >= 2) {
      return 70;
    }
  }

  const text = `${title} ${body}`.toLowerCase();
  if (text.match(/\b(breaking|bulletin|urgent|emergency|explosion|earthquake|tsunami|assassination|declaration of war|state of emergency)\b/i)) {
    return 85;
  }
  if (text.match(/\b(crisis|disaster|casualt|attack|fatal|alert|evacuat|clash)\b/i)) {
    return 65;
  }

  return 15;
}

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

  // Check Plain Mode setting (PRD A Category 3: Zero AI, Zero Quotas)
  const isPlainMode = getSetting('plain_mode_enabled', '0') === '1';
  if (isPlainMode) {
    console.log(`[Enricher] Plain Mode active (Zero AI) — processing ${pending.length} articles via deterministic rules`);
    processPlainModeBatch(pending);
    return;
  }

  const isTwoPassEnabled = getSetting('two_pass_ai_enabled', '1') === '1';
  // Determine batch size from primary provider config
  const primaryConfig = PROVIDER_CHAIN[0];
  const batchSize = primaryConfig?.batchSize ?? 20;

  console.log(`[Enricher] Processing ${pending.length} articles (Two-Pass: ${isTwoPassEnabled}) in batches of ${batchSize}`);

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    if (isTwoPassEnabled) {
      await processTwoPassBatch(batch);
    } else {
      await processBatch(batch);
    }
  }
}

/**
 * Processes a batch of articles using Pass 1 (Lightweight Batched Scoring).
 * Automatically triggers Pass 2 for top-tier articles meeting the urgency threshold (PRD A §10.1).
 */
export async function processTwoPassBatch(batch: ArticleRow[]): Promise<void> {
  const db = getDb();
  const pass2Threshold = parseInt(getSetting('pass2_threshold', '75'), 10);

  // 1. Pass 1 Lightweight Input (Truncate body to 500 chars to save prompt tokens)
  const pass1Inputs: Pass1Input[] = batch.map((a, idx) => ({
    article_index: idx,
    title_original: a.title_original ?? '',
    body_original: (a.body_original ?? a.title_original ?? '').slice(0, 500),
    language: a.language_detected ?? 'unknown',
    source_country: a.source_country,
    source_name: a.source_name,
  }));

  const pass1Prompt = buildPass1Prompt(pass1Inputs);
  let rawText: string | null = null;
  let useFallback = false;

  try {
    const result = await routeAIRequest(pass1Prompt);
    rawText = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Enricher] Pass 1 AI providers unavailable (${msg}). Applying deterministic triage.`);
    useFallback = true;
  }

  let pass1Results: Pass1Result[] = [];

  if (useFallback || !rawText) {
    pass1Results = batch.map((a, idx) => {
      const title = a.title_original || 'World News Dispatch';
      const body = a.body_original || '';
      return {
        article_index: idx,
        title_english: title,
        breaking_score: calculateDeterministicBreakingScore(title, body),
        categories: applyRuleBasedCategorization(title, body, a.source_country, a.source_name),
      };
    });
  } else {
    const parsed = parsePass1Response(rawText, batch.length);
    if (parsed.errors.length > 0) {
      console.warn(`[Enricher] Pass 1 validation warnings: ${parsed.errors.join('; ')}`);
    }
    const aiResultsByIndex = new Map(parsed.results.map((r) => [r.article_index, r]));
    pass1Results = batch.map((a, idx) => {
      const fromAi = aiResultsByIndex.get(idx);
      if (fromAi) return fromAi;
      const title = a.title_original || 'World News Dispatch';
      const body = a.body_original || '';
      return {
        article_index: idx,
        title_english: title,
        breaking_score: calculateDeterministicBreakingScore(title, body),
        categories: applyRuleBasedCategorization(title, body, a.source_country, a.source_name),
      };
    });
  }

  // 2. Write Pass 1 results to database
  const updatePass1 = db.prepare(`
    UPDATE articles SET
      title_english = @title_english,
      breaking_score = @breaking_score,
      pass1_completed_at = datetime('now'),
      status = 'done'
    WHERE id = @id
  `);

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO article_categories (article_id, category) VALUES (?, ?)
  `);

  const writePass1 = db.transaction((results: Pass1Result[]) => {
    for (const r of results) {
      const article = batch[r.article_index];
      if (!article) continue;
      updatePass1.run({
        id: article.id,
        title_english: r.title_english,
        breaking_score: r.breaking_score,
      });
      for (const cat of r.categories) {
        insertCategory.run(article.id, cat);
      }
      emitSseEvent('new_article', { article_id: article.id });
    }
  });

  writePass1(pass1Results);

  // Update telemetry: pass1_count
  db.prepare(`
    UPDATE two_pass_stats SET
      pass1_count = pass1_count + ?,
      last_updated_at = datetime('now')
    WHERE id = 1
  `).run(pass1Results.length);

  // 3. Partition articles by Pass 2 urgency threshold
  const qualifyingArticles: ArticleRow[] = [];
  const skippedArticles: ArticleRow[] = [];

  for (const r of pass1Results) {
    const article = batch[r.article_index];
    if (!article) continue;
    if (r.breaking_score >= pass2Threshold) {
      qualifyingArticles.push(article);
    } else {
      skippedArticles.push(article);
    }
  }

  // Record quota tokens saved for deferred dispatches (~740 tokens saved per skipped pass 2)
  if (skippedArticles.length > 0) {
    const tokensSaved = skippedArticles.length * 740;
    db.prepare(`
      UPDATE two_pass_stats SET
        pass2_skipped_count = pass2_skipped_count + ?,
        estimated_tokens_saved = estimated_tokens_saved + ?,
        last_updated_at = datetime('now')
      WHERE id = 1
    `).run(skippedArticles.length, tokensSaved);
  }

  // 4. Pass 2: In-Depth Enrichment for Qualifying Articles
  if (qualifyingArticles.length > 0) {
    console.log(`[Enricher] Pass 2 auto-triggering for ${qualifyingArticles.length} top-tier articles (score >= ${pass2Threshold})`);
    await processPass2Batch(qualifyingArticles);
  }

  // 5. Clustering and Alert Detection
  try {
    runClusteringPass();
  } catch (err) {
    console.warn('[Enricher] Clustering pass warning:', err);
  }

  try {
    const batchIds = batch.map((a) => a.id);
    detectAlerts(batchIds);
    checkWatchlistMatches(batchIds);
  } catch (err) {
    console.warn('[Enricher] Alert detection warning:', err);
  }
}

/**
 * Processes Pass 2 (In-Depth Enrichment) on a set of articles:
 * Generates executive summary, verbatim anchor phrases, entity tags, and keywords.
 */
export async function processPass2Batch(articles: ArticleRow[]): Promise<void> {
  const db = getDb();
  const inputs: Pass2Input[] = articles.map((a, idx) => ({
    article_index: idx,
    title_original: a.title_original ?? '',
    body_original: (a.body_original ?? a.title_original ?? '').slice(0, 4000),
    language: a.language_detected ?? 'unknown',
    source_country: a.source_country,
    source_name: a.source_name,
  }));

  const prompt = buildPass2Prompt(inputs);
  let rawText: string | null = null;
  let useFallback = false;

  try {
    const result = await routeAIRequest(prompt);
    rawText = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Enricher] Pass 2 AI providers unavailable (${msg}). Applying editorial fallback.`);
    useFallback = true;
  }

  let results: EnrichmentResult[] = [];
  if (useFallback || !rawText) {
    results = articles
      .map((a, idx) => {
        const textLen = (a.title_original?.length || 0) + (a.body_original?.length || 0);
        if (textLen < 15) return null;
        return createEditorialFallback(a, idx);
      })
      .filter((r): r is EnrichmentResult => r !== null);
  } else {
    const parsed = parseEnrichmentResponse(rawText, articles.length);
    const aiResultsByIndex = new Map(parsed.results.map((r) => [r.article_index, r]));
    results = articles
      .map((a, idx) => {
        const fromAi = aiResultsByIndex.get(idx);
        if (fromAi) return fromAi;
        return createEditorialFallback(a, idx);
      })
      .filter((r): r is EnrichmentResult => r !== null);
  }

  const updatePass2 = db.prepare(`
    UPDATE articles SET
      summary = @summary,
      body_english = @body_english,
      anchor_phrases = @anchor_phrases,
      pass2_completed_at = datetime('now'),
      ai_processed_at = datetime('now')
    WHERE id = @id
  `);

  const insertKeyword = db.prepare(`
    INSERT OR IGNORE INTO keywords (article_id, keyword) VALUES (?, ?)
  `);

  const writePass2 = db.transaction((validResults: EnrichmentResult[]) => {
    for (const r of validResults) {
      const article = articles[r.article_index];
      if (!article) continue;
      const summarySentences = (r.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length;
      const validAnchors = validateAnchorPhrases(r.anchor_phrases || [], r.body_english, summarySentences);

      updatePass2.run({
        id: article.id,
        summary: r.summary,
        body_english: r.body_english,
        anchor_phrases: validAnchors.length > 0 ? JSON.stringify(validAnchors) : null,
      });

      for (const kw of r.keywords) {
        insertKeyword.run(article.id, kw);
      }

      emitSseEvent('article_enriched_pass2', { article_id: article.id });
    }
  });

  writePass2(results);

  // Update telemetry: pass2_count
  db.prepare(`
    UPDATE two_pass_stats SET
      pass2_count = pass2_count + ?,
      last_updated_at = datetime('now')
    WHERE id = 1
  `).run(results.length);
}

/**
 * On-demand Pass 2 enrichment for a single dispatch (PRD A §10.1).
 * Invoked by user clicking "[✦ Summarize Story]" in the Main Reader.
 */
export async function enrichArticlePass2(articleId: number): Promise<void> {
  const db = getDb();
  const row = db.prepare(`
    SELECT a.*, s.name AS source_name, s.country AS source_country, s.url AS source_url
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.id = ?
  `).get(articleId) as (ArticleRow & { source_url: string }) | undefined;

  if (!row) {
    throw new Error(`Article ${articleId} not found`);
  }

  // If already Pass 2 completed with summary, return immediately
  if (row.pass2_completed_at && row.summary && row.summary.trim().length > 0) {
    return;
  }

  const inputs: Pass2Input[] = [{
    article_index: 0,
    title_original: row.title_original ?? '',
    body_original: (row.body_original ?? row.title_original ?? '').slice(0, 4000),
    language: row.language_detected ?? 'unknown',
    source_country: row.source_country,
    source_name: row.source_name,
  }];

  const prompt = buildPass2Prompt(inputs);
  let rawText: string | null = null;
  let useFallback = false;

  try {
    const result = await routeAIRequest(prompt);
    rawText = result.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Enricher] On-demand Pass 2 AI unavailable (${msg}). Applying editorial fallback.`);
    useFallback = true;
  }

  let enriched: EnrichmentResult;
  if (useFallback || !rawText) {
    enriched = createEditorialFallback(row, 0);
  } else {
    const parsed = parseEnrichmentResponse(rawText, 1);
    enriched = parsed.results[0] || createEditorialFallback(row, 0);
  }

  const summarySentences = (enriched.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length;
  const validAnchors = validateAnchorPhrases(enriched.anchor_phrases || [], enriched.body_english, summarySentences);

  const wasSkipped = row.pass1_completed_at !== null && row.pass2_completed_at === null;

  db.transaction(() => {
    db.prepare(`
      UPDATE articles SET
        summary = @summary,
        body_english = @body_english,
        title_english = COALESCE(title_english, @title_english),
        anchor_phrases = @anchor_phrases,
        pass2_completed_at = datetime('now'),
        ai_processed_at = datetime('now'),
        status = 'done'
      WHERE id = @id
    `).run({
      id: row.id,
      summary: enriched.summary,
      body_english: enriched.body_english,
      title_english: enriched.title_english,
      anchor_phrases: validAnchors.length > 0 ? JSON.stringify(validAnchors) : null,
    });

    const insertKeyword = db.prepare(`
      INSERT OR IGNORE INTO keywords (article_id, keyword) VALUES (?, ?)
    `);
    for (const kw of enriched.keywords) {
      insertKeyword.run(row.id, kw);
    }

    if (wasSkipped) {
      db.prepare(`
        UPDATE two_pass_stats SET
          pass2_count = pass2_count + 1,
          pass2_skipped_count = MAX(0, pass2_skipped_count - 1),
          estimated_tokens_saved = MAX(0, estimated_tokens_saved - 740),
          last_updated_at = datetime('now')
        WHERE id = 1
      `).run();
    } else {
      db.prepare(`
        UPDATE two_pass_stats SET
          pass2_count = pass2_count + 1,
          last_updated_at = datetime('now')
        WHERE id = 1
      `).run();
    }
  })();

  emitSseEvent('article_enriched_pass2', { article_id: row.id });
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
      pass1_completed_at = datetime('now'),
      pass2_completed_at = datetime('now'),
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

  // Update telemetry for single-pass mode
  db.prepare(`
    UPDATE two_pass_stats SET
      pass1_count = pass1_count + ?,
      pass2_count = pass2_count + ?,
      last_updated_at = datetime('now')
    WHERE id = 1
  `).run(results.length, results.length);
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

/**
 * Processes articles without any external AI API calls (PRD A Category 3).
 * Sets summary = NULL, applies deterministic categorization and breaking heuristics,
 * and marks articles as 'done'.
 */
export function processPlainModeBatch(batch: ArticleRow[]): void {
  const db = getDb();

  const updateArticle = db.prepare(`
    UPDATE articles SET
      title_english = coalesce(title_english, title_original),
      body_english  = coalesce(body_english, body_original),
      summary       = NULL,
      breaking_score = @breaking_score,
      anchor_phrases = NULL,
      pass1_completed_at = datetime('now'),
      pass2_completed_at = NULL,
      ai_processed_at = NULL,
      status        = 'done'
    WHERE id = @id
  `);

  const insertKeyword = db.prepare(`
    INSERT OR IGNORE INTO keywords (article_id, keyword) VALUES (?, ?)
  `);

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO article_categories (article_id, category) VALUES (?, ?)
  `);

  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'has', 'had', 'not', 'are', 'was', 'were',
    'been', 'will', 'would', 'could', 'should', 'about', 'after', 'into', 'more', 'their', 'they', 'what',
    'which', 'when', 'where', 'who', 'whom', 'whose', 'why', 'how', 'being', 'does', 'done', 'doing',
    'than', 'then', 'also', 'just', 'some', 'any', 'over', 'such', 'take', 'them', 'very', 'news',
    'said', 'says', 'reuters', 'hindu', 'times', 'post', 'press', 'associated', 'report', 'reports',
    'today', 'yesterday', 'first', 'second', 'years', 'month', 'week', 'amid', 'both', 'between',
  ]);

  const writeAll = db.transaction((rows: ArticleRow[]) => {
    for (const article of rows) {
      const title = (article.title_original || 'World News Dispatch').trim();
      const rawBody = (article.body_original || article.title_original || '').trim();
      const cleanBody = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Rule-based categorization
      const categories = applyRuleBasedCategorization(title, cleanBody, article.source_country, article.source_name);

      // Deterministic keyword extraction
      const words = `${title} ${cleanBody}`.toLowerCase().match(/[a-z]{4,}/g) || [];
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

      // Deterministic breaking score
      const breakingScore = calculateDeterministicBreakingScore(title, cleanBody);

      updateArticle.run({
        id: article.id,
        breaking_score: breakingScore,
      });

      for (const kw of keywords) {
        insertKeyword.run(article.id, kw);
      }

      for (const cat of categories) {
        insertCategory.run(article.id, cat);
      }

      // Emit SSE new_article event
      emitSseEvent('new_article', { article_id: article.id });
    }
  });

  writeAll(batch);

  // Update telemetry for Plain Mode (all articles counted as pass 1 triaged & quota conserved)
  db.prepare(`
    UPDATE two_pass_stats SET
      pass1_count = pass1_count + ?,
      pass2_skipped_count = pass2_skipped_count + ?,
      estimated_tokens_saved = estimated_tokens_saved + ?,
      last_updated_at = datetime('now')
    WHERE id = 1
  `).run(batch.length, batch.length, batch.length * 740);

  console.log(`[Enricher] Plain Mode batch completed — ${batch.length} articles processed with zero AI calls`);

  // Group newly enriched articles into story clusters
  try {
    runClusteringPass();
  } catch (err) {
    console.warn('[Enricher] Clustering pass warning:', err);
  }

  // Detect breaking news and cluster alerts
  try {
    const batchIds = batch.map((a) => a.id);
    const triggered = detectAlerts(batchIds);
    if (triggered.length > 0) {
      console.log(`[Enricher] Detected ${triggered.length} breaking alert(s) in Plain Mode`);
    }

    const watchlistAlerts = checkWatchlistMatches(batchIds);
    if (watchlistAlerts.length > 0) {
      console.log(`[Enricher] Triggered ${watchlistAlerts.length} watchlist alert(s) in Plain Mode`);
    }
  } catch (err) {
    console.warn('[Enricher] Alert detection warning:', err);
  }
}

/**
 * Returns the count of articles ingested in Plain Mode that have no AI summary.
 */
export function getUnenrichedCount(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM articles WHERE status = 'done' AND summary IS NULL`).get() as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

/**
 * Manually catch-up enriches a batch of unsummarized dispatches via AI (PRD A Category 3.2.6).
 * Triggered on user demand from Settings or Control Room.
 */
export async function summarizeUnenrichedBatch(limit = 20): Promise<{ processed: number; remaining: number }> {
  const db = getDb();
  const unenriched = db.prepare(`
    SELECT a.*, s.country AS source_country, s.name AS source_name
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.status = 'done' AND a.summary IS NULL
    ORDER BY a.fetched_at ASC
    LIMIT ?
  `).all(limit) as ArticleRow[];

  if (unenriched.length === 0) {
    return { processed: 0, remaining: 0 };
  }

  const ids = unenriched.map((a) => a.id);
  db.prepare(`UPDATE articles SET status = 'processing' WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);

  await processBatch(unenriched);

  const remaining = getUnenrichedCount();
  return { processed: unenriched.length, remaining };
}

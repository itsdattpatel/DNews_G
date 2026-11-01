/**
 * scratch/test_pipeline_run.ts
 * Diagnostic script: Run ONE manual fetch of a single real RSS feed and trace each stage.
 */
import { fetchRss } from '../backend/src/fetch/rss';
import { insertPendingArticles } from '../backend/src/pipeline/dedup';
import { scrapeArticle } from '../backend/src/fetch/scraper';
import { routeAIRequest } from '../backend/src/ai/router';
import { buildEnrichmentPrompt } from '../backend/src/ai/prompts';
import { getDb } from '../backend/src/db/db';

async function diagnosePipeline() {
  console.log('=== STAGE 1: FETCH REAL RSS FEED ===');
  const source = {
    slug: 'india_thehindu',
    name: 'The Hindu',
    country: 'India',
    url: 'https://www.thehindu.com/feeder/default.rss',
  };

  const fetched = await fetchRss(source.url, source.slug, source.name, source.country);
  console.log(`Fetched ${fetched.length} raw articles from ${source.name}`);
  if (fetched.length === 0) {
    console.error('Fetch returned 0 items!');
    return;
  }
  const sample = fetched[0]!;
  console.log(`Sample Article URL: ${sample.url}`);
  console.log(`Sample Title: ${sample.titleOriginal}`);
  console.log(`Sample Published: ${sample.publishedAt}`);
  console.log(`Sample Body snippet (length ${sample.bodyOriginal.length}): "${sample.bodyOriginal.slice(0, 150)}..."`);

  console.log('\n=== STAGE 2: DEDUP & INSERT PENDING ===');
  const db = getDb();
  const existing = db.prepare('SELECT id, status FROM articles WHERE url = ?').get(sample.url) as { id: number; status: string } | undefined;
  console.log(`Existing in DB? ${existing ? `YES (id: ${existing.id}, status: ${existing.status})` : 'NO'}`);

  const insertedCount = await insertPendingArticles([sample]);
  console.log(`insertPendingArticles result: ${insertedCount} new articles inserted`);

  const currentDbRow = db.prepare('SELECT id, url, status, fetched_at FROM articles WHERE url = ?').get(sample.url) as any;
  console.log(`Current DB row state:`, currentDbRow);

  console.log('\n=== STAGE 3: FULL TEXT EXTRACTION (SCRAPER) ===');
  try {
    const scraped = await scrapeArticle(sample.url);
    if (scraped) {
      console.log(`Scraper SUCCESS: extracted ${scraped.body.length} chars`);
      console.log(`Scraper snippet: "${scraped.body.slice(0, 150)}..."`);
    } else {
      console.log(`Scraper returned null (falling back to RSS bodyOriginal of ${sample.bodyOriginal.length} chars)`);
    }
  } catch (err: any) {
    console.log(`Scraper error: ${err.message}`);
  }

  console.log('\n=== STAGE 4: GEMINI / AI PASS ===');
  const enrichmentInput = [{
    article_index: 0,
    title_original: sample.titleOriginal,
    body_original: sample.bodyOriginal.slice(0, 3000),
    language: 'en',
    source_country: sample.country,
    source_name: sample.sourceName,
  }];
  const prompt = buildEnrichmentPrompt(enrichmentInput);
  console.log(`Enrichment Prompt built (length ${prompt.length} chars). Calling routeAIRequest()...`);
  try {
    const aiResult = await routeAIRequest(prompt);
    console.log(`AI Result provider: ${aiResult.provider}`);
    console.log(`AI Result text: ${aiResult.text.slice(0, 200)}...`);
  } catch (err: any) {
    console.error(`AI Pass FAILED: ${err.message}`);
  }

  console.log('\n=== STAGE 5: SAVED TO DB STATUS ===');
  const finalRow = db.prepare('SELECT id, title_english, summary, status FROM articles WHERE url = ?').get(sample.url) as any;
  console.log('Final article status in DB:', finalRow);
}

diagnosePipeline().catch(console.error);

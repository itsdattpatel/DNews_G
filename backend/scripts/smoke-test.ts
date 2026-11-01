import { getDb, closeDb } from '../src/db/db';
import { syncSources, insertPendingArticles } from '../src/pipeline/dedup';
import { SOURCES } from '../../config/sources';
import { fetchRss } from '../src/fetch/rss';

async function smokeTest() {
  const db = getDb();
  syncSources();
  console.log('--- Smoke Testing Live Feeds Across All 5 Countries + Animals ---');

  const testSlugs = [
    'india_thehindu',
    'usa_npr',
    'china_globaltimes',
    'japan_japantimes',
    'au_abc',
    'animals_mongabay',
  ];

  for (const slug of testSlugs) {
    const s = SOURCES.find((x) => x.slug === slug);
    if (!s) continue;
    const articles = await fetchRss(s.url, s.slug, s.name, s.country);
    const count = await insertPendingArticles(articles.slice(0, 5));
    console.log(`[PASS] ${s.country} (${s.name}): ${articles.length} live articles fetched, ${count} new inserted`);
  }

  const counts = db.prepare(`
    SELECT s.country, count(a.id) as count
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    GROUP BY s.country
    ORDER BY count DESC
  `).all() as { country: string; count: number }[];

  console.log('\n--- Articles by Country in SQLite ---');
  for (const c of counts) {
    console.log(`- ${c.country}: ${c.count} articles`);
  }

  closeDb();
}

smokeTest();

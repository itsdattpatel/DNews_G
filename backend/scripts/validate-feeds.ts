import Parser from 'rss-parser';
import { SOURCES } from '../../config/sources';

const parser = new Parser({
  timeout: 7000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (compatible; RSS-reader)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

async function testSource(s: (typeof SOURCES)[0]) {
  const start = Date.now();
  try {
    const feed = await parser.parseURL(s.url);
    const count = feed.items?.length ?? 0;
    const ms = Date.now() - start;
    console.log(`[PASS] ${s.slug} (${s.country} - ${s.name}): ${count} items in ${ms}ms`);
    return { slug: s.slug, ok: true, count, ms, url: s.url };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = Date.now() - start;
    console.log(`[FAIL] ${s.slug} (${s.country} - ${s.name}): ${msg} (${ms}ms)`);
    return { slug: s.slug, ok: false, error: msg, ms, url: s.url };
  }
}

async function run() {
  console.log(`Testing ${SOURCES.length} sources concurrently...\n`);
  const results = await Promise.all(SOURCES.map(testSource));
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${SOURCES.length}`);
}

run();

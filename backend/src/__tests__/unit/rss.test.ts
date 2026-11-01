import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseRssString } from '../../fetch/rss';

describe('RSS Parser (T1-01)', () => {
  it('parses fixture RSS XML and extracts articles', async () => {
    const fixturePath = path.join(__dirname, '../fixtures/sample-feed.xml');
    const xml = fs.readFileSync(fixturePath, 'utf8');

    const articles = await parseRssString(xml, 'sample-news', 'Sample News', 'Global');

    expect(articles.length).toBe(2);
    expect(articles[0]?.titleOriginal).toBe('Global Summit Reaches Landmark Accord on Clean Energy');
    expect(articles[0]?.url).toBe('https://example.com/news/clean-energy-accord');
    expect(articles[0]?.bodyOriginal).toContain('Delegates from over 40 nations');
    expect(articles[0]?.sourceSlug).toBe('sample-news');
    expect(articles[0]?.country).toBe('Global');
    expect(articles[0]?.publishedAt).toBeDefined();

    expect(articles[1]?.titleOriginal).toBe('Rare Snow Leopard Spotted in Himalayan Sanctuary');
    expect(articles[1]?.url).toBe('https://example.com/news/snow-leopard-spotted');
  });
});

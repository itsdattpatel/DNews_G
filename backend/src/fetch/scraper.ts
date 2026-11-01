/**
 * backend/src/fetch/scraper.ts
 * Mozilla Readability + JSDOM article body extractor for full article extraction
 * and outlets configured with fetchType: 'scrape'.
 * Gated by FEATURES.scraper.
 */
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { FEATURES } from '../../../config/features';

export interface ScrapedArticle {
  title: string;
  body: string;
  excerpt: string;
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle | null> {
  if (!FEATURES.scraper) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (compatible; NewsReader)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Scraper] HTTP ${res.status} when scraping ${url}`);
      return null;
    }

    const html = await res.text();
    return extractArticleFromHtml(html, url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Scraper] Failed to scrape ${url}: ${msg}`);
    return null;
  }
}

/** Extract readable article text from raw HTML */
export function extractArticleFromHtml(html: string, url = 'http://localhost'): ScrapedArticle | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();

    if (!parsed) return null;

    return {
      title: parsed.title ? parsed.title.trim() : '',
      body: parsed.textContent ? parsed.textContent.replace(/\s{2,}/g, ' ').trim() : '',
      excerpt: parsed.excerpt ? parsed.excerpt.trim() : '',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Scraper] Readability extraction error: ${msg}`);
    return null;
  }
}

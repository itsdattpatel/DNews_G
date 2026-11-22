/**
 * backend/src/fetch/rss.ts
 * Fetches and parses an RSS feed into ArticleRaw records.
 */
import Parser from 'rss-parser';
import { FEATURES } from '../../../config/features';
import { decodeEntitiesAndMojibake } from '../pipeline/textNormalizer';

export interface ArticleRaw {
  url: string;
  titleOriginal: string;
  bodyOriginal: string;
  publishedAt: string | null;
  sourceSlug: string;
  sourceName: string;
  country: string;
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'AI-World-News-Desk/1.0 (news aggregator)',
  },
});

export async function parseRssString(
  xml: string,
  sourceSlug: string,
  sourceName: string,
  country: string,
): Promise<ArticleRaw[]> {
  const feed = await parser.parseString(xml);
  const articles: ArticleRaw[] = [];

  for (const item of feed.items ?? []) {
    const itemUrl = item.link ?? item.guid;
    if (!itemUrl) continue;

    const title = item.title ?? '(no title)';
    // content:encoded > content > summary > contentSnippet, in priority order
    const body =
      ((item as Record<string, unknown>)['content:encoded'] as string) ??
      item.content ??
      item.summary ??
      item.contentSnippet ??
      '';

    const pubDate = item.pubDate ?? item.isoDate ?? null;

    articles.push({
      url: itemUrl.trim(),
      titleOriginal: title.trim(),
      bodyOriginal: stripHtml(String(body)).trim(),
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      sourceSlug,
      sourceName,
      country,
    });
  }

  return articles;
}

export async function fetchRss(
  url: string,
  sourceSlug: string,
  sourceName: string,
  country: string,
): Promise<ArticleRaw[]> {
  if (!FEATURES.rss) return [];

  try {
    const feed = await parser.parseURL(url);
    const articles: ArticleRaw[] = [];

    for (const item of feed.items ?? []) {
      const itemUrl = item.link ?? item.guid;
      if (!itemUrl) continue;

      const title = item.title ?? '(no title)';
      const body =
        ((item as Record<string, unknown>)['content:encoded'] as string) ??
        item.content ??
        item.summary ??
        item.contentSnippet ??
        '';

      const pubDate = item.pubDate ?? item.isoDate ?? null;
      let safePublishedAt: string | null = null;
      if (pubDate) {
        try {
          const parsed = new Date(pubDate).getTime();
          const maxFuture = Date.now() + 15 * 60 * 1000;
          if (!isNaN(parsed)) {
            // Clamp future-dated articles (e.g. newspaper embargoes or print editions) to current time
            safePublishedAt = new Date(parsed > maxFuture ? Date.now() : parsed).toISOString();
          }
        } catch {
          safePublishedAt = new Date().toISOString();
        }
      }

      articles.push({
        url: itemUrl.trim(),
        titleOriginal: title.trim(),
        bodyOriginal: stripHtml(String(body)).trim(),
        publishedAt: safePublishedAt,
        sourceSlug,
        sourceName,
        country,
      });
    }

    return articles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RSS] Failed to fetch ${url}: ${msg}`);
    return [];
  }
}

/** Very lightweight HTML tag stripper — avoids jsdom overhead in the hot path */
function stripHtml(html: string): string {
  const noTags = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return decodeEntitiesAndMojibake(noTags);
}

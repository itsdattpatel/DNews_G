/**
 * backend/src/fetch/gdelt.ts
 * GDELT 2.0 Doc API client for news discovery and outlets without RSS feeds.
 * Gated by FEATURES.gdelt.
 */
import { FEATURES } from '../../../config/features';
import type { ArticleRaw } from './rss';

export interface GdeltArticle {
  url: string;
  title: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

export interface GdeltResponse {
  articles?: GdeltArticle[];
}

export async function fetchGdelt(
  query: string,
  sourceSlug: string,
  sourceName: string,
  country: string,
  options: { maxRecords?: number; timespan?: string } = {},
): Promise<ArticleRaw[]> {
  if (!FEATURES.gdelt) return [];

  const maxRecords = Math.min(100, Math.max(5, options.maxRecords ?? 25));
  const timespan = options.timespan ?? '24h';

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
    query,
  )}&mode=artlist&maxrecords=${maxRecords}&timespan=${timespan}&format=json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-World-News-Desk/1.0 (news aggregator)',
        Accept: 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[GDELT] Request failed with HTTP ${res.status} for query: ${query}`);
      return [];
    }

    const data = (await res.json()) as GdeltResponse;
    if (!data.articles || !Array.isArray(data.articles)) {
      return [];
    }

    return data.articles
      .filter((a) => Boolean(a.url && a.title))
      .map((a) => ({
        url: a.url.trim(),
        titleOriginal: a.title.trim(),
        bodyOriginal: a.title.trim(), // GDELT returns headline + metadata, body fetched on demand
        publishedAt: parseGdeltDate(a.seendate),
        sourceSlug,
        sourceName: a.domain ? `${sourceName} (${a.domain})` : sourceName,
        country: country || a.sourcecountry || 'Global',
      }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[GDELT] Error fetching query "${query}": ${msg}`);
    return [];
  }
}

/** Parses GDELT date format YYYYMMDDTHHMMSSZ into ISO string */
export function parseGdeltDate(seenDate?: string): string | null {
  if (!seenDate) return null;
  try {
    // Format: 20261030T101500Z
    const match = seenDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (match) {
      const [, y, m, d, hh, mm, ss] = match;
      return new Date(Date.UTC(+y!, +m! - 1, +d!, +hh!, +mm!, +ss!)).toISOString();
    }
    const d = new Date(seenDate);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

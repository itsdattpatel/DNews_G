/**
 * backend/src/fetch/backfill.ts
 * GDELT date-range backfill for missed time windows when the app resumes after downtime.
 * Provides honest fallback reporting for RSS-only feeds that do not support historical querying.
 */
import { FEATURES } from '../../../config/features';
import { SOURCES } from '../../../config/sources';
import { fetchGdelt } from './gdelt';
import { insertPendingArticles } from '../pipeline/dedup';
import { getStartupGap, resetStartupGap, type MissedWindow } from './scheduler';
import type { ArticleRaw } from './rss';

export interface BackfillResult {
  coveredMinutes: number;
  totalMissedMinutes: number;
  articlesFetched: number;
  articlesInserted: number;
  gdeltCoverage: boolean;
  rssCoverage: boolean;
  warning?: string | undefined;
}

/**
 * Perform date-range backfill for missed time window using GDELT.
 * RSS feeds cannot query historical ranges; provides an honest warning.
 */
export async function backfillMissedWindow(
  windowOverride?: Partial<MissedWindow>,
): Promise<BackfillResult> {
  const startupGap = getStartupGap();
  const totalMissedMinutes = windowOverride?.missedMinutes ?? startupGap.missedMinutes;

  if (totalMissedMinutes <= 0) {
    return {
      coveredMinutes: 0,
      totalMissedMinutes: 0,
      articlesFetched: 0,
      articlesInserted: 0,
      gdeltCoverage: false,
      rssCoverage: false,
    };
  }

  let articlesFetched = 0;
  let articlesInserted = 0;
  let gdeltCoverage = false;
  let coveredMinutes = 0;

  // Map country to an existing enabled source slug
  const countrySlugMap: Record<string, string> = {};
  for (const s of SOURCES) {
    if (s.enabled && !countrySlugMap[s.country]) {
      countrySlugMap[s.country] = s.slug;
    }
  }
  const defaultSlug = SOURCES[0]?.slug ?? 'usa_npr';

  if (FEATURES.gdelt) {
    // Format GDELT timespan string
    // GDELT accepts e.g. "30m", "120m", "24h" (up to 24h = 1440m)
    const effectiveMinutes = Math.min(1440, Math.max(15, totalMissedMinutes));
    const timespan =
      effectiveMinutes <= 60 ? `${effectiveMinutes}m` : `${Math.ceil(effectiveMinutes / 60)}h`;

    const queries = [
      { query: 'India news', country: 'India' },
      { query: 'USA news', country: 'USA' },
      { query: 'UK news', country: 'UK' },
      { query: 'Japan news', country: 'Japan' },
      { query: 'Australia news', country: 'Australia' },
      { query: 'wildlife animals news', country: 'Animals' },
    ];

    const allArticles: ArticleRaw[] = [];

    for (const q of queries) {
      try {
        const slug = countrySlugMap[q.country] ?? defaultSlug;
        const articles = await fetchGdelt(q.query, slug, `GDELT (${q.country})`, q.country, {
          maxRecords: 20,
          timespan,
        });
        allArticles.push(...articles);
      } catch (err) {
        console.warn(`[Backfill] GDELT query failed for ${q.country}:`, err);
      }
    }

    articlesFetched = allArticles.length;
    if (allArticles.length > 0) {
      articlesInserted = await insertPendingArticles(allArticles, true);
    }
    gdeltCoverage = true;
    coveredMinutes = effectiveMinutes;
  }

  // Honest fallback message for RSS-only vs GDELT
  let warning: string;
  if (!FEATURES.gdelt) {
    warning = `RSS has no backfill; GDELT is disabled (0 of ${totalMissedMinutes} minutes covered)`;
  } else if (coveredMinutes < totalMissedMinutes) {
    warning = `RSS has no backfill; GDELT covered ${coveredMinutes} of ${totalMissedMinutes} minutes`;
  } else {
    warning = `RSS has no backfill; GDELT covered ${coveredMinutes} of ${totalMissedMinutes} minutes`;
  }

  console.log(`[Backfill] Completed: ${articlesInserted} new articles inserted. ${warning}`);

  // Mark startup gap as handled
  resetStartupGap();

  return {
    coveredMinutes,
    totalMissedMinutes,
    articlesFetched,
    articlesInserted,
    gdeltCoverage,
    rssCoverage: false, // RSS feeds cannot backfill date ranges
    warning,
  };
}

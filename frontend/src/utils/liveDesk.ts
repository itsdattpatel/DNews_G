/**
 * frontend/src/utils/liveDesk.ts
 * Pure filter-matching and memory-bounding helpers for live SSE ingestion on the Main Desk.
 */
import type { Article } from '../types';

export const MAX_IN_MEMORY_ARTICLES = 200;
export const MAX_IN_MEMORY_ALERTS = 100;
export const MAX_IN_MEMORY_ERRORS = 100;

export interface ActiveArticleFilters {
  selectedCategory: string | null;
  selectedCountry: string | null;
  searchQuery: string;
  isBreakingOnly: boolean;
  alertThreshold?: number;
}

/**
 * Returns true if an arriving or updated article satisfies the user's current feed filters.
 * Prevents wrong-country, wrong-category, or non-matching search items from polluting active lists.
 */
export function articleMatchesFilters(article: Article, filters: ActiveArticleFilters): boolean {
  if (filters.selectedCountry) {
    const country = (article.source?.country || '').toLowerCase();
    if (country !== filters.selectedCountry.toLowerCase()) {
      return false;
    }
  }

  if (filters.selectedCategory) {
    const target = filters.selectedCategory.toLowerCase();
    const cats = (article.categories || []).map((c) => c.toLowerCase());
    if (!cats.includes(target)) {
      return false;
    }
  }

  if (filters.isBreakingOnly) {
    const threshold = filters.alertThreshold ?? 75;
    if ((article.breaking_score ?? 0) < threshold) {
      return false;
    }
  }

  const trimmedQuery = filters.searchQuery.trim().toLowerCase();
  if (trimmedQuery.length > 0) {
    const haystack = [
      article.title_english,
      article.title_original,
      article.summary,
      article.body_english,
      article.source?.name,
      article.source?.country,
      ...(article.keywords || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(trimmedQuery)) {
      return false;
    }
  }

  return true;
}

/**
 * Caps an array of items cleanly without mutating the source array.
 */
export function capList<T>(items: T[], maxItems: number): T[] {
  if (items.length <= maxItems) return items;
  return items.slice(0, maxItems);
}

/**
 * Upserts an updated article or prepends a newly arrived article, keeping memory bounded.
 */
export function mergeLiveArticleList(
  existing: Article[],
  incoming: Article,
  filters: ActiveArticleFilters,
  maxItems: number = MAX_IN_MEMORY_ARTICLES,
): { items: Article[]; deltaTotal: number } {
  const idx = existing.findIndex((a) => a.id === incoming.id);
  const matches = articleMatchesFilters(incoming, filters);

  if (idx !== -1) {
    if (!matches) {
      const next = existing.filter((a) => a.id !== incoming.id);
      return { items: next, deltaTotal: -1 };
    }
    const next = [...existing];
    next[idx] = { ...existing[idx]!, ...incoming };
    return { items: next, deltaTotal: 0 };
  }

  if (!matches) {
    return { items: existing, deltaTotal: 0 };
  }

  return {
    items: capList([incoming, ...existing], maxItems),
    deltaTotal: 1,
  };
}

/**
 * Merges buffered live arrivals ahead of the current snapshot queue, deduping by id
 * and preserving memory bounds. Used on explicit "N new stories" click or wrap-around.
 */
export function mergePendingArticles(
  pending: Article[],
  existing: Article[],
  maxItems: number = MAX_IN_MEMORY_ARTICLES,
): { items: Article[]; addedCount: number } {
  if (!pending.length) {
    return { items: existing, addedCount: 0 };
  }

  const seen = new Set<number>();
  const combined: Article[] = [];
  let addedCount = 0;
  const existingIds = new Set(existing.map((a) => a.id));

  for (const item of pending) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    combined.push(item);
    if (!existingIds.has(item.id)) {
      addedCount += 1;
    }
  }

  for (const item of existing) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    combined.push(item);
  }

  return {
    items: capList(combined, maxItems),
    addedCount,
  };
}


/**
 * frontend/src/utils/category.ts
 * Helper functions for Category Rail, breaking score dot calculation, and broadsheet bylines.
 */
import type { Article } from '../types';

/**
 * 5-dot breaking score calculation per UI_SPEC.md Screen (b)
 * 0-20% = 1 dot, 21-40% = 2 dots, 41-60% = 3 dots, 61-80% = 4 dots, 81-100% = 5 dots
 */
export function getBreakingScoreDots(score: number): { filled: number; total: number } {
  const clamped = Math.max(0, Math.min(100, score));
  let filled = 1;
  if (clamped > 80) filled = 5;
  else if (clamped > 60) filled = 4;
  else if (clamped > 40) filled = 3;
  else if (clamped > 20) filled = 2;
  return { filled, total: 5 };
}

/**
 * Formats broadsheet byline string: "Outlet · Country"
 */
export function formatArticleByline(article: Pick<Article, 'source'>): string {
  const name = article.source?.name?.trim() || 'Wire Service';
  const country = article.source?.country?.trim() || 'Global';
  return `${name} · ${country}`;
}

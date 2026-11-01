/**
 * frontend/src/utils/watchlist.ts
 * Utility helpers, match calculator, and priority ink stamps for Screen (g) Watchlist Desk.
 */

export interface WatchlistArticleSnippet {
  title_english: string;
  summary?: string;
  keywords?: string[];
}

/**
 * Calculates how many articles match a watchlist item's keywords (case-insensitive substring/word match)
 */
export function calculateWatchlistMatches(
  keywords: string[],
  articles: WatchlistArticleSnippet[],
): number {
  if (!keywords.length || !articles.length) return 0;

  const normalizedKeywords = keywords
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (!normalizedKeywords.length) return 0;

  let matchCount = 0;

  for (const article of articles) {
    const title = (article.title_english || '').toLowerCase();
    const summary = (article.summary || '').toLowerCase();
    const articleKws = (article.keywords || []).map((k) => k.toLowerCase());

    const isMatch = normalizedKeywords.some((kw) => {
      if (title.includes(kw)) return true;
      if (summary.includes(kw)) return true;
      return articleKws.some((k) => k.includes(kw));
    });

    if (isMatch) {
      matchCount++;
    }
  }

  return matchCount;
}

export interface PriorityStamp {
  label: string;
  className: string;
}

/**
 * Returns broadsheet ink-stamp tokens for priority ratings
 */
export function getPriorityStamp(priority: 'low' | 'normal' | 'high'): PriorityStamp {
  switch (priority) {
    case 'high':
      return {
        label: 'URGENT WIRE',
        className:
          'border-accent text-accent bg-accent/10 dark:bg-accent/15 border font-mono font-bold uppercase tracking-wider',
      };
    case 'normal':
      return {
        label: 'ACTIVE RADAR',
        className:
          'border-amber-700/60 text-amber-800 dark:text-amber-300 bg-amber-500/10 border font-mono font-bold uppercase tracking-wider',
      };
    case 'low':
    default:
      return {
        label: 'ROUTINE LOG',
        className:
          'border-paper-border text-ink-secondary bg-paper-alt border font-mono font-bold uppercase tracking-wider',
      };
  }
}

export const WATCHLIST_PRESETS = [
  {
    topic: 'Tiger & Snow Leopard Conservation',
    keywords: ['tiger', 'snow leopard', 'poaching', 'sanctuary', 'corridor'],
    priority: 'high' as const,
  },
  {
    topic: 'Global Clean Energy Transition',
    keywords: ['clean energy', 'solar', 'wind', 'renewables', 'grid', 'battery'],
    priority: 'normal' as const,
  },
  {
    topic: 'Quantum & Semiconductor Tech',
    keywords: ['quantum', 'optical', 'chip', 'semiconductor', 'computing'],
    priority: 'normal' as const,
  },
  {
    topic: 'Central Bank Interest Rates',
    keywords: ['interest rate', 'inflation', 'federal reserve', 'central bank'],
    priority: 'low' as const,
  },
];

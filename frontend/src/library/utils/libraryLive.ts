/**
 * frontend/src/library/utils/libraryLive.ts
 * Pure filtering, capped-list, and non-jumping live reconciliation helpers for The Library
 * (PRD D Category 6).
 */

export const MAX_LIBRARY_LIST_ITEMS = 250;

export interface HistoryEventRecord {
  id: number;
  source_slug: string;
  external_id: string;
  event_date: string;
  event_year: number;
  headline: string;
  snippet: string;
  original_url: string;
  country: string | null;
  media_url?: string | null;
  license: string;
  attribution: string;
  cached_at?: string;
  is_bookmarked?: boolean;
}

export interface LibraryVerseRecord {
  id: number;
  book_id?: number;
  book_slug?: string;
  book_title?: string;
  section_number: number;
  section_unit?: string;
  verse_number: number;
  verse_ref: string;
  text_sanskrit?: string | null;
  text_original?: string | null;
  transliteration?: string | null;
  translation?: string;
  translation_english?: string;
  translator: string;
  meaning?: string | null;
  plain_meaning?: string | null;
  commentary_source?: string | null;
  meaning_reviewed?: number;
  theme?: string | null;
  theme_tags?: string | null;
  attribution?: string;
  source_url?: string | null;
  license?: string;
  source_license?: string;
  created_at?: string;
  is_bookmarked?: boolean;
}

export interface LibraryQuoteRecord {
  id: number;
  quote_text: string;
  author: string;
  author_origin?: string | null;
  country?: string | null;
  tradition?: string | null;
  source_work?: string | null;
  work_title?: string | null;
  year_published?: number | string | null;
  source_url?: string | null;
  theme?: string | null;
  theme_tags?: string | null;
  meaning?: string | null;
  plain_meaning?: string | null;
  commentary_source?: string | null;
  meaning_reviewed?: number;
  license?: string;
  source_license?: string;
  attribution: string;
  is_verified: boolean | number;
  created_at?: string;
  is_bookmarked?: boolean;
}

export interface LibraryMindCardRecord {
  id: number;
  slug: string;
  title: string;
  category: string;
  what_it_is: string;
  when_it_helps: string;
  steps: string[];
  time_needed_minutes: number;
  source_book: string;
  source_chapter: string;
  source_url: string;
  source_license: string;
  attribution: string;
  created_at?: string;
}

export interface HistoryFilterSpec {
  monthDay?: string;
  era?: 'all' | 'ancient' | 'medieval' | 'modern';
  decade?: string | number;
  country?: string;
  searchQuery?: string;
}

export interface VerseFilterSpec {
  bookId?: string | number;
  chapter?: number | 'all';
  theme?: string;
  searchQuery?: string;
}

export interface QuoteFilterSpec {
  author?: string;
  tradition?: string;
  theme?: string;
  verifiedOnly?: boolean;
  searchQuery?: string;
}

export interface MindCardFilterSpec {
  category?: string;
  maxTime?: number | 'all';
  searchQuery?: string;
}

export function capLibraryList<T>(items: T[], cap = MAX_LIBRARY_LIST_ITEMS): T[] {
  return items.length <= cap ? items : items.slice(0, cap);
}

export function historyMatchesFilter(item: HistoryEventRecord, filter: HistoryFilterSpec): boolean {
  if (filter.monthDay && filter.monthDay.trim()) {
    const md = filter.monthDay.trim();
    const dateVal = item.event_date || '';
    if (dateVal !== md && !dateVal.endsWith(`-${md}`)) {
      return false;
    }
  }

  if (filter.era && filter.era !== 'all') {
    const y = Number(item.event_year);
    if (filter.era === 'ancient' && !(y < 500)) return false;
    if (filter.era === 'medieval' && !(y >= 500 && y < 1800)) return false;
    if (filter.era === 'modern' && !(y >= 1800)) return false;
  }

  if (filter.decade && String(filter.decade) !== 'all') {
    const startYear = parseInt(String(filter.decade), 10);
    if (!Number.isNaN(startYear)) {
      const y = Number(item.event_year);
      if (y < startYear || y >= startYear + 10) return false;
    }
  }

  if (filter.country && filter.country !== 'all') {
    if ((item.country || '').toLowerCase() !== filter.country.toLowerCase()) return false;
  }

  if (filter.searchQuery && filter.searchQuery.trim()) {
    const q = filter.searchQuery.trim().toLowerCase();
    const haystack = [
      item.headline,
      item.snippet,
      item.country,
      item.attribution,
      item.license,
      item.source_slug,
      String(item.event_year),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function verseMatchesFilter(verse: LibraryVerseRecord, filter: VerseFilterSpec): boolean {
  if (filter.bookId && filter.bookId !== 'all') {
    const bookFilter = String(filter.bookId).toLowerCase();
    const matchesSlug = (verse.book_slug || '').toLowerCase() === bookFilter;
    const matchesId = verse.book_id !== undefined && String(verse.book_id).toLowerCase() === bookFilter;
    if (!matchesSlug && !matchesId) return false;
  }

  if (filter.chapter !== undefined && filter.chapter !== 'all' && Number(filter.chapter) > 0) {
    if (verse.section_number !== Number(filter.chapter)) return false;
  }

  if (filter.theme && filter.theme.trim() && filter.theme !== 'all') {
    const t = filter.theme.trim().toLowerCase();
    const tags = (verse.theme_tags ?? verse.theme ?? '').toLowerCase();
    if (!tags.includes(t)) return false;
  }

  if (filter.searchQuery && filter.searchQuery.trim()) {
    const q = filter.searchQuery.trim().toLowerCase();
    const haystack = [
      verse.verse_ref,
      verse.translation_english,
      verse.translation,
      verse.text_original,
      verse.text_sanskrit,
      verse.transliteration,
      verse.plain_meaning,
      verse.meaning,
      verse.translator,
      verse.source_license,
      verse.license,
      verse.attribution,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function quoteMatchesFilter(quote: LibraryQuoteRecord, filter: QuoteFilterSpec): boolean {
  if (filter.author && filter.author.trim() && filter.author !== 'all') {
    if ((quote.author || '').toLowerCase() !== filter.author.trim().toLowerCase()) {
      return false;
    }
  }

  if (filter.tradition && filter.tradition.trim() && filter.tradition !== 'all') {
    if ((quote.tradition || '').toLowerCase() !== filter.tradition.trim().toLowerCase()) {
      return false;
    }
  }

  if (filter.verifiedOnly && !quote.is_verified) {
    return false;
  }

  if (filter.theme && filter.theme.trim() && filter.theme !== 'all') {
    const t = filter.theme.trim().toLowerCase();
    const tags = (quote.theme_tags ?? quote.theme ?? '').toLowerCase();
    if (!tags.includes(t)) return false;
  }

  if (filter.searchQuery && filter.searchQuery.trim()) {
    const q = filter.searchQuery.trim().toLowerCase();
    const haystack = [
      quote.quote_text,
      quote.author,
      quote.work_title,
      quote.source_work,
      quote.plain_meaning,
      quote.meaning,
      quote.attribution,
      quote.source_license,
      quote.license,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function mindCardMatchesFilter(card: LibraryMindCardRecord, filter: MindCardFilterSpec): boolean {
  if (filter.category && filter.category !== 'all') {
    if (card.category.toLowerCase() !== filter.category.toLowerCase()) return false;
  }

  if (filter.maxTime !== undefined && filter.maxTime !== 'all') {
    if (Number(card.time_needed_minutes) > Number(filter.maxTime)) return false;
  }

  if (filter.searchQuery && filter.searchQuery.trim()) {
    const q = filter.searchQuery.trim().toLowerCase();
    const haystack = [
      card.title,
      card.what_it_is,
      card.when_it_helps,
      card.source_book,
      card.source_chapter,
      card.attribution,
      card.source_license,
      ...(Array.isArray(card.steps) ? card.steps : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export interface ReconcileOptions<T extends { id: number }> {
  action: 'created' | 'updated';
  item: T;
  matchesFilter: boolean;
  visible: T[];
  pending: T[];
  selected?: T | null | undefined;
}

export interface ReconcileResult<T extends { id: number }> {
  visible: T[];
  pending: T[];
  selected?: T | null | undefined;
}

/**
 * Reconciles a live-arriving Library item without shifting scroll or active reading state:
 * - Updates to existing visible/pending/selected items apply IN PLACE at the same index.
 * - Newly created matching items buffer into `pending` (rendered behind "• N new" pill).
 * - Non-matching newly created items never leak into the active filtered view.
 */
export function reconcileLibraryIncomingItem<T extends { id: number }>(
  opts: ReconcileOptions<T>,
): ReconcileResult<T> {
  const { action, item, matchesFilter, visible, pending, selected } = opts;

  const existingVisibleIdx = visible.findIndex((r) => r.id === item.id);
  const existingPendingIdx = pending.findIndex((r) => r.id === item.id);
  const matchesSelected = Boolean(selected && selected.id === item.id);

  if (action === 'updated' || existingVisibleIdx !== -1 || matchesSelected) {
    const nextVisible =
      existingVisibleIdx !== -1
        ? visible.map((r, i) => (i === existingVisibleIdx ? { ...r, ...item } : r))
        : visible;
    const nextPending =
      existingPendingIdx !== -1
        ? pending.map((r, i) => (i === existingPendingIdx ? { ...r, ...item } : r))
        : pending;
    const nextSelected = matchesSelected && selected ? { ...selected, ...item } : selected;
    return {
      visible: nextVisible,
      pending: nextPending,
      ...(selected !== undefined ? { selected: nextSelected } : {}),
    };
  }

  if (!matchesFilter) {
    return {
      visible,
      pending,
      ...(selected !== undefined ? { selected } : {}),
    };
  }

  if (existingPendingIdx !== -1) {
    return {
      visible,
      pending: pending.map((r, i) => (i === existingPendingIdx ? { ...r, ...item } : r)),
      ...(selected !== undefined ? { selected } : {}),
    };
  }

  return {
    visible,
    pending: capLibraryList([...pending, item], MAX_LIBRARY_LIST_ITEMS),
    ...(selected !== undefined ? { selected } : {}),
  };
}

export function mergePendingLibraryItems<T extends { id: number }>(
  pending: T[],
  visible: T[],
  prepend = true,
): T[] {
  if (pending.length === 0) return visible;
  const seen = new Set(visible.map((v) => v.id));
  const uniqueNew = pending.filter((p) => !seen.has(p.id));
  if (uniqueNew.length === 0) return visible;
  const combined = prepend ? [...uniqueNew, ...visible] : [...visible, ...uniqueNew];
  return capLibraryList(combined, MAX_LIBRARY_LIST_ITEMS);
}

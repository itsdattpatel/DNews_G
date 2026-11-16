/**
 * backend/src/library/services/provenanceService.ts
 * Aggregates live source, license, attribution, and meaning-review provenance
 * metrics across Historical Archives, Timeless Wisdom, and Mind Helps.
 */
import Database from 'better-sqlite3';

export interface LicenseBreakdownItem {
  license: string;
  section: 'history' | 'wisdom_books' | 'wisdom_verses' | 'wisdom_quotes' | 'mind_cards';
  count: number;
}

export interface LibraryProvenanceSummary {
  summary: {
    history_records: number;
    books: number;
    verses: number;
    quotes: number;
    mind_cards: number;
    reviewed_verses: number;
    reviewed_quotes: number;
  };
  licenses: LicenseBreakdownItem[];
  updated_at: string;
}

export function getLibraryProvenanceSummary(db: Database.Database): LibraryProvenanceSummary {
  const historyCount =
    (db.prepare('SELECT COUNT(*) as c FROM library_history_cache').get() as { c: number })?.c ?? 0;
  const booksCount =
    (db.prepare('SELECT COUNT(*) as c FROM library_books WHERE is_active = 1').get() as { c: number })?.c ?? 0;
  const versesCount =
    (db.prepare('SELECT COUNT(*) as c FROM library_verses').get() as { c: number })?.c ?? 0;
  const quotesCount =
    (db.prepare('SELECT COUNT(*) as c FROM library_quotes').get() as { c: number })?.c ?? 0;
  const mindCount =
    (db.prepare('SELECT COUNT(*) as c FROM library_mind_cards').get() as { c: number })?.c ?? 0;

  const verseCols = (db.prepare('PRAGMA table_info(library_verses)').all() as Array<{ name: string }>).map((c) => c.name);
  const quoteCols = (db.prepare('PRAGMA table_info(library_quotes)').all() as Array<{ name: string }>).map((c) => c.name);

  const reviewedVerses = verseCols.includes('meaning_reviewed')
    ? ((db.prepare('SELECT COUNT(*) as c FROM library_verses WHERE meaning_reviewed = 1').get() as { c: number })?.c ?? 0)
    : 0;
  const reviewedQuotes = quoteCols.includes('meaning_reviewed')
    ? ((db.prepare('SELECT COUNT(*) as c FROM library_quotes WHERE meaning_reviewed = 1').get() as { c: number })?.c ?? 0)
    : 0;

  const historyLicenses = (
    db.prepare('SELECT license as lic, COUNT(*) as c FROM library_history_cache GROUP BY license').all() as Array<{
      lic: string;
      c: number;
    }>
  ).map((r) => ({ license: r.lic || 'Unspecified', section: 'history' as const, count: r.c }));

  const bookLicenses = (
    db.prepare('SELECT source_license as lic, COUNT(*) as c FROM library_books WHERE is_active = 1 GROUP BY source_license').all() as Array<{
      lic: string;
      c: number;
    }>
  ).map((r) => ({ license: r.lic || 'Public Domain', section: 'wisdom_books' as const, count: r.c }));

  const verseLicenses = (
    db.prepare('SELECT source_license as lic, COUNT(*) as c FROM library_verses GROUP BY source_license').all() as Array<{
      lic: string;
      c: number;
    }>
  ).map((r) => ({ license: r.lic || 'Public Domain', section: 'wisdom_verses' as const, count: r.c }));

  const quoteLicenses = (
    db.prepare('SELECT source_license as lic, COUNT(*) as c FROM library_quotes GROUP BY source_license').all() as Array<{
      lic: string;
      c: number;
    }>
  ).map((r) => ({ license: r.lic || 'Public Domain', section: 'wisdom_quotes' as const, count: r.c }));

  const mindLicenses = (
    db.prepare('SELECT source_license as lic, COUNT(*) as c FROM library_mind_cards GROUP BY source_license').all() as Array<{
      lic: string;
      c: number;
    }>
  ).map((r) => ({ license: r.lic || 'CC BY 4.0', section: 'mind_cards' as const, count: r.c }));

  return {
    summary: {
      history_records: historyCount,
      books: booksCount,
      verses: versesCount,
      quotes: quotesCount,
      mind_cards: mindCount,
      reviewed_verses: reviewedVerses,
      reviewed_quotes: reviewedQuotes,
    },
    licenses: [...historyLicenses, ...bookLicenses, ...verseLicenses, ...quoteLicenses, ...mindLicenses],
    updated_at: new Date().toISOString(),
  };
}


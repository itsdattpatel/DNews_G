/**
 * backend/src/__tests__/unit/library-wisdom.test.ts
 * Tests for Scripture & Quote Wisdom Services (Category B4).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  ScriptureService,
  type ScriptureBook,
  type ScriptureVerse,
} from '../../library/services/scriptureService';
import {
  QuoteService,
  type WisdomQuote,
} from '../../library/services/quoteService';

describe('Library Wisdom Subsystem (Category B4)', () => {
  let db: Database.Database;
  let scriptureService: ScriptureService;
  let quoteService: QuoteService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS library_books (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        slug            TEXT UNIQUE NOT NULL,
        title_english   TEXT NOT NULL,
        title_original  TEXT NOT NULL,
        tradition       TEXT NOT NULL,
        total_sections  INTEGER NOT NULL,
        section_unit    TEXT NOT NULL DEFAULT 'Chapter',
        description     TEXT,
        default_translator TEXT NOT NULL,
        source_license  TEXT NOT NULL DEFAULT 'Public Domain',
        is_active       INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS library_verses (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id             INTEGER NOT NULL REFERENCES library_books(id),
        section_number      INTEGER NOT NULL,
        verse_number        INTEGER NOT NULL,
        verse_ref           TEXT NOT NULL,
        text_original       TEXT NOT NULL,
        transliteration     TEXT,
        translation_english TEXT NOT NULL,
        translator          TEXT NOT NULL,
        commentary_source   TEXT,
        plain_meaning       TEXT,
        source_url          TEXT NOT NULL,
        source_license      TEXT NOT NULL DEFAULT 'Public Domain',
        theme_tags          TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(book_id, section_number, verse_number)
      );

      CREATE TABLE IF NOT EXISTS library_quotes (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_text          TEXT NOT NULL,
        author              TEXT NOT NULL,
        work_title          TEXT,
        year_published      INTEGER,
        tradition           TEXT,
        country             TEXT,
        source_url          TEXT NOT NULL,
        source_license      TEXT NOT NULL DEFAULT 'Public Domain',
        attribution         TEXT NOT NULL,
        is_verified         INTEGER NOT NULL DEFAULT 1,
        plain_meaning       TEXT,
        theme_tags          TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS library_bookmarks (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        item_type       TEXT NOT NULL,
        item_id         INTEGER NOT NULL,
        note            TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_type, item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_lib_verses_book ON library_verses(book_id, section_number);
      CREATE INDEX IF NOT EXISTS idx_lib_quotes_author ON library_quotes(author);
    `);

    scriptureService = new ScriptureService(db);
    quoteService = new QuoteService(db);

    // Seed canonical registry & initial verses
    scriptureService.seedCanonicalBooksAndVerses();
    quoteService.seedCanonicalQuotes();
  });

  afterEach(() => {
    db.close();
  });

  describe('ScriptureService', () => {
    it('returns the active canonical holy books registry', () => {
      const books = scriptureService.getBooks();
      expect(books.length).toBeGreaterThanOrEqual(3);

      const slugs = books.map((b) => b.slug);
      expect(slugs).toContain('bhagavad_gita');
      expect(slugs).toContain('mahabharata');
      expect(slugs).toContain('ramayana');

      const gita = books.find((b) => b.slug === 'bhagavad_gita')!;
      expect(gita.title_english).toBe('Bhagavad Gita');
      expect(gita.title_original).toContain('श्रीमद्भगवद्गीता');
      expect(gita.default_translator).toContain('Edwin Arnold');
      expect(gita.source_license).toBe('Public Domain');
    });

    it('retrieves verses by book and section/chapter', () => {
      const verses = scriptureService.getVerses({ bookSlug: 'bhagavad_gita', section: 2 });
      expect(verses.length).toBeGreaterThan(0);

      const v47 = verses.find((v) => v.verse_number === 47);
      expect(v47).toBeDefined();
      expect(v47!.text_sanskrit).toContain('कर्मण्येवाधिकारस्ते');
      expect(v47!.transliteration).toContain('karmaṇyevādhikāraste');
      expect(v47!.translation).toContain('work');
      expect(v47!.translator).toContain('Edwin Arnold');
      expect(v47!.attribution).toContain('Public Domain');
    });

    it('filters verses by theme (e.g., duty, courage, detachment)', () => {
      const dutyVerses = scriptureService.getVerses({ theme: 'duty' });
      expect(dutyVerses.length).toBeGreaterThan(0);
      expect(dutyVerses.every((v) => v.theme?.toLowerCase().includes('duty'))).toBe(true);
    });

    it('provides a deterministic Verse of the Day', () => {
      const v1 = scriptureService.getVerseOfTheDay('2026-11-02');
      const v2 = scriptureService.getVerseOfTheDay('2026-11-02');
      expect(v1).toBeDefined();
      expect(v1.id).toBe(v2.id);

      // Different date yields different verse (when more than 1 exist)
      const vOther = scriptureService.getVerseOfTheDay('2026-11-03');
      expect(vOther).toBeDefined();
    });

    it('provides a random verse with optional book constraint', () => {
      const rand = scriptureService.getRandomVerse('bhagavad_gita');
      expect(rand).toBeDefined();
      expect(rand!.book_slug).toBe('bhagavad_gita');
    });
  });

  describe('QuoteService', () => {
    it('retrieves quotes filtered by author and theme', () => {
      const quotes = quoteService.getQuotes({ author: 'Marcus Aurelius' });
      expect(quotes.length).toBeGreaterThan(0);
      expect(quotes[0].author).toBe('Marcus Aurelius');
      expect(quotes[0].source_work).toContain('Meditations');
      expect(quotes[0].license).toBe('Public Domain');
      expect(quotes[0].attribution).toBeDefined();
    });

    it('filters quotes by tradition (e.g. Stoic, Vedanta, Eastern)', () => {
      const stoicQuotes = quoteService.getQuotes({ tradition: 'Stoic' });
      expect(stoicQuotes.length).toBeGreaterThan(0);
      expect(stoicQuotes.every((q) => q.tradition === 'Stoic')).toBe(true);
    });

    it('provides a deterministic Quote of the Day', () => {
      const q1 = quoteService.getQuoteOfTheDay('2026-11-02');
      const q2 = quoteService.getQuoteOfTheDay('2026-11-02');
      expect(q1).toBeDefined();
      expect(q1.id).toBe(q2.id);
    });

    it('provides a random quote', () => {
      const rand = quoteService.getRandomQuote();
      expect(rand).toBeDefined();
      expect(rand!.quote_text.length).toBeGreaterThan(10);
    });
  });
});

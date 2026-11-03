/**
 * backend/src/library/routes.ts
 * Isolated Express Router for The Library (Plain Mode / Zero AI)
 */
import { Router } from 'express';
import { getDb } from '../db/db';
import {
  getLibraryBookmarks,
  toggleLibraryBookmark,
  deleteLibraryBookmark,
  type LibraryItemType,
} from './services/bookmarkService';
import { HistoryService } from './services/historyService';
import { ScriptureService } from './services/scriptureService';
import { QuoteService } from './services/quoteService';
import { MindService, type MindCategory } from './services/mindService';

export const libraryRouter = Router();

// GET /api/library/status
libraryRouter.get('/status', (_req, res) => {
  try {
    const db = getDb();
    const booksCount =
      (db.prepare('SELECT COUNT(*) as count FROM library_books').get() as { count: number })?.count ?? 0;
    const historyCount =
      (db.prepare('SELECT COUNT(*) as count FROM library_history_cache').get() as { count: number })?.count ?? 0;
    const mindCount =
      (db.prepare('SELECT COUNT(*) as count FROM library_mind_cards').get() as { count: number })?.count ?? 0;
    const bookmarksCount =
      (db.prepare('SELECT COUNT(*) as count FROM library_bookmarks').get() as { count: number })?.count ?? 0;
    const helplinesCount =
      (db.prepare('SELECT COUNT(*) as count FROM library_helplines').get() as { count: number })?.count ?? 0;

    res.json({
      status: 'ok',
      section: 'The Library (Reading Room)',
      mode: 'plain_only',
      ai_enabled: false,
      counts: {
        books: booksCount,
        history_cached: historyCount,
        mind_cards: mindCount,
        bookmarks: bookmarksCount,
        helplines: helplinesCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Library status unavailable', details: err.message });
  }
});

// ─── Bookmarks Endpoints ──────────────────────────────────────────────────────

// GET /api/library/bookmarks
libraryRouter.get('/bookmarks', (_req, res) => {
  try {
    const bookmarks = getLibraryBookmarks();
    res.json({ bookmarks, total: bookmarks.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve bookmarks', details: err.message });
  }
});

// POST /api/library/bookmarks/toggle
libraryRouter.post('/bookmarks/toggle', (req, res) => {
  try {
    const { item_type, item_id, note } = req.body;
    if (!item_type || typeof item_id !== 'number') {
      res.status(400).json({ error: 'Missing or invalid item_type or item_id' });
      return;
    }
    const validTypes: LibraryItemType[] = ['history', 'verse', 'quote', 'mind'];
    if (!validTypes.includes(item_type)) {
      res.status(400).json({ error: `Invalid item_type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const result = toggleLibraryBookmark(item_type, item_id, note);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle bookmark', details: err.message });
  }
});

// DELETE /api/library/bookmarks/:id
libraryRouter.delete('/bookmarks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid bookmark id' });
      return;
    }
    const deleted = deleteLibraryBookmark(id);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete bookmark', details: err.message });
  }
});

// ─── Historical News Endpoints (Category B3) ──────────────────────────────────

// GET /api/library/history/today
libraryRouter.get('/history/today', async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
    const day = req.query.day ? parseInt(req.query.day as string, 10) : now.getDate();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(day) || day < 1 || day > 31) {
      res.status(400).json({ error: 'Invalid month (1-12) or day (1-31)' });
      return;
    }

    const historyService = new HistoryService(getDb());
    const items = await historyService.getTodayInHistory(month, day);
    res.json({
      date: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      total: items.length,
      items,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch historical events', details: err.message });
  }
});

// GET /api/library/history/search
libraryRouter.get('/history/search', (req, res) => {
  try {
    const { q, decade, country, source, year, limit, offset } = req.query;
    const historyService = new HistoryService(getDb());
    const result = historyService.searchHistory({
      query: q as string | undefined,
      decade: decade ? parseInt(decade as string, 10) : undefined,
      country: country as string | undefined,
      source: source as string | undefined,
      year: year ? parseInt(year as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search historical archives', details: err.message });
  }
});

// ─── Wisdom Endpoints (Category B4: Scriptures & Quotes) ──────────────────────

function ensureWisdomSeeded(db: any) {
  const scriptureService = new ScriptureService(db);
  const quoteService = new QuoteService(db);
  scriptureService.seedCanonicalBooksAndVerses();
  quoteService.seedCanonicalQuotes();
  return { scriptureService, quoteService };
}

// GET /api/library/wisdom/books
libraryRouter.get('/wisdom/books', (_req, res) => {
  try {
    const db = getDb();
    const { scriptureService } = ensureWisdomSeeded(db);
    const books = scriptureService.getBooks();
    res.json({ books, total: books.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve holy books registry', details: err.message });
  }
});

// GET /api/library/wisdom/verses
libraryRouter.get('/wisdom/verses', (req, res) => {
  try {
    const db = getDb();
    const { scriptureService } = ensureWisdomSeeded(db);
    const { book, section, theme, q, limit, offset } = req.query;
    const verses = scriptureService.getVerses({
      bookSlug: book as string | undefined,
      section: section ? parseInt(section as string, 10) : undefined,
      theme: theme as string | undefined,
      query: q as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json({ verses, total: verses.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve scripture verses', details: err.message });
  }
});

// GET /api/library/wisdom/verses/today
libraryRouter.get('/wisdom/verses/today', (_req, res) => {
  try {
    const db = getDb();
    const { scriptureService } = ensureWisdomSeeded(db);
    const verse = scriptureService.getVerseOfTheDay();
    res.json({ verse });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Verse of the Day', details: err.message });
  }
});

// GET /api/library/wisdom/verses/random
libraryRouter.get('/wisdom/verses/random', (req, res) => {
  try {
    const db = getDb();
    const { scriptureService } = ensureWisdomSeeded(db);
    const book = req.query.book as string | undefined;
    const verse = scriptureService.getRandomVerse(book);
    res.json({ verse });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve random verse', details: err.message });
  }
});

// GET /api/library/wisdom/quotes
libraryRouter.get('/wisdom/quotes', (req, res) => {
  try {
    const db = getDb();
    const { quoteService } = ensureWisdomSeeded(db);
    const { author, theme, tradition, q, limit, offset } = req.query;
    const quotes = quoteService.getQuotes({
      author: author as string | undefined,
      theme: theme as string | undefined,
      tradition: tradition as string | undefined,
      query: q as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json({ quotes, total: quotes.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve quotes', details: err.message });
  }
});

// GET /api/library/wisdom/quotes/today
libraryRouter.get('/wisdom/quotes/today', (_req, res) => {
  try {
    const db = getDb();
    const { quoteService } = ensureWisdomSeeded(db);
    const quote = quoteService.getQuoteOfTheDay();
    res.json({ quote });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Quote of the Day', details: err.message });
  }
});

// GET /api/library/wisdom/quotes/random
libraryRouter.get('/wisdom/quotes/random', (_req, res) => {
  try {
    const db = getDb();
    const { quoteService } = ensureWisdomSeeded(db);
    const quote = quoteService.getRandomQuote();
    res.json({ quote });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve random quote', details: err.message });
  }
});

// ─── Mind Helps Endpoints (Category B5) ───────────────────────────────────────

function ensureMindSeeded(db: any) {
  const mindService = new MindService(db);
  mindService.seedCanonicalMindCards();
  mindService.seedCanonicalHelplines();
  return mindService;
}

// GET /api/library/mind/cards
libraryRouter.get('/mind/cards', (req, res) => {
  try {
    const db = getDb();
    const mindService = ensureMindSeeded(db);
    const { category, max_time, q, limit, offset } = req.query;

    const cards = mindService.getCards({
      category: category as MindCategory | 'all' | undefined,
      maxTime: max_time ? parseInt(max_time as string, 10) : undefined,
      query: q as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({ cards, total: cards.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve psychological help cards', details: err.message });
  }
});

// GET /api/library/mind/cards/:id
libraryRouter.get('/mind/cards/:id', (req, res) => {
  try {
    const db = getDb();
    const mindService = ensureMindSeeded(db);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid card ID' });
      return;
    }

    const card = mindService.getCardById(id);
    if (!card) {
      res.status(404).json({ error: 'Mind card not found' });
      return;
    }

    res.json({ card });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve help card', details: err.message });
  }
});

// GET /api/library/mind/helplines
libraryRouter.get('/mind/helplines', (req, res) => {
  try {
    const db = getDb();
    const mindService = ensureMindSeeded(db);
    const country = req.query.country as string | undefined;

    const helplines = mindService.getHelplines(country);
    res.json({
      helplines,
      total: helplines.length,
      notice: 'General education only. Not medical advice or a substitute for a healthcare professional.',
      verified_date: '2026-11-02',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve crisis helplines registry', details: err.message });
  }
});




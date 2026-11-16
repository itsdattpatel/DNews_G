/**
 * backend/src/library/routes.ts
 * Isolated Express Router for The Library (Plain Mode / Zero AI)
 */
import { Router } from 'express';
import { getDb } from '../db/db';
import { emitSseEvent } from '../routes/sse';
import {
  getLibraryBookmarks,
  toggleLibraryBookmark,
  deleteLibraryBookmarkWithRecord,
  type LibraryItemType,
} from './services/bookmarkService';
import { HistoryService } from './services/historyService';
import { ScriptureService } from './services/scriptureService';
import { QuoteService } from './services/quoteService';
import { MindService, type MindCategory } from './services/mindService';
import { getLibraryProvenanceSummary } from './services/provenanceService';
import {
  getLibraryRefreshStatus,
  runLibraryHistoryRefresh,
} from './services/libraryRefreshScheduler';

export const libraryRouter = Router();

function parseNumericId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

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
    if (result.bookmarked && result.bookmark) {
      emitSseEvent('library_bookmark_update', {
        action: 'created',
        item_type,
        item_id,
        bookmark: result.bookmark,
      });
    } else {
      emitSseEvent('library_bookmark_update', {
        action: 'deleted',
        ...(result.id !== undefined ? { bookmark_id: result.id } : {}),
        item_type,
        item_id,
      });
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle bookmark', details: err.message });
  }
});

// DELETE /api/library/bookmarks/:id
libraryRouter.delete('/bookmarks/:id', (req, res) => {
  try {
    const id = parseNumericId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid bookmark id' });
      return;
    }
    const removed = deleteLibraryBookmarkWithRecord(id);
    if (removed) {
      emitSseEvent('library_bookmark_update', {
        action: 'deleted',
        bookmark_id: removed.id,
        item_type: removed.item_type,
        item_id: removed.item_id,
      });
    }
    res.json({ success: true, deleted: Boolean(removed) });
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

// POST /api/library/history
libraryRouter.post('/history', (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.headline || !body.original_url || !body.event_date) {
      res.status(400).json({ error: 'headline, event_date, and original_url are required' });
      return;
    }
    const historyService = new HistoryService(getDb());
    const record = historyService.createHistoryRecord({
      source_slug: body.source_slug || 'wikimedia_onthisday',
      external_id: body.external_id,
      event_date: String(body.event_date),
      event_year: Number(body.event_year ?? new Date().getFullYear()),
      headline: String(body.headline),
      snippet: String(body.snippet ?? ''),
      original_url: String(body.original_url),
      country: body.country ?? null,
      media_url: body.media_url ?? null,
      license: String(body.license || 'CC BY-SA 4.0'),
      attribution: String(body.attribution || 'Public Archival Contributor'),
    });
    emitSseEvent('library_history_update', { action: 'created', record });
    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create historical record', details: err.message });
  }
});

// PATCH /api/library/history/:id
libraryRouter.patch('/history/:id', (req, res) => {
  try {
    const id = parseNumericId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid history record ID' });
      return;
    }
    const historyService = new HistoryService(getDb());
    const record = historyService.updateHistoryRecord(id, req.body ?? {});
    if (!record) {
      res.status(404).json({ error: 'Historical record not found' });
      return;
    }
    emitSseEvent('library_history_update', { action: 'updated', record });
    res.json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update historical record', details: err.message });
  }
});

// GET /api/library/refresh/status
libraryRouter.get('/refresh/status', (_req, res) => {
  res.json(getLibraryRefreshStatus());
});

// POST /api/library/refresh/history
libraryRouter.post('/refresh/history', async (req, res) => {
  try {
    const monthDay = typeof req.body?.monthDay === 'string' ? req.body.monthDay : undefined;
    const skipExternalFetch = Boolean(req.body?.skipExternalFetch);
    const status = await runLibraryHistoryRefresh(monthDay, { skipExternalFetch });
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to trigger history refresh', details: err.message });
  }
});

// GET /api/library/provenance
libraryRouter.get('/provenance', (_req, res) => {
  try {
    res.json(getLibraryProvenanceSummary(getDb()));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve provenance registry', details: err.message });
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

// POST /api/library/wisdom/verses
libraryRouter.post('/wisdom/verses', (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.verse_ref || !body.text_original || !body.translation_english || !body.translator || !body.source_url) {
      res.status(400).json({
        error: 'verse_ref, text_original, translation_english, translator, and source_url are required',
      });
      return;
    }
    const db = getDb();
    const { scriptureService } = ensureWisdomSeeded(db);
    const record = scriptureService.createVerse({
      book_id: body.book_id,
      book_slug: body.book_slug,
      section_number: Number(body.section_number ?? 1),
      verse_number: Number(body.verse_number ?? 1),
      verse_ref: String(body.verse_ref),
      text_original: String(body.text_original),
      transliteration: body.transliteration ?? null,
      translation_english: String(body.translation_english),
      translator: String(body.translator),
      commentary_source: body.commentary_source ?? null,
      plain_meaning: body.plain_meaning ?? null,
      meaning_reviewed: body.meaning_reviewed ?? 0,
      source_url: String(body.source_url),
      source_license: String(body.source_license || 'Public Domain'),
      theme_tags: body.theme_tags ?? null,
    });
    emitSseEvent('library_wisdom_update', { kind: 'verse', action: 'created', record });
    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create scripture verse', details: err.message });
  }
});

// PATCH /api/library/wisdom/verses/:id
libraryRouter.patch('/wisdom/verses/:id', (req, res) => {
  try {
    const id = parseNumericId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid verse ID' });
      return;
    }
    const db = getDb();
    const { scriptureService } = ensureWisdomSeeded(db);
    const record = scriptureService.updateVerse(id, req.body ?? {});
    if (!record) {
      res.status(404).json({ error: 'Scripture verse not found' });
      return;
    }
    emitSseEvent('library_wisdom_update', { kind: 'verse', action: 'updated', record });
    res.json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update scripture verse', details: err.message });
  }
});

// POST /api/library/wisdom/quotes
libraryRouter.post('/wisdom/quotes', (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.quote_text || !body.author || !body.source_url || !body.attribution) {
      res.status(400).json({ error: 'quote_text, author, source_url, and attribution are required' });
      return;
    }
    const db = getDb();
    const { quoteService } = ensureWisdomSeeded(db);
    const record = quoteService.createQuote({
      quote_text: String(body.quote_text),
      author: String(body.author),
      work_title: body.work_title ?? null,
      year_published: body.year_published !== undefined ? Number(body.year_published) : null,
      tradition: body.tradition ?? null,
      country: body.country ?? null,
      source_url: String(body.source_url),
      source_license: String(body.source_license || 'Public Domain'),
      attribution: String(body.attribution),
      is_verified: body.is_verified ?? 1,
      plain_meaning: body.plain_meaning ?? null,
      meaning_reviewed: body.meaning_reviewed ?? 0,
      commentary_source: body.commentary_source ?? null,
      theme_tags: body.theme_tags ?? null,
    });
    emitSseEvent('library_wisdom_update', { kind: 'quote', action: 'created', record });
    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create quote', details: err.message });
  }
});

// PATCH /api/library/wisdom/quotes/:id
libraryRouter.patch('/wisdom/quotes/:id', (req, res) => {
  try {
    const id = parseNumericId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid quote ID' });
      return;
    }
    const db = getDb();
    const { quoteService } = ensureWisdomSeeded(db);
    const record = quoteService.updateQuote(id, req.body ?? {});
    if (!record) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    emitSseEvent('library_wisdom_update', { kind: 'quote', action: 'updated', record });
    res.json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update quote', details: err.message });
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

// POST /api/library/mind/cards
libraryRouter.post('/mind/cards', (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.title || !body.category || !body.what_it_is || !body.when_it_helps || !body.source_book || !body.source_url || !body.attribution) {
      res.status(400).json({
        error: 'title, category, what_it_is, when_it_helps, source_book, source_url, and attribution are required',
      });
      return;
    }
    const db = getDb();
    const mindService = ensureMindSeeded(db);
    const card = mindService.createCard({
      slug: body.slug,
      title: String(body.title),
      category: body.category as MindCategory,
      what_it_is: String(body.what_it_is),
      when_it_helps: String(body.when_it_helps),
      steps: Array.isArray(body.steps) ? body.steps.map(String) : [],
      time_needed_minutes: Number(body.time_needed_minutes ?? 5),
      source_book: String(body.source_book),
      source_chapter: String(body.source_chapter ?? 'General'),
      source_url: String(body.source_url),
      source_license: String(body.source_license || 'CC BY 4.0'),
      attribution: String(body.attribution),
    });
    emitSseEvent('library_mind_update', { action: 'created', record: card });
    res.status(201).json({ card });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create mind card', details: err.message });
  }
});

// PATCH /api/library/mind/cards/:id
libraryRouter.patch('/mind/cards/:id', (req, res) => {
  try {
    const id = parseNumericId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid card ID' });
      return;
    }
    const db = getDb();
    const mindService = ensureMindSeeded(db);
    const card = mindService.updateCard(id, req.body ?? {});
    if (!card) {
      res.status(404).json({ error: 'Mind card not found' });
      return;
    }
    emitSseEvent('library_mind_update', { action: 'updated', record: card });
    res.json({ card });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update mind card', details: err.message });
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




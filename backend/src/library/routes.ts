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

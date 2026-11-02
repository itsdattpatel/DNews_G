/**
 * backend/src/library/routes.ts
 * Isolated Express Router for The Library (Plain Mode / Zero AI)
 */
import { Router } from 'express';
import { getDb } from '../db/db';

export const libraryRouter = Router();

// GET /api/library/status
libraryRouter.get('/status', (_req, res) => {
  try {
    const db = getDb();
    const booksCount = (db.prepare('SELECT COUNT(*) as count FROM library_books').get() as { count: number })?.count ?? 0;
    const historyCount = (db.prepare('SELECT COUNT(*) as count FROM library_history_cache').get() as { count: number })?.count ?? 0;
    const mindCount = (db.prepare('SELECT COUNT(*) as count FROM library_mind_cards').get() as { count: number })?.count ?? 0;
    const helplinesCount = (db.prepare('SELECT COUNT(*) as count FROM library_helplines').get() as { count: number })?.count ?? 0;

    res.json({
      status: 'ok',
      section: 'The Library (Reading Room)',
      mode: 'plain_only',
      ai_enabled: false,
      counts: {
        books: booksCount,
        history_cached: historyCount,
        mind_cards: mindCount,
        helplines: helplinesCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Library status unavailable', details: err.message });
  }
});

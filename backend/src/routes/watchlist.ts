/**
 * backend/src/routes/watchlist.ts
 * REST API for user-defined topic monitors (P8-01).
 * Supports GET, POST, PATCH, DELETE operations on the watchlist table.
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { emitSseEvent } from './sse';

export const watchlistRouter = Router();

interface WatchlistDbRow {
  id: number;
  topic: string;
  keywords: string;
  priority: 'low' | 'normal' | 'high';
  enabled: number;
  created_at: string;
}

// GET /api/watchlist
watchlistRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT id, topic, keywords, priority, enabled, created_at FROM watchlist ORDER BY created_at DESC')
      .all() as WatchlistDbRow[];

    const items = rows.map((r) => {
      let kws: string[] = [];
      try {
        kws = JSON.parse(r.keywords);
      } catch {
        kws = [r.keywords];
      }
      return {
        id: r.id,
        topic: r.topic,
        keywords: kws,
        priority: r.priority,
        enabled: Boolean(r.enabled),
        created_at: r.created_at,
      };
    });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// POST /api/watchlist
watchlistRouter.post('/', (req: Request, res: Response) => {
  try {
    const { topic, keywords, priority = 'normal' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      res.status(400).json({ error: 'Valid topic string is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const validPriorities = ['low', 'normal', 'high'];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({ error: 'Priority must be one of low, normal, high', code: 'VALIDATION_ERROR' });
      return;
    }

    const kwArray = Array.isArray(keywords)
      ? keywords.map((k) => String(k).trim()).filter(Boolean)
      : topic.split(/\s+/).filter(Boolean);

    const db = getDb();
    const insertRes = db
      .prepare(`
        INSERT INTO watchlist (topic, keywords, priority, enabled)
        VALUES (?, ?, ?, 1)
      `)
      .run(topic.trim(), JSON.stringify(kwArray), priority);

    const newId = Number(insertRes.lastInsertRowid);
    const created = db.prepare('SELECT id, topic, keywords, priority, enabled, created_at FROM watchlist WHERE id = ?').get(newId) as WatchlistDbRow;

    const itemPayload = {
      id: created.id,
      topic: created.topic,
      keywords: JSON.parse(created.keywords),
      priority: created.priority,
      enabled: Boolean(created.enabled),
      created_at: created.created_at,
    };

    emitSseEvent('watchlist_update', { action: 'created', item: itemPayload });

    res.status(201).json(itemPayload);
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// PATCH /api/watchlist/:id
watchlistRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM watchlist WHERE id = ?').get(id) as WatchlistDbRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Watchlist topic not found', code: 'NOT_FOUND' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (req.body.topic !== undefined && typeof req.body.topic === 'string') {
      updates.push('topic = ?');
      params.push(req.body.topic.trim());
    }

    if (req.body.keywords !== undefined) {
      const kwArray = Array.isArray(req.body.keywords)
        ? req.body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean)
        : [];
      updates.push('keywords = ?');
      params.push(JSON.stringify(kwArray));
    }

    if (req.body.priority !== undefined) {
      const validPriorities = ['low', 'normal', 'high'];
      if (!validPriorities.includes(req.body.priority)) {
        res.status(400).json({ error: 'Invalid priority', code: 'VALIDATION_ERROR' });
        return;
      }
      updates.push('priority = ?');
      params.push(req.body.priority);
    }

    if (req.body.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(req.body.enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE watchlist SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT id, topic, keywords, priority, enabled, created_at FROM watchlist WHERE id = ?').get(id) as WatchlistDbRow;

    const itemPayload = {
      id: updated.id,
      topic: updated.topic,
      keywords: JSON.parse(updated.keywords),
      priority: updated.priority,
      enabled: Boolean(updated.enabled),
      created_at: updated.created_at,
    };

    emitSseEvent('watchlist_update', { action: 'updated', item: itemPayload });

    res.json(itemPayload);
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/watchlist/:id
watchlistRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const result = db.prepare('DELETE FROM watchlist WHERE id = ?').run(id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Watchlist topic not found', code: 'NOT_FOUND' });
      return;
    }

    emitSseEvent('watchlist_update', { action: 'deleted', deleted_id: id });

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});


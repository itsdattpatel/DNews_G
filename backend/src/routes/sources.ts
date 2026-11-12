/**
 * backend/src/routes/sources.ts
 * REST endpoints for managing news sources (RSS and GDELT).
 * GET /api/sources - list all configured sources with live fetch status
 * PATCH /api/sources/:id - toggle enabled status
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { emitSseEvent } from './sse';

export const sourcesRouter = Router();

// GET /api/sources
sourcesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT id, name, slug, url, country, fetch_type, enabled, last_fetched_at
        FROM sources
        ORDER BY country ASC, name ASC
      `)
      .all() as Array<{
        id: number;
        name: string;
        slug: string;
        url: string;
        country: string;
        fetch_type: string;
        enabled: number;
        last_fetched_at: string | null;
      }>;

    const items = rows.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));

    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// PATCH /api/sources/:id
sourcesRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid source ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const { enabled } = req.body || {};
    if (enabled !== undefined) {
      const isEnabled = enabled ? 1 : 0;
      db.prepare('UPDATE sources SET enabled = ? WHERE id = ?').run(isEnabled, id);
    }

    const updated = db.prepare('SELECT id, name, slug, url, country, fetch_type, enabled, last_fetched_at FROM sources WHERE id = ?').get(id) as {
      id: number;
      name: string;
      slug: string;
      url: string;
      country: string;
      fetch_type: string;
      enabled: number;
      last_fetched_at: string | null;
    } | undefined;

    if (!updated) {
      res.status(404).json({ error: 'Source not found', code: 'NOT_FOUND' });
      return;
    }

    const payload = {
      ...updated,
      enabled: Boolean(updated.enabled),
    };

    emitSseEvent('control_room_update', {
      type: 'source_toggled',
      source: payload,
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});


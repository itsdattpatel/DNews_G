/**
 * backend/src/routes/tv.ts
 * REST API for IPTV Live Channels, health checking, and favorites (P11-05, P11-07, P11-08).
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { checkChannelHealth } from '../tv/health';

export const tvRouter = Router();

interface TvChannelDbRow {
  id: number;
  name: string;
  country: string | null;
  category: string | null;
  stream_url: string;
  logo_url: string | null;
  is_alive: number;
  is_favorite: number;
  last_checked_at: string | null;
}

// GET /api/tv/channels
tvRouter.get('/channels', (req: Request, res: Response) => {
  try {
    const { category, country, q, include_dead, favorites_only } = req.query;
    const db = getDb();

    let sql = 'SELECT * FROM tv_channels WHERE 1=1';
    const params: (string | number)[] = [];

    // Filter dead channels by default unless include_dead=true (P11-10)
    if (include_dead !== 'true' && include_dead !== '1') {
      sql += ' AND is_alive = 1';
    }

    if (favorites_only === 'true' || favorites_only === '1') {
      sql += ' AND is_favorite = 1';
    }

    if (category && typeof category === 'string' && category.trim()) {
      const cleanCat = category.trim().toLowerCase();
      if (cleanCat === 'animals' || cleanCat === 'wildlife') {
        sql += ` AND (LOWER(category) LIKE '%doc%' OR LOWER(name) LIKE '%wild%' OR LOWER(name) LIKE '%safari%' OR LOWER(name) LIKE '%animal%' OR LOWER(name) LIKE '%nature%')`;
      } else {
        sql += ' AND LOWER(category) LIKE ?';
        params.push(`%${cleanCat}%`);
      }
    }

    if (country && typeof country === 'string' && country.trim()) {
      sql += ' AND (LOWER(country) = ? OR UPPER(country) = ?)';
      params.push(country.trim().toLowerCase(), country.trim().toUpperCase());
    }

    if (q && typeof q === 'string' && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)';
      params.push(term, term);
    }

    // Pinned favorites at top (P11-08), then alive status, then alphabetical
    sql += ' ORDER BY is_favorite DESC, is_alive DESC, name ASC';

    const rows = db.prepare(sql).all(...params) as TvChannelDbRow[];

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      category: r.category,
      stream_url: r.stream_url,
      logo_url: r.logo_url,
      is_alive: Boolean(r.is_alive),
      is_favorite: Boolean(r.is_favorite),
      last_checked_at: r.last_checked_at,
    }));

    res.json({ items });
  } catch (err) {
    console.error('[TV:Channels] Error fetching channels:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// PATCH /api/tv/channels/:id/favorite
tvRouter.patch('/channels/:id/favorite', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id'] || '', 10);
    const { is_favorite } = req.body || {};

    if (isNaN(id) || typeof is_favorite !== 'boolean') {
      res.status(400).json({ error: 'Valid channel ID and boolean is_favorite required', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const result = db
      .prepare('UPDATE tv_channels SET is_favorite = ? WHERE id = ?')
      .run(is_favorite ? 1 : 0, id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Channel not found', code: 'NOT_FOUND' });
      return;
    }

    const updated = db.prepare('SELECT * FROM tv_channels WHERE id = ?').get(id) as TvChannelDbRow;

    res.json({
      id: updated.id,
      name: updated.name,
      country: updated.country,
      category: updated.category,
      stream_url: updated.stream_url,
      logo_url: updated.logo_url,
      is_alive: Boolean(updated.is_alive),
      is_favorite: Boolean(updated.is_favorite),
      last_checked_at: updated.last_checked_at,
    });
  } catch (err) {
    console.error('[TV:Favorite] Error toggling favorite:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// POST /api/tv/channels/:id/health-check
tvRouter.post('/channels/:id/health-check', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id'] || '', 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Valid channel ID required', code: 'VALIDATION_ERROR' });
      return;
    }

    const health = await checkChannelHealth(id);
    res.json({
      is_alive: health.isAlive,
      latency_ms: health.latencyMs,
    });
  } catch (err) {
    console.error('[TV:Health] Probe failed:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});


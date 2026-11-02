/**
 * backend/src/routes/tv.ts
 * REST API for IPTV Live Channels, Curated Top-5 Outlets, Health Checks & Favorites (PRD A Category 5).
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { checkChannelHealth } from '../tv/health';
import { syncIptvCatalog, loadTop5Channels } from '../tv/catalog';

export const tvRouter = Router();

export interface TvChannelDbRow {
  id: number;
  name: string;
  slug: string | null;
  country: string | null;
  country_code: string | null;
  category: string | null;
  stream_url: string;
  youtube_live_url: string | null;
  youtube_channel_id: string | null;
  website: string | null;
  logo_url: string | null;
  is_alive: number;
  is_favorite: number;
  is_top5: number;
  rank: number | null;
  status: string | null;
  evidence: string | null;
  last_checked_at: string | null;
}

function mapChannelRow(r: TvChannelDbRow) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    country: r.country,
    country_code: r.country_code,
    category: r.category,
    stream_url: r.stream_url,
    youtube_live_url: r.youtube_live_url,
    youtube_channel_id: r.youtube_channel_id,
    website: r.website,
    logo_url: r.logo_url,
    is_alive: Boolean(r.is_alive),
    is_favorite: Boolean(r.is_favorite),
    is_top5: Boolean(r.is_top5),
    rank: r.rank,
    status: r.status || 'needs my review',
    evidence: r.evidence,
    last_checked_at: r.last_checked_at,
  };
}

// GET /api/tv/channels
tvRouter.get('/channels', (req: Request, res: Response) => {
  try {
    const { category, country, q, include_dead, favorites_only, top5_only, status } = req.query;
    const db = getDb();

    let sql = 'SELECT * FROM tv_channels WHERE 1=1';
    const params: (string | number)[] = [];

    // Filter dead channels by default unless include_dead=true
    if (include_dead !== 'true' && include_dead !== '1') {
      sql += ' AND is_alive = 1';
    }

    if (favorites_only === 'true' || favorites_only === '1') {
      sql += ' AND is_favorite = 1';
    }

    if (top5_only === 'true' || top5_only === '1') {
      sql += ' AND is_top5 = 1';
    }

    if (status && typeof status === 'string' && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
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
      sql += ' AND (LOWER(country) = ? OR UPPER(country) = ? OR UPPER(country_code) = ?)';
      const c = country.trim();
      params.push(c.toLowerCase(), c.toUpperCase(), c.toUpperCase());
    }

    if (q && typeof q === 'string' && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(country) LIKE ?)';
      params.push(term, term, term);
    }

    // Pinned favorites at top, then Top 5 ranked channels, then alive status, then alphabetical
    sql += ' ORDER BY is_favorite DESC, is_top5 DESC, rank ASC, is_alive DESC, name ASC';

    const rows = db.prepare(sql).all(...params) as TvChannelDbRow[];
    const items = rows.map(mapChannelRow);

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('[TV:Channels] Error fetching channels:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// GET /api/tv/top5 - Curated Top 5 Outlets per nation (PRD A Category 5.2)
tvRouter.get('/top5', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM tv_channels
      WHERE is_top5 = 1
      ORDER BY country ASC, rank ASC
    `).all() as TvChannelDbRow[];

    const nations: Record<string, ReturnType<typeof mapChannelRow>[]> = {};
    for (const r of rows) {
      const country = r.country || 'Global';
      if (!nations[country]) nations[country] = [];
      nations[country]!.push(mapChannelRow(r));
    }

    res.json({
      total: rows.length,
      nations,
    });
  } catch (err) {
    console.error('[TV:Top5] Error fetching top5 outlets:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// POST /api/tv/sync - Trigger sync of Top-5 & IPTV-org playlists
tvRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.body?.force_refresh === true;
    const result = await syncIptvCatalog({ forceRefresh });
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[TV:Sync] Error synchronizing IPTV catalog:', err);
    res.status(500).json({ error: String(err), code: 'SYNC_ERROR' });
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
    res.json(mapChannelRow(updated));
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

/**
 * backend/src/routes/tv.ts
 * REST API for IPTV Live Channels, Curated Top-5 Outlets, Health Checks & Favorites (PRD A Category 5).
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { checkChannelHealth } from '../tv/health';
import { syncIptvCatalog } from '../tv/catalog';
import { validateSsrfTarget, rewriteM3u8Playlist } from '../tv/proxy';
import { previewYouTubeSource, createCustomChannel } from '../tv/youtube';
import { emitSseEvent } from './sse';

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
    const { category, country, q, include_dead, favorites_only, top5_only, status, subpage } = req.query;
    const db = getDb();

    let sql = 'SELECT * FROM tv_channels WHERE 1=1';
    const params: (string | number)[] = [];

    // Subpage filtering (PRD C Category 5B Health Truth: live = is_alive = 1, faulty / stopped = is_alive = 0)
    if (subpage === 'faulty') {
      sql += " AND is_alive = 0 AND (last_checked_at IS NULL OR (julianday('now') - julianday(last_checked_at)) < 7)";
    } else if (subpage === 'stopped') {
      sql += " AND is_alive = 0 AND last_checked_at IS NOT NULL AND (julianday('now') - julianday(last_checked_at)) >= 7";
    } else if (subpage === 'live') {
      sql += ' AND is_alive = 1';
    } else if (include_dead !== 'true' && include_dead !== '1') {
      // Default: show alive streams
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

// GET /api/tv/subpages/counts - Counts for LIVE, FAULTY, and STOPPED subpages (PRD A Category 7.1)
tvRouter.get('/subpages/counts', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const live = db
      .prepare('SELECT COUNT(*) as cnt FROM tv_channels WHERE is_alive = 1')
      .get() as { cnt: number };
    const faulty = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM tv_channels WHERE is_alive = 0 AND (last_checked_at IS NULL OR (julianday('now') - julianday(last_checked_at)) < 7)"
      )
      .get() as { cnt: number };
    const stopped = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM tv_channels WHERE is_alive = 0 AND last_checked_at IS NOT NULL AND (julianday('now') - julianday(last_checked_at)) >= 7"
      )
      .get() as { cnt: number };

    res.json({
      live: live.cnt,
      faulty: faulty.cnt,
      stopped: stopped.cnt,
    });
  } catch (err: any) {
    console.error('[TV:SubpagesCounts] Error:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// PUT /api/tv/channels/:id - Update channel stream/embed URL or metadata (PRD A §7.1 Edit URL)
tvRouter.put('/channels/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id'] || '', 10);
    const { name, stream_url, youtube_live_url, website, category, country } = req.body || {};
    if (isNaN(id)) {
      res.status(400).json({ error: 'Valid channel ID required', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM tv_channels WHERE id = ?').get(id) as
      | TvChannelDbRow
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Channel not found', code: 'NOT_FOUND' });
      return;
    }

    db.prepare(`
      UPDATE tv_channels SET
        name = COALESCE(?, name),
        stream_url = COALESCE(?, stream_url),
        youtube_live_url = COALESCE(?, youtube_live_url),
        website = COALESCE(?, website),
        category = COALESCE(?, category),
        country = COALESCE(?, country),
        is_alive = 1,
        last_checked_at = datetime('now')
      WHERE id = ?
    `).run(
      name || null,
      stream_url || null,
      youtube_live_url || null,
      website || null,
      category || null,
      country || null,
      id
    );

    const updated = db.prepare('SELECT * FROM tv_channels WHERE id = ?').get(id) as TvChannelDbRow;
    const mapped = mapChannelRow(updated);
    emitSseEvent('tv_health_update', { action: 'updated', channel_id: id, channel: mapped });
    res.json(mapped);
  } catch (err: any) {
    console.error('[TV:UpdateChannel] Error:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/tv/channels/:id - Remove channel permanently (PRD A §7.1 Stopped Links)
tvRouter.delete('/channels/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id'] || '', 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Valid channel ID required', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const result = db.prepare('DELETE FROM tv_channels WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Channel not found', code: 'NOT_FOUND' });
      return;
    }

    emitSseEvent('tv_health_update', { action: 'deleted', channel_id: id });
    res.json({ success: true, deleted_id: id });
  } catch (err: any) {
    console.error('[TV:DeleteChannel] Error:', err);
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
    emitSseEvent('tv_health_update', { action: 'catalog_synced', ...result });
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
    const mapped = mapChannelRow(updated);
    emitSseEvent('tv_health_update', { action: 'updated', channel_id: id, channel: mapped });
    res.json(mapped);
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
      method: health.method,
      detail: health.detail,
    });
  } catch (err) {
    console.error('[TV:Health] Probe failed:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// POST /api/tv/probe-all - Probe health & playability across all channels (PRD C Category 5B)
tvRouter.post('/probe-all', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id FROM tv_channels').all() as { id: number }[];
    const results: { id: number; is_alive: boolean; latency_ms: number; method?: string | undefined }[] = [];

    for (const r of rows) {
      try {
        const probe = await checkChannelHealth(r.id);
        results.push({ id: r.id, is_alive: probe.isAlive, latency_ms: probe.latencyMs, method: probe.method });
      } catch {
        results.push({ id: r.id, is_alive: false, latency_ms: 0 });
      }
    }

    const aliveCount = results.filter((r) => r.is_alive).length;
    res.json({ total: results.length, alive: aliveCount, results });
  } catch (err: any) {
    console.error('[TV:ProbeAll] Error:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// OPTIONS /api/tv/proxy
// CORS preflight support for HLS byte-range streaming requests
tvRouter.options('/proxy', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// GET /api/tv/proxy?url=<encoded>
// Hardened HLS Stream Proxy with SSRF Protection, Header Forwarding & M3U8 chunk rewriting (PRD C Category 5B)
tvRouter.get('/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query['url'];
  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ error: 'Query parameter "url" is required', code: 'MISSING_URL' });
    return;
  }

  // 1. SSRF Protection validation on initial target
  const ssrf = await validateSsrfTarget(targetUrl);
  if (!ssrf.valid) {
    res.status(403).json({
      error: `SSRF validation blocked request: ${ssrf.reason}`,
      code: 'SSRF_BLOCKED',
    });
    return;
  }

  try {
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        (req.headers['user-agent'] as string) ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: (req.headers['accept'] as string) || '*/*',
    };

    if (req.headers['range']) {
      forwardHeaders['Range'] = req.headers['range'] as string;
    }
    if (req.headers['accept-language']) {
      forwardHeaders['Accept-Language'] = req.headers['accept-language'] as string;
    }

    try {
      const parsed = new URL(targetUrl);
      forwardHeaders['Referer'] = `${parsed.protocol}//${parsed.host}/`;
      forwardHeaders['Origin'] = `${parsed.protocol}//${parsed.host}`;
    } catch {}

    const upstreamRes = await fetch(targetUrl, {
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
      headers: forwardHeaders,
    });

    const finalUrl = upstreamRes.url || targetUrl;

    // 2. Secondary SSRF check on post-redirect URL if redirected
    if (finalUrl !== targetUrl) {
      const redirectSsrf = await validateSsrfTarget(finalUrl);
      if (!redirectSsrf.valid) {
        res.status(403).json({
          error: `Redirect SSRF validation blocked request: ${redirectSsrf.reason}`,
          code: 'SSRF_BLOCKED',
        });
        return;
      }
    }

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json({
        error: `Upstream returned HTTP ${upstreamRes.status}: ${upstreamRes.statusText}`,
        code: 'UPSTREAM_ERROR',
      });
      return;
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      finalUrl.includes('.m3u8') ||
      targetUrl.includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl');

    // CORS, Byte-range, and Cache headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (upstreamRes.headers.has('accept-ranges')) {
      res.setHeader('Accept-Ranges', upstreamRes.headers.get('accept-ranges')!);
    }
    if (upstreamRes.headers.has('content-range')) {
      res.setHeader('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    if (upstreamRes.headers.has('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
    }

    if (isM3u8) {
      const playlistText = await upstreamRes.text();
      const rewritten = rewriteM3u8Playlist(playlistText, finalUrl);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(upstreamRes.status).send(rewritten);
    } else {
      // TS segment / video binary data
      const arrayBuffer = await upstreamRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', contentType || 'video/MP2T');
      res.status(upstreamRes.status).send(buffer);
    }
  } catch (err: any) {
    console.error('[TV:Proxy] Proxy fetch error for url:', targetUrl, err.message);
    res.status(502).json({
      error: `Failed to proxy upstream stream: ${err.message}`,
      code: 'PROXY_FETCH_ERROR',
    });
  }
});

// POST /api/tv/preview-youtube
tvRouter.post('/preview-youtube', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Valid "url" string is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const preview = await previewYouTubeSource(url);
    res.json(preview);
  } catch (err: any) {
    console.error('[TV:YouTubePreview] Error:', err);
    res.status(500).json({ error: String(err), code: 'PREVIEW_ERROR' });
  }
});

// POST /api/tv/custom-channel
tvRouter.post('/custom-channel', (req: Request, res: Response) => {
  try {
    const channel = createCustomChannel(req.body || {});
    const mapped = mapChannelRow(channel);
    emitSseEvent('tv_health_update', { action: 'created', channel_id: mapped.id, channel: mapped });
    res.status(201).json(mapped);
  } catch (err: any) {
    console.error('[TV:CustomChannel] Error creating channel:', err);
    res.status(400).json({ error: err.message, code: 'CHANNEL_CREATE_ERROR' });
  }
});

// GET /api/tv/health/:channelId
tvRouter.get('/health/:channelId', (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params['channelId'] || '', 10);
    if (isNaN(channelId)) {
      res.status(400).json({ error: 'Valid channelId required', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM tv_channel_health WHERE channel_id = ?')
      .all(channelId);

    res.json({ channel_id: channelId, methods: rows });
  } catch (err: any) {
    console.error('[TV:HealthRecords] Error:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// POST /api/tv/health/:channelId/record
tvRouter.post('/health/:channelId/record', (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params['channelId'] || '', 10);
    const { method, success, latency_ms, failure_reason } = req.body || {};

    if (isNaN(channelId) || !['hls', 'youtube', 'vlc'].includes(method)) {
      res.status(400).json({
        error: 'Valid channelId and method (hls | youtube | vlc) required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM tv_channel_health WHERE channel_id = ? AND method = ?')
      .get(channelId, method) as any;

    if (existing) {
      const failures = success ? 0 : existing.consecutive_failures + 1;
      const lastWorked = success ? new Date().toISOString() : existing.last_worked_at;

      db.prepare(`
        UPDATE tv_channel_health SET
          last_checked_at = datetime('now'),
          last_worked_at = ?,
          consecutive_failures = ?,
          failure_reason = ?,
          latency_ms = ?
        WHERE id = ?
      `).run(lastWorked, failures, failure_reason || null, latency_ms || null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO tv_channel_health (
          channel_id, method, last_checked_at, last_worked_at,
          consecutive_failures, failure_reason, latency_ms
        ) VALUES (
          ?, ?, datetime('now'), ?,
          ?, ?, ?
        )
      `).run(
        channelId,
        method,
        success ? new Date().toISOString() : null,
        success ? 0 : 1,
        failure_reason || null,
        latency_ms || null
      );
    }

    emitSseEvent('tv_health_update', {
      action: 'method_health_recorded',
      channel_id: channelId,
      method,
      success: Boolean(success),
      latency_ms: latency_ms ?? null,
    });

    res.json({ success: true, channel_id: channelId, method });
  } catch (err: any) {
    console.error('[TV:RecordHealth] Error:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});


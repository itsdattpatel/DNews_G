/**
 * backend/src/routes/sources.ts
 * REST endpoints for managing news sources (RSS and GDELT).
 * GET /api/sources - list all configured sources with live fetch status
 * POST /api/sources - register a new custom RSS or YouTube wire feed
 * POST /api/sources/test - live test and validate an external feed with sample dispatches and favicon
 * PATCH /api/sources/:id - toggle enabled status
 * DELETE /api/sources/:id - remove a custom source
 */
import { Router, type Request, type Response } from 'express';
import Parser from 'rss-parser';
import { getDb } from '../db/db';
import { emitSseEvent } from './sse';

export const sourcesRouter = Router();

const testParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-World-News-Desk/1.0',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});

// Helper to resolve YouTube URL to RSS feed if applicable
function normalizeFeedUrl(inputUrl: string): string {
  let url = inputUrl.trim();
  // Handle YouTube channel links like https://www.youtube.com/channel/UCxxxx or https://www.youtube.com/@handle
  if (url.includes('youtube.com/channel/')) {
    const channelId = url.split('youtube.com/channel/')[1]?.split('/')[0]?.split('?')[0];
    if (channelId) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    }
  }
  return url;
}

// GET /api/sources
sourcesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT id, name, slug, url, country, fetch_type, enabled, last_fetched_at, region, language, priority
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
        region: string | null;
        language: string | null;
        priority: string | null;
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

// POST /api/sources/test - One-click live feed validation & preview
sourcesRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      res.status(400).json({ success: false, error: 'A valid HTTP/HTTPS URL is required' });
      return;
    }

    const targetUrl = normalizeFeedUrl(url);

    // Fetch and parse feed
    const feed = await testParser.parseURL(targetUrl);
    
    // Attempt favicon discovery via domain
    let domain = '';
    try {
      const parsed = new URL(feed.link || targetUrl);
      domain = parsed.hostname;
    } catch {
      domain = '';
    }
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

    const sampleItems = (feed.items || []).slice(0, 3).map((item) => ({
      title: item.title || '(Untitled dispatch)',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      snippet: (item.contentSnippet || item.summary || item.content || '').slice(0, 160).trim(),
    }));

    res.json({
      success: true,
      title: feed.title || 'Custom Wire Feed',
      description: feed.description || '',
      link: feed.link || targetUrl,
      targetUrl,
      faviconUrl,
      total_items: feed.items?.length || 0,
      sample_items: sampleItems,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(422).json({
      success: false,
      error: `Feed verification failed: ${errorMessage}. Ensure the URL points to a valid RSS/Atom/XML feed.`,
    });
  }
});

// POST /api/sources - Register custom wire source
sourcesRouter.post('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { name, url, country, fetch_type, region, language } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Source name is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      res.status(400).json({ error: 'A valid HTTP/HTTPS feed URL is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const cleanName = name.trim();
    const cleanUrl = normalizeFeedUrl(url);
    const cleanCountry = (country && String(country).trim()) || 'Global';
    const cleanFetchType = fetch_type === 'youtube' ? 'rss' : (fetch_type || 'rss');
    const cleanRegion = (region && String(region).trim()) || 'Global';
    const cleanLanguage = (language && String(language).trim()) || 'en';

    // Generate unique slug
    let baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);
    if (!baseSlug) baseSlug = 'wire_source';

    let finalSlug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM sources WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${baseSlug}_${counter++}`;
    }

    const result = db.prepare(`
      INSERT INTO sources (slug, name, country, url, fetch_type, enabled, region, language, priority)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'tier2')
    `).run(finalSlug, cleanName, cleanCountry, cleanUrl, cleanFetchType, cleanRegion, cleanLanguage);

    const insertedId = result.lastInsertRowid;
    const newSource = db.prepare(`
      SELECT id, name, slug, url, country, fetch_type, enabled, last_fetched_at, region, language, priority
      FROM sources WHERE id = ?
    `).get(insertedId) as {
      id: number;
      name: string;
      slug: string;
      url: string;
      country: string;
      fetch_type: string;
      enabled: number;
      last_fetched_at: string | null;
      region: string | null;
      language: string | null;
      priority: string | null;
    };

    const payload = {
      ...newSource,
      enabled: true,
    };

    emitSseEvent('control_room_update', {
      type: 'source_added',
      source: payload,
    });

    res.status(201).json({ success: true, source: payload });
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

// DELETE /api/sources/:id
sourcesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid source ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const existing = db.prepare('SELECT id, name, slug FROM sources WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Source not found', code: 'NOT_FOUND' });
      return;
    }

    db.prepare('DELETE FROM sources WHERE id = ?').run(id);

    emitSseEvent('control_room_update', {
      type: 'source_deleted',
      sourceId: id,
    });

    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

/**
 * backend/src/routes/articles.ts
 * GET /api/articles — paginated, filterable, full-text-searchable article list.
 * GET /api/articles/:id — single article with full body.
 * PATCH /api/articles/:id/bookmark — toggle bookmark.
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { computeConfirmationStatus } from '../utils/confirmation';
import { enrichArticlePass2 } from '../pipeline/enricher';
import { emitSseEvent } from './sse';

export const articlesRouter = Router();

articlesRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const limit = Math.min(200, parseInt(String(req.query['limit'] ?? '50'), 10));
  const offset = parseInt(String(req.query['offset'] ?? '0'), 10);
  const country = req.query['country'] as string | undefined;
  const category = req.query['category'] as string | undefined;
  const status = (req.query['status'] as string) ?? 'done';
  const clusterId = req.query['cluster_id'] as string | undefined;
  const q = req.query['q'] as string | undefined;
  const breaking = req.query['breaking'] === 'true';

  let query: string;
  const params: unknown[] = [];

  if (q) {
    // Full-text search path
    query = `
      SELECT a.id, a.url, a.title_english, a.summary, a.body_english, a.body_en_normalized, a.body_quality, a.readability_score, a.source_language, a.anchor_phrases, a.breaking_score,
             a.cluster_id, a.bookmarked, a.published_at, a.ingested_at, a.is_catchup, a.fetched_at,
             a.pass1_completed_at, a.pass2_completed_at,
             s.id AS source_id, s.name AS source_name, s.country AS source_country,
             c.outlet_count AS cluster_outlet_count, c.country_count AS cluster_country_count, c.is_breaking AS cluster_is_breaking,
             GROUP_CONCAT(DISTINCT ac.category) AS categories,
             GROUP_CONCAT(DISTINCT k.keyword) AS keywords
      FROM articles_fts
      JOIN articles a ON articles_fts.rowid = a.id
      JOIN sources s ON a.source_id = s.id
      LEFT JOIN clusters c ON a.cluster_id = c.id
      LEFT JOIN article_categories ac ON a.id = ac.article_id
      LEFT JOIN keywords k ON a.id = k.article_id
      WHERE articles_fts MATCH ?
        AND a.status = ?
        ${country ? "AND s.country = ?" : ''}
        ${category ? "AND ac.category = ?" : ''}
        ${clusterId ? "AND a.cluster_id = ?" : ''}
        ${breaking ? "AND a.breaking_score >= CAST((SELECT value FROM settings WHERE key='alert_threshold') AS INTEGER)" : ''}
      GROUP BY a.id
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;
    params.push(q, status);
    if (country) params.push(country);
    if (category) params.push(category);
    if (clusterId) params.push(parseInt(clusterId, 10));
    params.push(limit, offset);
  } else {
    query = `
      SELECT a.id, a.url, a.title_english, a.summary, a.body_english, a.body_en_normalized, a.body_quality, a.readability_score, a.source_language, a.anchor_phrases, a.breaking_score,
             a.cluster_id, a.bookmarked, a.published_at, a.ingested_at, a.is_catchup, a.fetched_at,
             a.pass1_completed_at, a.pass2_completed_at,
             s.id AS source_id, s.name AS source_name, s.country AS source_country,
             c.outlet_count AS cluster_outlet_count, c.country_count AS cluster_country_count, c.is_breaking AS cluster_is_breaking,
             GROUP_CONCAT(DISTINCT ac.category) AS categories,
             GROUP_CONCAT(DISTINCT k.keyword) AS keywords
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      LEFT JOIN clusters c ON a.cluster_id = c.id
      LEFT JOIN article_categories ac ON a.id = ac.article_id
      LEFT JOIN keywords k ON a.id = k.article_id
      WHERE a.status = ?
        ${country ? "AND s.country = ?" : ''}
        ${category ? "AND ac.category = ?" : ''}
        ${clusterId ? "AND a.cluster_id = ?" : ''}
        ${breaking ? "AND a.breaking_score >= CAST((SELECT value FROM settings WHERE key='alert_threshold') AS INTEGER)" : ''}
      GROUP BY a.id
      ORDER BY MIN(a.published_at, datetime('now')) DESC, a.fetched_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(status);
    if (country) params.push(country);
    if (category) params.push(category);
    if (clusterId) params.push(parseInt(clusterId, 10));
    params.push(limit, offset);
  }

  try {
    const rows = db.prepare(query).all(...params) as RawRow[];
    const items = rows.map(formatRow);

    // Count query with matching filters
    const countQuery = `
      SELECT COUNT(DISTINCT a.id) AS c
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      LEFT JOIN article_categories ac ON a.id = ac.article_id
      WHERE a.status = ?
        ${country ? "AND s.country = ?" : ''}
        ${category ? "AND ac.category = ?" : ''}
        ${clusterId ? "AND a.cluster_id = ?" : ''}
        ${breaking ? "AND a.breaking_score >= CAST((SELECT value FROM settings WHERE key='alert_threshold') AS INTEGER)" : ''}
    `;
    const countParams: unknown[] = [status];
    if (country) countParams.push(country);
    if (category) countParams.push(category);
    if (clusterId) countParams.push(parseInt(clusterId, 10));
    const total = (db.prepare(countQuery).get(...countParams) as { c: number }).c;

    res.json({ total, limit, offset, items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/articles/categories/counts
 * Returns live per-category article counts respecting optional country/q/breaking filters.
 */
articlesRouter.get('/categories/counts', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const country = req.query['country'] as string | undefined;
    const status = (req.query['status'] as string) ?? 'done';
    const q = req.query['q'] as string | undefined;
    const breaking = req.query['breaking'] === 'true';

    const params: unknown[] = [];
    let whereSql = 'a.status = ?';
    params.push(status);

    if (country) {
      whereSql += ' AND s.country = ?';
      params.push(country);
    }
    if (breaking) {
      whereSql += " AND a.breaking_score >= CAST((SELECT value FROM settings WHERE key='alert_threshold') AS INTEGER)";
    }

    const fromSql = q
      ? 'FROM articles_fts JOIN articles a ON articles_fts.rowid = a.id JOIN sources s ON a.source_id = s.id'
      : 'FROM articles a JOIN sources s ON a.source_id = s.id';
    if (q) {
      whereSql = `articles_fts MATCH ? AND ${whereSql}`;
      params.unshift(q);
    }

    const totalRow = db
      .prepare(`SELECT COUNT(DISTINCT a.id) AS total ${fromSql} WHERE ${whereSql}`)
      .get(...params) as { total: number };

    const categoryRows = db
      .prepare(`
        SELECT ac.category AS category, COUNT(DISTINCT a.id) AS cnt
        ${fromSql}
        JOIN article_categories ac ON a.id = ac.article_id
        WHERE ${whereSql}
        GROUP BY ac.category
      `)
      .all(...params) as Array<{ category: string; cnt: number }>;

    const categories: Record<string, number> = {};
    for (const r of categoryRows) {
      categories[r.category] = r.cnt;
    }

    return res.json({ total: totalRow?.total ?? 0, categories });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

export function getDetailedArticle(id: number) {
  const db = getDb();
  const row = db.prepare(`
    SELECT a.*, s.name AS source_name, s.country AS source_country, s.url AS source_url,
           c.outlet_count AS cluster_outlet_count, c.country_count AS cluster_country_count, c.is_breaking AS cluster_is_breaking,
           GROUP_CONCAT(DISTINCT ac.category) AS categories,
           GROUP_CONCAT(DISTINCT k.keyword) AS keywords
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    LEFT JOIN clusters c ON a.cluster_id = c.id
    LEFT JOIN article_categories ac ON a.id = ac.article_id
    LEFT JOIN keywords k ON a.id = k.article_id
    WHERE a.id = ?
    GROUP BY a.id
  `).get(id) as (RawRow & { body_original: string; body_english: string; language_detected: string; source_url: string }) | undefined;

  if (!row) return null;

  return {
    ...formatRow(row),
    body_original: row.body_original,
    body_english: row.body_english,
    language_detected: row.language_detected,
    anchor_phrases: (() => {
      try {
        return (row as any).anchor_phrases ? JSON.parse((row as any).anchor_phrases) : [];
      } catch {
        return [];
      }
    })(),
    source: {
      id: row.source_id,
      name: row.source_name,
      country: row.source_country,
      url: row.source_url,
    },
  };
}

articlesRouter.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params['id']!, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });

  const article = getDetailedArticle(id);
  if (!article) return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
  res.json(article);
});

/**
 * POST /api/articles/:id/enrich-pass2
 * On-demand Pass 2 enrichment for unsummarized articles (PRD A §10.1).
 */
articlesRouter.post('/:id/enrich-pass2', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id']!, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });

  try {
    await enrichArticlePass2(id);
    const updated = getDetailedArticle(id);
    if (!updated) return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ArticlesRouter] Pass 2 enrichment error for article ${id}:`, err);
    return res.status(500).json({ error: msg, code: 'ENRICHMENT_ERROR' });
  }
});

articlesRouter.patch('/:id/bookmark', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params['id']!, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });

  const body = req.body as { bookmarked?: boolean } | undefined;
  let nextValue: boolean;

  if (body && typeof body.bookmarked === 'boolean') {
    nextValue = body.bookmarked;
  } else {
    const row = db.prepare('SELECT bookmarked FROM articles WHERE id = ?').get(id) as { bookmarked: number } | undefined;
    if (!row) return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
    nextValue = row.bookmarked !== 1;
  }

  db.prepare('UPDATE articles SET bookmarked = ? WHERE id = ?').run(nextValue ? 1 : 0, id);
  emitSseEvent('bookmark_update', { article_id: id, bookmarked: nextValue });
  return res.json({ bookmarked: nextValue });
});

articlesRouter.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params['id']!, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });

  const existing = db.prepare('SELECT id, status FROM articles WHERE id = ?').get(id) as
    | { id: number; status: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });

  const { title_english, summary, breaking_score, status } = req.body as {
    title_english?: string;
    summary?: string;
    breaking_score?: number;
    status?: string;
  };

  const updates: string[] = [];
  const params: unknown[] = [];

  if (typeof title_english === 'string') {
    updates.push('title_english = ?');
    params.push(title_english);
  }
  if (typeof summary === 'string') {
    updates.push('summary = ?');
    params.push(summary);
  }
  if (typeof breaking_score === 'number' && !Number.isNaN(breaking_score)) {
    updates.push('breaking_score = ?');
    params.push(breaking_score);
  }
  if (typeof status === 'string') {
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = getDetailedArticle(id);
  if (!updated) return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });

  emitSseEvent('article_updated', { article_id: id });
  if (existing.status !== 'done' && status === 'done') {
    emitSseEvent('new_article', { article_id: id });
  }

  return res.json(updated);
});

interface RawRow {
  id: number; url: string; title_english: string | null; summary: string | null;
  body_english?: string | null; body_en_normalized?: string | null;
  body_quality?: string | null; readability_score?: number | null;
  source_language?: string | null;
  anchor_phrases?: string | null;
  breaking_score: number; cluster_id: number | null;
  cluster_outlet_count?: number | null;
  cluster_country_count?: number | null;
  cluster_is_breaking?: number | null;
  bookmarked: number; published_at: string | null; fetched_at: string;
  ingested_at?: string | null; is_catchup?: number | null;
  pass1_completed_at?: string | null; pass2_completed_at?: string | null;
  source_id: number; source_name: string; source_country: string;
  categories: string | null; keywords: string | null;
}

function formatRow(row: RawRow) {
  let anchorPhrases: any[] = [];
  if (row.anchor_phrases) {
    try {
      anchorPhrases = typeof row.anchor_phrases === 'string' ? JSON.parse(row.anchor_phrases) : row.anchor_phrases;
    } catch {
      anchorPhrases = [];
    }
  }

  const confirmation = computeConfirmationStatus({
    outletCount: row.cluster_outlet_count,
    countryCount: row.cluster_country_count,
    breakingScore: row.breaking_score,
    isBreakingCluster: row.cluster_is_breaking === 1,
  });

  return {
    id: row.id,
    url: row.url,
    title_english: row.title_english,
    summary: row.summary,
    body_english: row.body_english,
    body_en_normalized: row.body_en_normalized ?? row.body_english ?? null,
    body_quality: row.body_quality ?? 'good',
    readability_score: row.readability_score ?? 0,
    source_language: row.source_language ?? 'en',
    anchor_phrases: anchorPhrases,
    breaking_score: row.breaking_score,
    cluster_id: row.cluster_id,
    cluster_outlet_count: row.cluster_outlet_count ?? 1,
    cluster_country_count: row.cluster_country_count ?? 1,
    cluster_is_breaking: row.cluster_is_breaking === 1,
    confirmation,
    bookmarked: row.bookmarked === 1,
    published_at: row.published_at,
    ingested_at: row.ingested_at || row.fetched_at,
    is_catchup: row.is_catchup === 1,
    fetched_at: row.fetched_at,
    pass1_completed_at: row.pass1_completed_at ?? null,
    pass2_completed_at: row.pass2_completed_at ?? null,
    source: { id: row.source_id, name: row.source_name, country: row.source_country },
    categories: row.categories ? row.categories.split(',') : [],
    keywords: row.keywords ? row.keywords.split(',') : [],
  };
}

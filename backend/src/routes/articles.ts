/**
 * backend/src/routes/articles.ts
 * GET /api/articles — paginated, filterable, full-text-searchable article list.
 * GET /api/articles/:id — single article with full body.
 * PATCH /api/articles/:id/bookmark — toggle bookmark.
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';

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
      SELECT a.id, a.url, a.title_english, a.summary, a.body_english, a.anchor_phrases, a.breaking_score,
             a.cluster_id, a.bookmarked, a.published_at, a.ingested_at, a.is_catchup, a.fetched_at,
             s.id AS source_id, s.name AS source_name, s.country AS source_country,
             GROUP_CONCAT(DISTINCT ac.category) AS categories,
             GROUP_CONCAT(DISTINCT k.keyword) AS keywords
      FROM articles_fts
      JOIN articles a ON articles_fts.rowid = a.id
      JOIN sources s ON a.source_id = s.id
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
      SELECT a.id, a.url, a.title_english, a.summary, a.body_english, a.anchor_phrases, a.breaking_score,
             a.cluster_id, a.bookmarked, a.published_at, a.ingested_at, a.is_catchup, a.fetched_at,
             s.id AS source_id, s.name AS source_name, s.country AS source_country,
             GROUP_CONCAT(DISTINCT ac.category) AS categories,
             GROUP_CONCAT(DISTINCT k.keyword) AS keywords
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      LEFT JOIN article_categories ac ON a.id = ac.article_id
      LEFT JOIN keywords k ON a.id = k.article_id
      WHERE a.status = ?
        ${country ? "AND s.country = ?" : ''}
        ${category ? "AND ac.category = ?" : ''}
        ${clusterId ? "AND a.cluster_id = ?" : ''}
        ${breaking ? "AND a.breaking_score >= CAST((SELECT value FROM settings WHERE key='alert_threshold') AS INTEGER)" : ''}
      GROUP BY a.id
      ORDER BY a.published_at DESC, a.fetched_at DESC
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

articlesRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params['id']!, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });

  const row = db.prepare(`
    SELECT a.*, s.name AS source_name, s.country AS source_country, s.url AS source_url,
           GROUP_CONCAT(DISTINCT ac.category) AS categories,
           GROUP_CONCAT(DISTINCT k.keyword) AS keywords
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    LEFT JOIN article_categories ac ON a.id = ac.article_id
    LEFT JOIN keywords k ON a.id = k.article_id
    WHERE a.id = ?
    GROUP BY a.id
  `).get(id) as (RawRow & { body_original: string; body_english: string; language_detected: string; source_url: string }) | undefined;

  if (!row) return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });

  res.json({
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
  });
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
  return res.json({ bookmarked: nextValue });
});

interface RawRow {
  id: number; url: string; title_english: string | null; summary: string | null;
  body_english?: string | null; anchor_phrases?: string | null;
  breaking_score: number; cluster_id: number | null;
  bookmarked: number; published_at: string | null; fetched_at: string;
  ingested_at?: string | null; is_catchup?: number | null;
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

  return {
    id: row.id,
    url: row.url,
    title_english: row.title_english,
    summary: row.summary,
    body_english: row.body_english,
    anchor_phrases: anchorPhrases,
    breaking_score: row.breaking_score,
    cluster_id: row.cluster_id,
    bookmarked: row.bookmarked === 1,
    published_at: row.published_at,
    ingested_at: row.ingested_at || row.fetched_at,
    is_catchup: row.is_catchup === 1,
    fetched_at: row.fetched_at,
    source: { id: row.source_id, name: row.source_name, country: row.source_country },
    categories: row.categories ? row.categories.split(',') : [],
    keywords: row.keywords ? row.keywords.split(',') : [],
  };
}

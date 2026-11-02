/**
 * backend/src/routes/clusters.ts
 * GET /api/clusters — paginated, filterable story clusters
 * GET /api/clusters/:id — single cluster with all member articles
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { computeConfirmationStatus } from '../utils/confirmation';

export const clustersRouter = Router();

interface ClusterRow {
  id: number;
  headline: string | null;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: number;
}

interface ArticleSnippet {
  id: number;
  title_english: string | null;
  summary: string | null;
  source_id: number;
  source_name: string;
  source_country: string;
}

clustersRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '50'), 10)));
  const offset = Math.max(0, parseInt(String(req.query['offset'] ?? '0'), 10));
  const breaking = req.query['breaking'] === 'true';
  const category = req.query['category'] as string | undefined;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (breaking) {
    conditions.push('c.is_breaking = 1');
  }

  if (category) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM articles a2
        JOIN article_categories ac ON a2.id = ac.article_id
        WHERE a2.cluster_id = c.id AND ac.category = ?
      )
    `);
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM clusters c ${whereClause}`).get(...params) as {
    total: number;
  };

  // Get clusters
  const clusters = db.prepare(`
    SELECT c.id, c.headline, c.first_seen_at, c.last_updated_at, c.outlet_count, c.country_count, c.is_breaking
    FROM clusters c
    ${whereClause}
    ORDER BY c.last_updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as ClusterRow[];

  // Fetch article snippets for these clusters
  const clusterIds = clusters.map((c) => c.id);
  const articlesByCluster: Record<number, ArticleSnippet[]> = {};

  if (clusterIds.length > 0) {
    const placeholders = clusterIds.map(() => '?').join(',');
    const articleRows = db.prepare(`
      SELECT a.id, a.cluster_id, a.title_english, a.summary,
             s.id as source_id, s.name as source_name, s.country as source_country
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      WHERE a.cluster_id IN (${placeholders})
      ORDER BY a.breaking_score DESC, a.published_at DESC
    `).all(...clusterIds) as (ArticleSnippet & { cluster_id: number })[];

    for (const a of articleRows) {
      if (!articlesByCluster[a.cluster_id]) {
        articlesByCluster[a.cluster_id] = [];
      }
      articlesByCluster[a.cluster_id]!.push(a);
    }
  }

  const items = clusters.map((c) => ({
    id: c.id,
    headline: c.headline,
    first_seen_at: c.first_seen_at,
    last_updated_at: c.last_updated_at,
    outlet_count: c.outlet_count,
    country_count: c.country_count,
    is_breaking: c.is_breaking === 1,
    confirmation: computeConfirmationStatus({
      outletCount: c.outlet_count,
      countryCount: c.country_count,
      isBreakingCluster: c.is_breaking === 1,
    }),
    articles: (articlesByCluster[c.id] ?? []).map((a) => ({
      id: a.id,
      title_english: a.title_english,
      summary: a.summary,
      source: {
        id: a.source_id,
        name: a.source_name,
        country: a.source_country,
      },
    })),
  }));

  res.json({
    total: countRow.total,
    limit,
    offset,
    items,
  });
});

clustersRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params['id']!, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' });

  const cluster = db.prepare(`
    SELECT id, headline, first_seen_at, last_updated_at, outlet_count, country_count, is_breaking
    FROM clusters
    WHERE id = ?
  `).get(id) as ClusterRow | undefined;

  if (!cluster) return res.status(404).json({ error: 'Cluster not found', code: 'NOT_FOUND' });

  const articles = db.prepare(`
    SELECT a.id, a.title_english, a.summary, a.published_at, a.url, a.breaking_score,
           s.id as source_id, s.name as source_name, s.country as source_country
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.cluster_id = ?
    ORDER BY a.breaking_score DESC, a.published_at DESC
  `).all(id) as (ArticleSnippet & { published_at: string | null; url: string; breaking_score: number })[];

  // Fetch keywords and categories for all member articles
  const keywordsByArticle: Record<number, string[]> = {};
  const categoriesByArticle: Record<number, string[]> = {};

  if (articles.length > 0) {
    const artIds = articles.map((a) => a.id);
    const placeholders = artIds.map(() => '?').join(',');

    const kwRows = db
      .prepare(`SELECT article_id, keyword FROM keywords WHERE article_id IN (${placeholders})`)
      .all(...artIds) as Array<{ article_id: number; keyword: string }>;
    for (const kw of kwRows) {
      if (!keywordsByArticle[kw.article_id]) keywordsByArticle[kw.article_id] = [];
      keywordsByArticle[kw.article_id]!.push(kw.keyword);
    }

    const catRows = db
      .prepare(`SELECT article_id, category FROM article_categories WHERE article_id IN (${placeholders})`)
      .all(...artIds) as Array<{ article_id: number; category: string }>;
    for (const cat of catRows) {
      if (!categoriesByArticle[cat.article_id]) categoriesByArticle[cat.article_id] = [];
      categoriesByArticle[cat.article_id]!.push(cat.category);
    }
  }

  res.json({
    id: cluster.id,
    headline: cluster.headline,
    first_seen_at: cluster.first_seen_at,
    last_updated_at: cluster.last_updated_at,
    outlet_count: cluster.outlet_count,
    country_count: cluster.country_count,
    is_breaking: cluster.is_breaking === 1,
    confirmation: computeConfirmationStatus({
      outletCount: cluster.outlet_count,
      countryCount: cluster.country_count,
      isBreakingCluster: cluster.is_breaking === 1,
    }),
    articles: articles.map((a) => ({
      id: a.id,
      url: a.url,
      title_english: a.title_english,
      summary: a.summary,
      published_at: a.published_at,
      breaking_score: a.breaking_score,
      keywords: keywordsByArticle[a.id] ?? [],
      categories: categoriesByArticle[a.id] ?? [],
      source: {
        id: a.source_id,
        name: a.source_name,
        country: a.source_country,
      },
    })),
  });
});

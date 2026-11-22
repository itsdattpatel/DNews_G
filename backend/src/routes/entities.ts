/**
 * backend/src/routes/entities.ts
 * Entity Dossier & Deep Connection Inspector API
 * Aggregates historical mentions, co-occurring key figures, newsroom coverage,
 * and chronological dispatch archives for any named person, nation, or organization.
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';

export const entitiesRouter = Router();

entitiesRouter.get('/dossier', (req: Request, res: Response) => {
  try {
    const rawName = (req.query['name'] as string | undefined)?.trim();
    if (!rawName) {
      res.status(400).json({ error: 'Entity name is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getDb();
    const cleanName = rawName.toLowerCase();

    // 1. Find articles mentioning this entity via keywords and FTS5
    const keywordArticleRows = db.prepare(`
      SELECT DISTINCT article_id
      FROM keywords
      WHERE lower(keyword) = ?
    `).all(cleanName) as { article_id: number }[];

    let articleIds = keywordArticleRows.map((r) => r.article_id);

    // If few direct keyword matches, augment with FTS5 search
    if (articleIds.length < 5) {
      try {
        const sanitized = cleanName.replace(/["'*]/g, ' ').trim();
        if (sanitized) {
          const ftsRows = db.prepare(`
            SELECT rowid as article_id
            FROM articles_fts
            WHERE articles_fts MATCH ?
            LIMIT 30
          `).all(`"${sanitized}"*`) as { article_id: number }[];

          const combined = new Set([...articleIds, ...ftsRows.map((r) => r.article_id)]);
          articleIds = Array.from(combined);
        }
      } catch {
        // Fallback if FTS syntax error
      }
    }

    if (articleIds.length === 0) {
      res.json({
        success: true,
        entity: rawName,
        total_mentions: 0,
        avg_breaking_score: 0,
        first_seen: null,
        last_seen: null,
        co_occurring_entities: [],
        top_sources: [],
        articles: [],
      });
      return;
    }

    const placeholders = articleIds.map(() => '?').join(',');

    // 2. Fetch full article items for the timeline
    const articles = db.prepare(`
      SELECT a.id, a.url, a.title_english, a.summary, a.published_at, a.breaking_score,
             s.name as source_name, s.country as source_country
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      WHERE a.id IN (${placeholders})
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT 25
    `).all(...articleIds) as Array<{
      id: number;
      url: string;
      title_english: string;
      summary: string;
      published_at: string | null;
      breaking_score: number;
      source_name: string;
      source_country: string;
    }>;

    // 3. Co-occurring entities from keywords table
    const coOccurring = db.prepare(`
      SELECT k.keyword, count(*) as count
      FROM keywords k
      WHERE k.article_id IN (${placeholders})
        AND lower(k.keyword) != ?
      GROUP BY lower(k.keyword)
      ORDER BY count DESC
      LIMIT 10
    `).all(...articleIds, cleanName) as Array<{ keyword: string; count: number }>;

    // 4. Top covering news outlets
    const topSources = db.prepare(`
      SELECT s.name as source_name, s.country as source_country, count(*) as count
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      WHERE a.id IN (${placeholders})
      GROUP BY s.id
      ORDER BY count DESC
      LIMIT 8
    `).all(...articleIds) as Array<{ source_name: string; source_country: string; count: number }>;

    // 5. Aggregate stats
    const statsRow = db.prepare(`
      SELECT 
        AVG(breaking_score) as avg_score,
        MIN(COALESCE(published_at, fetched_at)) as first_seen,
        MAX(COALESCE(published_at, fetched_at)) as last_seen
      FROM articles
      WHERE id IN (${placeholders})
    `).get(...articleIds) as {
      avg_score: number | null;
      first_seen: string | null;
      last_seen: string | null;
    };

    res.json({
      success: true,
      entity: rawName,
      total_mentions: articleIds.length,
      avg_breaking_score: Math.round(statsRow?.avg_score ?? 0),
      first_seen: statsRow?.first_seen ?? null,
      last_seen: statsRow?.last_seen ?? null,
      co_occurring_entities: coOccurring,
      top_sources: topSources,
      articles: articles.map((a) => ({
        id: a.id,
        url: a.url,
        title_english: a.title_english,
        summary: a.summary,
        published_at: a.published_at,
        breaking_score: a.breaking_score,
        source: {
          name: a.source_name,
          country: a.source_country,
        },
      })),
    });
  } catch (err) {
    console.error('[Entities] Failed to generate dossier:', err);
    res.status(500).json({ error: 'Failed to generate entity dossier', code: 'SERVER_ERROR' });
  }
});

// GET /api/entities/graph
entitiesRouter.get('/graph', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // 1. Fetch top 35 prominent entities by mention frequency
    const topKeywords = db.prepare(`
      SELECT keyword, COUNT(*) as mentions, AVG(a.breaking_score) as avg_score
      FROM keywords k
      JOIN articles a ON k.article_id = a.id
      WHERE length(keyword) > 2
      GROUP BY lower(keyword)
      ORDER BY mentions DESC
      LIMIT 35
    `).all() as Array<{ keyword: string; mentions: number; avg_score: number | null }>;

    const KNOWN_NATIONS = new Set([
      'united states', 'usa', 'us', 'china', 'russia', 'india', 'uk', 'britain', 'france',
      'germany', 'japan', 'ukraine', 'israel', 'iran', 'gaza', 'taiwan', 'south korea',
      'north korea', 'turkey', 'syria', 'canada', 'australia', 'brazil', 'saudi arabia',
      'pakistan', 'bangladesh', 'qatar', 'egypt', 'lebanon', 'yemen', 'sudan'
    ]);

    const KNOWN_ORGS = new Set([
      'un', 'united nations', 'nato', 'eu', 'european union', 'who', 'imf', 'world bank',
      'iaea', 'icc', 'opec', 'asean', 'brics', 'g7', 'g20', 'fda', 'fbi', 'cia', 'pentagon'
    ]);

    const nodes = topKeywords.map((k, index) => {
      const lower = k.keyword.toLowerCase();
      let type: 'nation' | 'organization' | 'leader' | 'topic' = 'topic';
      if (KNOWN_NATIONS.has(lower)) {
        type = 'nation';
      } else if (KNOWN_ORGS.has(lower)) {
        type = 'organization';
      } else if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(k.keyword)) {
        type = 'leader';
      }

      return {
        id: k.keyword,
        name: k.keyword,
        type,
        mentions: k.mentions,
        urgency: Math.round(k.avg_score || 0),
        rank: index + 1,
      };
    });

    const nodeSet = new Set(nodes.map((n) => n.id.toLowerCase()));

    // 2. Fetch co-occurrence relationships (edges) between these entities
    const linksMap = new Map<string, { source: string; target: string; weight: number }>();

    const pairs = db.prepare(`
      SELECT k1.keyword as e1, k2.keyword as e2, COUNT(*) as weight
      FROM keywords k1
      JOIN keywords k2 ON k1.article_id = k2.article_id AND lower(k1.keyword) < lower(k2.keyword)
      GROUP BY lower(k1.keyword), lower(k2.keyword)
      HAVING weight >= 1
      ORDER BY weight DESC
      LIMIT 100
    `).all() as Array<{ e1: string; e2: string; weight: number }>;

    for (const p of pairs) {
      if (nodeSet.has(p.e1.toLowerCase()) && nodeSet.has(p.e2.toLowerCase())) {
        const key = `${p.e1.toLowerCase()}_${p.e2.toLowerCase()}`;
        linksMap.set(key, {
          source: p.e1,
          target: p.e2,
          weight: p.weight,
        });
      }
    }

    res.json({
      success: true,
      nodes,
      links: Array.from(linksMap.values()),
      total_entities: nodes.length,
      total_connections: linksMap.size,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Entities] Failed to generate entity network graph:', err);
    res.status(500).json({ error: 'Failed to generate entity graph', code: 'SERVER_ERROR' });
  }
});

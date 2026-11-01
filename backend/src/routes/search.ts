/**
 * backend/src/routes/search.ts
 * Archive search endpoint with full-text search (FTS5) and AI synthesis (P8-04).
 * POST /api/search
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { routeAIRequest } from '../ai/router';

export const searchRouter = Router();

interface SearchResultItem {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  breaking_score: number;
  source_name: string;
  source_country: string;
}

// POST /api/search
searchRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { query, use_ai = false, limit = 20 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Search query is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const cleanQuery = query.trim();
    const maxResults = Math.min(Math.max(1, parseInt(String(limit), 10) || 20), 50);
    const db = getDb();

    let results: SearchResultItem[] = [];

    // 1. Try SQLite FTS5 Match
    try {
      // Sanitize query for FTS5 (escape double quotes, wrap terms)
      const sanitizedFts = cleanQuery
        .replace(/["'*]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => `"${term}"*`)
        .join(' OR ');

      if (sanitizedFts) {
        results = db
          .prepare(`
            SELECT a.id, a.url, a.title_english, a.summary, a.published_at, a.breaking_score,
                   s.name as source_name, s.country as source_country
            FROM articles_fts fts
            JOIN articles a ON fts.rowid = a.id
            JOIN sources s ON a.source_id = s.id
            WHERE articles_fts MATCH ?
            ORDER BY bm25(articles_fts)
            LIMIT ?
          `)
          .all(sanitizedFts, maxResults) as SearchResultItem[];
      }
    } catch {
      // FTS query fallback
      results = [];
    }

    // 2. Fallback to LIKE if FTS produced 0 results
    if (results.length === 0) {
      const likeParam = `%${cleanQuery}%`;
      results = db
        .prepare(`
          SELECT a.id, a.url, a.title_english, a.summary, a.published_at, a.breaking_score,
                 s.name as source_name, s.country as source_country
          FROM articles a
          JOIN sources s ON a.source_id = s.id
          WHERE (a.title_english LIKE ? OR a.summary LIKE ? OR a.body_english LIKE ?)
          ORDER BY a.published_at DESC
          LIMIT ?
        `)
        .all(likeParam, likeParam, likeParam, maxResults) as SearchResultItem[];
    }

    // 3. AI Synthesis if requested
    let aiAnswer: string | null = null;
    if (use_ai && results.length > 0) {
      try {
        const contextText = results
          .slice(0, 8)
          .map(
            (r, i) =>
              `[${i + 1}] "${r.title_english}" (${r.source_name}, ${r.source_country}): ${r.summary || 'No summary'}`,
          )
          .join('\n');

        const prompt = `You are an investigative archive researcher for AI World News Desk.
User Archive Inquiry: "${cleanQuery}"

Retrieved historical dispatches:
${contextText}

Answer the inquiry in 2–3 concise sentences synthesized strictly from the retrieved dispatches above. Include bracket citations like [1] or [2] where relevant. Do NOT make up information.`;

        const aiRes = await routeAIRequest(prompt);
        aiAnswer = aiRes.text.trim();
      } catch (err) {
        console.warn('[Search] AI synthesis fallback:', err);
        aiAnswer = 'AI synthesis temporarily unavailable across provider fallback chain.';
      }
    }

    res.json({
      query: cleanQuery,
      results,
      ai_answer: aiAnswer,
    });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});


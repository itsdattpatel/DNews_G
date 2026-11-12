import natural from 'natural';
import { getDb } from '../db/db';
import { emitSseEvent } from '../routes/sse';

const SIMILARITY_THRESHOLD = 0.50; // threshold for grouping articles into the same story cluster

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'was',
  'are', 'were', 'been', 'be', 'by', 'with', 'from', 'as', 'that', 'this', 'it',
  'has', 'have', 'had', 'its', 'their', 'they', 'he', 'she', 'his', 'her', 'after',
  'new', 'said', 'will', 'about', 'more', 'over', 'into', 'up', 'out', 'not', 'no',
]);

/**
 * Tokenizes, stems, and computes word frequency vector for a text
 */
export function getTermVector(text: string): Map<string, number> {
  const vector = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/);

  for (const raw of words) {
    if (!raw || raw.length < 2 || STOP_WORDS.has(raw)) continue;
    const w = natural.PorterStemmer.stem(raw);
    if (!w || STOP_WORDS.has(w)) continue;
    vector.set(w, (vector.get(w) ?? 0) + 1);
  }
  return vector;
}

/**
 * Calculates cosine similarity between two texts based on term frequencies.
 * Returns a value between 0.0 and 1.0.
 */
export function cosineSimilarity(textA: string, textB: string): number {
  const vecA = getTermVector(textA);
  const vecB = getTermVector(textB);

  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  for (const [term, freqA] of vecA.entries()) {
    const freqB = vecB.get(term);
    if (freqB !== undefined) {
      dotProduct += freqA * freqB;
    }
  }

  let magA = 0;
  for (const val of vecA.values()) {
    magA += val * val;
  }

  let magB = 0;
  for (const val of vecB.values()) {
    magB += val * val;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

interface ArticleForClustering {
  id: number;
  title_english: string | null;
  summary: string | null;
  breaking_score: number;
  source_country: string;
  source_id: number;
}

interface ActiveCluster {
  id: number;
  headline: string;
  combined_text: string;
}

/**
 * Assigns or groups an article into a cluster.
 */
export function clusterArticle(articleId: number): number {
  const db = getDb();

  const article = db.prepare(`
    SELECT a.id, a.title_english, a.summary, a.breaking_score, a.source_id, s.country as source_country
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.id = ?
  `).get(articleId) as ArticleForClustering | undefined;

  if (!article) throw new Error(`Article ${articleId} not found`);

  const articleText = `${article.title_english ?? ''} ${article.summary ?? ''}`.trim();
  if (!articleText) return 0;

  // Retrieve recent clusters (last 48h)
  const recentClusters = db.prepare(`
    SELECT c.id, c.headline,
           GROUP_CONCAT(COALESCE(a.title_english, '') || ' ' || COALESCE(a.summary, '')) as combined_text
    FROM clusters c
    JOIN articles a ON a.cluster_id = c.id
    WHERE c.last_updated_at >= datetime('now', '-2 days')
    GROUP BY c.id
  `).all() as ActiveCluster[];

  let bestClusterId: number | null = null;
  let highestSim = 0;

  for (const cluster of recentClusters) {
    const sim = cosineSimilarity(articleText, cluster.combined_text || cluster.headline);
    if (sim > highestSim && sim >= SIMILARITY_THRESHOLD) {
      highestSim = sim;
      bestClusterId = cluster.id;
    }
  }

  if (bestClusterId !== null) {
    // Add to existing cluster
    db.prepare('UPDATE articles SET cluster_id = ? WHERE id = ?').run(bestClusterId, articleId);

    // Recalculate cluster stats & representative headline from highest-score article (P7-02)
    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT a.source_id) as outlet_count,
        COUNT(DISTINCT s.country) as country_count,
        MAX(CASE WHEN a.breaking_score >= 75 THEN 1 ELSE 0 END) as is_breaking
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      WHERE a.cluster_id = ?
    `).get(bestClusterId) as { outlet_count: number; country_count: number; is_breaking: number };

    const topArticle = db.prepare(`
      SELECT title_english FROM articles
      WHERE cluster_id = ? AND title_english IS NOT NULL
      ORDER BY breaking_score DESC, published_at DESC, id ASC
      LIMIT 1
    `).get(bestClusterId) as { title_english: string } | undefined;

    const targetCluster = recentClusters.find((c) => c.id === bestClusterId);
    const repHeadline = topArticle?.title_english ?? targetCluster?.headline ?? 'News Event';

    db.prepare(`
      UPDATE clusters SET
        headline = ?,
        outlet_count = ?,
        country_count = ?,
        is_breaking = ?,
        last_updated_at = datetime('now')
      WHERE id = ?
    `).run(repHeadline, stats.outlet_count, stats.country_count, stats.is_breaking, bestClusterId);

    emitSseEvent('cluster_update', {
      cluster_id: bestClusterId,
      outlet_count: stats.outlet_count,
      country_count: stats.country_count,
      is_breaking: Boolean(stats.is_breaking),
      headline: repHeadline,
      article_id: articleId,
    });

    return bestClusterId;
  } else {
    // Create new cluster
    const isBreaking = (article.breaking_score ?? 0) >= 75 ? 1 : 0;
    const headline = article.title_english ?? 'News Event';

    const insertResult = db.prepare(`
      INSERT INTO clusters (headline, outlet_count, country_count, is_breaking)
      VALUES (?, 1, 1, ?)
    `).run(headline, isBreaking);

    const newClusterId = Number(insertResult.lastInsertRowid);
    db.prepare('UPDATE articles SET cluster_id = ? WHERE id = ?').run(newClusterId, articleId);

    emitSseEvent('cluster_update', {
      cluster_id: newClusterId,
      outlet_count: 1,
      country_count: 1,
      is_breaking: Boolean(isBreaking),
      headline,
      article_id: articleId,
    });

    return newClusterId;
  }
}

/**
 * Runs clustering pass on all processed articles missing a cluster_id
 */
export function runClusteringPass(): number {
  const db = getDb();
  const unclustered = db.prepare(`
    SELECT id FROM articles
    WHERE cluster_id IS NULL AND status = 'done'
    ORDER BY fetched_at ASC
    LIMIT 200
  `).all() as { id: number }[];

  let count = 0;
  for (const { id } of unclustered) {
    clusterArticle(id);
    count++;
  }
  if (count > 0) {
    console.log(`[Cluster] Clustered ${count} articles into story groups`);
  }
  return count;
}

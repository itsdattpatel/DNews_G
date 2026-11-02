/**
 * backend/src/alerts/detector.ts
 * Breaking news and multi-outlet cluster alert detector (P6-01, P6-02, P6-03).
 * Evaluates urgency scores against thresholds, applies cluster rules,
 * records alerts in the SQLite database, and pushes SSE events to clients.
 */
import { getDb } from '../db/db';
import { emitSseEvent } from '../routes/sse';
import { computeConfirmationStatus } from '../utils/confirmation';

export interface AlertRecord {
  id: number;
  type: 'breaking' | 'quota' | 'provider_switch' | 'error' | 'watchlist';
  message: string;
  cluster_id: number | null;
  fired_at: string;
  acknowledged: number;
}

/**
 * Checks individual articles for breaking news threshold.
 * Rule: article breaking_score >= alert_threshold (default: 75).
 */
export function checkBreakingAlerts(articleIds?: number[]): AlertRecord[] {
  const db = getDb();

  // 1. Read threshold from settings (fallback to 75)
  const settingRow = db
    .prepare("SELECT value FROM settings WHERE key = 'alert_threshold'")
    .get() as { value?: string } | undefined;
  const threshold = settingRow?.value ? parseInt(settingRow.value, 10) : 75;

  // 2. Query target articles
  let query = `
    SELECT id, title_english, title_original, summary, breaking_score, cluster_id
    FROM articles
    WHERE status = 'done' AND breaking_score >= ?
  `;
  const params: unknown[] = [threshold];

  if (articleIds && articleIds.length > 0) {
    query += ` AND id IN (${articleIds.map(() => '?').join(',')})`;
    params.push(...articleIds);
  }

  const candidates = db.prepare(query).all(...params) as Array<{
    id: number;
    title_english: string | null;
    title_original: string | null;
    summary: string | null;
    breaking_score: number;
    cluster_id: number | null;
  }>;

  const createdAlerts: AlertRecord[] = [];

  const checkExisting = db.prepare(`
    SELECT id FROM alerts
    WHERE type = 'breaking' AND message LIKE ?
    LIMIT 1
  `);

  const insertAlert = db.prepare(`
    INSERT INTO alerts (type, message, cluster_id, fired_at, acknowledged)
    VALUES ('breaking', ?, ?, datetime('now'), 0)
  `);

  for (const article of candidates) {
    const headline = article.title_english || article.title_original || 'Breaking Dispatch';
    const marker = `[Art#${article.id}]`;

    // Check if alert already logged for this article
    const existing = checkExisting.get(`%${marker}%`);
    if (existing) {
      continue;
    }

    const message = `🚨 BREAKING ${marker}: ${headline} (Score: ${article.breaking_score})`;
    const insertRes = insertAlert.run(message, article.cluster_id ?? null);
    const newId = Number(insertRes.lastInsertRowid);

    const record: AlertRecord = {
      id: newId,
      type: 'breaking',
      message,
      cluster_id: article.cluster_id ?? null,
      fired_at: new Date().toISOString(),
      acknowledged: 0,
    };

    const clusterRow = article.cluster_id
      ? (db.prepare('SELECT outlet_count, country_count FROM clusters WHERE id = ?').get(article.cluster_id) as { outlet_count?: number; country_count?: number } | undefined)
      : undefined;

    const confirmation = computeConfirmationStatus({
      outletCount: clusterRow?.outlet_count ?? 1,
      countryCount: clusterRow?.country_count ?? 1,
      breakingScore: article.breaking_score,
    });

    createdAlerts.push(record);

    // Push real-time SSE event
    emitSseEvent('alert', {
      id: newId,
      type: 'breaking',
      message,
      article_id: article.id,
      cluster_id: article.cluster_id ?? null,
      breaking_score: article.breaking_score,
      fired_at: record.fired_at,
      confirmation,
    });
  }

  return createdAlerts;
}

/**
 * Checks cluster rule: >= 3 outlets AND >= 2 countries within 30 minutes.
 * Rule marks cluster.is_breaking = 1, logs to alerts table, and fires SSE.
 */
export function checkClusterAlerts(clusterIds?: number[]): AlertRecord[] {
  const db = getDb();

  let query = 'SELECT id, headline, first_seen_at, last_updated_at FROM clusters';
  const params: unknown[] = [];

  if (clusterIds && clusterIds.length > 0) {
    query += ` WHERE id IN (${clusterIds.map(() => '?').join(',')})`;
    params.push(...clusterIds);
  }

  const clusters = db.prepare(query).all(...params) as Array<{
    id: number;
    headline: string;
    first_seen_at: string;
    last_updated_at: string;
  }>;

  const createdAlerts: AlertRecord[] = [];

  const getArticlesForCluster = db.prepare(`
    SELECT a.id, a.published_at, a.fetched_at, s.name AS source_name, s.country
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.cluster_id = ?
  `);

  const checkExistingAlert = db.prepare(`
    SELECT id FROM alerts WHERE cluster_id = ? AND type = 'breaking' AND message LIKE '%BREAKING CLUSTER%' LIMIT 1
  `);

  const updateClusterBreaking = db.prepare(`
    UPDATE clusters SET is_breaking = 1 WHERE id = ?
  `);

  const insertAlert = db.prepare(`
    INSERT INTO alerts (type, message, cluster_id, fired_at, acknowledged)
    VALUES ('breaking', ?, ?, datetime('now'), 0)
  `);

  for (const cluster of clusters) {
    const articles = getArticlesForCluster.all(cluster.id) as Array<{
      id: number;
      published_at: string | null;
      fetched_at: string;
      source_name: string;
      country: string;
    }>;

    if (articles.length < 3) continue;

    const uniqueOutlets = new Set(articles.map((a) => a.source_name));
    const uniqueCountries = new Set(articles.map((a) => a.country));

    if (uniqueOutlets.size < 3 || uniqueCountries.size < 2) continue;

    // Check 30-minute span window
    const timestamps = articles
      .map((a) => {
        const timeStr = a.published_at || a.fetched_at;
        const ms = new Date(timeStr).getTime();
        return isNaN(ms) ? null : ms;
      })
      .filter((t): t is number => t !== null);

    let within30Min = true;
    if (timestamps.length >= 2) {
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const spanMinutes = (maxTime - minTime) / (1000 * 60);
      within30Min = spanMinutes <= 30;
    }

    if (!within30Min) continue;

    // Mark cluster as breaking in DB
    updateClusterBreaking.run(cluster.id);

    // Check if alert already logged for this cluster
    const existing = checkExistingAlert.get(cluster.id);
    if (existing) continue;

    const message = `🚨 BREAKING CLUSTER: ${cluster.headline} — ${uniqueOutlets.size} outlets, ${uniqueCountries.size} countries`;
    const insertRes = insertAlert.run(message, cluster.id);
    const newId = Number(insertRes.lastInsertRowid);

    const record: AlertRecord = {
      id: newId,
      type: 'breaking',
      message,
      cluster_id: cluster.id,
      fired_at: new Date().toISOString(),
      acknowledged: 0,
    };

    const confirmation = computeConfirmationStatus({
      outletCount: uniqueOutlets.size,
      countryCount: uniqueCountries.size,
      isBreakingCluster: true,
    });

    createdAlerts.push(record);

    // Push real-time SSE event
    emitSseEvent('alert', {
      id: newId,
      type: 'breaking',
      message,
      cluster_id: cluster.id,
      outlet_count: uniqueOutlets.size,
      country_count: uniqueCountries.size,
      fired_at: record.fired_at,
      confirmation,
    });
  }

  return createdAlerts;
}

/**
 * Orchestrator called after AI enrichment and clustering pass.
 * Detects both individual breaking articles and emerging breaking clusters.
 */
export function detectAlerts(articleIds?: number[]): AlertRecord[] {
  const db = getDb();
  const articleAlerts = checkBreakingAlerts(articleIds);

  // Collect associated cluster IDs
  let clusterIds: number[] = [];
  if (articleIds && articleIds.length > 0) {
    const rows = db
      .prepare(
        `SELECT DISTINCT cluster_id FROM articles WHERE id IN (${articleIds.map(() => '?').join(',')}) AND cluster_id IS NOT NULL`,
      )
      .all(...articleIds) as Array<{ cluster_id: number }>;
    clusterIds = rows.map((r) => r.cluster_id);
  }

  const clusterAlerts = checkClusterAlerts(clusterIds.length > 0 ? clusterIds : undefined);

  return [...articleAlerts, ...clusterAlerts];
}

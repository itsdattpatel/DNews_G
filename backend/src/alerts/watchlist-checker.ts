/**
 * backend/src/alerts/watchlist-checker.ts
 * Real-time Watchlist Checker (P8-02).
 * Evaluates newly enriched news articles against active topic monitors,
 * logs matches into the alerts table, and broadcasts SSE notifications.
 */
import { getDb } from '../db/db';
import { emitSseEvent } from '../routes/sse';
import type { AlertRecord } from './detector';

export interface WatchlistRow {
  id: number;
  topic: string;
  keywords: string; // JSON string
  priority: 'low' | 'normal' | 'high';
  enabled: number;
  created_at: string;
}

export function checkWatchlistMatches(articleIds?: number[]): AlertRecord[] {
  const db = getDb();

  // 1. Fetch enabled monitors
  const monitors = db
    .prepare('SELECT id, topic, keywords, priority, enabled, created_at FROM watchlist WHERE enabled = 1')
    .all() as WatchlistRow[];

  if (monitors.length === 0) return [];

  // 2. Fetch target articles
  let artQuery = `
    SELECT id, title_english, title_original, summary, cluster_id
    FROM articles
    WHERE status = 'done'
  `;
  const params: unknown[] = [];

  if (articleIds && articleIds.length > 0) {
    artQuery += ` AND id IN (${articleIds.map(() => '?').join(',')})`;
    params.push(...articleIds);
  }

  const articles = db.prepare(artQuery).all(...params) as Array<{
    id: number;
    title_english: string | null;
    title_original: string | null;
    summary: string | null;
    cluster_id: number | null;
  }>;

  if (articles.length === 0) return [];

  // 3. Fetch keywords for these articles
  const artIdList = articles.map((a) => a.id);
  const kwRows = db
    .prepare(
      `SELECT article_id, keyword FROM keywords WHERE article_id IN (${artIdList.map(() => '?').join(',')})`,
    )
    .all(...artIdList) as Array<{ article_id: number; keyword: string }>;

  const keywordsByArt = new Map<number, string[]>();
  for (const row of kwRows) {
    if (!keywordsByArt.has(row.article_id)) {
      keywordsByArt.set(row.article_id, []);
    }
    keywordsByArt.get(row.article_id)!.push(row.keyword.toLowerCase());
  }

  const createdAlerts: AlertRecord[] = [];

  const checkExistingAlert = db.prepare(`
    SELECT id FROM alerts
    WHERE type = 'watchlist' AND message LIKE ? AND message LIKE ?
    LIMIT 1
  `);

  const insertAlert = db.prepare(`
    INSERT INTO alerts (type, message, cluster_id, fired_at, acknowledged)
    VALUES ('watchlist', ?, ?, datetime('now'), 0)
  `);

  for (const article of articles) {
    const headline = article.title_english || article.title_original || 'News Story';
    const combinedSearchText = `${headline} ${article.summary || ''}`.toLowerCase();
    const articleKws = keywordsByArt.get(article.id) || [];

    for (const monitor of monitors) {
      let keywords: string[] = [];
      try {
        keywords = JSON.parse(monitor.keywords) as string[];
      } catch {
        keywords = monitor.topic.split(/\s+/);
      }

      const match = keywords.some((kw) => {
        const cleanKw = kw.trim().toLowerCase();
        if (!cleanKw) return false;
        return combinedSearchText.includes(cleanKw) || articleKws.includes(cleanKw);
      });

      if (!match) continue;

      const artTag = `[Art#${article.id}]`;
      const monTag = `[Watchlist#${monitor.id}]`;

      // Prevent duplicate alert
      const existing = checkExistingAlert.get(`%${artTag}%`, `%${monTag}%`);
      if (existing) continue;

      const message = `🎯 WATCHLIST ${artTag}${monTag} (${monitor.priority.toUpperCase()}): "${monitor.topic}" matched in "${headline}"`;
      const insertRes = insertAlert.run(message, article.cluster_id ?? null);
      const newId = Number(insertRes.lastInsertRowid);

      const record: AlertRecord = {
        id: newId,
        type: 'watchlist',
        message,
        cluster_id: article.cluster_id ?? null,
        fired_at: new Date().toISOString(),
        acknowledged: 0,
      };

      createdAlerts.push(record);

      emitSseEvent('alert', {
        id: newId,
        type: 'watchlist',
        topic: monitor.topic,
        priority: monitor.priority,
        message,
        article_id: article.id,
        cluster_id: article.cluster_id ?? null,
        fired_at: record.fired_at,
      });
    }
  }

  return createdAlerts;
}


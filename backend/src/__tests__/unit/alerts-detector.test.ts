/**
 * backend/src/__tests__/unit/alerts-detector.test.ts
 * Unit tests for Breaking News & Cluster Alert Detector (P6-01, P6-02, P6-03).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Mock DB module before importing detector
let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
}));

// Mock SSE emission
const mockEmitSseEvent = vi.fn();
vi.mock('../../routes/sse', () => ({
  emitSseEvent: (...args: unknown[]) => mockEmitSseEvent(...args),
}));

import {
  checkBreakingAlerts,
  checkClusterAlerts,
  detectAlerts,
} from '../../alerts/detector';

function setupSchema(db: Database.Database) {
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
}

describe('Breaking Alerts & Cluster Detector (P6-01, P6-02, P6-03)', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    mockEmitSseEvent.mockClear();

    // Populate sources
    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type) VALUES
      (1, 'source_in', 'The Hindu', 'India', 'https://thehindu.com/rss', 'rss'),
      (2, 'source_us', 'Reuters', 'United States', 'https://reuters.com/rss', 'rss'),
      (3, 'source_jp', 'NHK World', 'Japan', 'https://nhk.or.jp/rss', 'rss')
    `).run();
  });

  afterEach(() => {
    testDb.close();
  });

  it('triggers a breaking alert when breaking_score >= threshold (P6-01, P6-03)', () => {
    // Default threshold is 75 in settings table
    const articleInsert = testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score)
      VALUES (?, ?, ?, ?, 'done', ?)
    `);

    const res1 = articleInsert.run(1, 'https://test.com/high', 'Massive Quake Strikes', 'A major earthquake occurred.', 85);
    const res2 = articleInsert.run(2, 'https://test.com/low', 'Routine City Meeting', 'City council met today.', 40);

    const highArticleId = Number(res1.lastInsertRowid);
    const lowArticleId = Number(res2.lastInsertRowid);

    const generatedAlerts = checkBreakingAlerts([highArticleId, lowArticleId]);

    expect(generatedAlerts).toHaveLength(1);
    expect(generatedAlerts[0]?.type).toBe('breaking');
    expect(generatedAlerts[0]?.message).toContain('Massive Quake Strikes');
    expect(generatedAlerts[0]?.message).toContain('85');

    // Verify DB insertion
    const saved = testDb.prepare('SELECT * FROM alerts WHERE type = ?').all('breaking') as Array<{
      id: number;
      type: string;
      message: string;
      acknowledged: number;
    }>;
    expect(saved).toHaveLength(1);
    expect(saved[0]?.message).toContain('Massive Quake Strikes');
    expect(saved[0]?.acknowledged).toBe(0);

    // Verify SSE emitted
    expect(mockEmitSseEvent).toHaveBeenCalledWith('alert', expect.objectContaining({
      type: 'breaking',
      article_id: highArticleId,
      breaking_score: 85,
    }));
  });

  it('does not re-alert for an article that already has an alert', () => {
    const articleInsert = testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score)
      VALUES (1, 'https://test.com/high2', 'Wildfire Outbreak', 'Wildfire spreads rapidly.', 'done', 90)
    `);
    const id = Number(articleInsert.run().lastInsertRowid);

    const firstRun = checkBreakingAlerts([id]);
    expect(firstRun).toHaveLength(1);

    const secondRun = checkBreakingAlerts([id]);
    expect(secondRun).toHaveLength(0);

    const alertsCount = testDb.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    expect(alertsCount.count).toBe(1);
  });

  it('triggers cluster breaking alert when >= 3 outlets, >= 2 countries within 30 min (P6-02, P6-03)', () => {
    // Add 2 Indian sources + 1 US source = 3 outlets, 2 countries
    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type) VALUES
      (4, 'source_in_2', 'Times of India', 'India', 'https://timesofindia.indiatimes.com/rss', 'rss')
    `).run();

    // Create a cluster
    const clusterRes = testDb.prepare(`
      INSERT INTO clusters (headline, first_seen_at, last_updated_at, outlet_count, country_count)
      VALUES ('International Summit Breakthrough', datetime('now', '-10 minutes'), datetime('now'), 3, 2)
    `).run();
    const clusterId = Number(clusterRes.lastInsertRowid);

    // Insert 3 articles from 3 outlets and 2 distinct countries within 15 minutes of each other
    testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, status, cluster_id, published_at)
      VALUES
      (1, 'https://in.com/summit', 'Summit Concludes', 'done', ?, datetime('now', '-15 minutes')),
      (4, 'https://in2.com/summit', 'World Leaders Agree', 'done', ?, datetime('now', '-10 minutes')),
      (2, 'https://us.com/summit', 'Historic Accord Signed', 'done', ?, datetime('now', '-5 minutes'))
    `).run(clusterId, clusterId, clusterId);

    const clusterAlerts = checkClusterAlerts([clusterId]);

    expect(clusterAlerts).toHaveLength(1);
    expect(clusterAlerts[0]?.type).toBe('breaking');
    expect(clusterAlerts[0]?.cluster_id).toBe(clusterId);
    expect(clusterAlerts[0]?.message).toContain('International Summit Breakthrough');
    expect(clusterAlerts[0]?.message).toContain('3 outlets');
    expect(clusterAlerts[0]?.message).toContain('2 countries');

    // Verify cluster updated is_breaking = 1
    const cluster = testDb.prepare('SELECT is_breaking FROM clusters WHERE id = ?').get(clusterId) as { is_breaking: number };
    expect(cluster.is_breaking).toBe(1);

    // Verify SSE emitted
    expect(mockEmitSseEvent).toHaveBeenCalledWith('alert', expect.objectContaining({
      type: 'breaking',
      cluster_id: clusterId,
    }));
  });

  it('does not trigger cluster alert if criteria not met (< 3 outlets or < 2 countries)', () => {
    const clusterRes = testDb.prepare(`
      INSERT INTO clusters (headline, first_seen_at, last_updated_at, outlet_count, country_count)
      VALUES ('Local Festival', datetime('now'), datetime('now'), 2, 1)
    `).run();
    const clusterId = Number(clusterRes.lastInsertRowid);

    // Only 2 outlets from 1 country (India)
    testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, status, cluster_id, published_at)
      VALUES
      (1, 'https://in1.com/fest', 'Local Fest', 'done', ?, datetime('now', '-5 minutes')),
      (1, 'https://in2.com/fest', 'Fest Continues', 'done', ?, datetime('now', '-2 minutes'))
    `).run(clusterId, clusterId);

    const clusterAlerts = checkClusterAlerts([clusterId]);
    expect(clusterAlerts).toHaveLength(0);
  });

  it('detectAlerts orchestrates both article and cluster checks', () => {
    const clusterRes = testDb.prepare(`
      INSERT INTO clusters (headline, first_seen_at, last_updated_at, outlet_count, country_count)
      VALUES ('Global Cyber Event', datetime('now', '-10 minutes'), datetime('now'), 3, 3)
    `).run();
    const clusterId = Number(clusterRes.lastInsertRowid);

    const a1 = Number(testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, status, breaking_score, cluster_id, published_at)
      VALUES (1, 'https://in.com/cyber', 'Grid Disrupted', 'done', 88, ?, datetime('now', '-10 minutes'))
    `).run(clusterId).lastInsertRowid);

    const a2 = Number(testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, status, breaking_score, cluster_id, published_at)
      VALUES (2, 'https://us.com/cyber', 'Outages Reported', 'done', 60, ?, datetime('now', '-8 minutes'))
    `).run(clusterId).lastInsertRowid);

    const a3 = Number(testDb.prepare(`
      INSERT INTO articles (source_id, url, title_english, status, breaking_score, cluster_id, published_at)
      VALUES (3, 'https://jp.com/cyber', 'Defense Alert', 'done', 50, ?, datetime('now', '-2 minutes'))
    `).run(clusterId).lastInsertRowid);

    const alerts = detectAlerts([a1, a2, a3]);

    // Should generate article breaking alert for a1 (score 88) and cluster breaking alert for the 3-country story
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    const breakingArticle = alerts.find(a => a.message.includes('Grid Disrupted'));
    expect(breakingArticle).toBeDefined();

    const clusterAlert = alerts.find(a => a.cluster_id === clusterId && a.message.includes('Global Cyber Event'));
    expect(clusterAlert).toBeDefined();
  });
});

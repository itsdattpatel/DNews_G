import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  applyRuleBasedCategorization,
  calculateDeterministicBreakingScore,
  processPlainModeBatch,
  getUnenrichedCount,
  type ArticleRow,
} from '../../pipeline/enricher';
import * as dbModule from '../../db/db';

describe('Plain Mode Engine & Deterministic Rules (PRD A Category 3)', () => {
  describe('Rule-Based Categorization', () => {
    it('accurately categorizes political topics without AI', () => {
      const cats = applyRuleBasedCategorization(
        'Prime Minister calls snap election amid parliament vote',
        'Government officials debate legislative changes in senate.'
      );
      expect(cats).toContain('Politics');
    });

    it('accurately categorizes business & financial topics without AI', () => {
      const cats = applyRuleBasedCategorization(
        'Federal Reserve raises interest rates to combat inflation',
        'Stock market indexes dip as investors assess GDP growth and corporate earnings.'
      );
      expect(cats).toContain('Business');
    });

    it('accurately categorizes technology & AI topics without AI', () => {
      const cats = applyRuleBasedCategorization(
        'New semiconductor chip architecture accelerates neural algorithms',
        'Cybersecurity researchers analyze novel software vulnerabilities in mobile devices.'
      );
      expect(cats).toContain('Tech');
    });

    it('accurately categorizes wildlife & animal topics without AI', () => {
      const cats = applyRuleBasedCategorization(
        'Rare Bengal tiger spotted in national reserve habitat',
        'Conservationists celebrate successful breeding program for endangered species.'
      );
      expect(cats).toContain('Animals');
    });

    it('falls back to World when no specific lexical patterns match', () => {
      const cats = applyRuleBasedCategorization('General Morning Dispatch', 'A regular summary of daily dispatches.');
      expect(cats).toEqual(['World']);
    });
  });

  describe('Deterministic Breaking Score', () => {
    it('assigns high breaking score for urgent crisis keywords', () => {
      const score = calculateDeterministicBreakingScore('URGENT: Earthquake triggers tsunami alert across coast', 'Emergency responders deploy.');
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('assigns 90 breaking score when cluster crosses >= 3 outlets and >= 2 countries', () => {
      const score = calculateDeterministicBreakingScore('Major summit concludes', 'Delegates agree on treaty.', 4, 3);
      expect(score).toBe(90);
    });

    it('assigns calm baseline score for regular news', () => {
      const score = calculateDeterministicBreakingScore('Annual flower show opens downtown', 'Visitors enjoy seasonal blooms.');
      expect(score).toBe(15);
    });
  });

  describe('Plain Mode Batch Processing (Zero AI)', () => {
    let testDb: Database.Database;

    beforeEach(() => {
      testDb = new Database(':memory:');
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY,
          slug TEXT UNIQUE,
          name TEXT,
          country TEXT,
          url TEXT,
          fetch_type TEXT,
          enabled INTEGER DEFAULT 1,
          last_fetched_at TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER REFERENCES sources(id),
          url TEXT UNIQUE,
          title_original TEXT,
          title_english TEXT,
          body_original TEXT,
          body_english TEXT,
          summary TEXT,
          language_detected TEXT,
          published_at TEXT,
          fetched_at TEXT DEFAULT (datetime('now')),
          ai_processed_at TEXT,
          status TEXT DEFAULT 'pending',
          breaking_score INTEGER DEFAULT 0,
          cluster_id INTEGER,
          bookmarked INTEGER DEFAULT 0,
          anchor_phrases TEXT DEFAULT NULL,
          ingested_at TEXT,
          is_catchup INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS keywords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER,
          keyword TEXT,
          UNIQUE(article_id, keyword)
        );
        CREATE TABLE IF NOT EXISTS article_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER,
          category TEXT,
          UNIQUE(article_id, category)
        );
        CREATE TABLE IF NOT EXISTS clusters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        INSERT INTO sources (id, slug, name, country, url, fetch_type)
        VALUES (1, 'bbc', 'BBC News', 'UK', 'https://bbc.com', 'rss');
      `);

      vi.spyOn(dbModule, 'getDb').mockReturnValue(testDb as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      testDb.close();
    });

    it('processes batch with zero AI calls, leaving summary NULL and status done', () => {
      testDb.prepare(`
        INSERT INTO articles (id, source_id, url, title_original, body_original, language_detected, status)
        VALUES (101, 1, 'https://test.com/art1', 'Parliament passes climate legislation', 'Lawmakers voted today on carbon reduction.', 'en', 'pending')
      `).run();

      const batch: ArticleRow[] = [{
        id: 101,
        source_id: 1,
        url: 'https://test.com/art1',
        title_original: 'Parliament passes climate legislation',
        title_english: null,
        body_original: 'Lawmakers voted today on carbon reduction.',
        body_english: null,
        summary: null,
        language_detected: 'en',
        published_at: null,
        fetched_at: '2026-11-02T10:00:00Z',
        ai_processed_at: null,
        status: 'pending',
        breaking_score: 0,
        cluster_id: null,
        bookmarked: 0,
        anchor_phrases: null,
        ingested_at: '2026-11-02T10:00:00Z',
        is_catchup: 0,
        created_at: '2026-11-02T10:00:00Z',
        source_country: 'UK',
        source_name: 'BBC News',
      }];

      processPlainModeBatch(batch);

      const updated = testDb.prepare('SELECT * FROM articles WHERE id = 101').get() as any;
      expect(updated.status).toBe('done');
      expect(updated.summary).toBeNull();
      expect(updated.anchor_phrases).toBeNull();
      expect(updated.ai_processed_at).toBeNull();
      expect(updated.title_english).toBe('Parliament passes climate legislation');
      expect(updated.body_english).toBe('Lawmakers voted today on carbon reduction.');

      // Check categories
      const categories = testDb.prepare('SELECT category FROM article_categories WHERE article_id = 101').all() as any[];
      const catList = categories.map((c) => c.category);
      expect(catList).toContain('Politics');
      expect(catList).toContain('Environment');

      // Check unenriched count
      expect(getUnenrichedCount()).toBe(1);
    });
  });
});

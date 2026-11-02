/**
 * backend/src/__tests__/unit/two-pass-ai.test.ts
 * Unit tests for Two-Pass AI Processing & Quota Telemetry (PRD A Category 10).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb, getSetting, setSetting } from '../../db/db';
import { buildPass1Prompt, type Pass1Input } from '../../ai/prompts';
import { parsePass1Response } from '../../ai/schema';
import {
  processTwoPassBatch,
  enrichArticlePass2,
  type ArticleRow,
} from '../../pipeline/enricher';
import * as aiRouter from '../../ai/router';

describe('Category 10: Two-Pass AI Processing & Quota Telemetry', () => {
  const testDataDir = path.resolve('backend/data_test_two_pass');

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['DATA_DIR'] = testDataDir;
    process.env['DB_PATH'] = path.join(testDataDir, 'news.sqlite');

    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {}
    }

    const db = getDb();
    try {
      db.prepare('DELETE FROM articles').run();
      db.prepare('DELETE FROM article_categories').run();
      db.prepare('DELETE FROM keywords').run();
      db.prepare(`
        UPDATE two_pass_stats SET
          pass1_count = 0,
          pass2_count = 0,
          pass2_skipped_count = 0,
          estimated_tokens_saved = 0,
          last_updated_at = datetime('now')
        WHERE id = 1
      `).run();
    } catch {}

    db.prepare(`
      INSERT OR IGNORE INTO sources (id, slug, name, country, url, fetch_type, enabled)
      VALUES (1, 'reuters', 'Reuters', 'USA', 'https://reuters.com/rss', 'rss', 1)
    `).run();

    setSetting('two_pass_ai_enabled', '1');
    setSetting('pass2_threshold', '75');
    setSetting('plain_mode_enabled', '0');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    closeDb();
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('Pass 1 Prompts & Schema Parsing', () => {
    it('constructs minimal token prompt for batched triage', () => {
      const inputs: Pass1Input[] = [
        {
          article_index: 0,
          title_original: 'Earthquake strikes coast',
          body_original: 'A major tremor occurred today near the coastal faultline.',
          language: 'en',
          source_country: 'Japan',
          source_name: 'NHK',
        },
      ];

      const prompt = buildPass1Prompt(inputs);
      expect(prompt).toContain('Triage the following 1 news articles');
      expect(prompt).toContain('breaking_score');
      expect(prompt).toContain('categories');
      expect(prompt).not.toContain('anchor_phrases');
      expect(prompt).not.toContain('species_tags');
    });

    it('validates and parses valid Pass 1 JSON array response', () => {
      const rawJson = JSON.stringify([
        {
          article_index: 0,
          title_english: 'Earthquake Strikes Off Coast of Japan',
          breaking_score: 85,
          categories: ['World', 'Environment'],
        },
      ]);

      const result = parsePass1Response(rawJson, 1);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.title_english).toBe('Earthquake Strikes Off Coast of Japan');
      expect(result.results[0]!.breaking_score).toBe(85);
      expect(result.results[0]!.categories).toEqual(['World', 'Environment']);
    });

    it('handles markdown code fences and cleans response cleanly', () => {
      const rawText = "```json\n" + JSON.stringify([
        {
          article_index: 0,
          title_english: 'New Semiconductor Plant Opens',
          breaking_score: 45,
          categories: ['Tech', 'Business'],
        },
      ]) + "\n```";

      const result = parsePass1Response(rawText, 1);
      expect(result.errors).toHaveLength(0);
      expect(result.results[0]!.breaking_score).toBe(45);
      expect(result.results[0]!.categories).toEqual(['Tech', 'Business']);
    });

    it('gracefully reports errors on invalid JSON', () => {
      const result = parsePass1Response('MALFORMED_OUTPUT', 1);
      expect(result.results).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Two-Pass Batch Execution Engine', () => {
    it('saves Pass 1 only for articles below urgency threshold and increments saved token telemetry', async () => {
      const db = getDb();
      db.prepare(`
        INSERT INTO articles (id, source_id, url, title_original, body_original, status)
        VALUES (10, 1, 'https://reuters.com/art10', 'Local library hosts annual book sale', 'The community gathered for the annual weekend event.', 'pending')
      `).run();

      const batch: ArticleRow[] = [
        {
          id: 10,
          source_id: 1,
          url: 'https://reuters.com/art10',
          title_original: 'Local library hosts annual book sale',
          title_english: null,
          body_original: 'The community gathered for the annual weekend event.',
          body_english: null,
          summary: null,
          language_detected: 'en',
          published_at: '2026-11-02T10:00:00Z',
          fetched_at: '2026-11-02T10:00:00Z',
          ai_processed_at: null,
          status: 'pending',
          breaking_score: 0,
          cluster_id: null,
          bookmarked: 0,
          created_at: '2026-11-02T10:00:00Z',
          source_country: 'USA',
          source_name: 'Reuters',
        },
      ];

      vi.spyOn(aiRouter, 'routeAIRequest').mockResolvedValueOnce({
        text: JSON.stringify([
          {
            article_index: 0,
            title_english: 'Local Library Hosts Annual Book Sale',
            breaking_score: 30, // below 75 threshold
            categories: ['Entertainment'],
          },
        ]),
        provider: 'gemini',
        model: 'gemini-1.5-flash',
      });

      await processTwoPassBatch(batch);

      const row = db.prepare('SELECT * FROM articles WHERE id = 10').get() as any;
      expect(row.status).toBe('done');
      expect(row.pass1_completed_at).not.toBeNull();
      expect(row.pass2_completed_at).toBeNull();
      expect(row.summary).toBeNull(); // Pass 2 deferred!
      expect(row.breaking_score).toBe(30);

      const stats = db.prepare('SELECT * FROM two_pass_stats WHERE id = 1').get() as any;
      expect(stats.pass1_count).toBe(1);
      expect(stats.pass2_count).toBe(0);
      expect(stats.pass2_skipped_count).toBe(1);
      expect(stats.estimated_tokens_saved).toBe(740);
    });

    it('automatically triggers Pass 2 for articles meeting or exceeding threshold', async () => {
      const db = getDb();
      db.prepare(`
        INSERT INTO articles (id, source_id, url, title_original, body_original, status)
        VALUES (20, 1, 'https://reuters.com/art20', 'Massive earthquake triggers tsunami warning', 'A magnitude 8.1 earthquake struck the coast triggering urgent tsunami evacuations across the region.', 'pending')
      `).run();

      const batch: ArticleRow[] = [
        {
          id: 20,
          source_id: 1,
          url: 'https://reuters.com/art20',
          title_original: 'Massive earthquake triggers tsunami warning',
          title_english: null,
          body_original: 'A magnitude 8.1 earthquake struck the coast triggering urgent tsunami evacuations across the region.',
          body_english: null,
          summary: null,
          language_detected: 'en',
          published_at: '2026-11-02T10:00:00Z',
          fetched_at: '2026-11-02T10:00:00Z',
          ai_processed_at: null,
          status: 'pending',
          breaking_score: 0,
          cluster_id: null,
          bookmarked: 0,
          created_at: '2026-11-02T10:00:00Z',
          source_country: 'USA',
          source_name: 'Reuters',
        },
      ];

      // Pass 1 AI response
      vi.spyOn(aiRouter, 'routeAIRequest')
        .mockResolvedValueOnce({
          text: JSON.stringify([
            {
              article_index: 0,
              title_english: 'Massive Earthquake Triggers Tsunami Warning',
              breaking_score: 92, // >= 75 threshold
              categories: ['World', 'Environment'],
            },
          ]),
          provider: 'gemini',
          model: 'gemini-1.5-flash',
        })
        // Pass 2 AI response
        .mockResolvedValueOnce({
          text: JSON.stringify([
            {
              article_index: 0,
              title_english: 'Massive Earthquake Triggers Tsunami Warning',
              body_english: 'A magnitude 8.1 earthquake struck the coast triggering urgent tsunami evacuations across the region.',
              summary: 'A powerful magnitude 8.1 earthquake struck coastal zones today. Authorities have issued urgent tsunami evacuations. Emergency crews are monitoring coastal sea levels.',
              keywords: ['earthquake', 'tsunami', 'evacuation'],
              categories: ['World', 'Environment'],
              breaking_score: 92,
              species_tags: [],
              location_tags: ['Pacific Coast'],
              anchor_phrases: [
                {
                  phrase: 'magnitude 8.1 earthquake struck',
                  sentence_index: 0,
                },
              ],
            },
          ]),
          provider: 'gemini',
          model: 'gemini-1.5-flash',
        });

      await processTwoPassBatch(batch);

      const row = db.prepare('SELECT * FROM articles WHERE id = 20').get() as any;
      expect(row.status).toBe('done');
      expect(row.pass1_completed_at).not.toBeNull();
      expect(row.pass2_completed_at).not.toBeNull();
      expect(row.summary).toContain('powerful magnitude 8.1 earthquake');
      expect(row.anchor_phrases).toContain('magnitude 8.1 earthquake struck');

      const stats = db.prepare('SELECT * FROM two_pass_stats WHERE id = 1').get() as any;
      expect(stats.pass1_count).toBe(1);
      expect(stats.pass2_count).toBe(1);
      expect(stats.pass2_skipped_count).toBe(0);
    });
  });

  describe('On-Demand Pass 2 Enrichment (enrichArticlePass2)', () => {
    it('enriches an unsummarized article on demand and adjusts quota saved telemetry', async () => {
      const db = getDb();
      // Seed an article that only finished Pass 1
      db.prepare(`
        INSERT INTO articles (
          id, source_id, url, title_original, title_english, body_original, body_english,
          summary, status, breaking_score, pass1_completed_at, pass2_completed_at
        ) VALUES (
          30, 1, 'https://reuters.com/art30', 'Tech consortium unveils open quantum standard',
          'Tech Consortium Unveils Open Quantum Standard',
          'A group of leading institutions unveiled an open architectural standard for quantum computing systems today.',
          'A group of leading institutions unveiled an open architectural standard for quantum computing systems today.',
          NULL, 'done', 60, '2026-11-02T10:00:00Z', NULL
        )
      `).run();

      // Seed stats table as having 1 skipped article
      db.prepare(`
        UPDATE two_pass_stats SET
          pass1_count = 1,
          pass2_count = 0,
          pass2_skipped_count = 1,
          estimated_tokens_saved = 740
        WHERE id = 1
      `).run();

      vi.spyOn(aiRouter, 'routeAIRequest').mockResolvedValueOnce({
        text: JSON.stringify([
          {
            article_index: 0,
            title_english: 'Tech Consortium Unveils Open Quantum Standard',
            body_english: 'A group of leading institutions unveiled an open architectural standard for quantum computing systems today.',
            summary: 'A technological consortium has established open specifications for quantum architectures. The framework is intended to enhance cross-platform research collaboration.',
            keywords: ['quantum', 'computing', 'standard'],
            categories: ['Tech', 'Science'],
            breaking_score: 60,
            species_tags: [],
            location_tags: [],
            anchor_phrases: [
              {
                phrase: 'unveiled an open architectural standard',
                sentence_index: 0,
              },
            ],
          },
        ]),
        provider: 'gemini',
        model: 'gemini-1.5-flash',
      });

      await enrichArticlePass2(30);

      const row = db.prepare('SELECT * FROM articles WHERE id = 30').get() as any;
      expect(row.summary).toContain('technological consortium has established');
      expect(row.pass2_completed_at).not.toBeNull();
      expect(row.anchor_phrases).toContain('unveiled an open architectural standard');

      // Telemetry properly adjusted: 1 article was upgraded from skipped to full Pass 2
      const stats = db.prepare('SELECT * FROM two_pass_stats WHERE id = 1').get() as any;
      expect(stats.pass1_count).toBe(1);
      expect(stats.pass2_count).toBe(1);
      expect(stats.pass2_skipped_count).toBe(0);
      expect(stats.estimated_tokens_saved).toBe(0);
    });
  });

  describe('REST API Integration', () => {
    it('POST /api/articles/:id/enrich-pass2 returns the enriched article', async () => {
      const db = getDb();
      db.prepare(`
        INSERT INTO articles (
          id, source_id, url, title_original, title_english, body_original, body_english,
          summary, status, breaking_score, pass1_completed_at, pass2_completed_at
        ) VALUES (
          40, 1, 'https://reuters.com/art40', 'Diplomats reach tentative trade framework',
          'Diplomats Reach Tentative Trade Framework',
          'International negotiators agreed on tariff limits after extensive multilateral talks.',
          'International negotiators agreed on tariff limits after extensive multilateral talks.',
          NULL, 'done', 55, '2026-11-02T10:00:00Z', NULL
        )
      `).run();

      const app = createApp();
      const res = await request(app).post('/api/articles/40/enrich-pass2');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(40);
      expect(res.body.summary).not.toBeNull();
      expect(res.body.pass2_completed_at).not.toBeNull();
    });

    it('GET /api/settings/two-pass-telemetry exposes accurate metrics', async () => {
      const db = getDb();
      db.prepare(`
        UPDATE two_pass_stats SET
          pass1_count = 150,
          pass2_count = 45,
          pass2_skipped_count = 105,
          estimated_tokens_saved = 77700
        WHERE id = 1
      `).run();

      const app = createApp();
      const res = await request(app).get('/api/settings/two-pass-telemetry');

      expect(res.status).toBe(200);
      expect(res.body.two_pass_ai_enabled).toBe(true);
      expect(res.body.pass2_threshold).toBe(75);
      expect(res.body.pass1_count).toBe(150);
      expect(res.body.pass2_count).toBe(45);
      expect(res.body.pass2_skipped_count).toBe(105);
      expect(res.body.estimated_tokens_saved).toBe(77700);
    });

    it('PATCH /api/settings updates two_pass_ai_enabled and pass2_threshold', async () => {
      const app = createApp();
      const res = await request(app)
        .patch('/api/settings')
        .send({
          two_pass_ai_enabled: false,
          pass2_threshold: 80,
        });

      expect(res.status).toBe(200);
      expect(res.body.two_pass_ai_enabled).toBe(false);
      expect(res.body.pass2_threshold).toBe(80);

      expect(getSetting('two_pass_ai_enabled')).toBe('0');
      expect(getSetting('pass2_threshold')).toBe('80');
    });
  });
});

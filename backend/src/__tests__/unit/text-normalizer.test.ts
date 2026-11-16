/**
 * backend/src/__tests__/unit/text-normalizer.test.ts
 * Unit tests for Automatic Zero-AI Text Normalization & Readability Pipeline (PRD E Category 4).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  decodeEntitiesAndMojibake,
  stripBoilerplate,
  normalizeSentencesAndPunctuation,
  cleanHeadline,
  extractLeadSummary,
  computeReadability,
  normalizeArticleText,
} from '../../pipeline/textNormalizer';
import { insertPendingArticles } from '../../pipeline/dedup';
import { processPlainModeBatch } from '../../pipeline/enricher';
import { getDb, closeDb } from '../../db/db';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Text Normalizer & Readability Engine (PRD E Category 4)', () => {
  describe('decodeEntitiesAndMojibake', () => {
    it('decodes named and numeric HTML entities', () => {
      const raw = 'Inflation &amp; interest rates &mdash; &ldquo;It&#39;s critical,&rdquo; says official &hellip;';
      const decoded = decodeEntitiesAndMojibake(raw);
      expect(decoded).toBe('Inflation & interest rates — "It\'s critical," says official …');
    });

    it('resolves UTF-8 mojibake patterns to proper characters', () => {
      const raw = 'The ministerâ€™s announcement â€” â€œvictory for tradeâ€';
      const decoded = decodeEntitiesAndMojibake(raw);
      expect(decoded).toBe('The minister\'s announcement — "victory for trade"');
    });

    it('handles empty or null-like strings safely', () => {
      expect(decodeEntitiesAndMojibake('')).toBe('');
    });
  });

  describe('stripBoilerplate', () => {
    it('removes typical wire service leading datelines', () => {
      const raw1 = 'NEW DELHI (Reuters) — The finance ministry announced new tax guidelines on Monday.';
      expect(stripBoilerplate(raw1)).toBe('The finance ministry announced new tax guidelines on Monday.');

      const raw2 = 'WASHINGTON (AP) - The United States Senate passed the resolution by unanimous vote.';
      expect(stripBoilerplate(raw2)).toBe('The United States Senate passed the resolution by unanimous vote.');
    });

    it('removes trailing subscription fluff and clickbait tail', () => {
      const raw = 'Markets closed higher today. Read more at example.com. All rights reserved. Subscribe to our newsletter.';
      const cleaned = stripBoilerplate(raw);
      expect(cleaned).toBe('Markets closed higher today.');
    });
  });

  describe('normalizeSentencesAndPunctuation', () => {
    it('separates glued sentences and repairs irregular punctuation spacing', () => {
      const raw = 'The dollar rose.The euro fell , amid uncertainty ; meanwhile,stocks rallied!!';
      const normalized = normalizeSentencesAndPunctuation(raw);
      expect(normalized).toBe('The dollar rose. The euro fell, amid uncertainty; meanwhile, stocks rallied!');
    });

    it('capitalizes sentence beginnings', () => {
      const raw = 'oil prices rebounded. global demand remained steady.';
      const normalized = normalizeSentencesAndPunctuation(raw);
      expect(normalized).toBe('Oil prices rebounded. Global demand remained steady.');
    });
  });

  describe('cleanHeadline', () => {
    it('strips trailing outlet attributions and decodes entities in headlines', () => {
      const raw1 = 'Central Banks Coordinate Currency Strategy | Reuters';
      expect(cleanHeadline(raw1)).toBe('Central Banks Coordinate Currency Strategy');

      const raw2 = 'Historic Peace Treaty Signed &amp; Ratified - BBC News';
      expect(cleanHeadline(raw2)).toBe('Historic Peace Treaty Signed & Ratified');
    });
  });

  describe('extractLeadSummary', () => {
    it('extracts coherent initial sentences ending cleanly without cutoffs', () => {
      const text =
        'Global trade volume reached an all-time high this quarter following tariff reductions. European nations saw the strongest export gains across all sectors. Emerging markets also reported significant manufacturing expansion.';
      const summary = extractLeadSummary(text, 2);
      expect(summary).toBe(
        'Global trade volume reached an all-time high this quarter following tariff reductions. European nations saw the strongest export gains across all sectors.',
      );
    });
  });

  describe('computeReadability', () => {
    it('computes reading ease score and rates sufficient text as good quality', () => {
      const text =
        'The international climate summit concluded today in Geneva with delegates signing a landmark agreement to protect marine biodiversity across international waters. The agreement establishes conservation zones and mandates sustainable fishing practices.';
      const res = computeReadability(text);
      expect(res.quality).toBe('good');
      expect(res.score).toBeGreaterThan(0);
      expect(res.wordCount).toBeGreaterThan(20);
    });

    it('rates short excerpts as poor quality', () => {
      const text = 'Brief alert message.';
      const res = computeReadability(text);
      expect(res.quality).toBe('poor');
      expect(res.wordCount).toBeLessThan(15);
    });
  });

  describe('normalizeArticleText Full Zero-AI Pipeline', () => {
    it('transforms messy raw article scrape into clean, readable broadsheet copy', () => {
      const rawTitle = 'Markets Surge Across Asia &amp; Europe | Reuters';
      const rawBody =
        'TOKYO (Reuters) — Asian markets surged on Tuesday.investors cheered positive economic data. The Nikkei index rose 2.5 percent , led by technology shares. European markets opened higher as well. Read full story at reuters.com. All rights reserved.';

      const result = normalizeArticleText(rawTitle, rawBody);
      expect(result.titleEnglish).toBe('Markets Surge Across Asia & Europe');
      expect(result.bodyEnglishNormalized).toContain('Asian markets surged on Tuesday. Investors cheered positive economic data.');
      expect(result.bodyEnglishNormalized).not.toContain('Read full story');
      expect(result.bodyEnglishNormalized).not.toContain('All rights reserved');
      expect(result.summary).toContain('Asian markets surged on Tuesday.');
      expect(result.quality).toBe('good');
      expect(result.readabilityScore).toBeGreaterThan(0);
      expect(result.sourceLanguage).toBe('en');
    });
  });

  describe('Database Ingestion & Plain Mode Integration', () => {
    let tempDir: string;
    const originalEnv = { ...process.env };

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dnews-norm-test-'));
      process.env['DATA_DIR'] = tempDir;
      process.env['DB_PATH'] = path.join(tempDir, 'norm_test.sqlite');
      process.env.NODE_ENV = 'test';
      closeDb();
    });

    afterEach(() => {
      closeDb();
      process.env = { ...originalEnv };
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    it('automatically populates normalized readability fields during article ingestion and Plain Mode processing', async () => {
      const db = getDb();

      // Seed a source
      db.prepare(`
        INSERT INTO sources (slug, name, country, url, fetch_type)
        VALUES ('test_wire', 'Test Wire', 'International', 'https://example.com/rss', 'rss')
      `).run();

      const rawArticle = {
        url: 'https://example.com/news/1',
        titleOriginal: 'Solar Energy Output Doubles &amp; Prices Plunge | Wire',
        bodyOriginal:
          'BERLIN (DW) — Renewable energy production reached historic levels today.solar panels generated record electricity. Grid operators reported stable power transmission across the continent. Read more at dw.com.',
        publishedAt: new Date().toISOString(),
        sourceSlug: 'test_wire',
        sourceName: 'Test Wire',
        country: 'International',
      };

      const inserted = await insertPendingArticles([rawArticle]);
      expect(inserted).toBe(1);

      // Verify pending article already received automatic normalization
      const pendingRow = db.prepare('SELECT * FROM articles WHERE url = ?').get(rawArticle.url) as any;
      expect(pendingRow.title_english).toBe('Solar Energy Output Doubles & Prices Plunge');
      expect(pendingRow.body_en_normalized).toContain('Renewable energy production reached historic levels today.');
      expect(pendingRow.body_en_normalized).not.toContain('Read more at');
      expect(pendingRow.body_quality).toBe('good');
      expect(pendingRow.readability_score).toBeGreaterThan(0);

      // Run Plain Mode processing (Zero AI)
      const batch = db.prepare('SELECT a.*, s.name as source_name, s.country as source_country FROM articles a JOIN sources s ON a.source_id = s.id').all() as any[];
      processPlainModeBatch(batch);

      const processedRow = db.prepare('SELECT * FROM articles WHERE url = ?').get(rawArticle.url) as any;
      expect(processedRow.status).toBe('done');
      expect(processedRow.body_english).toContain('Renewable energy production reached historic levels today.');
      expect(processedRow.body_quality).toBe('good');
    });
  });
});

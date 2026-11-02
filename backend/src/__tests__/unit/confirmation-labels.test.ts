/**
 * backend/src/__tests__/unit/confirmation-labels.test.ts
 * Unit tests for Story Corroboration & Confirmation Labels (PRD A Category 9).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeConfirmationStatus } from '../../utils/confirmation';
import { getDb, closeDb } from '../../db/db';
import fs from 'fs';
import path from 'path';

describe('Story Corroboration & Confirmation Labels (Category 9)', () => {
  describe('computeConfirmationStatus logic', () => {
    it('returns "Single source" for 1 outlet', () => {
      const res = computeConfirmationStatus({ outletCount: 1, countryCount: 1 });
      expect(res.tier).toBe('single_source');
      expect(res.label).toBe('Single source');
      expect(res.isConfirmed).toBe(false);
      expect(res.breakingLabel).toBeUndefined();
    });

    it('returns "Single source" when outletCount is null or 0', () => {
      const res = computeConfirmationStatus({ outletCount: null, countryCount: null });
      expect(res.tier).toBe('single_source');
      expect(res.label).toBe('Single source');
      expect(res.outletCount).toBe(1);
      expect(res.countryCount).toBe(1);
    });

    it('returns "2 outlets" for 2 outlets across 1 or 2 countries', () => {
      const res1 = computeConfirmationStatus({ outletCount: 2, countryCount: 1 });
      expect(res1.tier).toBe('two_outlets');
      expect(res1.label).toBe('2 outlets');
      expect(res1.isConfirmed).toBe(false);

      const res2 = computeConfirmationStatus({ outletCount: 2, countryCount: 2 });
      expect(res2.tier).toBe('two_outlets');
      expect(res2.label).toBe('2 outlets');
      expect(res2.isConfirmed).toBe(false);
    });

    it('returns "N outlets" for 3+ outlets in only 1 country', () => {
      const res = computeConfirmationStatus({ outletCount: 4, countryCount: 1 });
      expect(res.tier).toBe('multi_outlet_single_nation');
      expect(res.label).toBe('4 outlets');
      expect(res.isConfirmed).toBe(false);
    });

    it('returns "Confirmed: N outlets in M countries" for 3+ outlets across 2+ nations', () => {
      const res = computeConfirmationStatus({ outletCount: 3, countryCount: 2 });
      expect(res.tier).toBe('confirmed');
      expect(res.label).toBe('Confirmed: 3 outlets in 2 countries');
      expect(res.isConfirmed).toBe(true);

      const res2 = computeConfirmationStatus({ outletCount: 7, countryCount: 4 });
      expect(res2.tier).toBe('confirmed');
      expect(res2.label).toBe('Confirmed: 7 outlets in 4 countries');
      expect(res2.isConfirmed).toBe(true);
    });

    it('labels single-source breaking news as "Unconfirmed Breaking"', () => {
      const res = computeConfirmationStatus({ outletCount: 1, countryCount: 1, breakingScore: 85 });
      expect(res.isBreaking).toBe(true);
      expect(res.isConfirmed).toBe(false);
      expect(res.breakingLabel).toBe('Unconfirmed Breaking');
      expect(res.label).toBe('Single source');
    });

    it('labels 2-outlet breaking news as "Unconfirmed Breaking"', () => {
      const res = computeConfirmationStatus({ outletCount: 2, countryCount: 2, breakingScore: 90 });
      expect(res.isBreaking).toBe(true);
      expect(res.isConfirmed).toBe(false);
      expect(res.breakingLabel).toBe('Unconfirmed Breaking');
      expect(res.label).toBe('2 outlets');
    });

    it('upgrades breaking alert automatically to "Confirmed Breaking" when corroborated across 2+ nations', () => {
      const res = computeConfirmationStatus({ outletCount: 4, countryCount: 3, breakingScore: 92 });
      expect(res.isBreaking).toBe(true);
      expect(res.isConfirmed).toBe(true);
      expect(res.breakingLabel).toBe('Confirmed Breaking');
      expect(res.label).toBe('Confirmed: 4 outlets in 3 countries');
    });

    it('recognizes breaking cluster flag even if individual breakingScore is omitted', () => {
      const res = computeConfirmationStatus({ outletCount: 5, countryCount: 2, isBreakingCluster: true });
      expect(res.isBreaking).toBe(true);
      expect(res.isConfirmed).toBe(true);
      expect(res.breakingLabel).toBe('Confirmed Breaking');
    });
  });

  describe('Database and Plain Mode Determinism', () => {
    const testDir = path.join(__dirname, '..', '..', '..', 'data', 'test-confirmation-' + Date.now());

    beforeEach(() => {
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      process.env['DATA_DIR'] = testDir;
    });

    afterEach(() => {
      closeDb();
      delete process.env['DATA_DIR'];
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('computes confirmation from joined clusters table', () => {
      const db = getDb();
      // Insert source
      db.prepare(`
        INSERT INTO sources (slug, name, country, url, fetch_type, enabled)
        VALUES ('test_src', 'Test Wire', 'India', 'https://example.com/rss', 'rss', 1)
      `).run();

      // Insert cluster with 4 outlets in 2 countries
      const cRes = db.prepare(`
        INSERT INTO clusters (headline, outlet_count, country_count, is_breaking)
        VALUES ('Global Headline', 4, 2, 1)
      `).run();
      const clusterId = Number(cRes.lastInsertRowid);

      // Insert article attached to this cluster
      db.prepare(`
        INSERT INTO articles (source_id, url, title_english, summary, breaking_score, cluster_id, status)
        VALUES (1, 'https://example.com/art1', 'Test Headline', 'Summary text', 80, ?, 'done')
      `).run(clusterId);

      // Query article with joined cluster
      const row = db.prepare(`
        SELECT a.id, a.breaking_score, c.outlet_count, c.country_count, c.is_breaking
        FROM articles a
        LEFT JOIN clusters c ON a.cluster_id = c.id
        WHERE a.url = 'https://example.com/art1'
      `).get() as { outlet_count: number; country_count: number; breaking_score: number; is_breaking: number };

      const status = computeConfirmationStatus({
        outletCount: row.outlet_count,
        countryCount: row.country_count,
        breakingScore: row.breaking_score,
        isBreakingCluster: row.is_breaking === 1,
      });

      expect(status.isConfirmed).toBe(true);
      expect(status.breakingLabel).toBe('Confirmed Breaking');
      expect(status.label).toBe('Confirmed: 4 outlets in 2 countries');
    });
  });
});


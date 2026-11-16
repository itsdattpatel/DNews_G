/**
 * backend/src/__tests__/unit/global-sources.test.ts
 * Unit tests for Global News Sources Expansion (PRD E Category 3).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SOURCES } from '../../../../config/sources';
import { syncSources } from '../../pipeline/dedup';
import { getDb, closeDb } from '../../db/db';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Global News Sources Expansion (PRD E Category 3)', () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dnews-sources-test-'));
    process.env['DATA_DIR'] = tempDir;
    process.env['DB_PATH'] = path.join(tempDir, 'test_sources.sqlite');
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

  describe('Source Catalog Validation', () => {
    it('contains over 100 verified global sources', () => {
      expect(SOURCES.length).toBeGreaterThanOrEqual(100);
    });

    it('ensures every source has a unique slug', () => {
      const slugs = SOURCES.map((s) => s.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('ensures every source has a valid http/https URL and valid fetchType', () => {
      for (const s of SOURCES) {
        expect(s.url.startsWith('http://') || s.url.startsWith('https://')).toBe(true);
        expect(['rss', 'gdelt', 'scrape']).toContain(s.fetchType);
        expect(s.name.trim().length).toBeGreaterThan(0);
        expect(s.country.trim().length).toBeGreaterThan(0);
      }
    });

    it('covers all designated world regions', () => {
      const regions = new Set(SOURCES.map((s) => s.region));
      const requiredRegions = [
        'Global',
        'Americas',
        'Europe',
        'Middle East',
        'Asia',
        'Africa',
        'Oceania',
      ];
      for (const req of requiredRegions) {
        expect(regions.has(req as any)).toBe(true);
      }
    });

    it('preserves all foundational starter sources', () => {
      const foundationalSlugs = [
        'india_thehindu',
        'india_ndtv',
        'usa_npr',
        'usa_cbs',
        'china_cgtn',
        'japan_nhkworld',
        'au_abc',
        'animals_mongabay',
      ];
      const catalogSlugs = new Set(SOURCES.map((s) => s.slug));
      for (const slug of foundationalSlugs) {
        expect(catalogSlugs.has(slug)).toBe(true);
      }
    });
  });

  describe('Database Synchronization (syncSources)', () => {
    it('synchronizes all sources and metadata into SQLite with migration 016', () => {
      syncSources();
      const db = getDb();

      const countRow = db.prepare('SELECT COUNT(*) as count FROM sources').get() as { count: number };
      expect(countRow.count).toBe(SOURCES.length);

      // Verify regional categorization
      const regionCounts = db
        .prepare('SELECT region, COUNT(*) as count FROM sources GROUP BY region')
        .all() as Array<{ region: string; count: number }>;
      expect(regionCounts.length).toBeGreaterThanOrEqual(7);

      // Verify tier1 priority wire presence
      const reuters = db.prepare('SELECT * FROM sources WHERE slug = ?').get('global_reuters') as any;
      expect(reuters).toBeDefined();
      expect(reuters.region).toBe('Global');
      expect(reuters.priority).toBe('tier1');
      expect(reuters.language).toBe('en');

      // Verify European source
      const ukGuardian = db.prepare('SELECT * FROM sources WHERE slug = ?').get('uk_guardian') as any;
      expect(ukGuardian).toBeDefined();
      expect(ukGuardian.region).toBe('Europe');
      expect(ukGuardian.country).toBe('United Kingdom');

      // Verify African source
      const nigeria = db.prepare('SELECT * FROM sources WHERE slug = ?').get('ng_punch') as any;
      expect(nigeria).toBeDefined();
      expect(nigeria.region).toBe('Africa');
      expect(nigeria.country).toBe('Nigeria');
    });
  });
});

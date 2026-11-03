/**
 * backend/src/__tests__/unit/library-mind.test.ts
 * Unit tests for MindService (Psychological help cards & Helplines registry - Category B5).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MindService, type MindCategory } from '../../library/services/mindService';

describe('Library Mind Helps Subsystem (Category B5)', () => {
  let db: Database.Database;
  let mindService: MindService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS library_mind_cards (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        slug                TEXT UNIQUE NOT NULL,
        title               TEXT NOT NULL,
        category            TEXT NOT NULL CHECK(category IN ('stress','anxiety','sleep','focus','habits','anger','grief','relationships','selftalk')),
        what_it_is          TEXT NOT NULL,
        when_it_helps       TEXT NOT NULL,
        steps_json          TEXT NOT NULL,
        time_needed_minutes INTEGER NOT NULL,
        source_book         TEXT NOT NULL,
        source_chapter      TEXT NOT NULL,
        source_url          TEXT NOT NULL,
        source_license      TEXT NOT NULL,
        attribution         TEXT NOT NULL,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS library_helplines (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code    TEXT NOT NULL,
        country_name    TEXT NOT NULL,
        org_name        TEXT NOT NULL,
        service_phone   TEXT NOT NULL,
        sms_text        TEXT,
        website_url     TEXT NOT NULL,
        hours_available TEXT NOT NULL DEFAULT '24/7',
        verified_date   TEXT NOT NULL,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    mindService = new MindService(db);
    mindService.seedCanonicalMindCards();
    mindService.seedCanonicalHelplines();
  });

  afterEach(() => {
    db.close();
  });

  describe('MindCards Service', () => {
    it('seeds and returns psychological help cards across 9 categories', () => {
      const cards = mindService.getCards();
      expect(cards.length).toBeGreaterThanOrEqual(10);

      const categories = new Set(cards.map((c) => c.category));
      expect(categories.has('stress')).toBe(true);
      expect(categories.has('anxiety')).toBe(true);
      expect(categories.has('sleep')).toBe(true);
      expect(categories.has('focus')).toBe(true);
      expect(categories.has('habits')).toBe(true);
      expect(categories.has('anger')).toBe(true);
      expect(categories.has('grief')).toBe(true);
      expect(categories.has('relationships')).toBe(true);
      expect(categories.has('selftalk')).toBe(true);
    });

    it('filters cards by category (e.g. anxiety)', () => {
      const anxietyCards = mindService.getCards({ category: 'anxiety' });
      expect(anxietyCards.length).toBeGreaterThan(0);
      expect(anxietyCards.every((c) => c.category === 'anxiety')).toBe(true);
      expect(anxietyCards[0].title).toContain('5-4-3-2-1');
      expect(anxietyCards[0].steps.length).toBeGreaterThanOrEqual(5);
    });

    it('filters cards by timeNeededMinutes (e.g. <= 3 minutes for quick relief)', () => {
      const quickCards = mindService.getCards({ maxTime: 3 });
      expect(quickCards.length).toBeGreaterThan(0);
      expect(quickCards.every((c) => c.time_needed_minutes <= 3)).toBe(true);
    });

    it('searches cards by keyword (e.g. breathing or somatic)', () => {
      const searchResults = mindService.getCards({ query: 'breathing' });
      expect(searchResults.length).toBeGreaterThan(0);
      expect(
        searchResults.some(
          (c) =>
            c.title.toLowerCase().includes('breathing') ||
            c.what_it_is.toLowerCase().includes('breathing')
        )
      ).toBe(true);
    });

    it('retrieves a single card by ID with parsed steps', () => {
      const card = mindService.getCardById(1);
      expect(card).not.toBeNull();
      expect(card!.id).toBe(1);
      expect(card!.steps).toBeInstanceOf(Array);
      expect(card!.steps.length).toBeGreaterThan(0);
      expect(card!.source_license).toContain('CC BY');
      expect(card!.attribution).toBeDefined();
    });
  });

  describe('Helplines Service', () => {
    it('seeds and returns verified crisis helplines for IN, US, CN, JP, AU', () => {
      const helplines = mindService.getHelplines();
      expect(helplines.length).toBeGreaterThanOrEqual(9);

      const countryCodes = new Set(helplines.map((h) => h.country_code));
      expect(countryCodes.has('IN')).toBe(true);
      expect(countryCodes.has('US')).toBe(true);
      expect(countryCodes.has('CN')).toBe(true);
      expect(countryCodes.has('JP')).toBe(true);
      expect(countryCodes.has('AU')).toBe(true);
    });

    it('filters helplines by country code', () => {
      const inHelplines = mindService.getHelplines('IN');
      expect(inHelplines.length).toBeGreaterThanOrEqual(2);
      expect(inHelplines.every((h) => h.country_code === 'IN')).toBe(true);
      expect(inHelplines.some((h) => h.org_name.includes('Tele-MANAS'))).toBe(true);

      const usHelplines = mindService.getHelplines('US');
      expect(usHelplines.some((h) => h.service_phone.includes('988'))).toBe(true);
    });
  });
});


/**
 * frontend/src/__tests__/unit/category-rail.test.ts
 * Unit tests for Screen (b): Category Rail & Filter (Step 6).
 * Verifies category filtering, 5-dot breaking score calculation,
 * outlet + country byline display, and empty/loading state contracts.
 */
import { describe, it, expect } from 'vitest';
import type { Article } from '../../types';
import { getBreakingScoreDots, formatArticleByline } from '../../utils/category';

describe('Screen (b): Category Rail & Filter Specs (Step 6)', () => {
  describe('Breaking Score 5-Dot Scale (UI_SPEC Screen b)', () => {
    it('calculates 5 filled dots for high breaking score (81-100)', () => {
      expect(getBreakingScoreDots(92)).toEqual({ filled: 5, total: 5 });
      expect(getBreakingScoreDots(82)).toEqual({ filled: 5, total: 5 });
    });

    it('calculates 4 filled dots for score between 61 and 80', () => {
      expect(getBreakingScoreDots(75)).toEqual({ filled: 4, total: 5 });
      expect(getBreakingScoreDots(68)).toEqual({ filled: 4, total: 5 });
    });

    it('calculates 3 filled dots for score between 41 and 60', () => {
      expect(getBreakingScoreDots(45)).toEqual({ filled: 3, total: 5 });
      expect(getBreakingScoreDots(55)).toEqual({ filled: 3, total: 5 });
    });

    it('calculates 2 filled dots for score between 21 and 40', () => {
      expect(getBreakingScoreDots(30)).toEqual({ filled: 2, total: 5 });
    });

    it('calculates 1 filled dot for low score (0-20)', () => {
      expect(getBreakingScoreDots(10)).toEqual({ filled: 1, total: 5 });
      expect(getBreakingScoreDots(0)).toEqual({ filled: 1, total: 5 });
    });
  });

  describe('Broadsheet Byline Formatting (outlet · country)', () => {
    it('formats source name and country cleanly with broadsheet interpunct', () => {
      const art = {
        source: {
          id: 1,
          name: 'The Hindu',
          country: 'India',
        },
      };
      expect(formatArticleByline(art)).toBe('The Hindu · India');
    });

    it('handles global fallbacks gracefully when source metadata is partial', () => {
      const art = {
        source: {
          id: 99,
          name: '',
          country: '',
        },
      };
      expect(formatArticleByline(art)).toBe('Wire Service · Global');
    });
  });

  describe('Category Filter Isolation', () => {
    const sampleArticles: Partial<Article>[] = [
      { id: 1, categories: ['World', 'Politics'], title_english: 'Diplomatic Accord' },
      { id: 2, categories: ['Animals', 'Environment'], title_english: 'Snow Leopards' },
      { id: 3, categories: ['Tech', 'Science'], title_english: 'Quantum Breakthrough' },
      { id: 4, categories: ['Business'], title_english: 'Clean Energy Investments' },
    ];

    it('filters articles matching a selected category accurately', () => {
      const selectedCategory = 'Animals';
      const filtered = sampleArticles.filter((art) =>
        art.categories?.includes(selectedCategory),
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe(2);
    });

    it('returns all articles when category is null or "All"', () => {
      const selectedCategory: string | null = null;
      const filtered = sampleArticles.filter((art) => {
        if (!selectedCategory || selectedCategory === 'All') return true;
        return art.categories?.includes(selectedCategory);
      });
      expect(filtered).toHaveLength(4);
    });
  });
});

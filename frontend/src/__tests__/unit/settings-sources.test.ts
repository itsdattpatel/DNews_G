/**
 * frontend/src/__tests__/unit/settings-sources.test.ts
 * Unit tests for Screen (l) Settings & Screen (m) API & Sources utilities.
 */
import { describe, it, expect } from 'vitest';
import {
  maskApiKey,
  calculateQuotaPercentage,
  renderQuotaDots,
  filterSources,
} from '../../utils/sources';
import type { Source } from '../../types';

describe('Settings & Sources Desks (Screens l & m)', () => {
  describe('maskApiKey', () => {
    it('masks middle characters preserving prefix and suffix', () => {
      const masked = maskApiKey('gsk_123456789abcdef');
      expect(masked.startsWith('gsk_')).toBe(true);
      expect(masked.endsWith('cdef')).toBe(true);
      expect(masked).toContain('••••••••');
    });

    it('handles short or missing keys safely', () => {
      expect(maskApiKey('')).toBe('••••••••••••');
      expect(maskApiKey('123')).toBe('••••••');
      expect(maskApiKey(undefined)).toBe('••••••••••••');
    });
  });

  describe('calculateQuotaPercentage', () => {
    it('calculates ratio against limit and clamps to 0-100', () => {
      expect(calculateQuotaPercentage(800, 1000)).toBe(80);
      expect(calculateQuotaPercentage(0, 1000)).toBe(0);
      expect(calculateQuotaPercentage(1500, 1000)).toBe(100);
      expect(calculateQuotaPercentage(-50, 1000)).toBe(0);
    });
  });

  describe('renderQuotaDots', () => {
    it('renders 5-dot telegraph string accurately', () => {
      expect(renderQuotaDots(80)).toBe('[●●●●○ 80%]');
      expect(renderQuotaDots(40)).toBe('[●●○○○ 40%]');
      expect(renderQuotaDots(100)).toBe('[●●●●● 100%]');
      expect(renderQuotaDots(0)).toBe('[○○○○○ 0%]');
    });
  });

  describe('filterSources', () => {
    const sampleSources: Source[] = [
      { id: 1, name: 'The Hindu', slug: 'the-hindu', country: 'India', url: 'https://hindu.com/rss' },
      { id: 2, name: 'Reuters World', slug: 'reuters-world', country: 'USA', url: 'https://reuters.com/rss' },
      { id: 3, name: 'Times of India', slug: 'times-of-india', country: 'India', url: 'https://toi.com/rss' },
    ];

    it('filters sources by country', () => {
      const filtered = filterSources(sampleSources, 'India');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.name)).toEqual(['The Hindu', 'Times of India']);
    });

    it('searches sources by name query', () => {
      const searched = filterSources(sampleSources, null, 'Reuters');
      expect(searched).toHaveLength(1);
      expect(searched[0].name).toBe('Reuters World');
    });

    it('handles empty or null inputs', () => {
      expect(filterSources([], null)).toEqual([]);
      expect(filterSources(null as unknown as Source[], null)).toEqual([]);
    });
  });
});


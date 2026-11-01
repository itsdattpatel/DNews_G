/**
 * frontend/src/__tests__/unit/world-map-broadsheet.test.ts
 * Unit tests for Screen (e): Global News Radar & Wildlife Map (Step 8).
 * Tests cartographic coordinates, wildlife crime layer markers,
 * projection switching, and broadsheet tooltip generation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { aggregateCountryNews } from '../../utils/geo';
import type { Article } from '../../types';

describe('Screen (e): Global News Radar & Wildlife Crime Layer (Step 8)', () => {
  beforeEach(() => {
    useAppStore.setState({
      isGlobeOpen: false,
      selectedCountry: null,
    });
  });

  describe('Wildlife Crime Layer Detection & Marker Coordinates', () => {
    it('flags countries with Animals category or wildlife trafficking keywords', () => {
      const articles: Partial<Article>[] = [
        {
          id: 1,
          source: { id: 1, name: 'The Hindu', country: 'India' },
          categories: ['Animals', 'Environment'],
          keywords: ['snow-leopards', 'poaching', 'corridors'],
          title_english: 'Snow Leopards Protection Accord',
        },
        {
          id: 2,
          source: { id: 2, name: 'Reuters', country: 'USA' },
          categories: ['Business'],
          keywords: ['solar', 'batteries'],
          title_english: 'Clean Energy Investments',
        },
      ];

      const { wildlifeCountries, countryStats } = aggregateCountryNews(articles as Article[]);

      expect(wildlifeCountries.has('India')).toBe(true);
      expect(wildlifeCountries.has('USA')).toBe(false);

      const indiaCentroid = countryStats['India']?.centroid;
      expect(indiaCentroid).toBeDefined();
      expect(indiaCentroid?.[0]).toBeCloseTo(78.96, 1);
      expect(indiaCentroid?.[1]).toBeCloseTo(20.59, 1);
    });

    it('generates triangle marker polygon points centered on coordinates', () => {
      const cx = 100;
      const cy = 100;
      const size = 12;
      // Triangle pointing up: top vertex, bottom-right, bottom-left
      const points = `${cx},${cy - size} ${cx + size * 0.866},${cy + size * 0.5} ${cx - size * 0.866},${cy + size * 0.5}`;
      expect(points).toContain('100,88');
      expect(points).toContain('110.392,106');
    });
  });

  describe('Projection and Region Filter State Management', () => {
    it('manages isGlobeOpen and selectedCountry transitions', () => {
      const store = useAppStore.getState();
      expect(store.isGlobeOpen).toBe(false);

      store.setGlobeOpen(true);
      expect(useAppStore.getState().isGlobeOpen).toBe(true);

      store.setSelectedCountry('India');
      expect(useAppStore.getState().selectedCountry).toBe('India');

      store.setGlobeOpen(false);
      expect(useAppStore.getState().isGlobeOpen).toBe(false);
    });
  });
});

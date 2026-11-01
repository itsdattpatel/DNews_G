/**
 * frontend/src/__tests__/unit/world-map.test.ts
 * Unit tests for Global News Radar & Wildlife Map (Phase 9).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import {
  resolveCountryKey,
  aggregateCountryNews,
  COUNTRY_COORDINATES,
} from '../../utils/geo';
import type { Article } from '../../types';

describe('Global News Radar & Wildlife Map (Phase 9)', () => {
  beforeEach(() => {
    useAppStore.setState({
      isGlobeOpen: false,
      selectedCountry: null,
    });
  });

  it('manages isGlobeOpen state in the store (P9-07)', () => {
    const store = useAppStore.getState();
    expect(store.isGlobeOpen).toBe(false);

    store.setGlobeOpen(true);
    expect(useAppStore.getState().isGlobeOpen).toBe(true);

    store.setGlobeOpen(false);
    expect(useAppStore.getState().isGlobeOpen).toBe(false);
  });

  it('resolves country names, codes, and aliases to canonical keys (P9-02)', () => {
    expect(resolveCountryKey('India')).toBe('India');
    expect(resolveCountryKey('IN')).toBe('India');
    expect(resolveCountryKey('USA')).toBe('USA');
    expect(resolveCountryKey('United States of America')).toBe('USA');
    expect(resolveCountryKey('China')).toBe('China');
    expect(resolveCountryKey('Japan')).toBe('Japan');
    expect(resolveCountryKey('Australia')).toBe('Australia');
    expect(resolveCountryKey('Atlantis')).toBeNull();
  });

  it('defines valid centroid coordinates for all 5 starter countries (P9-02)', () => {
    const starterCountries = ['India', 'USA', 'China', 'Japan', 'Australia'];
    for (const c of starterCountries) {
      const geo = COUNTRY_COORDINATES[c];
      expect(geo).toBeDefined();
      expect(geo?.centroid).toHaveLength(2);
      expect(typeof geo?.centroid[0]).toBe('number');
      expect(typeof geo?.centroid[1]).toBe('number');
    }
  });

  it('aggregates article counts, categories, and detects breaking score spikes (P9-03)', () => {
    const mockArticles: Partial<Article>[] = [
      {
        id: 1,
        source: { id: 1, name: 'The Hindu', country: 'India' },
        categories: ['World', 'Politics'],
        breaking_score: 60,
      },
      {
        id: 2,
        source: { id: 1, name: 'The Hindu', country: 'India' },
        categories: ['World'],
        breaking_score: 88, // Breaking!
      },
      {
        id: 3,
        source: { id: 2, name: 'Reuters', country: 'USA' },
        categories: ['Tech'],
        breaking_score: 45,
      },
    ];

    const { countryStats, totalDispatchesMapped } = aggregateCountryNews(mockArticles as Article[]);
    expect(totalDispatchesMapped).toBe(3);

    const india = countryStats['India'];
    expect(india).toBeDefined();
    expect(india?.articleCount).toBe(2);
    expect(india?.breakingCount).toBe(1);
    expect(india?.highestBreakingScore).toBe(88);
    expect(india?.topCategory).toBe('World');

    const usa = countryStats['USA'];
    expect(usa).toBeDefined();
    expect(usa?.articleCount).toBe(1);
    expect(usa?.topCategory).toBe('Tech');
  });

  it('identifies wildlife-crime overlay regions from Animals category and keywords (P9-04)', () => {
    const mockArticles: Partial<Article>[] = [
      {
        id: 10,
        source: { id: 1, name: 'The Hindu', country: 'India' },
        categories: ['Animals'],
        keywords: ['tiger', 'poaching', 'reserve'],
        title_english: 'Wildlife protection stepped up after tiger reserve breach',
        summary: 'Rangers seize contraband skins',
      },
      {
        id: 11,
        source: { id: 3, name: 'ABC AU', country: 'Australia' },
        categories: ['Environment'],
        keywords: ['barrier reef', 'coral'],
        title_english: 'Coral bleaching update',
      },
    ];

    const { wildlifeCountries } = aggregateCountryNews(mockArticles as Article[]);
    expect(wildlifeCountries.has('India')).toBe(true);
    expect(wildlifeCountries.has('Australia')).toBe(false);
  });
});


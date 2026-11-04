/**
 * frontend/src/__tests__/unit/globe-3d.test.tsx
 * Unit tests for PRD C Category 7: 3D Interactive Broadsheet Globe & 2D Projection Hub.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore } from '../../store/useAppStore';
import { WorldMap } from '../../components/map/WorldMap';
import { aggregateCountryNews, COUNTRY_COORDINATES } from '../../utils/geo';
import type { Article } from '../../types';

// Mock react-globe.gl to avoid WebGL / window requirements in Node SSR
vi.mock('react-globe.gl', () => {
  return {
    default: (props: any) => (
      <div data-testid="mock-react-globe" style={{ width: props.width, height: props.height }}>
        <div data-testid="globe-polygons-count">{props.polygonsData?.length || 0}</div>
        <div data-testid="globe-html-pins-count">{props.htmlElementsData?.length || 0}</div>
      </div>
    ),
  };
});

describe('PRD C Category 7: 3D Interactive Broadsheet Globe & Projection Hub', () => {
  const mockArticles: Partial<Article>[] = [
    {
      id: 1,
      source: { id: 1, name: 'The Hindu', country: 'India' },
      categories: ['World', 'Animals'],
      keywords: ['tiger', 'reserve', 'corridor'],
      breaking_score: 85, // Breaking + Wildlife!
      title_english: 'Project Tiger Extends Corridors in Nilgiri Biosphere',
    },
    {
      id: 2,
      source: { id: 2, name: 'Reuters', country: 'USA' },
      categories: ['Politics'],
      keywords: ['diplomacy', 'summit'],
      breaking_score: 65,
      title_english: 'Diplomatic Envoys Convene for Global Maritime Summit',
    },
    {
      id: 3,
      source: { id: 3, name: 'Nikkei', country: 'Japan' },
      categories: ['Tech'],
      keywords: ['semiconductor', 'foundry'],
      breaking_score: 90, // Breaking!
      title_english: 'Next-Generation Silicon Foundry Commissioned in Kumamoto',
    },
  ];

  beforeEach(() => {
    useAppStore.setState({
      isGlobeOpen: true,
      selectedCountry: null,
      currentView: 'reader',
      theme: 'night',
      articles: mockArticles as Article[],
      settings: {
        ...useAppStore.getState().settings,
        map_engine: 'globe',
        globe_autorotate: true,
        map_wildlife_layer: true,
        map_pulse_enabled: true,
      },
    });
  });

  it('renders the Broadsheet Global Radar modal with 3D Globe elements', () => {
    const html = renderToStaticMarkup(<WorldMap forceOpen={true} />);

    // Broadsheet Heading and Subtitle
    expect(html).toContain('Global Cartographic News Radar');
    expect(html).toContain('Geotagged Reports');
    expect(html).toContain('Cartographic News Radar · Global Wire Dispatches');

    // Controls
    expect(html).toContain('Wildlife Layer:');
    expect(html).toContain('btn-toggle-projection');
    expect(html).toContain('btn-close-globe-map');
  });

  it('manages isGlobeOpen and selectedCountry store state transitions', () => {
    const store = useAppStore.getState();
    expect(store.isGlobeOpen).toBe(true);

    store.setGlobeOpen(false);
    expect(useAppStore.getState().isGlobeOpen).toBe(false);

    store.setSelectedCountry('India');
    expect(useAppStore.getState().selectedCountry).toBe('India');
  });

  it('correctly aggregates news articles into country stats and wildlife indicators', () => {
    const { countryStats, wildlifeCountries, totalDispatchesMapped } = aggregateCountryNews(
      mockArticles as Article[],
    );

    expect(totalDispatchesMapped).toBe(3);
    expect(wildlifeCountries.has('India')).toBe(true);
    expect(wildlifeCountries.has('USA')).toBe(false);

    const india = countryStats['India'];
    expect(india).toBeDefined();
    expect(india?.articleCount).toBe(1);
    expect(india?.hasWildlifeCrime).toBe(true);
    expect(india?.highestBreakingScore).toBe(85);
    expect(india?.breakingCount).toBe(1);

    const japan = countryStats['Japan'];
    expect(japan).toBeDefined();
    expect(japan?.highestBreakingScore).toBe(90);
    expect(japan?.breakingCount).toBe(1);
  });

  it('contains valid centroid coordinates for all starter countries', () => {
    const countries = ['India', 'USA', 'China', 'Japan', 'Australia', 'United Kingdom'];
    for (const country of countries) {
      const geo = COUNTRY_COORDINATES[country];
      expect(geo).toBeDefined();
      expect(geo?.centroid).toHaveLength(2);
      expect(typeof geo?.centroid[0]).toBe('number');
      expect(typeof geo?.centroid[1]).toBe('number');
    }
  });

  it('respects map settings stored in useAppStore', () => {
    const store = useAppStore.getState();
    expect(store.settings.map_engine).toBe('globe');
    expect(store.settings.globe_autorotate).toBe(true);
    expect(store.settings.map_wildlife_layer).toBe(true);
    expect(store.settings.map_pulse_enabled).toBe(true);

    useAppStore.setState({
      settings: { ...store.settings, map_engine: 'flat' },
    });
    expect(useAppStore.getState().settings.map_engine).toBe('flat');
  });
});

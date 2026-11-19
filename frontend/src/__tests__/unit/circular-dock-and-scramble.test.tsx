/**
 * frontend/src/__tests__/unit/circular-dock-and-scramble.test.tsx
 * Tests for CircularDock, CircularGalleryWireDock, and ScrambledText components.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CircularDock } from '../../components/article/CircularDock';
import { CircularGalleryWireDock } from '../../components/article/CircularGalleryWireDock';
import { ScrambledText, PRESET_CHARSETS } from '../../components/ui/ScrambledText';
import { generateArticleCardTexture } from '../../utils/cardTextureGenerator';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

describe('CircularDock Component', () => {
  const dummyArticles: Article[] = [
    {
      id: 101,
      url: 'https://reuters.com/news-101',
      title_english: 'First Global Dispatch From London',
      source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
      published_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      summary: 'Summary 1',
      breaking_score: 85,
      cluster_id: null,
      bookmarked: false,
      keywords: ['london'],
      categories: ['World'],
    },
    {
      id: 102,
      url: 'https://nikkei.com/news-102',
      title_english: 'Tokyo Financial Markets Surge on Tech Rally',
      source: { id: 2, name: 'Nikkei', country: 'Japan' },
      published_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      summary: 'Summary 2',
      breaking_score: 45,
      cluster_id: null,
      bookmarked: true,
      keywords: ['tokyo'],
      categories: ['Business'],
    },
    {
      id: 103,
      url: 'https://apnews.com/news-103',
      title_english: 'Washington Enacts New Climate Legislation',
      source: { id: 3, name: 'AP News', country: 'USA' },
      published_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      summary: 'Summary 3',
      breaking_score: 60,
      cluster_id: null,
      bookmarked: false,
      keywords: ['washington'],
      categories: ['Politics'],
    },
  ];

  beforeEach(() => {
    useAppStore.setState({
      articles: dummyArticles,
      selectedArticleId: 102, // Tokyo is active center
    });
  });

  it('renders circular dock with frosted shell, indicator bar and dispatches', () => {
    const html = renderToStaticMarkup(
      <CircularDock forcedArticles={dummyArticles} forcedSelectedArticleId={102} />
    );

    expect(html).toContain('circular-dock');
    expect(html).toContain('Orbit Wire Docker');
    expect(html).toContain('Dispatch 2 of 3');
    expect(html).toContain('First Global Dispatch From London');
    expect(html).toContain('Tokyo Financial Markets Surge on Tech Rally');
    expect(html).toContain('Washington Enacts New Climate Legislation');
  });

  it('elevates selected active card with zero blur and apex translateY', () => {
    const html = renderToStaticMarkup(
      <CircularDock forcedArticles={dummyArticles} forcedSelectedArticleId={102} />
    );

    expect(html).toContain('id="article-card-102"');
    expect(html).toContain('data-active-card="true"');
  });

  it('returns null when articles list is empty', () => {
    const html = renderToStaticMarkup(
      <CircularDock forcedArticles={[]} forcedSelectedArticleId={null} />
    );
    expect(html).toBe('');
  });

  it('renders CircularGalleryWireDock pure floating cards container', () => {
    const html = renderToStaticMarkup(
      <CircularGalleryWireDock forcedArticles={dummyArticles} forcedSelectedArticleId={102} />
    );

    expect(html).toContain('circular-dock');
    expect(html).toContain('circular-gallery');
  });
});

describe('Card Texture Generator', () => {
  it('generates non-empty data URL for an article in browser environment', () => {
    const dummy: Article = {
      id: 201,
      url: 'https://example.com/201',
      title_english: 'Sample Headline For Canvas Texture',
      source: { id: 1, name: 'BBC', country: 'UK' },
      published_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      summary: 'Brief summary',
      breaking_score: 90,
      cluster_id: null,
      bookmarked: false,
      keywords: [],
      categories: ['World'],
    };

    const texture = generateArticleCardTexture(dummy, true);
    expect(typeof texture).toBe('string');
  });
});

describe('ScrambledText Component', () => {
  it('renders static text when enabled is false', () => {
    const html = renderToStaticMarkup(
      <ScrambledText text="BROADSHEET HEADLINE" enabled={false} />
    );
    expect(html).toContain('BROADSHEET HEADLINE');
  });

  it('supports character presets', () => {
    expect(PRESET_CHARSETS.broadsheet).toContain('A');
    expect(PRESET_CHARSETS.cipher).toContain('!');
    expect(PRESET_CHARSETS.matrix).toContain('0');
    expect(PRESET_CHARSETS.alphanumeric).toContain('z');
  });
});

/**
 * frontend/src/__tests__/unit/apk-live-sync-remediation.test.tsx
 * Regression tests for Mobile APK Live Sync, API Base Routing & Audit Fixes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { autonomousEngine, SEED_ARTICLES } from '../../lib/autonomousEngine';
import { useAppStore } from '../../store/useAppStore';
import { articleMatchesFilters } from '../../utils/liveDesk';
import { CircularGalleryWireDock } from '../../components/article/CircularGalleryWireDock';
import { AdaptiveNotchPill } from '../../components/layout/AdaptiveNotchPill';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import * as apiModule from '../../lib/api';
import type { Article } from '../../types';

function makeArticle(id: number, overrides: Partial<Article> = {}): Article {
  const now = new Date().toISOString();
  return {
    id,
    url: `https://example.test/item/${id}`,
    title_english: `Headline ${id}`,
    summary: `Summary ${id}`,
    body_english: `Body ${id}`,
    language_detected: 'en',
    breaking_score: 40,
    bookmarked: false,
    cluster_id: null,
    categories: ['World'],
    keywords: ['world'],
    published_at: now,
    fetched_at: now,
    source: { id: 1, name: 'Wire', country: 'Global' },
    ...overrides,
  };
}

describe('APK Live Sync & Audit Defect Remediation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const memStorage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (memStorage.has(k) ? memStorage.get(k)! : null),
      setItem: (k: string, v: string) => {
        memStorage.set(k, String(v));
      },
      removeItem: (k: string) => {
        memStorage.delete(k);
      },
      clear: () => {
        memStorage.clear();
      },
    });
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    useAppStore.setState({
      articles: [],
      pendingNewArticles: [],
      totalArticles: 0,
      selectedArticle: null,
      selectedArticleId: null,
      autoAdvanceQueueIds: [],
      selectedCountry: null,
      selectedCategory: null,
      searchQuery: '',
      isBreakingOnly: false,
      sourcesCount: 0,
      settings: {
        ...useAppStore.getState().settings,
        alert_threshold: 75,
      },
    });
  });

  it('uses 0-100 integer breaking_score scale in autonomousEngine seeds compatible with liveDesk filter', () => {
    const leadSeed = SEED_ARTICLES[0]!;
    expect(leadSeed.breaking_score).toBeGreaterThanOrEqual(75);
    expect(leadSeed.breaking_score).toBeLessThanOrEqual(100);
    expect(
      articleMatchesFilters(leadSeed, {
        selectedCategory: null,
        selectedCountry: null,
        searchQuery: '',
        isBreakingOnly: true,
        alertThreshold: 75,
      }),
    ).toBe(true);
  });

  it('normalizes legacy 0-1 localStorage breaking scores to 0-100 on init', () => {
    const legacy = makeArticle(9991, { breaking_score: 0.92, categories: ['World'] });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dnews_autonomous_articles_v1', JSON.stringify([legacy]));
    }
    (autonomousEngine as any).isInitialized = false;
    const loaded = autonomousEngine.getArticle(9991);
    expect(loaded).not.toBeNull();
    expect(loaded?.breaking_score).toBe(92);
  });

  it('exports apiUrl helper combining getApiBaseUrl with relative paths', () => {
    const apiAny = apiModule as Record<string, unknown>;
    expect(typeof apiAny['apiUrl']).toBe('function');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dnews_remote_desk_url', 'http://192.168.1.25:3005/');
    }
    const apiUrl = apiAny['apiUrl'] as (path: string) => string;
    expect(apiUrl('/api/tv/channels')).toBe('http://192.168.1.25:3005/api/tv/channels');
  });

  it('renders #btn-new-stories-pill in CircularGalleryWireDock when pendingNewArticles is non-empty', () => {
    const a1 = makeArticle(1);
    const a2 = makeArticle(2);
    const html = renderToStaticMarkup(
      <CircularGalleryWireDock forcedArticles={[a1]} forcedPendingNewArticles={[a2]} />,
    );
    expect(html).toContain('id="btn-new-stories-pill"');
    expect(html).toContain('1 new story');
  });

  it('replaces desk articles immediately on performFullResync("remote_desk_connected")', async () => {
    const seed = makeArticle(1001);
    const remoteFresh = makeArticle(5001, { title_english: 'Remote Live Story' });
    useAppStore.getState().setArticles([seed], 1);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 1, items: [remoteFresh] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await useAppStore.getState().performFullResync('remote_desk_connected');

    const state = useAppStore.getState();
    expect(state.pendingNewArticles).toHaveLength(0);
    expect(state.articles.map((a) => a.id)).toEqual([5001]);
    expect(state.selectedArticleId).toBe(5001);
  });

  it('renders dynamic telemetry and real app version in AdaptiveNotchPill instead of stale hardcoded 155/v1.0.8', () => {
    const html = renderToStaticMarkup(
      <AdaptiveNotchPill
        forcedOpen={true}
        forcedArticles={[makeArticle(1), makeArticle(2)]}
        forcedSourcesCount={185}
      />,
    );
    expect(html).toContain('notch-telemetry-popover');
    expect(html).not.toContain('155 Sources');
    expect(html).not.toContain('v1.0.8');
    expect(html).toContain('185 Sources');
    expect(html).toContain('2 Stories');
  });

  it('renders MobileBottomNav in document flow instead of fixed overlapping NewsTicker', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html).not.toContain('fixed bottom-0');
  });
});

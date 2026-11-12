/**
 * frontend/src/__tests__/unit/live-update-main-desk.test.tsx
 * Unit & memory-soak tests for PRD D Category 4: Live-Update Fixes, Main Desk.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CappedIdSet, sseBus } from '../../lib/sseBus';
import {
  MAX_IN_MEMORY_ARTICLES,
  articleMatchesFilters,
  capList,
  mergeLiveArticleList,
} from '../../utils/liveDesk';
import { computeWindowBounds } from '../../hooks/useWindowedList';
import { clampLiveRefreshMs } from '../../hooks/useSSE';
import { useAppStore } from '../../store/useAppStore';
import { StatusStrip } from '../../components/layout/StatusStrip';
import { RightIconRail } from '../../components/layout/RightIconRail';
import { UnifiedSettingsDialog } from '../../components/settings/UnifiedSettingsDialog';
import type { Article } from '../../types';

function makeArticle(id: number, overrides: Partial<Article> = {}): Article {
  const now = new Date(Date.UTC(2026, 10, 12, 9, id % 60, 0)).toISOString();
  return {
    id,
    url: `https://wire.example.test/${id}`,
    title_english: `Dispatch Headline #${id}`,
    title_original: null,
    body_english: `Full wire report body for article #${id}.`,
    body_original: null,
    summary: `Summary for dispatch #${id}`,
    language_detected: 'en',
    published_at: now,
    fetched_at: now,
    ingested_at: now,
    breaking_score: 45,
    bookmarked: false,
    cluster_id: null,
    categories: ['World'],
    keywords: ['diplomacy', `tag-${id}`],
    source: {
      id: 1,
      slug: 'reuters',
      name: 'Reuters',
      country: 'US',
      url: 'https://reuters.com',
      fetch_type: 'rss',
    },
    ...overrides,
  };
}

describe('PRD D Category 4: Live-Update Fixes, Main Desk', () => {
  beforeEach(() => {
    sseBus.clearAllListeners();
    useAppStore.setState({
      articles: [],
      totalArticles: 0,
      selectedArticle: null,
      selectedArticleId: null,
      autoAdvanceQueueIds: [],
      selectedCategory: null,
      selectedCountry: null,
      searchQuery: '',
      isBreakingOnly: false,
      unreadAlertsCount: 0,
      sseStatus: 'connected',
      sseReconnectAttempts: 0,
      sseLastEventId: 0,
      startupStatus: null,
      isSettingsOpen: false,
      settings: {
        ...useAppStore.getState().settings,
        live_refresh_interval_sec: 5,
        alert_threshold: 75,
      },
    });
  });

  describe('sseBus typed pub/sub & leak safety', () => {
    it('delivers strongly-typed payloads and releases all listeners on unsubscribe', () => {
      const seenAlerts: string[] = [];
      const seenCounts: number[] = [];

      const unsubAlert = sseBus.subscribe('alert', (payload) => {
        seenAlerts.push(payload.message);
      });
      const unsubMany = sseBus.subscribeMany(['cluster_update', 'new_article'], (evt, payload) => {
        if (evt === 'cluster_update') {
          seenCounts.push((payload as { cluster_id: number }).cluster_id);
        }
      });

      expect(sseBus.getListenerCount()).toBe(3);

      sseBus.emit('alert', { type: 'breaking', message: 'URGENT DISPATCH', breaking_score: 92 });
      sseBus.emit('cluster_update', { cluster_id: 42, outlet_count: 5 });

      expect(seenAlerts).toEqual(['URGENT DISPATCH']);
      expect(seenCounts).toEqual([42]);

      unsubAlert();
      unsubMany();

      expect(sseBus.getListenerCount()).toBe(0);
    });

    it('soak-tests 1,000 mount/unmount cycles with zero leftover listeners', () => {
      for (let i = 0; i < 1000; i += 1) {
        const unsub = sseBus.subscribe('tv_health_update', () => {});
        unsub();
      }
      expect(sseBus.getListenerCount()).toBe(0);
    });
  });

  describe('CappedIdSet frame deduplication & bounded memory', () => {
    it('deduplicates repeated SSE frame ids within window', () => {
      const seen = new CappedIdSet(100);
      expect(seen.add('new_article:101')).toBe(true);
      expect(seen.has('new_article:101')).toBe(true);
      expect(seen.add('new_article:101')).toBe(false);
    });

    it('caps internal set at maxSize (2,000) across 5,000 soaked frames', () => {
      const seen = new CappedIdSet(2000);
      for (let i = 1; i <= 5000; i += 1) {
        seen.add(`new_article:${i}`);
      }
      expect(seen.size).toBe(2000);
      expect(seen.has('new_article:1')).toBe(false);
      expect(seen.has('new_article:5000')).toBe(true);
    });
  });

  describe('Filter isolation, windowing & memory bounds', () => {
    it('enforces country, category, breaking threshold, and search filters strictly', () => {
      const indiaTech = makeArticle(10, {
        title_english: 'Bengaluru Quantum Chip Milestone',
        categories: ['Tech'],
        breaking_score: 88,
        source: { id: 2, slug: 'hindu', name: 'The Hindu', country: 'IN', url: '', fetch_type: 'rss' },
      });

      expect(
        articleMatchesFilters(indiaTech, {
          selectedCategory: 'Tech',
          selectedCountry: 'IN',
          searchQuery: 'quantum',
          isBreakingOnly: true,
          alertThreshold: 75,
        }),
      ).toBe(true);

      expect(
        articleMatchesFilters(indiaTech, {
          selectedCategory: 'Tech',
          selectedCountry: 'US',
          searchQuery: '',
          isBreakingOnly: false,
        }),
      ).toBe(false);

      expect(
        articleMatchesFilters(indiaTech, {
          selectedCategory: 'Politics',
          selectedCountry: null,
          searchQuery: '',
          isBreakingOnly: false,
        }),
      ).toBe(false);

      expect(
        articleMatchesFilters(indiaTech, {
          selectedCategory: null,
          selectedCountry: null,
          searchQuery: 'moonshot',
          isBreakingOnly: false,
        }),
      ).toBe(false);
    });

    it('caps in-memory articles at MAX_IN_MEMORY_ARTICLES (200) across high-volume bursts', () => {
      let current: Article[] = [];
      for (let i = 1; i <= 350; i += 1) {
        const res = mergeLiveArticleList(current, makeArticle(i), {
          selectedCategory: null,
          selectedCountry: null,
          searchQuery: '',
          isBreakingOnly: false,
        });
        current = res.items;
      }

      expect(current.length).toBe(MAX_IN_MEMORY_ARTICLES);
      expect(current[0]?.id).toBe(350);
      expect(capList(current, 50)).toHaveLength(50);
    });

    it('computes bounded viewport windows for long lists without mounting all items', () => {
      const bounds = computeWindowBounds({
        totalCount: 500,
        scrollTop: 1520,
        viewportHeight: 600,
        estimateItemHeight: 76,
        overscan: 6,
        minRenderCount: 40,
      });

      expect(bounds.endIndex - bounds.startIndex).toBeLessThan(80);
      expect(bounds.startIndex).toBeGreaterThan(0);
      expect(bounds.endIndex).toBeLessThan(500);
    });
  });

  describe('Live refresh interval clamping & store synchronization', () => {
    it('clamps live_refresh_interval_sec between 2s and 30s with default 5s', () => {
      expect(clampLiveRefreshMs(undefined)).toBe(5000);
      expect(clampLiveRefreshMs(1)).toBe(2000);
      expect(clampLiveRefreshMs(2)).toBe(2000);
      expect(clampLiveRefreshMs(12)).toBe(12000);
      expect(clampLiveRefreshMs(99)).toBe(30000);
    });

    it('updates selectedArticle in-place without disturbing autoAdvanceQueueIds', () => {
      const a1 = makeArticle(101, { title_english: 'Initial Headline', breaking_score: 50 });
      const a2 = makeArticle(102, { title_english: 'Second Story' });

      useAppStore.getState().setArticles([a1, a2], 2);
      useAppStore.getState().setSelectedArticle(a1);
      useAppStore.setState({ autoAdvanceQueueIds: [101, 102] });

      const enrichedA1 = makeArticle(101, {
        title_english: 'Updated Desk Headline',
        breaking_score: 91,
        summary: 'Deepened summary from Pass 2',
      });
      const outOfFilterJapan = makeArticle(103, {
        source: { id: 9, slug: 'kyodo', name: 'Kyodo', country: 'JP', url: '', fetch_type: 'rss' },
      });

      useAppStore.setState({ selectedCountry: 'US' });
      useAppStore.getState().applyLiveArticlesBatch([enrichedA1, outOfFilterJapan]);

      const state = useAppStore.getState();
      expect(state.selectedArticle?.title_english).toBe('Updated Desk Headline');
      expect(state.selectedArticle?.breaking_score).toBe(91);
      expect(state.articles.map((a) => a.id)).toEqual([101, 102]);
      expect(state.autoAdvanceQueueIds).toEqual([101, 102]);
    });

    it('updates unread alerts, session gap, bookmark, and remote settings cleanly', () => {
      const a1 = makeArticle(201, { bookmarked: false });
      useAppStore.getState().setArticles([a1], 1);
      useAppStore.getState().setSelectedArticle(a1);

      useAppStore.getState().incrementUnreadAlerts(3);
      useAppStore.getState().applyBookmarkUpdate(201, true);
      useAppStore.getState().applySettingsFromRemote({ live_refresh_interval_sec: 12 });
      useAppStore.getState().applySessionGapUpdate({ detected: true, missed_minutes: 18, can_backfill: true });

      const s = useAppStore.getState();
      expect(s.unreadAlertsCount).toBe(3);
      expect(s.selectedArticle?.bookmarked).toBe(true);
      expect(s.settings.live_refresh_interval_sec).toBe(12);
      expect(s.startupStatus?.detected).toBe(true);
      expect(s.startupStatus?.missed_minutes).toBe(18);
    });
  });

  describe('Main Desk broadsheet UI components', () => {
    it('renders non-blocking Reconnecting chip in StatusStrip only while reconnecting', () => {
      const reconnectingHtml = renderToStaticMarkup(
        <StatusStrip forcedSseStatus="reconnecting" forcedSseReconnectAttempts={2} />,
      );
      expect(reconnectingHtml).toContain('id="status-strip-reconnecting-chip"');
      expect(reconnectingHtml).toContain('Reconnecting... (#2)');

      const connectedHtml = renderToStaticMarkup(
        <StatusStrip forcedSseStatus="connected" forcedSseReconnectAttempts={0} />,
      );
      expect(connectedHtml).not.toContain('status-strip-reconnecting-chip');
    });

    it('renders numeric tabular unread alert badge on RightIconRail only when unreadAlertsCount > 0', () => {
      const withUnreadHtml = renderToStaticMarkup(<RightIconRail forcedUnreadAlertsCount={14} />);
      expect(withUnreadHtml).toContain('id="badge-rail-unread-alerts"');
      expect(withUnreadHtml).toContain('14');
      expect(withUnreadHtml).toContain('tabular-nums');

      const cappedHtml = renderToStaticMarkup(<RightIconRail forcedUnreadAlertsCount={128} />);
      expect(cappedHtml).toContain('99+');

      const cleanHtml = renderToStaticMarkup(<RightIconRail forcedUnreadAlertsCount={0} />);
      expect(cleanHtml).not.toContain('badge-rail-unread-alerts');
    });

    it('renders Live refresh interval slider (2s-30s, default 5s) + Reset button in Settings > News & Sources', () => {
      const html = renderToStaticMarkup(
        <UnifiedSettingsDialog forceOpen initialSection="news_sources" />,
      );

      expect(html).toContain('Live refresh interval');
      expect(html).toContain('id="slider-live-refresh-interval"');
      expect(html).toContain('min="2"');
      expect(html).toContain('max="30"');
      expect(html).toContain('id="value-live-refresh-interval"');
      expect(html).toContain('5s');
      expect(html).toContain('id="btn-reset-live-refresh"');
      expect(html).toContain('Reset to default');
    });
  });
});

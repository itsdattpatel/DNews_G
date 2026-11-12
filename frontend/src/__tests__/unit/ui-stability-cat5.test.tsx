/**
 * frontend/src/__tests__/unit/ui-stability-cat5.test.tsx
 * TDD tests for PRD D Category 5: UI Stability (queue snapshot, new-stories pill,
 * fixed-width/tabular-nums telemetry, zero jump/remount guarantees).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore } from '../../store/useAppStore';
import { CardStrip } from '../../components/article/CardStrip';
import { StatusStrip } from '../../components/layout/StatusStrip';
import { RightIconRail } from '../../components/layout/RightIconRail';
import { TopBar } from '../../components/layout/TopBar';
import { DualTimestamp } from '../../components/common/DualTimestamp';
import type { Article } from '../../types';

function makeArticle(id: number, overrides: Partial<Article> = {}): Article {
  const now = new Date(Date.UTC(2026, 10, 12, 10, id % 60, 0)).toISOString();
  return {
    id,
    url: `https://wire.example.test/${id}`,
    title_english: `Headline Dispatch #${id}`,
    title_original: null,
    body_english: `Wire copy for story #${id}.`,
    body_original: null,
    summary: `Summary for story #${id}`,
    language_detected: 'en',
    published_at: now,
    fetched_at: now,
    ingested_at: now,
    breaking_score: 55,
    bookmarked: false,
    cluster_id: null,
    categories: ['World'],
    keywords: ['diplomacy', `k-${id}`],
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

describe('PRD D Category 5: UI Stability', () => {
  beforeEach(() => {
    useAppStore.setState({
      articles: [],
      pendingNewArticles: [],
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
      startupStatus: {
        status: 'ok',
        uptime_ms: 15000,
        missed_minutes: 8,
        last_fetched_at: new Date(Date.UTC(2026, 10, 12, 10, 0, 0)).toISOString(),
        detected: true,
        can_backfill: true,
        window_start: null,
        window_end: null,
      },
      settings: {
        ...useAppStore.getState().settings,
        auto_advance_enabled: false,
        auto_advance_interval_sec: 7,
        sound_enabled: false,
      },
    });
  });

  describe('Queue snapshot & "N new stories" buffering', () => {
    it('buffers newly arriving live stories without mutating current queue or selection', () => {
      const a102 = makeArticle(102);
      const a101 = makeArticle(101);
      useAppStore.getState().setArticles([a102, a101], 2);

      expect(useAppStore.getState().selectedArticleId).toBe(102);
      expect(useAppStore.getState().autoAdvanceQueueIds).toEqual([102, 101]);

      const a103 = makeArticle(103);
      const a104 = makeArticle(104);
      useAppStore.getState().applyLiveArticlesBatch([a103, a104]);

      const state = useAppStore.getState();
      expect(state.articles.map((a) => a.id)).toEqual([102, 101]);
      expect(state.autoAdvanceQueueIds).toEqual([102, 101]);
      expect(state.selectedArticleId).toBe(102);
      expect(state.pendingNewArticles.map((a) => a.id)).toEqual([104, 103]);
      expect(state.totalArticles).toBe(2);
    });

    it('updates existing in-snapshot story in-place while buffering only brand-new stories', () => {
      const a102 = makeArticle(102);
      const a101 = makeArticle(101);
      useAppStore.getState().setArticles([a102, a101], 2);

      const updated102 = makeArticle(102, { summary: 'Enriched live summary #102' });
      const new105 = makeArticle(105);
      useAppStore.getState().applyLiveArticlesBatch([updated102, new105]);

      const state = useAppStore.getState();
      expect(state.articles.map((a) => a.id)).toEqual([102, 101]);
      expect(state.selectedArticle?.summary).toBe('Enriched live summary #102');
      expect(state.pendingNewArticles.map((a) => a.id)).toEqual([105]);
    });

    it('preserves exact manual and auto-advance order without skips or repeats while pending stories wait', () => {
      const a103 = makeArticle(103);
      const a102 = makeArticle(102);
      const a101 = makeArticle(101);
      useAppStore.getState().setArticles([a103, a102, a101], 3);

      // Buffer two new live dispatches while reading 103
      useAppStore.getState().applyLiveArticlesBatch([makeArticle(104), makeArticle(105)]);
      expect(useAppStore.getState().pendingNewArticles).toHaveLength(2);

      // Step through snapshot: 103 -> 102 -> 101 (no skips, no repeats, pending still waiting)
      useAppStore.getState().nextArticle();
      expect(useAppStore.getState().selectedArticleId).toBe(102);
      expect(useAppStore.getState().pendingNewArticles.map((a) => a.id)).toEqual([105, 104]);

      useAppStore.getState().nextArticle();
      expect(useAppStore.getState().selectedArticleId).toBe(101);
      expect(useAppStore.getState().pendingNewArticles.map((a) => a.id)).toEqual([105, 104]);

      // Step backward stays on snapshot too: 101 -> 102 -> 103
      useAppStore.getState().prevArticle();
      expect(useAppStore.getState().selectedArticleId).toBe(102);
    });

    it('merges pending new stories smoothly when user clicks the "N new stories" pill action', () => {
      const a102 = makeArticle(102);
      const a101 = makeArticle(101);
      useAppStore.getState().setArticles([a102, a101], 2);
      useAppStore.getState().nextArticle(); // Now reading 101

      useAppStore.getState().applyLiveArticlesBatch([makeArticle(103), makeArticle(104)]);
      useAppStore.getState().mergePendingNewArticles();

      const state = useAppStore.getState();
      expect(state.pendingNewArticles).toHaveLength(0);
      expect(state.articles.map((a) => a.id)).toEqual([104, 103, 102, 101]);
      expect(state.autoAdvanceQueueIds).toEqual([104, 103, 102, 101]);
      expect(state.selectedArticleId).toBe(101); // Never jerks currently read story
      expect(state.totalArticles).toBe(4);
    });

    it('merges pending new stories automatically on queue wrap-around', () => {
      const a102 = makeArticle(102);
      const a101 = makeArticle(101);
      useAppStore.getState().setArticles([a102, a101], 2);

      useAppStore.getState().applyLiveArticlesBatch([makeArticle(103)]);
      useAppStore.getState().nextArticle(); // 102 -> 101
      expect(useAppStore.getState().selectedArticleId).toBe(101);

      // Wrap around past end of queue (101 -> wrap)
      useAppStore.getState().nextArticle();
      const state = useAppStore.getState();
      expect(state.pendingNewArticles).toHaveLength(0);
      expect(state.articles.map((a) => a.id)).toEqual([103, 102, 101]);
      expect(state.autoAdvanceQueueIds).toEqual([103, 102, 101]);
      expect(state.selectedArticleId).toBe(103);
      expect(state.totalArticles).toBe(3);
    });

    it('clears pendingNewArticles when filters change', () => {
      useAppStore.getState().setArticles([makeArticle(101)], 1);
      useAppStore.getState().applyLiveArticlesBatch([makeArticle(102)]);
      expect(useAppStore.getState().pendingNewArticles).toHaveLength(1);

      useAppStore.getState().setSelectedCategory('Tech');
      expect(useAppStore.getState().pendingNewArticles).toHaveLength(0);

      useAppStore.getState().applyLiveArticlesBatch([makeArticle(103, { categories: ['Tech'] })]);
      expect(useAppStore.getState().pendingNewArticles).toHaveLength(1);

      useAppStore.getState().setSelectedCountry('JP');
      expect(useAppStore.getState().pendingNewArticles).toHaveLength(0);
    });
  });

  describe('Pill UI, tabular numerals, and fixed-width chips', () => {
    it('renders "#btn-new-stories-pill" in CardStrip only when pendingNewArticles is non-empty', () => {
      const a101 = makeArticle(101);
      const a102 = makeArticle(102);
      const a103 = makeArticle(103);

      const emptyMarkup = renderToStaticMarkup(
        <CardStrip forcedArticles={[a101]} forcedPendingNewArticles={[]} />,
      );
      expect(emptyMarkup).not.toContain('btn-new-stories-pill');

      const oneMarkup = renderToStaticMarkup(
        <CardStrip forcedArticles={[a101]} forcedPendingNewArticles={[a102]} />,
      );
      expect(oneMarkup).toContain('id="btn-new-stories-pill"');
      expect(oneMarkup).toContain('1 new story');
      expect(oneMarkup).toContain('tabular-nums');

      const twoMarkup = renderToStaticMarkup(
        <CardStrip forcedArticles={[a101]} forcedPendingNewArticles={[a103, a102]} />,
      );
      expect(twoMarkup).toContain('2 new stories');
    });

    it('uses tabular-nums across StatusStrip, TopBar Auto button, RightIconRail badges, and DualTimestamp', () => {
      useAppStore.setState({ unreadAlertsCount: 4 });
      const statusHtml = renderToStaticMarkup(<StatusStrip />);
      const topBarHtml = renderToStaticMarkup(<TopBar />);
      const railHtml = renderToStaticMarkup(<RightIconRail />);
      const timeHtml = renderToStaticMarkup(
        <DualTimestamp publishedAt={new Date(Date.UTC(2026, 10, 12, 9, 45, 0)).toISOString()} />,
      );

      expect(statusHtml).toContain('tabular-nums');
      expect(topBarHtml).toContain('tabular-nums');
      expect(railHtml).toContain('tabular-nums');
      expect(timeHtml).toContain('tabular-nums');
    });
  });
});

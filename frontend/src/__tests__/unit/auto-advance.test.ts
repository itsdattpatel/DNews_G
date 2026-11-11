/**
 * frontend/src/__tests__/unit/auto-advance.test.ts
 * Category 2: Auto-Advance reader state and navigation wrap tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

describe('Category 2: Auto-Advance & Wrap Navigation (PRD A 2.2)', () => {
  const dummyArticles: Article[] = [
    {
      id: 101,
      source: { id: 1, slug: 'hindu', name: 'The Hindu', country: 'India', url: '', fetch_type: 'rss' },
      url: 'http://test.com/1',
      title_english: 'Article 101',
      title_original: null,
      body_english: 'Body 1',
      body_original: null,
      summary: 'Summary 1',
      language_detected: 'en',
      published_at: '2026-11-01T20:00:00Z',
      fetched_at: '2026-11-01T20:05:00Z',
      breaking_score: 50,
      bookmarked: false,
      cluster_id: null,
      categories: ['World'],
      keywords: [],
    },
    {
      id: 102,
      source: { id: 1, slug: 'hindu', name: 'The Hindu', country: 'India', url: '', fetch_type: 'rss' },
      url: 'http://test.com/2',
      title_english: 'Article 102',
      title_original: null,
      body_english: 'Body 2',
      body_original: null,
      summary: 'Summary 2',
      language_detected: 'en',
      published_at: '2026-11-01T20:00:00Z',
      fetched_at: '2026-11-01T20:05:00Z',
      breaking_score: 60,
      bookmarked: false,
      cluster_id: null,
      categories: ['World'],
      keywords: [],
    },
    {
      id: 103,
      source: { id: 1, slug: 'hindu', name: 'The Hindu', country: 'India', url: '', fetch_type: 'rss' },
      url: 'http://test.com/3',
      title_english: 'Article 103',
      title_original: null,
      body_english: 'Body 3',
      body_original: null,
      summary: 'Summary 3',
      language_detected: 'en',
      published_at: '2026-11-01T20:00:00Z',
      fetched_at: '2026-11-01T20:05:00Z',
      breaking_score: 80,
      bookmarked: false,
      cluster_id: null,
      categories: ['World'],
      keywords: [],
    },
  ];

  beforeEach(() => {
    useAppStore.setState({
      articles: dummyArticles,
      selectedArticleId: 101,
      selectedArticle: dummyArticles[0],
      autoAdvanceResetToken: 0,
      isAutoAdvanceManualPaused: false,
      isArticlePanelHovered: false,
      settings: {
        refresh_interval_minutes: 5,
        alert_threshold: 75,
        auto_cleanup_enabled: false,
        retention_days: 30,
        sound_enabled: false,
        auto_advance_enabled: true,
        auto_advance_interval_sec: 7,
        auto_advance_pause_on_hover: true,
      },
    });
  });

  it('advances sequentially from first to second article', () => {
    useAppStore.getState().nextArticle();
    expect(useAppStore.getState().selectedArticleId).toBe(102);
  });

  it('wraps seamlessly from the last article to the first article (index 0)', () => {
    // Select the last article (103)
    useAppStore.getState().setSelectedArticle(dummyArticles[2] ?? null);
    expect(useAppStore.getState().selectedArticleId).toBe(103);

    // Call nextArticle: must wrap around to 101!
    useAppStore.getState().nextArticle();
    expect(useAppStore.getState().selectedArticleId).toBe(101);
  });

  it('wraps backwards from the first article to the last article (prevArticle)', () => {
    expect(useAppStore.getState().selectedArticleId).toBe(101);

    // Call prevArticle: must wrap around to 103!
    useAppStore.getState().prevArticle();
    expect(useAppStore.getState().selectedArticleId).toBe(103);
  });

  it('increments autoAdvanceResetToken on manual selection and navigation', () => {
    const initialToken = useAppStore.getState().autoAdvanceResetToken;
    useAppStore.getState().nextArticle();
    expect(useAppStore.getState().autoAdvanceResetToken).toBeGreaterThan(initialToken);

    const token2 = useAppStore.getState().autoAdvanceResetToken;
    useAppStore.getState().setSelectedArticle(dummyArticles[1] ?? null);
    expect(useAppStore.getState().autoAdvanceResetToken).toBeGreaterThan(token2);
  });

  it('toggles manual pause state correctly', () => {
    expect(useAppStore.getState().isAutoAdvanceManualPaused).toBe(false);
    useAppStore.getState().toggleAutoAdvanceManualPaused();
    expect(useAppStore.getState().isAutoAdvanceManualPaused).toBe(true);
    useAppStore.getState().toggleAutoAdvanceManualPaused();
    expect(useAppStore.getState().isAutoAdvanceManualPaused).toBe(false);
  });

  it('tracks article panel hover state', () => {
    expect(useAppStore.getState().isArticlePanelHovered).toBe(false);
    useAppStore.getState().setIsArticlePanelHovered(true);
    expect(useAppStore.getState().isArticlePanelHovered).toBe(true);
    useAppStore.getState().setIsArticlePanelHovered(false);
    expect(useAppStore.getState().isArticlePanelHovered).toBe(false);
  });

  it('resets stale manual pause when enabling auto-advance or toggling StatusStrip Play from Off', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return new Response(
        JSON.stringify({ ...useAppStore.getState().settings, ...body }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    try {
      useAppStore.setState({
        settings: { ...useAppStore.getState().settings, auto_advance_enabled: false },
        isAutoAdvanceManualPaused: true,
      });

      await useAppStore.getState().updateSettings({ auto_advance_enabled: true });
      expect(useAppStore.getState().settings.auto_advance_enabled).toBe(true);
      expect(useAppStore.getState().isAutoAdvanceManualPaused).toBe(false);

      // StatusStrip play/pause from Off turns Auto-Advance ON instead of arming manual pause
      useAppStore.setState({
        settings: { ...useAppStore.getState().settings, auto_advance_enabled: false },
        isAutoAdvanceManualPaused: false,
      });
      await useAppStore.getState().toggleStatusStripPlayPause();
      expect(useAppStore.getState().settings.auto_advance_enabled).toBe(true);
      expect(useAppStore.getState().isAutoAdvanceManualPaused).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('resets currentView back to reader when closing an overlay view (prevents stuck Directory view)', () => {
    useAppStore.getState().setCurrentView('tv');
    useAppStore.getState().setTvViewOpen(true);
    expect(useAppStore.getState().currentView).toBe('tv');

    useAppStore.getState().setTvViewOpen(false);
    expect(useAppStore.getState().isTvViewOpen).toBe(false);
    expect(useAppStore.getState().currentView).toBe('reader');

    useAppStore.getState().setCurrentView('control-room');
    useAppStore.getState().setControlRoomOpen(true);
    useAppStore.getState().setControlRoomOpen(false);
    expect(useAppStore.getState().currentView).toBe('reader');

    useAppStore.getState().setCurrentView('globe');
    useAppStore.getState().setGlobeOpen(true);
    useAppStore.getState().setGlobeOpen(false);
    expect(useAppStore.getState().currentView).toBe('reader');
  });

  it('keeps active queue order & reset token stable when SSE prepends articles while running, joining on wrap-around', () => {
    useAppStore.setState((s) => ({
      settings: { ...s.settings, auto_advance_enabled: true },
    }));
    useAppStore.getState().setArticles(dummyArticles, 3);
    useAppStore.getState().setSelectedArticle(dummyArticles[0] ?? null);

    const tokenBeforeSse = useAppStore.getState().autoAdvanceResetToken;

    // Simulate SSE injecting a brand new breaking article at id 999
    useAppStore.getState().addOrPrependArticle({
      ...dummyArticles[0]!,
      id: 999,
      title_english: 'Breaking Live Wire Arrival',
    });

    // Must NEVER trigger timer reset!
    expect(useAppStore.getState().autoAdvanceResetToken).toBe(tokenBeforeSse);

    // Queue order stays [101, 102, 103] without skipping/repeating/reshuffling
    useAppStore.getState().nextArticle({ isAutoAdvance: true });
    expect(useAppStore.getState().selectedArticleId).toBe(102);
    // Auto-advance transition itself must NOT bump manual reset token
    expect(useAppStore.getState().autoAdvanceResetToken).toBe(tokenBeforeSse);

    useAppStore.getState().nextArticle({ isAutoAdvance: true });
    expect(useAppStore.getState().selectedArticleId).toBe(103);

    // Wrapping around from end of snapshot merges live arrival 999 cleanly
    useAppStore.getState().nextArticle({ isAutoAdvance: true });
    expect(useAppStore.getState().selectedArticleId).toBe(999);
  });
});

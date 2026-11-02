/**
 * frontend/src/__tests__/unit/auto-advance.test.ts
 * Category 2: Auto-Advance reader state and navigation wrap tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
});

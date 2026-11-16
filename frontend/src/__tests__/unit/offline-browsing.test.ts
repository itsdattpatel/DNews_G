/**
 * frontend/src/__tests__/unit/offline-browsing.test.ts
 * Invariant test: Saved articles and data remain fully visible and readable
 * when offline, and reconnection resumes scraping (User request validation).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

describe('Offline Data Preservation & Browsing Invariant', () => {
  const sampleSavedArticles: Article[] = [
    {
      id: 101,
      source: { id: 1, slug: 'reuters', name: 'Reuters', country: 'International', url: '', fetch_type: 'rss' },
      url: 'https://reuters.com/news/101',
      title_english: 'Global Economic Accord Signed in Geneva',
      title_original: null,
      body_english: 'Delegates from 40 nations ratified the historic agreement.\n\nKey provisions ensure sustainable trade.',
      body_original: null,
      summary: 'Delegates from 40 nations ratified the historic agreement.',
      language_detected: 'en',
      published_at: '2026-11-16T10:00:00Z',
      fetched_at: '2026-11-16T10:05:00Z',
      breaking_score: 75,
      bookmarked: true,
      cluster_id: 12,
      categories: ['Business', 'World'],
      keywords: ['accord', 'geneva', 'trade'],
    },
    {
      id: 102,
      source: { id: 2, slug: 'bbc', name: 'BBC News', country: 'United Kingdom', url: '', fetch_type: 'rss' },
      url: 'https://bbc.com/news/102',
      title_english: 'New Clean Energy Milestone Reached',
      title_original: null,
      body_english: 'Offshore wind farms supplied more than half of the national grid electricity today.',
      body_original: null,
      summary: 'Offshore wind farms supplied record electricity.',
      language_detected: 'en',
      published_at: '2026-11-16T11:00:00Z',
      fetched_at: '2026-11-16T11:05:00Z',
      breaking_score: 40,
      bookmarked: false,
      cluster_id: 14,
      categories: ['Tech', 'Environment'],
      keywords: ['energy', 'wind'],
    },
  ];

  beforeEach(() => {
    useAppStore.setState({
      articles: sampleSavedArticles,
      selectedArticleId: 101,
      selectedArticle: sampleSavedArticles[0],
      isOnline: true,
      reconnectedRecently: false,
    });
  });

  it('keeps all previously saved articles intact and readable when network drops offline', () => {
    // 1. Simulate network loss
    useAppStore.getState().setConnectivityOnline(false);

    const state = useAppStore.getState();
    // Watchdog updates offline status
    expect(state.isOnline).toBe(false);

    // Existing saved articles are NEVER cleared or hidden
    expect(state.articles.length).toBe(2);
    expect(state.articles[0].title_english).toBe('Global Economic Accord Signed in Geneva');
    expect(state.selectedArticle?.body_english).toContain('Key provisions ensure sustainable trade');
  });

  it('allows switching selected article and reading full text while offline', async () => {
    useAppStore.getState().setConnectivityOnline(false);

    // User navigates to article 102
    await useAppStore.getState().selectArticleById(102);

    const state = useAppStore.getState();
    expect(state.selectedArticleId).toBe(102);
    expect(state.selectedArticle?.title_english).toBe('New Clean Energy Milestone Reached');
    expect(state.selectedArticle?.body_english).toContain('Offshore wind farms');
  });

  it('notifies user of reconnection without disrupting current reading', () => {
    // Drop offline
    useAppStore.getState().setConnectivityOnline(false);
    expect(useAppStore.getState().isOnline).toBe(false);

    // Reconnection occurs
    useAppStore.getState().setConnectivityOnline(true);
    const state = useAppStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.reconnectedRecently).toBe(true);

    // Current reading article remains uninterrupted
    expect(state.selectedArticleId).toBe(101);
    expect(state.articles.length).toBe(2);
  });
});

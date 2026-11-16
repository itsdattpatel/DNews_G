/**
 * frontend/src/__tests__/unit/first-run-article-panel.test.tsx
 * Tests the initial-edition first-run ingestion state in ArticlePanel.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticlePanel } from '../../components/article/ArticlePanel';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

describe('ArticlePanel First-Run & Ingestion States', () => {
  beforeEach(() => {
    useAppStore.setState({
      articles: [],
      selectedArticle: null,
      selectedArticleId: null,
      isLoading: false,
    });
  });

  it('renders authentic broadsheet "First Edition" state when desk has 0 articles', () => {
    const html = renderToStaticMarkup(<ArticlePanel articles={[]} article={null} />);
    expect(html).toContain('article-panel-first-run');
    expect(html).toContain('HOT OFF THE PRESS');
    expect(html).toContain("Printing Today&#x27;s First Edition");
    expect(html).toContain('155 international bureaus across 70+ nations');
    expect(html).toContain('Fetch Wire Dispatches Now');
  });

  it('renders standard desk prompt when articles exist but none selected', () => {
    const dummyArticle: Article = {
      id: 1,
      url: 'https://reuters.com/news-1',
      title_english: 'World Dispatch #1',
      source: { id: 1, name: 'Reuters', country: 'United Kingdom' },
      published_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      summary: '',
      breaking_score: 50,
      cluster_id: null,
      bookmarked: false,
      keywords: [],
      categories: ['World'],
    };

    const html = renderToStaticMarkup(<ArticlePanel articles={[dummyArticle]} article={null} />);
    expect(html).toContain('article-panel-empty');
    expect(html).toContain('The Wire Dispatch Desk');
    expect(html).not.toContain('article-panel-first-run');
  });

  it('renders full article report when a dispatch is selected', () => {
    const dummyArticle: Article = {
      id: 42,
      url: 'https://bbc.com/world-42',
      title_english: 'Historic Global Climate Accord Signed in Geneva',
      body_english: 'Delegates from 195 nations reached an unprecedented consensus today in Geneva.',
      summary: 'Geneva accord unites 195 nations on emissions milestones.',
      source: { id: 2, name: 'BBC News', country: 'United Kingdom' },
      published_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      categories: ['World', 'Environment'],
      breaking_score: 85,
      cluster_id: null,
      bookmarked: false,
      keywords: ['climate', 'geneva'],
    };

    const html = renderToStaticMarkup(
      <ArticlePanel articles={[dummyArticle]} article={dummyArticle} />
    );
    expect(html).toContain('article-panel');
    expect(html).toContain('Historic Global Climate Accord Signed in Geneva');
    expect(html).not.toContain('article-panel-first-run');
    expect(html).not.toContain('article-panel-empty');
  });
});

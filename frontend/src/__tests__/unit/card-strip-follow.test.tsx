/**
 * frontend/src/__tests__/unit/card-strip-follow.test.tsx
 * Unit test suite for PRD C Category 4: CardStrip Active Follow & Highlight.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardStrip } from '../../components/article/CardStrip';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

const MOCK_ARTICLES: Article[] = [
  {
    id: 101,
    url: 'https://example.com/1',
    title_english: 'First Global Dispatch Report',
    summary: 'Summary of dispatch 1',
    breaking_score: 40,
    cluster_id: null,
    bookmarked: false,
    published_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 1, name: 'Reuters', country: 'US', url: '', fetch_type: 'rss' },
    categories: ['World'],
    keywords: ['global'],
  },
  {
    id: 102,
    url: 'https://example.com/2',
    title_english: 'Second Breaking News Wire',
    summary: 'Summary of dispatch 2',
    breaking_score: 90,
    cluster_id: null,
    bookmarked: true,
    published_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 2, name: 'BBC News', country: 'UK', url: '', fetch_type: 'rss' },
    categories: ['Politics'],
    keywords: ['politics'],
  },
  {
    id: 103,
    url: 'https://example.com/3',
    title_english: 'Third Tech Innovation Story',
    summary: 'Summary of dispatch 3',
    breaking_score: 25,
    cluster_id: null,
    bookmarked: false,
    published_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    source: { id: 3, name: 'Kyodo', country: 'JP', url: '', fetch_type: 'rss' },
    categories: ['Tech'],
    keywords: ['tech'],
  },
];

describe('PRD C Category 4: CardStrip Following & Highlighting', () => {
  beforeEach(() => {
    useAppStore.setState({
      articles: MOCK_ARTICLES,
      selectedArticleId: 102,
      settings: {
        ...useAppStore.getState().settings,
        strip_follow_enabled: true,
        strip_follow_grace_sec: 4,
      },
    });
  });

  it('renders card strip container, track and navigation scroll buttons', () => {
    const html = renderToStaticMarkup(<CardStrip />);
    expect(html).toContain('id="card-strip-container"');
    expect(html).toContain('id="card-strip-track"');
    expect(html).toContain('id="btn-card-strip-prev"');
    expect(html).toContain('id="btn-card-strip-next"');
  });

  it('renders all article cards with unique IDs and data-active-card flags', () => {
    const html = renderToStaticMarkup(
      <CardStrip forcedArticles={MOCK_ARTICLES} forcedSelectedArticleId={102} />
    );
    expect(html).toContain('id="article-card-101"');
    expect(html).toContain('id="article-card-102"');
    expect(html).toContain('id="article-card-103"');

    // Article 102 is selected
    expect(html).toContain('id="article-card-102"');
    expect(html).toContain('data-active-card="true"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-current="true"');

    // Article 101 is not selected
    expect(html).toContain('id="article-card-101"');
    expect(html).toContain('data-active-card="false"');
    expect(html).toContain('aria-selected="false"');
  });

  it('renders high impact breaking badge and bookmark state', () => {
    const html = renderToStaticMarkup(
      <CardStrip forcedArticles={MOCK_ARTICLES} forcedSelectedArticleId={102} />
    );
    // Article 102 has breaking_score 90
    expect(html).toContain('90%');
    expect(html).toContain('High Impact Breaking Story');
  });

  it('renders follow paused badge when user scrolls during grace window', () => {
    const html = renderToStaticMarkup(
      <CardStrip
        forcedArticles={MOCK_ARTICLES}
        forcedSelectedArticleId={102}
        forcedFollowPaused={true}
        forcedStripFollowEnabled={true}
        forcedStripFollowGraceSec={4}
      />
    );
    expect(html).toContain('id="card-strip-follow-paused-badge"');
    expect(html).toContain('Follow paused (4s)');
  });

  it('renders empty placeholder message when no articles exist', () => {
    useAppStore.setState({ articles: [], selectedArticleId: null });
    const html = renderToStaticMarkup(<CardStrip />);
    expect(html).toContain('No dispatches match the current filter');
  });
});

/**
 * frontend/src/components/category/CategoryRailView.tsx
 * Screen (b): Full Broadsheet Category Rail & Instant Wire Filter (Step 6).
 * Pure Tailwind design tokens, ink-and-paper contrast, newspaper top-rules,
 * authentic ink-stamp category tags, 5-dot breaking rating scale, and full loading/empty/error states.
 */
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useArticles } from '../../hooks/useArticles';
import { Badge } from '@/components/ui/badge';
import { getBreakingScoreDots, formatArticleByline } from '../../utils/category';
import {
  Search,
  Flame,
  Star,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'World',
  'Politics',
  'Business',
  'Tech',
  'Science',
  'Health',
  'Sports',
  'Entertainment',
  'Environment',
  'Animals',
  'Crime',
];

const COUNTRIES = [
  { label: 'All Regions', value: null },
  { label: 'India', value: 'India' },
  { label: 'USA', value: 'USA' },
  { label: 'China', value: 'China' },
  { label: 'Japan', value: 'Japan' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Wildlife Wire', value: 'Animals' },
];

export const CategoryRailView: React.FC = () => {
  const articles = useAppStore((s) => s.articles);
  const totalArticles = useAppStore((s) => s.totalArticles);
  const isLoading = useAppStore((s) => s.isLoading);
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const isBreakingOnly = useAppStore((s) => s.isBreakingOnly);
  const toggleBreakingOnly = useAppStore((s) => s.toggleBreakingOnly);
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [sortBy, setSortBy] = useState<'latest' | 'breaking'>('latest');

  // Trigger reactive article fetching based on active filters
  useArticles();

  // Client-side sort if needed
  const sortedArticles = useMemo(() => {
    const list = [...articles];
    if (sortBy === 'breaking') {
      return list.sort((a, b) => (b.breaking_score ?? 0) - (a.breaking_score ?? 0));
    }
    return list.sort((a, b) => {
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [articles, sortBy]);

  const handleOpenArticle = (id: number) => {
    selectArticleById(id);
    setCurrentView('reader');
  };

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedCountry(null);
    setSearchQuery('');
    if (isBreakingOnly) toggleBreakingOnly();
  };

  return (
    <div
      id="category-rail-view"
      className="flex-1 w-full h-full overflow-y-auto bg-paper text-ink p-6 sm:p-8 lg:p-10 select-none flex flex-col gap-6"
    >
      {/* 1. Header Section: Masthead Kicker & Category Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b-2 border-ink">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
              Section Desk · Catalog & Wire Archive
            </span>
            <span className="text-ink-muted text-xs">/</span>
            <span className="font-mono text-xs font-bold text-accent">
              {totalArticles} Total Wire Dispatches
            </span>
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
            {selectedCategory ? `${selectedCategory} Wire` : 'Global News Directory'}
          </h1>
        </div>

        {/* Action: Switch to Article Reader */}
        <button
          onClick={() => setCurrentView('reader')}
          className="inline-flex items-center gap-2 px-3.5 py-2 border-2 border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs font-ui text-xs font-bold text-ink transition-colors shadow-xs shrink-0"
        >
          <span>Return to Dual Reader Desk</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 2. Ink-Stamp Category Tab Rail */}
      <div
        id="category-tab-rail"
        role="tablist"
        aria-label="Category Desks"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === 'All' ? selectedCategory === null : selectedCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
              className={`shrink-0 px-3 py-1 rounded-xs font-ui text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
                isActive
                  ? 'border-2 border-ink bg-ink text-paper shadow-xs scale-102 font-extrabold'
                  : 'border border-paper-border bg-paper-alt hover:border-ink hover:bg-paper text-ink-secondary hover:text-ink'
              }`}
            >
              {cat === 'All' ? '─ All Wire ─' : cat}
            </button>
          );
        })}
      </div>

      {/* 3. Filter Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border border-paper-border bg-paper-alt rounded-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              id="category-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category dispatches (verbatim or keywords)..."
              className="w-full pl-9 pr-8 py-1.5 bg-paper border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink placeholder:text-ink-muted focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Country / Region Selector */}
          <div className="relative">
            <select
              aria-label="Filter by Region"
              value={selectedCountry ?? ''}
              onChange={(e) => setSelectedCountry(e.target.value ? e.target.value : null)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-paper border border-paper-border hover:border-ink focus:border-ink rounded-xs font-ui text-xs font-semibold text-ink cursor-pointer focus:outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.label} value={c.value ?? ''}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted"
            />
          </div>

          {/* Breaking Only Filter Toggle */}
          <button
            onClick={toggleBreakingOnly}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-bold transition-all shadow-xs ${
              isBreakingOnly
                ? 'border-accent bg-accent text-white font-extrabold'
                : 'border-paper-border bg-paper hover:border-accent/60 text-ink-secondary hover:text-accent'
            }`}
          >
            <Flame size={13} fill={isBreakingOnly ? 'currentColor' : 'none'} />
            <span>Breaking Only</span>
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted">
            Sort:
          </span>
          <button
            onClick={() => setSortBy(sortBy === 'latest' ? 'breaking' : 'latest')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-paper-border hover:border-ink bg-paper rounded-xs font-mono text-xs font-semibold text-ink transition-colors"
            title="Toggle Sort Order"
          >
            <SlidersHorizontal size={11} />
            <span>{sortBy === 'latest' ? 'Latest Wire ▾' : 'Breaking Score ▾'}</span>
          </button>
        </div>
      </div>

      {/* 4. Main Grid Viewport */}
      {isLoading ? (
        /* Loading Skeleton: 9 broadsheet cards */
        <div
          id="category-grid-loading"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="p-4 border border-paper-border bg-paper-alt rounded-xs flex flex-col justify-between h-[210px] animate-pulse"
            >
              <div>
                <div className="h-[2px] bg-paper-border w-full mb-3" />
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-20 bg-paper-border rounded-xs" />
                  <div className="h-4 w-12 bg-paper-border rounded-xs" />
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-5 w-full bg-paper-border rounded-xs" />
                  <div className="h-5 w-4/5 bg-paper-border rounded-xs" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-paper-border rounded-xs" />
                  <div className="h-3 w-3/4 bg-paper-border rounded-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-paper-border">
                <div className="h-3 w-28 bg-paper-border rounded-xs" />
                <div className="h-3 w-14 bg-paper-border rounded-xs" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedArticles.length === 0 ? (
        /* Empty State: Broadsheet wire dispatch illustration */
        <div
          id="category-grid-empty"
          className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-paper-border rounded-xs bg-paper-alt min-h-[380px]"
        >
          {/* Custom SVG Broadsheet Newspaper Dispatch Illustration */}
          <div className="p-4 border-2 border-ink rounded-xs bg-paper mb-4 shadow-sm">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ink"
            >
              {/* Folded newspaper folio */}
              <rect x="10" y="8" width="44" height="48" rx="2" />
              <line x1="16" y1="16" x2="48" y2="16" strokeWidth="2.5" />
              <line x1="16" y1="22" x2="36" y2="22" />
              <line x1="16" y1="28" x2="30" y2="28" />
              <line x1="16" y1="34" x2="30" y2="34" />
              <line x1="16" y1="40" x2="30" y2="40" />
              <rect x="34" y="26" width="14" height="18" fill="currentColor" fillOpacity="0.1" />
              <line x1="16" y1="46" x2="48" y2="46" strokeDasharray="2 2" />
            </svg>
          </div>

          <h3 className="font-headline text-2xl font-bold text-ink tracking-tight mb-2">
            No Wire Dispatches Found
          </h3>
          <p className="font-body text-sm text-ink-secondary max-w-md mb-6 leading-relaxed">
            The editorial wire monitors are actively polling global syndicates, but
            no reports currently match your selected filters.
          </p>

          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs font-ui text-xs font-bold text-ink transition-colors shadow-xs"
          >
            <RotateCcw size={13} />
            <span>Reset All Section Filters</span>
          </button>
        </div>
      ) : (
        /* Populated Grid of Broadsheet Cards */
        <div
          id="category-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {sortedArticles.map((article) => {
            const isBreaking = (article.breaking_score ?? 0) >= 75;
            const primaryCategory = article.categories?.[0] || 'General';
            const byline = formatArticleByline(article);
            const dots = getBreakingScoreDots(article.breaking_score ?? 0);

            const timeStr = article.published_at
              ? new Date(article.published_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent Wire';

            return (
              <article
                key={article.id}
                id={`category-card-${article.id}`}
                data-testid="category-article-card"
                onClick={() => handleOpenArticle(article.id)}
                className="group relative p-4 bg-paper-alt hover:bg-paper border border-paper-border hover:border-ink rounded-xs flex flex-col justify-between cursor-pointer transition-all duration-150 hover:-translate-y-1 shadow-xs hover:shadow-md"
              >
                {/* 1. Newspaper Top Rule Divider */}
                <div>
                  <div
                    className={`h-[2px] w-full mb-3.5 transition-colors ${
                      isBreaking ? 'bg-accent' : 'bg-ink group-hover:bg-ink'
                    }`}
                  />

                  {/* Top Line: Category Stamp + Breaking Dots + Bookmark */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <Badge category={primaryCategory} className="text-[0.625rem] px-2 py-0.5" />

                    <div className="flex items-center gap-2">
                      {/* 5-Dot Breaking Score Scale (UI_SPEC Screen b) */}
                      <div
                        className="flex items-center gap-1 font-mono text-[0.6875rem]"
                        title={`Breaking Impact Score: ${article.breaking_score ?? 0}%`}
                      >
                        {Array.from({ length: dots.total }).map((_, dIdx) => (
                          <span
                            key={dIdx}
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                              dIdx < dots.filled
                                ? isBreaking
                                  ? 'bg-accent'
                                  : 'bg-ink'
                                : 'bg-paper-border'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Bookmark Star Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(article.id);
                        }}
                        aria-label={article.bookmarked ? 'Remove bookmark' : 'Bookmark story'}
                        className="p-1 text-ink-muted hover:text-amber-600 transition-colors"
                      >
                        <Star
                          size={13}
                          fill={article.bookmarked ? 'currentColor' : 'none'}
                          className={article.bookmarked ? 'text-amber-600' : 'text-ink-muted'}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Headline: Playfair Serif */}
                  <h2 className="font-headline text-lg sm:text-xl font-bold text-ink leading-snug tracking-tight mb-2 line-clamp-2 group-hover:text-ink/90 transition-colors">
                    {article.title_english || article.title_original}
                  </h2>

                  {/* Excerpt / Summary: Source Serif */}
                  {article.summary && (
                    <p className="font-body text-xs text-ink-secondary leading-relaxed line-clamp-2 mb-3">
                      {article.summary}
                    </p>
                  )}
                </div>

                {/* Footer: Outlet · Country Byline & Time */}
                <div className="pt-3 border-t border-paper-border flex items-center justify-between text-ink-secondary text-[0.6875rem]">
                  <span className="font-ui font-semibold truncate max-w-[170px]" title={byline}>
                    {byline}
                  </span>
                  <span className="font-mono text-ink-muted shrink-0">{timeStr}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryRailView;

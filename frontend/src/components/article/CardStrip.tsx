/**
 * frontend/src/components/article/CardStrip.tsx
 * Bottom horizontal wire dispatch strip styled as broadsheet news cards.
 * Performance-optimized with React.memo, pure Tailwind design tokens, and zero inline styles.
 * Supports horizontal two-finger swipe, vertical wheel tilt scroll, and non-overlapping arrow navigators.
 */
import React, { useRef, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';

interface ArticleCardItemProps {
  article: Article;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onToggleBookmark: (id: number) => void;
}

const ArticleCardItem = memo<ArticleCardItemProps>(({
  article,
  isSelected,
  onSelect,
  onToggleBookmark,
}) => {
  const isBreaking = (article.breaking_score ?? 0) >= 75;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(article.id);
    }
  };

  return (
    <div
      id={`article-card-${article.id}`}
      data-testid="article-card"
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`Dispatch: ${article.title_english || article.title_original} from ${article.source.name}`}
      onClick={() => onSelect(article.id)}
      onKeyDown={handleKeyDown}
      className={`relative shrink-0 w-[300px] min-w-[300px] h-[150px] p-3.5 rounded-xs flex flex-col justify-between cursor-pointer transition-all ${
        isSelected
          ? 'border-2 border-ink bg-paper shadow-md -translate-y-1 news-rule-t'
          : isBreaking
          ? 'border-2 border-accent bg-paper-alt hover:bg-paper hover:border-ink shadow-xs'
          : 'border border-paper-border/80 bg-paper-alt/60 hover:bg-paper hover:border-ink hover:-translate-y-0.5'
      }`}
    >
      {/* Card Header: Outlet + Country + Breaking/Bookmark */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-wider text-ink truncate max-w-[130px]">
            {article.source.name}
          </span>
          <span className="text-ink-muted text-xs">·</span>
          <span className="font-ui text-[0.625rem] text-ink-secondary truncate max-w-[80px]">
            {article.source.country}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isBreaking && (
            <span
              title="High Impact Breaking Story"
              className="inline-flex items-center gap-1 font-mono text-[0.625rem] font-bold text-accent px-1.5 py-0.5 rounded-xs border border-accent/40 bg-accent/10"
            >
              <Flame size={11} fill="currentColor" />
              <span>{article.breaking_score}%</span>
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article.id);
            }}
            aria-label={article.bookmarked ? 'Remove bookmark' : 'Bookmark story'}
            className="p-1 text-ink-muted hover:text-amber-600 transition-colors"
            title="Bookmark story"
          >
            <Star
              size={13}
              fill={article.bookmarked ? 'currentColor' : 'none'}
              className={article.bookmarked ? 'text-amber-600' : 'text-ink-muted'}
            />
          </button>
        </div>
      </div>

      {/* Card Headline */}
      <h4 className="font-headline text-sm font-bold text-ink line-clamp-2 leading-snug my-1">
        {article.title_english || article.title_original}
      </h4>

      {/* Card Footer: Category Stamps & Dual Timestamp */}
      <div className="flex items-center justify-between pt-2 border-t border-paper-border/60">
        <div className="flex gap-1 overflow-hidden shrink-0">
          {(article.categories || []).slice(0, 1).map((cat: string, i: number) => (
            <span
              key={i}
              className="font-ui text-[0.5625rem] uppercase font-semibold px-1.5 py-0.5 rounded-xs border border-paper-border bg-paper text-ink-secondary"
            >
              {cat}
            </span>
          ))}
        </div>
        <DualTimestamp
          layout="compact"
          publishedAt={article.published_at}
          ingestedAt={article.ingested_at || article.fetched_at}
          isCatchup={Boolean(article.is_catchup)}
          className="ml-auto truncate max-w-[170px]"
        />
      </div>
    </div>
  );
});

ArticleCardItem.displayName = 'ArticleCardItem';

export const CardStrip: React.FC = () => {
  const articles = useAppStore((s) => s.articles);
  const selectedArticleId = useAppStore((s) => s.selectedArticleId);
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Convert vertical wheel events to horizontal scrolling over cards strip
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <footer
      id="card-strip-container"
      role="region"
      aria-label="Dispatch wire feed"
      className="relative z-30 w-full h-full min-h-0 min-w-0 bg-paper-alt border-t-2 border-ink flex items-center select-none overflow-hidden transition-colors duration-150"
    >
      {/* Non-overlapping Left Scroll Pillar */}
      <div className="shrink-0 px-2 h-full flex items-center justify-center bg-paper-alt border-r border-paper-border/60 z-10 shadow-xs">
        <button
          onClick={() => handleScroll(-340)}
          aria-label="Scroll wire left"
          className="p-1.5 rounded-xs border border-ink bg-paper text-ink shadow-xs hover:bg-ink hover:text-paper transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Cards Scroll Track (Two-finger swipe + wheel support) */}
      <div
        id="card-strip-track"
        ref={scrollContainerRef}
        onWheel={handleWheel}
        data-lenis-prevent="true"
        role="feed"
        aria-busy="false"
        className="flex-1 flex items-center gap-3.5 px-4 py-2 overflow-x-auto overscroll-x-contain h-full"
      >
        {articles.length === 0 ? (
          <div className="font-ui text-xs text-ink-muted italic m-auto">
            No dispatches match the current filter. Live radar scanning wire...
          </div>
        ) : (
          articles.map((art) => (
            <ArticleCardItem
              key={art.id}
              article={art}
              isSelected={art.id === selectedArticleId}
              onSelect={selectArticleById}
              onToggleBookmark={toggleBookmark}
            />
          ))
        )}
      </div>

      {/* Non-overlapping Right Scroll Pillar */}
      <div className="shrink-0 px-2 h-full flex items-center justify-center bg-paper-alt border-l border-paper-border/60 z-10 shadow-xs">
        <button
          onClick={() => handleScroll(340)}
          aria-label="Scroll wire right"
          className="p-1.5 rounded-xs border border-ink bg-paper text-ink shadow-xs hover:bg-ink hover:text-paper transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
};

export default CardStrip;

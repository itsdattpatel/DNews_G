/**
 * frontend/src/components/article/CardStrip.tsx
 * Bottom horizontal wire dispatch strip styled as broadsheet news cards.
 * Performance-optimized with React.memo, pure Tailwind design tokens, and zero inline styles.
 */
import React, { useRef, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import { ScoutBadge } from '../spider/ScoutBadge';
import { SpiderGlyph } from '../spider/SpiderGlyph';

interface ArticleCardItemProps {
  article: Article;
  isSelected: boolean;
  isScoutTarget: boolean;
  onSelect: (id: number) => void;
  onToggleBookmark: (id: number) => void;
}

const ArticleCardItem = memo<ArticleCardItemProps>(({
  article,
  isSelected,
  isScoutTarget,
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
          : isScoutTarget
          ? 'border-2 border-dashed border-ink/50 bg-paper-alt/70'
          : 'border border-paper-border/80 bg-paper-alt/60 hover:bg-paper hover:border-ink hover:-translate-y-0.5'
      }`}
    >
      {/* Scout Indicator */}
      {isScoutTarget && !isSelected && <ScoutBadge />}

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

      {/* Card Footer: Category Stamps & Spider Badge */}
      <div className="flex items-center justify-between pt-2 border-t border-paper-border/60">
        <div className="flex gap-1 overflow-hidden">
          {(article.categories || []).slice(0, 2).map((cat: string, i: number) => (
            <span
              key={i}
              className="font-ui text-[0.5625rem] uppercase font-semibold px-1.5 py-0.5 rounded-xs border border-paper-border bg-paper text-ink-secondary"
            >
              {cat}
            </span>
          ))}
        </div>

        <span className="inline-flex items-center gap-1 font-mono text-[0.5625rem] text-ink-muted">
          <SpiderGlyph size={10} color="currentColor" />
          <span>{article.spider_type || 'Reader'}</span>
        </span>
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

  // Identify next upcoming card for Scout Spider pre-marking
  const currentIndex = articles.findIndex((art) => art.id === selectedArticleId);
  const nextIndex = currentIndex >= 0 && articles.length > 1 ? (currentIndex + 1) % articles.length : -1;

  const handleScroll = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <footer
      id="card-strip-container"
      role="region"
      aria-label="Dispatch wire feed"
      className="relative z-30 h-[180px] min-h-[180px] bg-paper-alt border-t-2 border-ink flex flex-col justify-center transition-colors duration-150 select-none"
    >
      {/* Scroll controls */}
      <button
        onClick={() => handleScroll(-340)}
        aria-label="Scroll wire left"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-xs border border-ink bg-paper text-ink shadow-xs hover:bg-paper-alt transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        onClick={() => handleScroll(340)}
        aria-label="Scroll wire right"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-xs border border-ink bg-paper text-ink shadow-xs hover:bg-paper-alt transition-colors"
      >
        <ChevronRight size={16} />
      </button>

      {/* Cards Scroll Track */}
      <div
        id="card-strip-track"
        ref={scrollContainerRef}
        role="feed"
        aria-busy="false"
        className="flex items-center gap-3.5 px-12 py-3 overflow-x-auto overflow-y-hidden no-scrollbar h-full"
      >
        {articles.length === 0 ? (
          <div className="font-ui text-xs text-ink-muted italic m-auto">
            No dispatches match the current filter. Live radar scanning wire...
          </div>
        ) : (
          articles.map((art, index) => (
            <ArticleCardItem
              key={art.id}
              article={art}
              isSelected={art.id === selectedArticleId}
              isScoutTarget={index === nextIndex}
              onSelect={selectArticleById}
              onToggleBookmark={toggleBookmark}
            />
          ))
        )}
      </div>
    </footer>
  );
};

export default CardStrip;

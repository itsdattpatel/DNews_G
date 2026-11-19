/**
 * frontend/src/components/article/CircularDock.tsx
 * Circling Arched Bottom Docker overlaying the unified reader desk:
 * - Floating broadsheet frosted glass bar (backdrop-blur-xl bg-paper/85)
 * - Arched circular orbit geometry: cards on left/right flanks slope down and curve
 *   upward toward the apex center where the focused story box is completely elevated and clearly seeable.
 * - Flanking cards have progressive radial blur that clears into crystal-sharp focus at center.
 * - Auto-centers dynamically on story focus change (auto-advance, click, j/k navigation).
 * - Preserves bookmarking, breaking badges, timestamps, and full keyboard accessibility.
 */
import React, { useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';
import { ConfirmationBadge } from '../common/ConfirmationBadge';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface CircularCardProps {
  article: Article;
  isSelected: boolean;
  offset: number; // distance from active index (0 = center focused card)
  onSelect: (id: number) => void;
  onToggleBookmark: (id: number) => void;
}

const CircularCard = memo<CircularCardProps>(({
  article,
  isSelected,
  offset,
  onSelect,
  onToggleBookmark,
}) => {
  const isBreaking = (article.breaking_score ?? 0) >= 75;
  const absOffset = Math.abs(offset);

  // Circular curve calculation:
  // Center (offset 0) is elevated at apex (-16px) with 0 blur, 100% opacity, scale 1.05
  // Flanks slope downward (+6px per unit) with progressive blur up to 5px and reduced opacity
  const translateY = isSelected ? -14 : Math.min(28, absOffset * 6.5);
  const scale = isSelected ? 1.06 : Math.max(0.86, 1.0 - absOffset * 0.04);
  const blurPx = isSelected ? 0 : Math.min(4.5, absOffset * 1.25);
  const opacity = isSelected ? 1 : Math.max(0.45, 1 - absOffset * 0.12);
  const rotateDeg = Math.max(-6, Math.min(6, offset * 1.2));
  const zIndex = isSelected ? 25 : Math.max(1, 20 - absOffset);

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
      data-active-card={isSelected ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`Dispatch: ${article.title_english || article.title_original} from ${article.source.name}`}
      onClick={() => onSelect(article.id)}
      onKeyDown={handleKeyDown}
      style={{
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotateDeg}deg)`,
        filter: blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none',
        opacity,
        zIndex,
        transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1), filter 320ms ease, opacity 320ms ease, border-color 200ms ease',
      }}
      className={`relative shrink-0 w-[275px] sm:w-[295px] h-[132px] p-3 rounded-lg flex flex-col justify-between cursor-pointer select-none pointer-events-auto [contain:layout_style] ${
        isSelected
          ? 'border-2 border-[var(--color-ink,#111827)] bg-[var(--color-paper,#fff)] shadow-xl ring-2 ring-[var(--color-ink,#111827)]/20'
          : isBreaking
          ? 'border-2 border-accent/80 bg-paper-alt hover:bg-paper hover:border-ink shadow-sm'
          : 'border border-paper-border/90 bg-paper/95 hover:bg-paper hover:border-ink shadow-xs'
      }`}
    >
      {/* Card Header: Outlet + Country + Breaking/Bookmark */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-wider text-ink truncate max-w-[125px]">
            {article.source.name}
          </span>
          <span className="text-ink-muted text-xs">·</span>
          <span className="font-ui text-[0.625rem] text-ink-secondary truncate max-w-[75px]">
            {article.source.country}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isBreaking && (
            <span
              title="High Impact Breaking Story"
              className="inline-flex items-center gap-1 font-mono text-[0.5625rem] font-bold tabular-nums text-accent px-1.5 py-0.5 rounded border border-accent/40 bg-accent/10"
            >
              <Flame size={10} fill="currentColor" />
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
              size={12}
              fill={article.bookmarked ? 'currentColor' : 'none'}
              className={article.bookmarked ? 'text-amber-600' : 'text-ink-muted'}
            />
          </button>
        </div>
      </div>

      {/* Card Headline */}
      <h4 className="font-headline text-[0.8125rem] sm:text-sm font-bold text-ink line-clamp-2 leading-snug my-1">
        {article.title_english || article.title_original}
      </h4>

      {/* Card Footer: Category Stamps, Confirmation Stamp & Dual Timestamp */}
      <div className="flex items-center justify-between pt-1.5 border-t border-paper-border/60 gap-1.5 overflow-hidden">
        <div className="flex items-center gap-1 overflow-hidden shrink-0">
          {(article.categories || []).slice(0, 1).map((cat: string, i: number) => (
            <span
              key={i}
              className="font-ui text-[0.5625rem] uppercase font-semibold px-1.5 py-0.5 rounded border border-paper-border bg-paper text-ink-secondary"
            >
              {cat}
            </span>
          ))}
          <ConfirmationBadge article={article} variant="compact" />
        </div>
        <DualTimestamp
          layout="compact"
          publishedAt={article.published_at}
          ingestedAt={article.ingested_at || article.fetched_at}
          isCatchup={Boolean(article.is_catchup)}
          className="ml-auto truncate max-w-[120px] shrink-0"
        />
      </div>
    </div>
  );
});

CircularCard.displayName = 'CircularCard';

export interface CircularDockProps {
  forcedArticles?: Article[];
  forcedSelectedArticleId?: number | null;
}

export const CircularDock: React.FC<CircularDockProps> = ({
  forcedArticles,
  forcedSelectedArticleId,
}) => {
  const storeArticles = useAppStore((s) => s.articles);
  const articles = forcedArticles ?? storeArticles;
  const storeSelectedArticleId = useAppStore((s) => s.selectedArticleId);
  const selectedArticleId = forcedSelectedArticleId !== undefined ? forcedSelectedArticleId : storeSelectedArticleId;
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const prevArticle = useAppStore((s) => s.prevArticle);

  const isAutoAdvance = useAppStore((s) => s.settings.auto_advance_enabled ?? false);
  const autoAdvanceInterval = useAppStore((s) => s.settings.auto_advance_interval_sec ?? 7);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserInteractingRef = useRef(false);
  const graceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active index
  const activeIndex = articles.findIndex((a) => a.id === selectedArticleId);

  // Smooth scroll center active card
  const centerCard = useCallback(
    (articleId: number | null, smooth = true) => {
      if (!articleId || !scrollContainerRef.current) return;
      const cardEl = document.getElementById(`article-card-${articleId}`);
      const trackEl = scrollContainerRef.current;
      if (cardEl && trackEl) {
        const targetLeft = Math.max(0, cardEl.offsetLeft - (trackEl.clientWidth - cardEl.clientWidth) / 2);
        trackEl.scrollTo({
          left: targetLeft,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    []
  );

  // Auto-center whenever active story changes
  useIsomorphicLayoutEffect(() => {
    if (!isUserInteractingRef.current) {
      centerCard(selectedArticleId, true);
    }
  }, [selectedArticleId, centerCard]);

  // Center on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      centerCard(selectedArticleId, false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = () => {
    isUserInteractingRef.current = true;
    if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
    graceTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 3500);
  };

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <aside
      id="circular-dock"
      aria-label="Circling Wire Docker"
      className="absolute bottom-3 left-0 right-0 z-30 pointer-events-none flex justify-center items-end px-3 sm:px-6"
    >
      {/* Outer Dock Shell: Frosted broadsheet glass, rounded container */}
      <div className="relative w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl backdrop-blur-xl bg-paper/85 dark:bg-paper/90 border border-paper-border/80 shadow-2xl rounded-2xl pt-2 pb-3.5 px-3 pointer-events-auto overflow-hidden">
        
        {/* Subtle Top Indicator Bar */}
        <div className="flex items-center justify-between px-3 pb-1.5 text-[0.6875rem] font-mono text-ink-secondary border-b border-paper-border/40 select-none">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-ink">Orbit Wire Docker</span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-muted tabular-nums">
              Dispatch {activeIndex >= 0 ? activeIndex + 1 : 1} of {articles.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAutoAdvance && (
              <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] text-accent px-1.5 py-0.5 rounded border border-accent/30 bg-accent/10">
                <span>Auto ({autoAdvanceInterval}s)</span>
              </span>
            )}
            <button
              onClick={() => prevArticle()}
              className="p-1 rounded hover:bg-paper-border/40 text-ink transition-colors"
              title="Previous Story (k / Left Arrow)"
              aria-label="Previous Story"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => nextArticle()}
              className="p-1 rounded hover:bg-paper-border/40 text-ink transition-colors"
              title="Next Story (j / Right Arrow)"
              aria-label="Next Story"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Horizontal Card Track with Left/Right Soft Blur Gradient Overlays */}
        <div className="relative w-full mt-2">
          {/* Left flank soft blur mask */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 z-20 bg-gradient-to-r from-[var(--color-paper,#FAF7F0)] via-[var(--color-paper,#FAF7F0)]/70 to-transparent"
          />

          {/* Right flank soft blur mask */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 z-20 bg-gradient-to-l from-[var(--color-paper,#FAF7F0)] via-[var(--color-paper,#FAF7F0)]/70 to-transparent"
          />

          {/* Scrollable Track */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth px-8 sm:px-16 pt-5 pb-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              perspective: '1000px',
            }}
          >
            {articles.map((art, idx) => {
              const offset = activeIndex >= 0 ? idx - activeIndex : 0;
              return (
                <CircularCard
                  key={art.id}
                  article={art}
                  isSelected={art.id === selectedArticleId}
                  offset={offset}
                  onSelect={(id) => {
                    selectArticleById(id);
                    centerCard(id, true);
                  }}
                  onToggleBookmark={toggleBookmark}
                />
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};

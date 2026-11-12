/**
 * frontend/src/components/article/CardStrip.tsx
 * PRD C Category 4: Bottom horizontal dispatch strip following active story.
 * - Smoothly centers active card on auto-advance, click, or j/k keys.
 * - Smooth wrap-around when transitioning between last and first card.
 * - Suspends follow during user two-finger drag/wheel for 4s grace period (configurable 2-15s).
 * - Immediate follow resumption on story click, next/prev, or keyboard navigation.
 * - Honors reduce-motion preference (instant jump vs smooth scroll).
 * - Toggleable via Settings > Reading ("Follow current story").
 */
import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';
import { ConfirmationBadge } from '../common/ConfirmationBadge';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
      data-active-card={isSelected ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`Dispatch: ${article.title_english || article.title_original} from ${article.source.name}`}
      onClick={() => onSelect(article.id)}
      onKeyDown={handleKeyDown}
      className={`relative shrink-0 w-[300px] min-w-[300px] h-[150px] p-3.5 rounded-xs flex flex-col justify-between cursor-pointer transition-all duration-150 scroll-anchor-auto [contain:layout_style] ${
        isSelected
          ? 'border-2 border-[var(--color-ink,#111827)] bg-[var(--color-paper,#fff)] shadow-md -translate-y-1 ring-1 ring-[var(--color-ink,#111827)] news-rule-t'
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
              className="inline-flex items-center gap-1 font-mono text-[0.625rem] font-bold tabular-nums text-accent px-1.5 py-0.5 rounded-xs border border-accent/40 bg-accent/10"
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

      {/* Card Footer: Category Stamps, Confirmation Stamp & Dual Timestamp */}
      <div className="flex items-center justify-between pt-2 border-t border-paper-border/60 gap-1.5 overflow-hidden">
        <div className="flex items-center gap-1 overflow-hidden shrink-0">
          {(article.categories || []).slice(0, 1).map((cat: string, i: number) => (
            <span
              key={i}
              className="font-ui text-[0.5625rem] uppercase font-semibold px-1.5 py-0.5 rounded-xs border border-paper-border bg-paper text-ink-secondary"
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
          className="ml-auto truncate max-w-[130px] shrink-0"
        />
      </div>
    </div>
  );
});

ArticleCardItem.displayName = 'ArticleCardItem';

export interface CardStripProps {
  forcedArticles?: Article[];
  forcedPendingNewArticles?: Article[];
  forcedSelectedArticleId?: number | null;
  forcedFollowPaused?: boolean;
  forcedStripFollowEnabled?: boolean;
  forcedStripFollowGraceSec?: number;
}

export const CardStrip: React.FC<CardStripProps> = ({
  forcedArticles,
  forcedPendingNewArticles,
  forcedSelectedArticleId,
  forcedFollowPaused,
  forcedStripFollowEnabled,
  forcedStripFollowGraceSec,
}) => {
  const storeArticles = useAppStore((s) => s.articles);
  const articles = forcedArticles ?? storeArticles;
  const storePendingNewArticles = useAppStore((s) => s.pendingNewArticles);
  const pendingNewArticles = forcedPendingNewArticles ?? storePendingNewArticles;
  const mergePendingNewArticles = useAppStore((s) => s.mergePendingNewArticles);

  const storeSelectedArticleId = useAppStore((s) => s.selectedArticleId);
  const selectedArticleId = forcedSelectedArticleId !== undefined ? forcedSelectedArticleId : storeSelectedArticleId;

  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const prevAnchorRef = useRef<{ id: number; offsetLeft: number } | null>(null);

  // Settings for auto-follow (PRD C Category 4)
  const storeStripFollowEnabled = useAppStore((s) => s.settings.strip_follow_enabled ?? true);
  const stripFollowEnabled = forcedStripFollowEnabled !== undefined ? forcedStripFollowEnabled : storeStripFollowEnabled;

  const storeStripFollowGraceSec = useAppStore((s) => s.settings.strip_follow_grace_sec ?? 4);
  const stripFollowGraceSec = forcedStripFollowGraceSec !== undefined ? forcedStripFollowGraceSec : storeStripFollowGraceSec;

  const reduceMotionOverride = useAppStore((s) => s.settings.reduce_motion_override ?? 'system');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserInteractingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const graceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [internalFollowPaused, setInternalFollowPaused] = useState(false);
  const followPaused = forcedFollowPaused !== undefined ? forcedFollowPaused : internalFollowPaused;

  // Resolve reduce-motion
  const getScrollBehavior = useCallback((): ScrollBehavior => {
    if (reduceMotionOverride === 'reduce') return 'auto';
    if (reduceMotionOverride === 'allow') return 'smooth';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'auto';
    }
    return 'smooth';
  }, [reduceMotionOverride]);

  // Center target card in container
  const centerCard = useCallback(
    (articleId: number | null, overrideBehavior?: ScrollBehavior) => {
      if (!articleId || !scrollContainerRef.current) return;
      const cardEl = document.getElementById(`article-card-${articleId}`);
      const trackEl = scrollContainerRef.current;
      if (cardEl && trackEl) {
        // Calculate centered offset
        const targetLeft = Math.max(0, cardEl.offsetLeft - (trackEl.clientWidth - cardEl.clientWidth) / 2);
        trackEl.scrollTo({
          left: targetLeft,
          behavior: overrideBehavior || getScrollBehavior(),
        });
      }
    },
    [getScrollBehavior]
  );

  // Resume follow immediately
  const resumeFollow = useCallback(() => {
    isUserInteractingRef.current = false;
    setInternalFollowPaused(false);
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
    }
  }, []);

  // User manual scroll / drag trigger
  const handleUserInteraction = useCallback(() => {
    isUserInteractingRef.current = true;
    setInternalFollowPaused(true);

    if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
    graceTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      setInternalFollowPaused(false);
    }, stripFollowGraceSec * 1000);
  }, [stripFollowGraceSec]);

  // Track onScroll: ONLY treat as user interaction if pointer is actively dragging scrollbar
  const handleTrackScroll = () => {
    if (isPointerDownRef.current) {
      handleUserInteraction();
    }
  };

  // Manual button scroll
  const handleScrollBy = (offset: number) => {
    handleUserInteraction();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: getScrollBehavior() });
    }
  };

  // Convert vertical wheel events to horizontal scrolling over cards strip
  const handleWheel = (e: React.WheelEvent) => {
    handleUserInteraction();
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Immediate resume of follow on direct card select
  const handleDirectSelect = useCallback(
    (id: number) => {
      resumeFollow();
      selectArticleById(id);
      centerCard(id);
    },
    [resumeFollow, selectArticleById, centerCard]
  );

  // Global listener: keys j/k or Arrow navigation immediately resumes follow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['j', 'k', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        resumeFollow();
      }
    };

    const handlePointerUp = () => {
      isPointerDownRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resumeFollow]);

  // Compensate horizontal scrollLeft when stories are merged/prepended while scrolled away from start
  useIsomorphicLayoutEffect(() => {
    const trackEl = scrollContainerRef.current;
    const prevAnchor = prevAnchorRef.current;
    const firstId = articles[0]?.id ?? null;

    if (trackEl && prevAnchor && firstId !== null && firstId !== prevAnchor.id) {
      if (trackEl.scrollLeft > 16 || isUserInteractingRef.current) {
        const shiftedEl = document.getElementById(`article-card-${prevAnchor.id}`);
        if (shiftedEl) {
          const delta = shiftedEl.offsetLeft - prevAnchor.offsetLeft;
          if (delta > 0) {
            trackEl.scrollLeft += delta;
          }
        }
      }
    }

    if (firstId !== null && typeof document !== 'undefined') {
      const firstEl = document.getElementById(`article-card-${firstId}`);
      prevAnchorRef.current = firstEl
        ? { id: firstId, offsetLeft: firstEl.offsetLeft }
        : { id: firstId, offsetLeft: 16 };
    } else {
      prevAnchorRef.current = null;
    }
  }, [articles]);

  // When selectedArticleId changes:
  useEffect(() => {
    if (!stripFollowEnabled) return;
    if (!selectedArticleId) return;

    // Do not fight user during active 4s scroll grace window
    if (isUserInteractingRef.current) return;

    centerCard(selectedArticleId);
  }, [selectedArticleId, stripFollowEnabled, centerCard]);

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
          id="btn-card-strip-prev"
          onClick={() => handleScrollBy(-340)}
          aria-label="Scroll wire left"
          className="p-1.5 rounded-xs border border-ink bg-paper text-ink shadow-xs hover:bg-ink hover:text-paper transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Cards Scroll Track (Two-finger swipe + wheel support) */}
      <div
        id="card-strip-track"
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onPointerDown={() => { isPointerDownRef.current = true; }}
        onScroll={handleTrackScroll}
        data-lenis-prevent="true"
        role="feed"
        aria-busy="false"
        className="flex-1 flex items-center gap-3.5 px-4 py-2 overflow-x-auto overscroll-x-contain h-full scrollbar-thin"
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
              onSelect={handleDirectSelect}
              onToggleBookmark={toggleBookmark}
            />
          ))
        )}
      </div>

      {/* Floating "N new stories" Merge Pill (position: absolute so 0 px layout shift) */}
      {pendingNewArticles.length > 0 && (
        <button
          type="button"
          id="btn-new-stories-pill"
          data-testid="new-stories-pill"
          onClick={() => {
            mergePendingNewArticles();
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTo({ left: 0, behavior: getScrollBehavior() });
            }
          }}
          aria-label={`Load ${pendingNewArticles.length} new ${pendingNewArticles.length === 1 ? 'story' : 'stories'} into wire`}
          className="absolute left-14 top-2 z-30 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-ink bg-accent text-paper font-mono text-[0.6875rem] font-bold tabular-nums shadow-md hover:brightness-110 transition-opacity cursor-pointer animate-row-fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-paper shrink-0" />
          <span>
            {pendingNewArticles.length} new {pendingNewArticles.length === 1 ? 'story' : 'stories'}
          </span>
        </button>
      )}

      {/* User Scroll Grace Indicator */}
      {followPaused && stripFollowEnabled && (
        <div
          id="card-strip-follow-paused-badge"
          className="absolute right-14 bottom-2 z-20 px-2 py-0.5 font-mono text-[10px] font-semibold bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] text-[var(--color-ink-muted,#6b7280)] rounded-xs shadow-xs pointer-events-none animate-in fade-in duration-150"
        >
          Follow paused ({stripFollowGraceSec}s)
        </div>
      )}

      {/* Non-overlapping Right Scroll Pillar */}
      <div className="shrink-0 px-2 h-full flex items-center justify-center bg-paper-alt border-l border-paper-border/60 z-10 shadow-xs">
        <button
          id="btn-card-strip-next"
          onClick={() => handleScrollBy(340)}
          aria-label="Scroll wire right"
          className="p-1.5 rounded-xs border border-ink bg-paper text-ink shadow-xs hover:bg-ink hover:text-paper transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
};

export default CardStrip;

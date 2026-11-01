/**
 * frontend/src/components/article/SummaryPanel.tsx
 * Right Summary Column (40%): Broadsheet executive intelligence summary.
 * Sentence-by-sentence structured reading page linked directly to left-panel evidence.
 * Pure Tailwind, zero cyberpunk inline styles, full loading/empty/error states.
 */
import React, { useState, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Star, Sparkles, Layers, Clock } from 'lucide-react';
import { SpiderCanvas } from '../spider/SpiderCanvas';

export const SummaryPanel: React.FC = () => {
  const article = useAppStore((s) => s.selectedArticle);
  const isLoading = useAppStore((s) => s.isLoading);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);
  const setTimelineClusterId = useAppStore((s) => s.setTimelineClusterId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const activeSentenceIndex = useAppStore((s) => s.activeSentenceIndex);
  const setActiveSentenceIndex = useAppStore((s) => s.setActiveSentenceIndex);

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(-1);

  // Split summary into discrete sentences
  const sentences = useMemo(() => {
    if (!article?.summary) return [];
    // Match sentence boundaries (period, question mark, exclamation mark followed by space or end)
    const raw = article.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [article.summary];
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
  }, [article?.summary]);

  const isBreaking = (article?.breaking_score ?? 0) >= 75;

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div
        id="summary-panel-loading"
        className="flex-[2] h-full overflow-y-auto p-6 sm:p-8 bg-paper-alt border-ink animate-pulse flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-paper-border mb-6">
            <div className="h-5 w-36 bg-paper-border rounded-xs" />
            <div className="h-6 w-20 bg-paper-border rounded-xs" />
          </div>
          <div className="space-y-4">
            <div className="h-20 w-full bg-paper rounded-xs border border-paper-border" />
            <div className="h-24 w-full bg-paper rounded-xs border border-paper-border" />
            <div className="h-20 w-full bg-paper rounded-xs border border-paper-border" />
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!article) {
    return (
      <div
        id="summary-panel-empty"
        className="flex-[2] h-full flex flex-col items-center justify-center p-8 text-center bg-paper-alt text-ink"
      >
        <div className="p-4 border-2 border-ink rounded-xs bg-paper mb-4 shadow-xs">
          <Sparkles size={32} className="text-ink" />
        </div>
        <h3 className="font-headline text-xl font-bold text-ink tracking-tight mb-2">
          Executive Summary Wire
        </h3>
        <p className="font-ui text-xs text-ink-secondary max-w-xs">
          AI synthesis, key evidence quotes, and cross-source comparisons will appear here once a dispatch is chosen.
        </p>
      </div>
    );
  }

  return (
    <div
      id="summary-panel"
      ref={containerRef}
      className="flex-[2] h-full relative overflow-y-auto p-6 sm:p-8 bg-paper-alt text-ink flex flex-col justify-between transition-colors duration-150 select-none"
    >
      {/* Retain SpiderCanvas for procedural mount (Step 5 will replace this) */}
      <SpiderCanvas
        containerRef={containerRef}
        keywords={article.keywords || []}
        spiderType={article.spider_type}
        breakingScore={article.breaking_score}
        onKeywordActive={(idx) => setActiveKeywordIndex(idx)}
      />

      <div className="relative z-10 flex flex-col gap-6">
        {/* 1. Header & Actions Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-paper-border">
          <div className="flex items-center gap-2">
            <span className="font-ui text-[0.6875rem] uppercase font-bold tracking-widest text-ink-secondary">
              Executive Briefing
            </span>
            {isBreaking ? (
              <span className="font-ui text-[0.625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs border border-accent bg-accent/15 text-accent shadow-xs">
                Breaking ({article.breaking_score}%)
              </span>
            ) : (
              <span className="font-mono text-[0.625rem] uppercase px-2 py-0.5 rounded-xs border border-paper-border bg-paper text-ink-muted">
                {article.spider_type || 'Reader'} Desk
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bookmark Action */}
            <button
              id="bookmark-toggle-btn"
              onClick={() => toggleBookmark(article.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs border text-xs font-semibold transition-all shadow-xs ${
                article.bookmarked
                  ? 'border-ink bg-paper text-amber-700 dark:text-amber-400 font-bold'
                  : 'border-paper-border bg-paper hover:border-ink text-ink-secondary hover:text-ink'
              }`}
              title="Bookmark this dispatch"
            >
              <Star size={13} fill={article.bookmarked ? 'currentColor' : 'none'} />
              <span>{article.bookmarked ? 'Saved' : 'Save Story'}</span>
            </button>
          </div>
        </div>

        {/* 2. Structured Sentence-Level Intelligence Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-lg font-bold text-ink">
              Key Intelligence Takeaways
            </h3>
            <span className="font-mono text-[0.625rem] text-ink-muted">
              {sentences.length} {sentences.length === 1 ? 'bullet' : 'points'}
            </span>
          </div>

          <div className="space-y-2.5">
            {sentences.map((sentence, idx) => {
              const isActive = activeSentenceIndex === idx;

              return (
                <div
                  key={idx}
                  data-sentence-index={idx}
                  onMouseEnter={() => setActiveSentenceIndex(idx)}
                  onMouseLeave={() => setActiveSentenceIndex(null)}
                  onClick={() => {
                    setActiveSentenceIndex(idx);
                    const anchor = document.getElementById(`anchor-sentence-${idx}`);
                    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`p-3.5 rounded-xs border transition-all cursor-pointer ${
                    isActive
                      ? 'border-ink bg-paper shadow-xs border-l-4 border-l-accent -translate-x-0.5'
                      : 'border-paper-border/80 bg-paper/70 hover:bg-paper hover:border-ink'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-[0.6875rem] font-bold text-ink-muted pt-0.5 select-none shrink-0">
                      § {idx + 1}
                    </span>
                    <p className="font-body text-sm sm:text-[0.9375rem] leading-relaxed text-ink select-text">
                      {sentence}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Keywords & Entities Wire Stamp */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="pt-4 border-t border-paper-border">
            <span className="font-ui text-[0.6875rem] uppercase font-bold tracking-wider text-ink-muted block mb-2">
              Tracked Subject Entities:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {article.keywords.map((kw, i) => (
                <span
                  key={i}
                  className={`font-mono text-[0.6875rem] px-2 py-0.5 rounded-xs border transition-colors ${
                    activeKeywordIndex === i
                      ? 'border-ink bg-ink text-paper font-bold'
                      : 'border-paper-border bg-paper text-ink-secondary hover:border-ink hover:text-ink'
                  }`}
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Cross-Coverage Actions & Timeline Drawer Trigger */}
      <div className="relative z-10 pt-6 mt-6 border-t-2 border-ink space-y-2">
        {article.cluster_id ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                setCompareClusterId(article.cluster_id);
                setCurrentView('compare');
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs font-ui text-xs font-bold text-ink transition-colors shadow-xs"
            >
              <Layers size={13} />
              <span>Compare World Outlets</span>
            </button>
            <button
              onClick={() => {
                setTimelineClusterId(article.cluster_id);
                setCurrentView('timeline');
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-paper-border bg-paper-alt hover:border-ink hover:bg-paper rounded-xs font-ui text-xs font-bold text-ink transition-colors"
            >
              <Clock size={13} />
              <span>Story Timeline</span>
            </button>
          </div>
        ) : (
          <div className="font-ui text-[0.6875rem] text-ink-muted text-center italic">
            Single wire report · No international cluster detected yet
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPanel;

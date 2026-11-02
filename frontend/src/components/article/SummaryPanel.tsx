/**
 * frontend/src/components/article/SummaryPanel.tsx
 * Right Summary Column (40%): Broadsheet executive intelligence summary.
 * Sentence-by-sentence structured reading page linked directly to left-panel evidence.
 * Pure Tailwind, zero cyberpunk inline styles, full loading/empty/error states.
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Star, Layers, Clock, Sparkles, Play, Pause } from 'lucide-react';
import type { Article } from '../../types';

export interface SummaryPanelProps {
  article?: Article | null;
  plainMode?: boolean;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  article: propArticle,
  plainMode: propPlainMode,
}) => {
  const storeArticle = useAppStore((s) => s.selectedArticle);
  const storePlainMode = useAppStore((s) => s.settings.plain_mode_enabled ?? false);
  const article = propArticle !== undefined ? propArticle : storeArticle;
  const isPlainMode = propPlainMode !== undefined ? propPlainMode : storePlainMode;
  const isLoading = useAppStore((s) => s.isLoading);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);
  const setTimelineClusterId = useAppStore((s) => s.setTimelineClusterId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const activeSentenceIndex = useAppStore((s) => s.activeSentenceIndex);
  const setActiveSentenceIndex = useAppStore((s) => s.setActiveSentenceIndex);
  const isReadingModeConfigured = useAppStore(
    (s) => s.settings.reading_mode_enabled ?? true
  );
  const isReadingModeActive = useAppStore((s) => s.isReadingModeActive);
  const toggleReadingMode = useAppStore((s) => s.toggleReadingMode);
  const pass2Threshold = useAppStore((s) => s.settings.pass2_threshold ?? 75);
  const enrichArticlePass2 = useAppStore((s) => s.enrichArticlePass2);

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(-1);
  const [isEnriching, setIsEnriching] = useState(false);

  const handleSummarizeStory = async () => {
    if (!article?.id || isEnriching) return;
    setIsEnriching(true);
    try {
      await enrichArticlePass2(article.id);
    } finally {
      setIsEnriching(false);
    }
  };

  // Split summary into discrete sentences
  const sentences = useMemo(() => {
    if (!article?.summary) return [];
    // Match sentence boundaries (period, question mark, exclamation mark followed by space or end)
    const raw = article.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [article.summary];
    return raw.map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }, [article?.summary]);

  const isBreaking = (article?.breaking_score ?? 0) >= 75;

  // Synchronized Reading Mode sweep (respecting prefers-reduced-motion)
  useEffect(() => {
    if (!isReadingModeActive || !isReadingModeConfigured || sentences.length === 0) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (activeSentenceIndex === null) {
        setActiveSentenceIndex(0);
      }
      return;
    }

    if (activeSentenceIndex === null || activeSentenceIndex >= sentences.length) {
      setActiveSentenceIndex(0);
    }

    const interval = setInterval(() => {
      const current = useAppStore.getState().activeSentenceIndex;
      const next = current === null ? 0 : current + 1;
      setActiveSentenceIndex(next >= sentences.length ? 0 : next);
    }, 3600);

    return () => clearInterval(interval);
  }, [isReadingModeActive, isReadingModeConfigured, sentences.length, setActiveSentenceIndex]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div
        id="summary-panel-loading"
        data-lenis-prevent="true"
        className="w-full h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain p-6 sm:p-8 bg-paper-alt border-ink animate-pulse flex flex-col justify-between"
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
        data-lenis-prevent="true"
        className="w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center p-8 text-center bg-paper-alt text-ink"
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
      data-lenis-prevent="true"
      className="w-full h-full min-h-0 min-w-0 relative overflow-y-auto overscroll-contain p-6 sm:p-8 bg-paper-alt text-ink flex flex-col justify-between transition-colors duration-150 select-none"
    >
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
                Editorial Wire
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Reading Mode Action */}
            {isReadingModeConfigured && sentences.length > 0 && (
              <button
                id="btn-reading-mode-toggle"
                onClick={() => toggleReadingMode()}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs border text-xs font-semibold transition-all shadow-xs ${
                  isReadingModeActive
                    ? 'border-accent bg-accent/15 text-accent font-bold ring-1 ring-accent/30'
                    : 'border-paper-border bg-paper hover:border-ink text-ink-secondary hover:text-ink'
                }`}
                title={isReadingModeActive ? 'Pause Reading Mode sweep' : 'Start synchronized Reading Mode'}
              >
                {isReadingModeActive ? (
                  <>
                    <Pause size={12} className="text-accent animate-pulse" />
                    <span>Reading…</span>
                  </>
                ) : (
                  <>
                    <Play size={12} className="text-ink" />
                    <span>Reading Mode</span>
                  </>
                )}
              </button>
            )}

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

        {/* 2. Structured Sentence-Level Intelligence Cards or Pass 1 Triage Card */}
        {sentences.length === 0 ? (
          isPlainMode ? (
            <div className="p-5 border-2 border-dashed border-paper-border bg-paper rounded-xs text-center space-y-2">
              <span className="font-mono text-xs font-bold text-ink-muted uppercase">
                Plain Mode Active
              </span>
              <p className="font-ui text-xs text-ink-secondary">
                AI executive briefing is offline. Read raw dispatches in the left reader panel.
              </p>
            </div>
          ) : (
            <div
              id="summary-pass1-card"
              className="p-6 border-2 border-dashed border-ink/40 bg-paper rounded-xs text-center space-y-4 shadow-xs"
            >
              <div className="inline-flex p-3 border-2 border-ink bg-paper-alt rounded-xs shadow-xs">
                <Sparkles size={24} className="text-accent" />
              </div>
              <div className="space-y-1.5">
                <span className="font-mono text-[0.6875rem] font-bold text-accent uppercase tracking-wider px-2 py-0.5 rounded-xs border border-accent bg-accent/15">
                  ✦ Quick-Scored Dispatch (Pass 1)
                </span>
                <h4 className="font-headline text-base font-bold text-ink pt-1">
                  Pass 2 Synthesis Deferred
                </h4>
                <p className="font-ui text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
                  Urgency score is <strong className="text-ink">{article.breaking_score}%</strong> (Threshold: {pass2Threshold}%). Executive briefing and verbatim anchor quotes were deferred to preserve AI quota.
                </p>
              </div>
              <button
                id="btn-summary-enrich-pass2"
                onClick={handleSummarizeStory}
                disabled={isEnriching}
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink rounded-xs font-ui text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isEnriching ? (
                  <>
                    <span className="animate-spin text-sm">✦</span>
                    <span>Synthesizing Story…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Summarize Story (Pass 2)</span>
                  </>
                )}
              </button>
            </div>
          )
        ) : (
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
              {sentences.map((sentence: string, idx: number) => {
                const isActive = activeSentenceIndex === idx;
                const hasEvidence = (article.anchor_phrases || []).some(
                  (a: { sentence_index: number }) => a.sentence_index === idx
                );

                return (
                  <div
                    key={idx}
                    data-sentence-index={idx}
                    onMouseEnter={() => {
                      if (!isReadingModeActive) setActiveSentenceIndex(idx);
                    }}
                    onMouseLeave={() => {
                      if (!isReadingModeActive) setActiveSentenceIndex(null);
                    }}
                    onClick={() => {
                      setActiveSentenceIndex(idx);
                      const anchor = document.getElementById(`anchor-sentence-${idx}`);
                      if (anchor) {
                        const prefersReducedMotion =
                          typeof window !== 'undefined' &&
                          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        anchor.scrollIntoView({
                          behavior: prefersReducedMotion ? 'auto' : 'smooth',
                          block: 'center',
                        });
                      }
                    }}
                    className={`p-3.5 rounded-xs border transition-all cursor-pointer relative overflow-hidden ${
                      isActive
                        ? 'border-ink bg-paper shadow-xs border-l-4 border-l-accent -translate-x-0.5'
                        : 'border-paper-border/80 bg-paper/70 hover:bg-paper hover:border-ink'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono text-[0.6875rem] font-bold text-ink-muted pt-0.5 select-none shrink-0">
                          § {idx + 1}
                        </span>
                        <p className="font-body text-sm sm:text-[0.9375rem] leading-relaxed text-ink select-text">
                          {sentence}
                        </p>
                      </div>

                      {hasEvidence && (
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold shrink-0 select-none"
                          title="Verbatim evidence anchor linked in article"
                        >
                          Evidence
                        </span>
                      )}
                    </div>

                    {/* Synchronized Reading Mode Sweep Progress Bar */}
                    {isReadingModeActive && isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent/20 overflow-hidden">
                        <div className="h-full bg-accent animate-[reading-progress_3.6s_linear_infinite]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Keywords & Entities Wire Stamp */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="pt-4 border-t border-paper-border">
            <span className="font-ui text-[0.6875rem] uppercase font-bold tracking-wider text-ink-muted block mb-2">
              Tracked Subject Entities:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {article.keywords.map((kw: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveKeywordIndex(activeKeywordIndex === i ? -1 : i)}
                  className={`font-mono text-[0.6875rem] px-2 py-0.5 rounded-xs border cursor-pointer transition-colors ${
                    activeKeywordIndex === i
                      ? 'border-ink bg-ink text-paper font-bold'
                      : 'border-paper-border bg-paper text-ink-secondary hover:border-ink hover:text-ink'
                  }`}
                >
                  #{kw}
                </button>
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

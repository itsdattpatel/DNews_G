/**
 * frontend/src/components/timeline/StoryTimeline.tsx
 * Screen (d): Broadsheet Story Timeline Desk (Step 7).
 * Tracks chronological event progression across an unfolding international story cluster.
 * Features a ruled column timeline, breaking event crimson nodes,
 * interactive dispatch preview card, and pure Tailwind newspaper tokens.
 */
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sseBus } from '../../lib/sseBus';
import {
  X,
  Flame,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  History,
} from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';
import { apiFetch } from '../../lib/api';

interface TimelineArticle {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  ingested_at?: string | null;
  is_catchup?: boolean;
  breaking_score: number;
  categories?: string[];
  source: {
    id: number;
    name: string;
    country: string;
  };
}

interface TimelineClusterData {
  id: number;
  headline: string;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: boolean;
  articles: TimelineArticle[];
}

export const StoryTimeline: React.FC = () => {
  const timelineClusterId = useAppStore((s) => s.timelineClusterId);
  const setTimelineClusterId = useAppStore((s) => s.setTimelineClusterId);
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [cluster, setCluster] = useState<TimelineClusterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && timelineClusterId) {
        setTimelineClusterId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timelineClusterId, setTimelineClusterId]);

  // Fetch cluster details & subscribe to live updates
  useEffect(() => {
    if (!timelineClusterId) {
      setCluster(null);
      return;
    }

    let isMounted = true;
    const loadTimeline = (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
        setSelectedEventIndex(0);
      }

      apiFetch(`/api/clusters/${timelineClusterId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load story timeline`);
          return res.json();
        })
        .then((data: TimelineClusterData) => {
          if (isMounted) {
            // Sort articles chronologically (oldest to newest for event timeline)
            const sorted = [...(data.articles || [])].sort((a, b) => {
              const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
              const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
              return timeA - timeB;
            });
            setCluster({ ...data, articles: sorted });
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            if (!silent) setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
            setLoading(false);
          }
        });
    };

    loadTimeline(false);

    const unsub = sseBus.subscribeMany(
      ['cluster_update', 'article_updated', 'article_enriched_pass2', 'resync'],
      (event, payload) => {
        if (event === 'cluster_update' && payload?.cluster_id && payload.cluster_id !== timelineClusterId) {
          return;
        }
        loadTimeline(true);
      },
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, [timelineClusterId]);

  if (!timelineClusterId) return null;

  const activeArticle = cluster?.articles[selectedEventIndex] ?? cluster?.articles[0];

  const handleOpenArticle = (id: number) => {
    setTimelineClusterId(null);
    selectArticleById(id);
    setCurrentView('reader');
  };

  return (
    <div
      id="story-timeline-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-headline-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-ink/70 backdrop-blur-xs select-none"
      onClick={() => setTimelineClusterId(null)}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Header & Metadata */}
        <div className="p-5 sm:p-6 border-b-2 border-ink bg-paper-alt flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
                Story Progression Chronicle
              </span>
              <span className="text-ink-muted text-xs">/</span>
              <span className="font-mono text-xs font-bold text-ink">
                Cluster #{timelineClusterId}
              </span>
              {cluster?.is_breaking && (
                <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] font-bold px-2 py-0.5 rounded-xs border border-accent bg-accent/15 text-accent">
                  <Flame size={11} fill="currentColor" />
                  <span>Evolving Event</span>
                </span>
              )}
            </div>

            <h2
              id="timeline-headline-title"
              className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-ink truncate"
            >
              {cluster?.headline || `Story Timeline: Cluster #${timelineClusterId}`}
            </h2>

            <div className="font-ui text-xs text-ink-secondary flex items-center gap-2">
              <span>
                Tracking {cluster?.articles?.length || 0} chronological wire updates across{' '}
                {cluster?.outlet_count || 1} world newsrooms
              </span>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-timeline-modal"
            onClick={() => setTimelineClusterId(null)}
            className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
            title="Close Timeline (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Main Body: Ruled Horizontal Timeline + Active Detail Card */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col justify-between gap-6">
          {loading ? (
            /* Loading State: 4 timeline node skeletons */
            <div id="timeline-loading-state" className="space-y-8 animate-pulse">
              <div className="h-24 w-full bg-paper-alt border border-paper-border rounded-xs" />
              <div className="h-44 w-full bg-paper-alt border border-paper-border rounded-xs" />
            </div>
          ) : error ? (
            /* Error State */
            <div
              id="timeline-error-state"
              className="flex flex-col items-center justify-center p-12 text-center text-ink"
            >
              <div className="p-3 border-2 border-accent bg-accent/10 rounded-xs mb-3 text-accent">
                <Flame size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold mb-1">Failed to Load Chronicle</h3>
              <p className="font-body text-xs text-ink-secondary max-w-sm mb-4">{error}</p>
              <button
                onClick={() => setTimelineClusterId(timelineClusterId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs font-ui text-xs font-bold"
              >
                <RefreshCw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : cluster && cluster.articles.length <= 1 ? (
            /* Empty State */
            <div
              id="timeline-empty-state"
              className="flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="p-3 border-2 border-ink rounded-xs bg-paper-alt mb-3">
                <History size={24} className="text-ink-muted" />
              </div>
              <h3 className="font-headline text-xl font-bold mb-1">Single Wire Report</h3>
              <p className="font-body text-xs text-ink-secondary max-w-xs">
                Only one dispatch currently recorded in this cluster — chronological progression will appear as follow-up stories arrive.
              </p>
            </div>
          ) : (
            <>
              {/* Ruled Horizontal Timeline Rail */}
              <div className="p-4 sm:p-6 border border-paper-border bg-paper-alt rounded-xs shadow-xs relative overflow-x-auto no-scrollbar">
                <div className="min-w-max pb-2 pt-4">
                  {/* Newspaper Center Horizontal Ruled Line */}
                  <div className="relative flex items-center justify-between gap-8 sm:gap-12 before:content-[''] before:absolute before:left-0 before:right-0 before:top-1/2 before:-translate-y-1/2 before:h-[2px] before:bg-ink before:z-0">
                    {cluster?.articles.map((art, idx) => {
                      const isSelected = selectedEventIndex === idx;
                      const isEventBreaking = (art.breaking_score ?? 0) >= 75;
                      const timeStr = art.published_at
                        ? new Date(art.published_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Wire';

                      return (
                        <div
                          key={art.id}
                          onClick={() => setSelectedEventIndex(idx)}
                          className={`relative z-10 flex flex-col items-center cursor-pointer group transition-all ${
                            isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                          }`}
                        >
                          {/* Time Stamp Header */}
                          <span className="font-mono text-[0.6875rem] font-bold text-ink-secondary mb-2 bg-paper-alt px-1">
                            {timeStr}
                          </span>

                          {/* Node Circle on the Ruled Line */}
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-xs ${
                              isSelected
                                ? isEventBreaking
                                  ? 'border-accent bg-accent text-white font-bold ring-4 ring-accent/20'
                                  : 'border-ink bg-ink text-paper font-bold ring-4 ring-ink/20'
                                : isEventBreaking
                                ? 'border-accent bg-paper text-accent hover:bg-accent hover:text-white'
                                : 'border-ink bg-paper text-ink hover:bg-ink hover:text-paper'
                            }`}
                          >
                            <span className="font-mono text-[0.625rem]">{idx + 1}</span>
                          </div>

                          {/* Outlet Pill Below */}
                          <div className="mt-2 text-center max-w-[110px]">
                            <span
                              className={`font-ui text-[0.6875rem] font-bold truncate block ${
                                isSelected ? 'text-ink underline' : 'text-ink-secondary'
                              }`}
                            >
                              {art.source.name}
                            </span>
                            <span className="font-mono text-[0.625rem] text-ink-muted">
                              {art.source.country}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Selected Event Detail Panel */}
              {activeArticle && (
                <div
                  id="timeline-active-event-card"
                  className="p-6 sm:p-7 border-2 border-ink bg-paper rounded-xs shadow-sm flex flex-col justify-between gap-4 transition-all"
                >
                  <div>
                    {/* Header: Outlet · Country · Time · Breaking Indicator */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-paper-border mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-ui text-xs font-bold uppercase tracking-wider text-ink">
                          {activeArticle.source.name} · {activeArticle.source.country}
                        </span>
                        <span className="text-ink-muted">·</span>
                        <DualTimestamp
                          publishedAt={activeArticle.published_at}
                          ingestedAt={activeArticle.ingested_at}
                          isCatchup={Boolean(activeArticle.is_catchup)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-xs border border-paper-border bg-paper-alt font-bold">
                          Update {selectedEventIndex + 1} of {cluster?.articles.length}
                        </span>
                        {(activeArticle.breaking_score ?? 0) >= 75 && (
                          <span className="font-mono text-[0.625rem] font-bold px-2 py-0.5 rounded-xs border border-accent bg-accent/15 text-accent">
                            Breaking ({activeArticle.breaking_score}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Headline: Playfair Serif */}
                    <h3 className="font-headline text-xl sm:text-2xl font-bold text-ink leading-snug tracking-tight mb-3">
                      {activeArticle.title_english}
                    </h3>

                    {/* Summary Body: Source Serif */}
                    <p className="font-body text-sm sm:text-base leading-relaxed text-ink-secondary mb-4">
                      {activeArticle.summary}
                    </p>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-4 border-t border-paper-border flex flex-wrap items-center justify-between gap-3">
                    {/* Step Navigation Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedEventIndex === 0}
                        onClick={() => setSelectedEventIndex((i) => Math.max(0, i - 1))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-paper-border hover:border-ink disabled:opacity-40 disabled:hover:border-paper-border bg-paper rounded-xs font-ui text-xs font-bold transition-colors"
                      >
                        <ChevronLeft size={13} />
                        <span>Earlier Event</span>
                      </button>

                      <button
                        type="button"
                        disabled={selectedEventIndex === (cluster?.articles.length ?? 1) - 1}
                        onClick={() =>
                          setSelectedEventIndex((i) =>
                            Math.min((cluster?.articles.length ?? 1) - 1, i + 1),
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-paper-border hover:border-ink disabled:opacity-40 disabled:hover:border-paper-border bg-paper rounded-xs font-ui text-xs font-bold transition-colors"
                      >
                        <span>Later Event</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* Open in Main Reader Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenArticle(activeArticle.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs font-ui text-xs font-bold text-ink transition-colors shadow-xs"
                    >
                      <span>Read Full Wire Dispatch</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryTimeline;

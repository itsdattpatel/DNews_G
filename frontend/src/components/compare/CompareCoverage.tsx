/**
 * frontend/src/components/compare/CompareCoverage.tsx
 * Screen (c): Multi-Outlet Coverage Comparison Desk (Step 7).
 * Side-by-side same-story reporting across world outlets and countries.
 * Features shared keyword extraction, catenary silk curve cross-linking,
 * broadsheet serif typography, and zero cyberpunk inline styles.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Layers,
  Flame,
  ArrowRight,
  Globe2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export interface Point2D {
  x: number;
  y: number;
}

export function generateSilkPath(from: Point2D, to: Point2D): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx1 = from.x + dx * 0.25;
  const cy1 = from.y + dy * 0.1;
  const cx2 = from.x + dx * 0.75;
  const cy2 = to.y - dy * 0.1;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

interface EnrichedClusterArticle {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  breaking_score: number;
  keywords: string[];
  categories: string[];
  source: {
    id: number;
    name: string;
    country: string;
  };
}

interface ClusterData {
  id: number;
  headline: string;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: boolean;
  articles: EnrichedClusterArticle[];
}

const SILK_PALETTE = [
  '#C0392B', // Crimson
  '#2C4A7C', // Navy
  '#1A3D1A', // Forest
  '#B45309', // Amber
  '#4A1A3A', // Plum
  '#1A2A4A', // Steel
];

export const CompareCoverage: React.FC = () => {
  const compareClusterId = useAppStore((s) => s.compareClusterId);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeKeywordFilter, setActiveKeywordFilter] = useState<string | null>(null);
  const [silkThreads, setSilkThreads] = useState<
    Array<{ d: string; color: string; keyword: string }>
  >([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLElement[]>>(new Map());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && compareClusterId) {
        setCompareClusterId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [compareClusterId, setCompareClusterId]);

  // Fetch cluster details
  useEffect(() => {
    if (!compareClusterId) {
      setClusterData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/clusters/${compareClusterId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load cluster`);
        return res.json();
      })
      .then((data: ClusterData) => {
        if (isMounted) {
          setClusterData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch cluster');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [compareClusterId]);

  // Identify shared keywords across articles (P7-05)
  const sharedKeywordsMap = useMemo(() => {
    if (!clusterData || !clusterData.articles) return new Map<string, number>();

    const frequency = new Map<string, number>();
    for (const art of clusterData.articles) {
      const distinctInArt = new Set((art.keywords || []).map((k) => k.toLowerCase()));
      for (const kw of distinctInArt) {
        frequency.set(kw, (frequency.get(kw) ?? 0) + 1);
      }
    }

    // Filter to keywords appearing in >= 2 articles
    const shared = new Map<string, number>();
    let colorIndex = 0;
    for (const [kw, count] of frequency.entries()) {
      if (count >= 2) {
        shared.set(kw, colorIndex % SILK_PALETTE.length);
        colorIndex++;
      }
    }
    return shared;
  }, [clusterData]);

  // Calculate catenary silk threads connecting shared keyword chips (P7-06)
  const computeSilkThreads = () => {
    if (!containerRef.current) return;
    const bodyRect = containerRef.current.getBoundingClientRect();
    const threads: Array<{ d: string; color: string; keyword: string }> = [];

    for (const [kw, colorIdx] of sharedKeywordsMap.entries()) {
      // If a specific keyword is focused, only draw that thread
      if (activeKeywordFilter && activeKeywordFilter !== kw) continue;

      const elements = chipRefs.current.get(kw) || [];
      if (elements.length < 2) continue;

      const points: Point2D[] = elements
        .filter((el) => document.body.contains(el))
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left - bodyRect.left + rect.width / 2 + containerRef.current!.scrollLeft,
            y: rect.top - bodyRect.top + rect.height / 2 + containerRef.current!.scrollTop,
          };
        });

      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        if (from && to) {
          threads.push({
            d: generateSilkPath(from, to),
            color: SILK_PALETTE[colorIdx] ?? '#C0392B',
            keyword: kw,
          });
        }
      }
    }

    setSilkThreads(threads);
  };

  useEffect(() => {
    const timer = setTimeout(computeSilkThreads, 200);
    window.addEventListener('resize', computeSilkThreads);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computeSilkThreads);
    };
  }, [clusterData, sharedKeywordsMap, activeKeywordFilter]);

  if (!compareClusterId) return null;

  const handleOpenArticle = (id: number) => {
    setCompareClusterId(null);
    selectArticleById(id);
    setCurrentView('reader');
  };

  const isBreaking = clusterData?.is_breaking || false;

  return (
    <div
      id="compare-coverage-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-headline-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-ink/70 backdrop-blur-xs select-none"
      onClick={() => setCompareClusterId(null)}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Header & Metadata */}
        <div className="p-5 sm:p-6 border-b-2 border-ink bg-paper-alt flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
                Cross-Wire Comparison Desk
              </span>
              <span className="text-ink-muted text-xs">/</span>
              <span className="font-mono text-xs font-bold text-ink">
                Story Cluster #{compareClusterId}
              </span>
              {isBreaking && (
                <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] font-bold px-2 py-0.5 rounded-xs border border-accent bg-accent/15 text-accent">
                  <Flame size={11} fill="currentColor" />
                  <span>Breaking Story</span>
                </span>
              )}
            </div>

            <h2
              id="compare-headline-title"
              className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-ink truncate"
            >
              {clusterData?.headline || `Coverage Analysis: Story #${compareClusterId}`}
            </h2>

            <div className="font-ui text-xs text-ink-secondary flex items-center gap-2">
              <span>
                Synthesizing {clusterData?.outlet_count || 1} independent news agencies across{' '}
                {clusterData?.country_count || 1} sovereign jurisdictions
              </span>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-compare-modal"
            onClick={() => setCompareClusterId(null)}
            className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
            title="Close Comparison Desk (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Shared Themes Ink-Stamp Toolbar */}
        {sharedKeywordsMap.size > 0 && (
          <div className="px-6 py-3 border-b border-paper-border bg-paper flex flex-wrap items-center gap-2 shrink-0">
            <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
              <Sparkles size={12} className="text-accent" />
              <span>Shared Themes:</span>
            </span>

            {Array.from(sharedKeywordsMap.entries()).map(([kw, colorIdx]) => {
              const isFiltered = activeKeywordFilter === kw;
              const color = SILK_PALETTE[colorIdx] ?? '#C0392B';
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setActiveKeywordFilter(isFiltered ? null : kw)}
                  className={`font-mono text-xs px-2.5 py-0.5 rounded-xs border transition-all ${
                    isFiltered
                      ? 'border-ink bg-ink text-paper font-bold shadow-xs scale-102'
                      : 'border-paper-border bg-paper-alt hover:border-ink text-ink-secondary hover:text-ink'
                  }`}
                  style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
                >
                  #{kw}
                </button>
              );
            })}

            {activeKeywordFilter && (
              <button
                type="button"
                onClick={() => setActiveKeywordFilter(null)}
                className="font-ui text-[0.6875rem] text-ink-muted hover:text-ink underline ml-1"
              >
                Clear theme focus
              </button>
            )}
          </div>
        )}

        {/* 3. Main Multi-Column Reading Body */}
        <div
          ref={containerRef}
          onScroll={computeSilkThreads}
          className="flex-1 overflow-x-auto overflow-y-auto p-6 relative min-h-[380px]"
        >
          {loading ? (
            /* Loading State: 4 broadsheet column skeletons */
            <div id="compare-loading-state" className="flex gap-6 min-w-max h-full">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-[320px] p-5 border border-paper-border bg-paper-alt rounded-xs flex flex-col justify-between animate-pulse"
                >
                  <div>
                    <div className="h-[2px] bg-paper-border w-full mb-3" />
                    <div className="h-4 w-28 bg-paper-border rounded-xs mb-3" />
                    <div className="h-6 w-full bg-paper-border rounded-xs mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-paper-border rounded-xs" />
                      <div className="h-3 w-5/6 bg-paper-border rounded-xs" />
                      <div className="h-3 w-4/6 bg-paper-border rounded-xs" />
                    </div>
                  </div>
                  <div className="h-8 w-full bg-paper-border rounded-xs mt-6" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div
              id="compare-error-state"
              className="flex flex-col items-center justify-center p-12 text-center h-full text-ink"
            >
              <div className="p-3 border-2 border-accent bg-accent/10 rounded-xs mb-4 text-accent">
                <Flame size={28} />
              </div>
              <h3 className="font-headline text-xl font-bold mb-2">Failed to Load Story Cluster</h3>
              <p className="font-body text-sm text-ink-secondary max-w-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setCompareClusterId(compareClusterId);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs font-ui text-xs font-bold"
              >
                <RefreshCw size={12} />
                <span>Retry Transmission</span>
              </button>
            </div>
          ) : clusterData && clusterData.articles.length === 0 ? (
            /* Empty State */
            <div
              id="compare-empty-state"
              className="flex flex-col items-center justify-center p-12 text-center h-full"
            >
              <div className="p-3 border-2 border-ink rounded-xs bg-paper-alt mb-3">
                <Layers size={24} className="text-ink-muted" />
              </div>
              <h3 className="font-headline text-xl font-bold mb-1">Single Wire Report</h3>
              <p className="font-body text-sm text-ink-secondary max-w-xs">
                No matching international member articles found in this story cluster.
              </p>
            </div>
          ) : (
            /* Populated Side-by-Side Broadsheet Columns */
            <div className="relative flex gap-6 min-w-max pb-4">
              {/* Thematic Silk Threads SVG Canvas */}
              <svg
                className="absolute inset-0 pointer-events-none z-10 w-full h-full"
                aria-hidden="true"
              >
                {silkThreads.map((thread, idx) => (
                  <path
                    key={idx}
                    d={thread.d}
                    stroke={thread.color}
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    fill="none"
                    strokeOpacity="0.8"
                  />
                ))}
              </svg>

              {/* Side-by-Side Columns */}
              {clusterData?.articles.map((article) => {
                const primaryCategory = article.categories?.[0] || 'General';
                return (
                  <div
                    key={article.id}
                    id={`compare-column-article-${article.id}`}
                    className="w-[320px] p-5 border border-paper-border bg-paper hover:border-ink rounded-xs flex flex-col justify-between transition-colors shadow-xs relative z-20"
                  >
                    <div>
                      {/* Column Header: Outlet + Country + Newspaper Top Rule */}
                      <div className="h-[2px] bg-ink w-full mb-3" />

                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Globe2 size={13} className="text-ink-secondary" />
                          <span className="font-ui text-xs font-bold uppercase tracking-wider text-ink">
                            {article.source.name}
                          </span>
                        </div>
                        <span className="font-mono text-[0.6875rem] px-2 py-0.5 rounded-xs border border-paper-border bg-paper-alt text-ink-muted">
                          {article.source.country}
                        </span>
                      </div>

                      <Badge category={primaryCategory} className="text-[0.625rem] mb-2.5" />

                      {/* Headline: Playfair Serif */}
                      <h3 className="font-headline text-lg font-bold text-ink leading-snug tracking-tight mb-2.5 line-clamp-3">
                        {article.title_english}
                      </h3>

                      {/* Summary: Source Serif */}
                      <p className="font-body text-xs text-ink-secondary leading-relaxed line-clamp-4 mb-4">
                        {article.summary}
                      </p>

                      {/* Keywords / Shared Themes Chips */}
                      {article.keywords && article.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-paper-border">
                          {article.keywords.map((kw) => {
                            const isShared = sharedKeywordsMap.has(kw.toLowerCase());
                            const colorIdx = sharedKeywordsMap.get(kw.toLowerCase()) ?? 0;
                            const isFocused =
                              activeKeywordFilter === kw.toLowerCase();
                            return (
                              <span
                                key={kw}
                                ref={(el) => {
                                  if (!el) return;
                                  const list = chipRefs.current.get(kw.toLowerCase()) || [];
                                  if (!list.includes(el)) {
                                    list.push(el);
                                    chipRefs.current.set(kw.toLowerCase(), list);
                                  }
                                }}
                                className={`font-mono text-[0.6875rem] px-1.5 py-0.5 rounded-xs border transition-colors ${
                                  isFocused
                                    ? 'border-ink bg-ink text-paper font-bold'
                                    : isShared
                                    ? 'border-ink/60 bg-paper-alt font-semibold text-ink'
                                    : 'border-paper-border text-ink-muted'
                                }`}
                                style={
                                  isShared && !isFocused
                                    ? { borderLeftColor: SILK_PALETTE[colorIdx], borderLeftWidth: '2.5px' }
                                    : {}
                                }
                              >
                                #{kw}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Action: Read Full Article in Main Reader */}
                    <button
                      type="button"
                      onClick={() => handleOpenArticle(article.id)}
                      className="mt-5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs font-ui text-xs font-bold text-ink transition-colors shadow-xs"
                    >
                      <span>Read Full Dispatch</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompareCoverage;

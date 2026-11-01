/**
 * frontend/src/components/compare/CompareCoverage.tsx
 * Side-by-side editorial news coverage comparison across multiple outlets and countries (P7-04, P7-05, P7-06).
 * Features shared keyword highlighting and Weaver spider silk thread cross-linking.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { WeaverSpider } from '../../spider/spiderTypes/Weaver';
import type { Point2D } from '../../canvas/ik';
import './CompareCoverage.css';

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

const PALETTE = [
  '#818cf8', // Indigo
  '#fbbf24', // Amber
  '#4ade80', // Emerald
  '#f472b6', // Rose Pink
  '#38bdf8', // Cyan
  '#a78bfa', // Purple
];

export const CompareCoverage: React.FC = () => {
  const compareClusterId = useAppStore((s) => s.compareClusterId);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);

  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [silkThreads, setSilkThreads] = useState<Array<{ d: string; color: string; keyword: string }>>([]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLElement[]>>(new Map());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCompareClusterId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCompareClusterId]);

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
        shared.set(kw, colorIndex % PALETTE.length);
        colorIndex++;
      }
    }
    return shared;
  }, [clusterData]);

  // Calculate Weaver silk threads connecting shared keyword chips (P7-06)
  const computeSilkThreads = () => {
    if (!bodyRef.current) return;
    const bodyRect = bodyRef.current.getBoundingClientRect();
    const threads: Array<{ d: string; color: string; keyword: string }> = [];

    for (const [kw, colorIdx] of sharedKeywordsMap.entries()) {
      const elements = chipRefs.current.get(kw) || [];
      if (elements.length < 2) continue;

      const points: Point2D[] = elements
        .filter((el) => document.body.contains(el))
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left - bodyRect.left + rect.width / 2 + bodyRef.current!.scrollLeft,
            y: rect.top - bodyRect.top + rect.height / 2 + bodyRef.current!.scrollTop,
          };
        });

      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        if (from && to) {
          threads.push({
            d: WeaverSpider.generateSilkPath(from, to),
            color: PALETTE[colorIdx] ?? '#38bdf8',
            keyword: kw,
          });
        }
      }
    }

    setSilkThreads(threads);
  };

  useEffect(() => {
    const timer = setTimeout(computeSilkThreads, 150);
    window.addEventListener('resize', computeSilkThreads);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computeSilkThreads);
    };
  }, [clusterData, sharedKeywordsMap]);

  if (!compareClusterId) return null;

  return (
    <div
      className="compare-coverage-backdrop"
      id="compare-coverage-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-headline-title"
      onClick={() => setCompareClusterId(null)}
    >
      <div className="compare-coverage-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="compare-coverage-header">
          <div className="compare-coverage-header-main">
            {/* Custom SVG Weaver Spider cross-wire emblem */}
            <svg
              className="compare-coverage-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v6m0 6v6M3 12h6m6 0h6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
            <div>
              <h2 className="compare-coverage-title" id="compare-headline-title">
                {clusterData?.headline || `Story Cluster #${compareClusterId}`}
              </h2>
              <div className="compare-coverage-sub">
                Editorial multi-perspective comparison across {clusterData?.country_count || 1} countries and {clusterData?.outlet_count || 1} outlets
              </div>
            </div>
          </div>

          <button
            type="button"
            className="compare-coverage-close-btn"
            onClick={() => setCompareClusterId(null)}
            aria-label="Close compare coverage view"
            id="btn-close-compare-modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        {loading && (
          <div className="compare-loading" id="compare-loading-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="missed-news-spinner">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <div>Synthesizing cross-wire coverage dispatches...</div>
          </div>
        )}

        {error && (
          <div className="compare-error" id="compare-error-state">
            <strong>Error loading cluster:</strong> {error}
          </div>
        )}

        {!loading && !error && clusterData && clusterData.articles.length === 0 && (
          <div className="compare-empty" id="compare-empty-state">
            No member articles found for this story cluster.
          </div>
        )}

        {!loading && !error && clusterData && clusterData.articles.length > 0 && (
          <div className="compare-coverage-body" ref={bodyRef} onScroll={computeSilkThreads}>
            {/* Weaver Silk Threads SVG layer (P7-06) */}
            <svg className="compare-weaver-canvas" aria-hidden="true">
              {silkThreads.map((thread, idx) => (
                <path
                  key={idx}
                  d={thread.d}
                  stroke={thread.color}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  fill="none"
                  strokeOpacity="0.75"
                />
              ))}
            </svg>

            {/* Side-by-side columns per article/outlet (P7-04) */}
            {clusterData.articles.map((article) => (
              <div key={article.id} className="compare-column" id={`compare-column-article-${article.id}`}>
                {/* Column Header */}
                <div className="compare-column-header">
                  <div className="compare-column-country">
                    {/* Globe custom SVG */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>{article.source.country}</span>
                  </div>
                  <div className="compare-column-outlet">{article.source.name}</div>
                </div>

                {/* Column Editorial Body */}
                <div className="compare-column-content">
                  <h3 className="compare-column-headline">{article.title_english}</h3>
                  <div className="compare-column-summary">{article.summary}</div>

                  {/* Keywords chips with shared highlighting (P7-05) */}
                  <div className="compare-column-keywords">
                    {(article.keywords || []).map((kw, kwIdx) => {
                      const lower = kw.toLowerCase();
                      const isShared = sharedKeywordsMap.has(lower);
                      const colorIdx = isShared ? sharedKeywordsMap.get(lower)! : -1;

                      return (
                        <span
                          key={kwIdx}
                          ref={(el) => {
                            if (!el) return;
                            if (!chipRefs.current.has(lower)) {
                              chipRefs.current.set(lower, []);
                            }
                            const arr = chipRefs.current.get(lower)!;
                            if (!arr.includes(el)) arr.push(el);
                          }}
                          className={`compare-keyword-chip ${isShared ? `shared col-${colorIdx}` : ''}`}
                          title={isShared ? `Shared keyword: "${kw}" (cross-linked by Weaver spider)` : kw}
                        >
                          #{kw}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Column Footer */}
                <div className="compare-column-footer">
                  <span>Score: {article.breaking_score}%</span>
                  <span>{article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


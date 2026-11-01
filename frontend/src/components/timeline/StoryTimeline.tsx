/**
 * frontend/src/components/timeline/StoryTimeline.tsx
 * Chronological story timeline modal tracking evolving events in a cluster (P7-07).
 */
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import './StoryTimeline.css';

interface TimelineArticle {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  breaking_score: number;
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

  const [cluster, setCluster] = useState<TimelineClusterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTimelineClusterId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTimelineClusterId]);

  // Fetch cluster details
  useEffect(() => {
    if (!timelineClusterId) {
      setCluster(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/clusters/${timelineClusterId}`)
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
          setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [timelineClusterId]);

  if (!timelineClusterId) return null;

  return (
    <div
      className="story-timeline-backdrop"
      id="story-timeline-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-headline-title"
      onClick={() => setTimelineClusterId(null)}
    >
      <div className="story-timeline-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="story-timeline-header">
          <div className="story-timeline-header-main">
            {/* Custom SVG Chronometer emblem */}
            <svg
              className="story-timeline-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
              <h2 className="story-timeline-title" id="timeline-headline-title">
                {cluster?.headline || `Story Chronology #${timelineClusterId}`}
              </h2>
              <div className="story-timeline-sub">
                Timeline development across {cluster?.outlet_count || 1} outlets and {cluster?.country_count || 1} countries
              </div>
            </div>
          </div>

          <button
            type="button"
            className="story-timeline-close-btn"
            onClick={() => setTimelineClusterId(null)}
            aria-label="Close story timeline view"
            id="btn-close-timeline-modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="story-timeline-body">
          {loading && (
            <div className="compare-loading" id="timeline-loading-state">
              <div>Loading chronological event milestones...</div>
            </div>
          )}

          {error && (
            <div className="compare-error" id="timeline-error-state">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && cluster && cluster.articles.length === 0 && (
            <div className="compare-empty" id="timeline-empty-state">
              No historical event milestones found for this story cluster.
            </div>
          )}

          {!loading && !error && cluster && cluster.articles.length > 0 && (
            <div className="story-timeline-track">
              {cluster.articles.map((art, idx) => (
                <div key={art.id} className="story-timeline-item" id={`timeline-item-${art.id}`}>
                  <div className="story-timeline-dot" />
                  <div
                    className="story-timeline-card"
                    onClick={() => {
                      selectArticleById(art.id);
                      setTimelineClusterId(null);
                    }}
                    title="Click to load article into desk"
                  >
                    <div className="story-timeline-meta">
                      <span className="story-timeline-outlet">{art.source.name} ({art.source.country})</span>
                      <span>
                        {art.published_at
                          ? new Date(art.published_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : `Milestone #${idx + 1}`}
                      </span>
                    </div>
                    <h3 className="story-timeline-headline">{art.title_english}</h3>
                    <p className="story-timeline-excerpt">{art.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


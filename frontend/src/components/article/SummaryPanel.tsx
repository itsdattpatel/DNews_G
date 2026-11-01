/**
 * frontend/src/components/article/SummaryPanel.tsx
 * Right main panel displaying the AI-synthesized summary with typewriter effect,
 * keyword chips, breaking score indicator, and spider canvas overlay mount.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Star, Flame, Sparkles, Tag, Layers, Clock } from 'lucide-react';
import { SpiderCanvas } from '../spider/SpiderCanvas';

export const SummaryPanel: React.FC = () => {
  const article = useAppStore((s) => s.selectedArticle);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);
  const setTimelineClusterId = useAppStore((s) => s.setTimelineClusterId);

  const [typedText, setTypedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect (40 chars per second = 25ms per char)
  // Respects prefers-reduced-motion (P4-09)
  useEffect(() => {
    if (!article?.summary) {
      setTypedText('');
      setIsTypingComplete(false);
      return;
    }

    const fullSummary = article.summary;

    // Check for prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedText(fullSummary);
      setIsTypingComplete(true);
      return;
    }

    let index = 0;
    setTypedText('');
    setIsTypingComplete(false);

    // 40 char/s pacing
    const interval = setInterval(() => {
      index += 1;
      if (index >= fullSummary.length) {
        setTypedText(fullSummary);
        setIsTypingComplete(true);
        clearInterval(interval);
      } else {
        setTypedText(fullSummary.slice(0, index));
      }
    }, 25);

    return () => clearInterval(interval);
  }, [article?.id, article?.summary]);

  if (!article) {
    return (
      <div
        id="summary-panel-empty"
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          color: 'var(--text-muted)',
          background: 'rgba(10, 14, 26, 0.4)',
        }}
      >
        <Sparkles size={48} color="#334155" style={{ marginBottom: '16px' }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>AI Intelligence Summary</p>
        <p style={{ fontSize: '0.8rem', color: '#475569' }}>Real-time bullet synthesis and spider radar</p>
      </div>
    );
  }

  const isBreaking = article.breaking_score >= 75;

  return (
    <div
      id="summary-panel"
      ref={containerRef}
      style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        overflowY: 'auto',
        padding: '16px 22px',
        background: 'rgba(10, 14, 26, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Spider Canvas Overlay with dynamic spider factory (all 6 types) */}
      <SpiderCanvas
        containerRef={containerRef}
        keywords={article.keywords || []}
        spiderType={article.spider_type}
        breakingScore={article.breaking_score}
        onKeywordActive={(idx) => setActiveKeywordIndex(idx)}
      />
      {/* Top Header / Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#a78bfa" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.88rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#c4b5fd',
              textTransform: 'uppercase',
            }}
          >
            AI Executive Briefing
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: isBreaking
                ? 'rgba(239, 68, 68, 0.15)'
                : article.spider_type === 'Swarm'
                ? 'rgba(34, 197, 94, 0.15)'
                : article.spider_type === 'Weaver'
                ? 'rgba(56, 189, 248, 0.15)'
                : article.spider_type === 'Archive'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(167, 139, 250, 0.15)',
              color: isBreaking
                ? '#ef4444'
                : article.spider_type === 'Swarm'
                ? '#22c55e'
                : article.spider_type === 'Weaver'
                ? '#38bdf8'
                : article.spider_type === 'Archive'
                ? '#f59e0b'
                : 'var(--accent-spider)',
              border: isBreaking
                ? '1px solid rgba(239, 68, 68, 0.35)'
                : article.spider_type === 'Swarm'
                ? '1px solid rgba(34, 197, 94, 0.35)'
                : article.spider_type === 'Weaver'
                ? '1px solid rgba(56, 189, 248, 0.35)'
                : article.spider_type === 'Archive'
                ? '1px solid rgba(245, 158, 11, 0.35)'
                : '1px solid rgba(167, 139, 250, 0.3)',
            }}
          >
            {isBreaking ? 'RedAlert' : article.spider_type || 'Reader'}
          </span>
        </div>

        {/* Action icons: Bookmark, Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="bookmark-toggle-btn"
            onClick={() => toggleBookmark(article.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: article.bookmarked ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
              color: article.bookmarked ? '#f59e0b' : 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Bookmark article"
          >
            <Star size={13} fill={article.bookmarked ? '#f59e0b' : 'none'} />
            <span>{article.bookmarked ? 'Saved' : 'Bookmark'}</span>
          </button>
        </div>
      </div>

      {/* Breaking Score Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderRadius: '10px',
          background: isBreaking ? 'rgba(239, 68, 68, 0.12)' : 'rgba(30, 41, 59, 0.4)',
          border: isBreaking ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} color={isBreaking ? '#ef4444' : '#f59e0b'} />
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isBreaking ? '#fca5a5' : '#cbd5e1' }}>
              Breaking Impact Score
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {isBreaking ? 'High priority breaking news' : 'Standard regional news reporting'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '75px',
              height: '7px',
              borderRadius: '9999px',
              background: 'rgba(51, 65, 85, 0.5)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${article.breaking_score}%`,
                height: '100%',
                background: isBreaking ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#6366f1',
                borderRadius: '9999px',
              }}
            />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isBreaking ? '#ef4444' : '#818cf8' }}>
            {article.breaking_score}%
          </span>
        </div>
      </div>

      {/* Typewriter Summary Body */}
      <div
        id="typewriter-summary-content"
        style={{
          fontSize: '0.92rem',
          lineHeight: 1.6,
          color: '#f1f5f9',
          letterSpacing: '-0.01em',
          fontWeight: 400,
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(51, 65, 85, 0.35)',
          minHeight: '60px',
        }}
      >
        {typedText}
        {!isTypingComplete && (
          <span
            style={{
              display: 'inline-block',
              width: '3px',
              height: '1em',
              backgroundColor: '#a78bfa',
              marginLeft: '4px',
              verticalAlign: 'text-bottom',
              animation: 'pulse-red 0.8s infinite',
            }}
          />
        )}
      </div>

      {/* Target Keyword Chips (Used by Reader Spider in Phase 4) */}
      {article.keywords && article.keywords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            <Tag size={13} color="#a78bfa" />
            <span>EXTRACTED KEYWORDS</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {article.keywords.map((kw, i) => {
              const isActive = activeKeywordIndex === i;
              return (
                <span
                  key={i}
                  className={`keyword-chip ${isActive ? 'active-reading' : ''}`}
                  data-keyword={kw}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(167, 139, 250, 0.28)' : 'rgba(99, 102, 241, 0.12)',
                    border: isActive ? '1px solid #a78bfa' : '1px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: isActive ? '0 0 12px rgba(167, 139, 250, 0.45)' : 'none',
                    color: isActive ? '#ffffff' : '#c7d2fe',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    transition: 'all 0.25s ease',
                    transform: isActive ? 'scale(1.06)' : 'none',
                    cursor: 'default',
                  }}
                >
                  #{kw}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Bar */}
      {article.categories && article.categories.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>CATEGORIES:</span>
          {article.categories.map((cat, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Multi-Outlet Cluster Controls (P7-07, P7-08) */}
      {article.cluster_id && (
        <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '10px' }}>
          <button
            id="btn-compare-coverage"
            onClick={() => setCompareClusterId(article.cluster_id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#c4b5fd',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Compare coverage side-by-side across outlets"
          >
            <Layers size={15} />
            <span>Compare Coverage</span>
          </button>

          <button
            id="btn-story-timeline"
            onClick={() => setTimelineClusterId(article.cluster_id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="View chronological timeline of this story cluster"
          >
            <Clock size={15} />
            <span>Timeline</span>
          </button>
        </div>
      )}
    </div>
  );
};

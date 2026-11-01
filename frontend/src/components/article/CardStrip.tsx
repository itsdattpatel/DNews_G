/**
 * frontend/src/components/article/CardStrip.tsx
 * Bottom horizontal scrolling feed of glassmorphic article cards.
 * Performance-optimized with React.memo card components and full keyboard/ARIA accessibility (P12-04, P12-05).
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
  const isBreaking = article.breaking_score >= 75;

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
      className={`glass-card ${isBreaking ? 'breaking-pulse' : ''}`}
      style={{
        width: '280px',
        minWidth: '280px',
        height: '155px',
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        position: 'relative',
        border: isSelected
          ? '1px solid var(--accent-primary)'
          : isBreaking
          ? '1px solid rgba(239, 68, 68, 0.6)'
          : isScoutTarget
          ? '1px dashed #94a3b8'
          : '1px solid var(--border)',
        background: isSelected
          ? 'rgba(30, 41, 59, 0.85)'
          : isScoutTarget
          ? 'rgba(30, 41, 59, 0.55)'
          : 'rgba(15, 23, 42, 0.65)',
        boxShadow: isSelected
          ? '0 0 16px rgba(99, 102, 241, 0.3)'
          : isBreaking
          ? '0 0 14px rgba(239, 68, 68, 0.25)'
          : isScoutTarget
          ? '0 0 14px rgba(148, 163, 184, 0.25)'
          : 'none',
        transform: isSelected ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Scout Spider Indicator on upcoming card */}
      {isScoutTarget && !isSelected && <ScoutBadge />}

      {/* Card Header: Outlet + Country + Breaking/Bookmark */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: isSelected ? '#c7d2fe' : '#94a3b8',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {article.source.name}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>•</span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {article.source.country}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isBreaking && (
            <span
              title="Breaking News"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#ef4444',
              }}
            >
              <Flame size={12} fill="#ef4444" />
              <span>{article.breaking_score}%</span>
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article.id);
            }}
            aria-label={article.bookmarked ? 'Remove bookmark' : 'Bookmark story'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              padding: '2px',
            }}
            title="Bookmark"
          >
            <Star
              size={13}
              color={article.bookmarked ? '#f59e0b' : '#475569'}
              fill={article.bookmarked ? '#f59e0b' : 'none'}
            />
          </button>
        </div>
      </div>

      {/* Card Headline */}
      <h4
        style={{
          fontSize: '0.84rem',
          fontWeight: 600,
          lineHeight: 1.35,
          color: isSelected ? '#ffffff' : '#f1f5f9',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: '4px 0',
        }}
      >
        {article.title_english || article.title_original}
      </h4>

      {/* Card Footer: Keywords / Spider Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
        <div style={{ display: 'flex', gap: '4px', overflow: 'hidden' }}>
          {(article.categories || []).slice(0, 2).map((cat: string, i: number) => (
            <span
              key={i}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                color: '#94a3b8',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.65rem',
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.65rem',
            color: 'var(--accent-spider)',
            fontWeight: 600,
          }}
        >
          <SpiderGlyph size={11} color="var(--accent-spider)" />
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
      style={{
        height: '190px',
        minHeight: '190px',
        background: 'rgba(10, 14, 26, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 30,
      }}
    >
      {/* Scroll controls */}
      <button
        onClick={() => handleScroll(-320)}
        style={{
          position: 'absolute',
          left: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          background: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
        aria-label="Scroll wire left"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={() => handleScroll(320)}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          background: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
        aria-label="Scroll wire right"
      >
        <ChevronRight size={18} />
      </button>

      {/* Cards Scroll Track */}
      <div
        id="card-strip-track"
        ref={scrollContainerRef}
        role="feed"
        aria-busy="false"
        style={{
          display: 'flex',
          gap: '14px',
          padding: '16px 48px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          height: '100%',
          alignItems: 'center',
        }}
      >
        {articles.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto' }}>
            No articles match the current filter. Live radar is scanning...
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

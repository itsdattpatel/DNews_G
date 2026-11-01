/**
 * frontend/src/components/article/ArticlePanel.tsx
 * Left main panel displaying the selected article's full original/translated text.
 */
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ExternalLink, Globe2, Languages, Clock, BookOpen } from 'lucide-react';

export const ArticlePanel: React.FC = () => {
  const article = useAppStore((s) => s.selectedArticle);
  const [showOriginal, setShowOriginal] = useState(false);

  if (!article) {
    return (
      <div
        id="article-panel-empty"
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          color: 'var(--text-muted)',
          background: 'rgba(10, 14, 26, 0.5)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <BookOpen size={48} color="#334155" style={{ marginBottom: '16px' }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Select a news card below to read</p>
        <p style={{ fontSize: '0.8rem', color: '#475569' }}>Live feeds update automatically via AI radar</p>
      </div>
    );
  }

  const title = showOriginal && article.title_original ? article.title_original : article.title_english;
  const body = showOriginal && article.body_original ? article.body_original : (article.body_english || article.body_original || article.summary);

  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return (
    <div
      id="article-panel"
      style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        padding: '28px 32px',
        borderRight: '1px solid var(--border)',
        background: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header Metadata Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Source Outlet Badge */}
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {article.source.name}
          </span>

          {/* Country Tag */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.5)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
            }}
          >
            <Globe2 size={13} color="#94a3b8" />
            {article.source.country}
          </span>

          {/* Timestamp */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#64748b',
              fontSize: '0.75rem',
            }}
          >
            <Clock size={12} />
            {formattedDate}
          </span>
        </div>

        {/* Translation Switch & Source Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {article.title_original && article.title_original !== article.title_english && (
            <button
              id="language-toggle-btn"
              onClick={() => setShowOriginal(!showOriginal)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: showOriginal ? 'rgba(99, 102, 241, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                color: showOriginal ? '#a5b4fc' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Toggle Original vs AI English Translation"
            >
              <Languages size={13} />
              <span>{showOriginal ? 'Showing Original' : 'English Translated'}</span>
            </button>
          )}

          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#818cf8',
                fontSize: '0.75rem',
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
              }}
              title="Open full article on publisher site"
            >
              <span>Source</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Article Title */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.65rem',
          fontWeight: 700,
          lineHeight: 1.3,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>

      {/* Article Body Content */}
      <div
        style={{
          fontSize: '0.98rem',
          lineHeight: 1.75,
          color: '#cbd5e1',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {body}
      </div>
    </div>
  );
};

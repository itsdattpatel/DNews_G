/**
 * frontend/src/components/chat/ArchiveChat.tsx
 * Historical Archive Search and AI Synthesis Desk (P8-03, P8-05).
 * Features FTS5 queries, AI answer synthesis with citations, and active ArchiveSpider.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SearchResponse, SearchResultItem } from '../../types';
import { ArchiveSpider } from '../../spider/spiderTypes/Archive';
import './ArchiveChat.css';

export const ArchiveChat: React.FC = () => {
  const { isArchiveChatOpen, setArchiveChatOpen, selectArticleById } = useAppStore();
  const [query, setQuery] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spiderRef = useRef<ArchiveSpider | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const citationRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize or cleanup ArchiveSpider
  useEffect(() => {
    if (!isArchiveChatOpen) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      spiderRef.current = null;
      return;
    }

    const spider = new ArchiveSpider(120, 80);
    spiderRef.current = spider;
    lastTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      const canvas = canvasRef.current;
      if (canvas && spiderRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          spiderRef.current.update(dt);
          spiderRef.current.render(ctx);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isArchiveChatOpen]);

  // Adjust canvas size to body dimensions
  const updateCanvasBounds = useCallback(() => {
    if (!canvasRef.current || !bodyRef.current) return;
    const rect = bodyRef.current.getBoundingClientRect();
    canvasRef.current.width = rect.width;
    canvasRef.current.height = Math.max(rect.height, bodyRef.current.scrollHeight);
  }, []);

  useEffect(() => {
    if (isArchiveChatOpen) {
      updateCanvasBounds();
      window.addEventListener('resize', updateCanvasBounds);
      return () => window.removeEventListener('resize', updateCanvasBounds);
    }
  }, [isArchiveChatOpen, updateCanvasBounds]);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isArchiveChatOpen) {
        setArchiveChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArchiveChatOpen, setArchiveChatOpen]);

  // Execute archive search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setHighlightedIndex(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          use_ai: useAi,
          limit: 15,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search failed with status ${res.status}`);
      }

      const data: SearchResponse = await res.json();
      setSearchResponse(data);

      // Give DOM time to lay out citations, then feed coordinates to ArchiveSpider
      setTimeout(() => {
        updateCanvasBounds();
        if (spiderRef.current && bodyRef.current) {
          const bodyRect = bodyRef.current.getBoundingClientRect();
          const targets = citationRefs.current
            .filter((el): el is HTMLDivElement => Boolean(el))
            .map((el) => {
              const r = el.getBoundingClientRect();
              return {
                x: r.left - bodyRect.left + 24,
                y: r.top - bodyRect.top + r.height / 2,
              };
            });

          if (targets.length > 0) {
            spiderRef.current.setScanTargets(targets);
          }
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Open cited article in the main news desk
  const handleSelectArticle = (articleId: number) => {
    selectArticleById(articleId);
    setArchiveChatOpen(false);
  };

  // Render synthesized text with interactive bracket citations e.g. [1]
  const renderAiAnswer = (answer: string) => {
    const parts = answer.split(/(\[\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = parseInt(match[1]!, 10);
        return (
          <button
            key={idx}
            type="button"
            className="archive-citation-index"
            style={{
              cursor: 'pointer',
              border: 'none',
              marginLeft: '2px',
              marginRight: '2px',
              verticalAlign: 'baseline',
            }}
            onClick={() => {
              setHighlightedIndex(citationNum);
              const card = citationRefs.current[citationNum - 1];
              if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            title={`Highlight source dispatch #${citationNum}`}
          >
            [{citationNum}]
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (!isArchiveChatOpen) return null;

  return (
    <div
      className="archive-chat-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-chat-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) setArchiveChatOpen(false);
      }}
    >
      <div className="archive-chat-modal">
        {/* Header */}
        <header className="archive-chat-header">
          <div className="archive-chat-header-main">
            <svg
              className="archive-chat-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div>
              <h2 id="archive-chat-heading" className="archive-chat-title">
                Investigative Archive Intelligence
              </h2>
              <div className="archive-chat-sub">
                Historical FTS5 full-text indexing &amp; synthesized journalistic citations
              </div>
            </div>
          </div>
          <button
            className="archive-chat-close-btn"
            onClick={() => setArchiveChatOpen(false)}
            aria-label="Close Archive Search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="archive-chat-body" ref={bodyRef}>
          <canvas ref={canvasRef} className="archive-spider-canvas" />

          {/* Error State */}
          {error && (
            <div className="archive-error-state" role="alert">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="archive-state-title">Archive Query Error</div>
              <div className="archive-state-desc">{error}</div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="archive-loading-state" role="status">
              <div className="archive-loading-spinner" />
              <div className="archive-state-title">Scouring Historical Dispatches...</div>
              <div className="archive-state-desc">
                Consulting FTS5 database indices and coordinating AI synthesis across fallback providers.
              </div>
            </div>
          )}

          {/* Initial Empty State */}
          {!isLoading && !error && !searchResponse && (
            <div className="archive-empty-state">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <div className="archive-state-title">The Morgue is Ready</div>
              <div className="archive-state-desc">
                Enter an investigative topic (e.g., &quot;nuclear safety&quot;, &quot;wildlife trafficking&quot;, &quot;monsoon&quot;) to query historical records and generate cited answers.
              </div>
            </div>
          )}

          {/* Results View */}
          {!isLoading && !error && searchResponse && (
            <>
              {/* AI Answer Synthesis Card */}
              {searchResponse.ai_answer && (
                <div className="archive-ai-answer-card">
                  <div className="archive-ai-answer-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Synthesized Investigative Briefing
                  </div>
                  <p className="archive-ai-answer-text">
                    {renderAiAnswer(searchResponse.ai_answer)}
                  </p>
                </div>
              )}

              {/* Citations List */}
              <div className="archive-citations-section">
                <div className="archive-citations-title">
                  Dispatches Retrieved ({searchResponse.results.length})
                </div>

                {searchResponse.results.length === 0 ? (
                  <div className="archive-empty-state">
                    <div className="archive-state-title">No Matching Records Found</div>
                    <div className="archive-state-desc">
                      Try broader keywords or verify terms in the inquiry.
                    </div>
                  </div>
                ) : (
                  <div className="archive-citations-list">
                    {searchResponse.results.map((item: SearchResultItem, index: number) => {
                      const citationIndex = index + 1;
                      const isHighlighted = highlightedIndex === citationIndex;

                      return (
                        <div
                          key={item.id}
                          ref={(el) => {
                            citationRefs.current[index] = el;
                          }}
                          className={`archive-citation-item ${isHighlighted ? 'highlighted' : ''}`}
                          style={
                            isHighlighted
                              ? { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }
                              : undefined
                          }
                          onClick={() => handleSelectArticle(item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSelectArticle(item.id);
                          }}
                        >
                          <div className="archive-citation-header">
                            <span className="archive-citation-index">[{citationIndex}]</span>
                            <span>
                              {item.source_name} ({item.source_country}) &bull;{' '}
                              {item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Historical'}
                            </span>
                          </div>
                          <h4 className="archive-citation-headline">{item.title_english}</h4>
                          <p className="archive-citation-summary">{item.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer & Search Input */}
        <footer className="archive-chat-footer">
          <form className="archive-input-row" onSubmit={handleSearch}>
            <input
              type="text"
              className="archive-chat-input"
              placeholder="Search news morgue &amp; query historical reporting..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="archive-chat-btn-search"
              disabled={isLoading || !query.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>{isLoading ? 'Querying...' : 'Query Morgue'}</span>
            </button>
          </form>

          <div className="archive-chat-options">
            <label className="archive-toggle-label">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
              />
              <span>Synthesize response with active AI provider</span>
            </label>
            <span>Press ESC to return to desk</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

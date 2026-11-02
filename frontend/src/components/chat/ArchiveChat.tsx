/**
 * frontend/src/components/chat/ArchiveChat.tsx
 * Screen (f): Investigative Morgue & Historical FTS5 Search Desk (Step 9).
 * Broadsheet newspaper styling, FTS5 full-text queries, AI synthesis with interactive citations,
 * instant query chips, and full empty/loading/error states.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SearchResponse, SearchResultItem } from '../../types';
import {
  parseCitations,
  formatRelevanceScore,
  ARCHIVE_SUGGESTION_CHIPS,
} from '../../utils/archive';
import {
  X,
  Search,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';

export const ArchiveChat: React.FC = () => {
  const { isArchiveChatOpen, setArchiveChatOpen, selectArticleById, settings } = useAppStore();
  const isPlainMode = settings.plain_mode_enabled ?? false;
  const [query, setQuery] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const citationRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close on Escape
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
  const handleSearch = async (overrideQuery?: string) => {
    const targetQuery = (overrideQuery ?? query).trim();
    if (!targetQuery || isLoading) return;

    if (overrideQuery) {
      setQuery(overrideQuery);
    }

    setIsLoading(true);
    setError(null);
    setHighlightedIndex(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: targetQuery,
          use_ai: isPlainMode ? false : useAi,
          limit: 15,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search query failed with status ${res.status}`);
      }

      const data: SearchResponse = await res.json();
      setSearchResponse(data);
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

  if (!isArchiveChatOpen) return null;

  return (
    <div
      id="archive-chat-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-chat-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-7 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setArchiveChatOpen(false);
      }}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Masthead Header */}
        <header className="p-4 sm:p-5 border-b-2 border-ink bg-paper-alt flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
                Investigative Morgue & Archival Record · Vol. XCII No. 41
              </span>
            </div>

            <h2
              id="archive-chat-heading"
              className="font-headline text-xl sm:text-2xl font-bold tracking-tight text-ink"
            >
              The Archival News Morgue
            </h2>

            <div className="font-ui text-xs text-ink-secondary">
              FTS5 full-text indexing &amp; synthesized journalistic citations over stored dispatches
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Synthesis Checkbox Toggle / Plain Mode Indicator */}
            {isPlainMode ? (
              <div
                id="badge-archive-plainmode"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border border-paper-border bg-paper-alt font-mono text-xs text-ink-muted"
                title="Plain Mode active: AI synthesis is offline. Historical queries run via SQLite FTS5 index only."
              >
                <span>FTS keyword search only (AI synthesis offline)</span>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-xs font-ui font-semibold text-ink-secondary cursor-pointer hover:text-ink">
                <input
                  id="checkbox-archive-ai-synthesis"
                  type="checkbox"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  className="w-3.5 h-3.5 accent-ink cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Sparkles size={12} className="text-accent" />
                  <span>AI Synthesis</span>
                </span>
              </label>
            )}

            {/* Close Button */}
            <button
              id="btn-close-archive-chat"
              type="button"
              onClick={() => setArchiveChatOpen(false)}
              className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
              title="Close Morgue (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2. Search & Suggestion Bar */}
        <div className="p-4 border-b border-paper-border bg-paper shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                id="archive-query-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query historical reporting (e.g., 'tiger population', 'clean energy', 'quantum')..."
                className="w-full pl-9 pr-3 py-2 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs sm:text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              id="btn-archive-search"
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-ink text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <Search size={13} />
              <span>{isLoading ? 'Consulting...' : 'Query Morgue'}</span>
            </button>
          </form>

          {/* Prompt Chips */}
          <div
            data-lenis-prevent="true"
            className="mt-2.5 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 text-xs"
          >
            <span className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted shrink-0">
              Inquiries:
            </span>
            {ARCHIVE_SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSearch(chip)}
                className="font-mono text-[0.6875rem] border border-paper-border hover:border-ink bg-paper-alt hover:bg-paper px-2.5 py-0.5 rounded-xs text-ink-secondary hover:text-ink transition-colors shrink-0 whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Main Archival Body */}
        <div
          id="archive-chat-body"
          ref={bodyRef}
          data-lenis-prevent="true"
          className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-6 relative bg-paper"
        >
          <div className="relative z-10 space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div
                id="archive-loading-indicator"
                className="p-8 border-2 border-paper-border bg-paper-alt rounded-xs text-center space-y-3"
              >
                <div className="inline-block w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                <h3 className="font-headline text-lg font-bold">
                  Scouring Historical Morgue Records...
                </h3>
                <p className="font-body text-xs text-ink-secondary max-w-md mx-auto">
                  Consulting SQLite FTS5 full-text indices and executing editorial synthesis across configured AI provider models.
                </p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div
                id="archive-error-banner"
                role="alert"
                className="p-6 border-2 border-accent bg-accent/5 rounded-xs text-center space-y-3"
              >
                <h3 className="font-headline text-lg font-bold text-accent">
                  Archival Query Failed
                </h3>
                <p className="font-body text-xs text-ink-secondary max-w-md mx-auto">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="px-3.5 py-1.5 border border-accent bg-paper text-accent font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-accent hover:text-paper inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Retry Inquiry</span>
                </button>
              </div>
            )}

            {/* Initial Empty State */}
            {!isLoading && !error && !searchResponse && (
              <div
                id="archive-empty-prompt"
                className="py-12 px-6 border-2 border-dashed border-paper-border bg-paper-alt/40 rounded-xs text-center space-y-4"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 border-2 border-ink bg-paper rounded-xs">
                  <Archive size={24} className="text-ink" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline text-xl font-bold text-ink">
                    The Historical News Morgue is Open
                  </h3>
                  <p className="font-body text-xs text-ink-secondary max-w-md mx-auto">
                    Type a topic above or select one of the investigative inquiry chips to search full-text articles and generate synthesized editorial summaries.
                  </p>
                </div>
              </div>
            )}

            {/* Results Display */}
            {!isLoading && !error && searchResponse && (
              <>
                {/* AI Answer Synthesis Card */}
                {searchResponse.ai_answer && (
                  <div
                    id="archive-ai-briefing-card"
                    className="p-5 border-2 border-ink bg-paper-alt rounded-xs shadow-xs news-rule-t news-rule-b space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-paper-border pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-accent" />
                        <span className="font-ui text-xs font-bold uppercase tracking-wider text-ink">
                          Synthesized Investigative Briefing
                        </span>
                      </div>
                      <span className="font-mono text-[0.625rem] text-ink-muted">
                        Synthesized from {searchResponse.results.length} historical dispatches
                      </span>
                    </div>

                    <div className="font-body text-sm sm:text-base leading-relaxed text-ink">
                      {parseCitations(searchResponse.ai_answer).map((part, idx) => {
                        if (part.type === 'citation' && part.citationIndex !== undefined) {
                          const citationNum = part.citationIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setHighlightedIndex(citationNum);
                                const card = citationRefs.current[citationNum - 1];
                                if (card) {
                                  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className="font-mono text-xs font-bold text-accent px-1.5 py-0.5 border border-accent/40 rounded-xs bg-paper hover:bg-accent hover:text-paper mx-1 cursor-pointer transition-colors shadow-2xs"
                              title={`Inspect source dispatch [${citationNum}]`}
                            >
                              [{citationNum}]
                            </button>
                          );
                        }
                        return <span key={idx}>{part.content}</span>;
                      })}
                    </div>
                  </div>
                )}

                {/* Retrieved Source Dispatches */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                    <h3 className="font-headline text-lg font-bold text-ink">
                      Archival Wire Dispatches ({searchResponse.results.length} Retrieved)
                    </h3>
                    <span className="font-mono text-xs text-ink-secondary">
                      Ranked by BM25 relevance &amp; chronology
                    </span>
                  </div>

                  {searchResponse.results.length === 0 ? (
                    <div className="py-10 text-center space-y-2 border border-paper-border bg-paper-alt rounded-xs">
                      <h4 className="font-headline text-base font-bold text-ink">
                        No Matching Archival Records Found
                      </h4>
                      <p className="font-body text-xs text-ink-secondary">
                        Try broader terms or verify keywords in the inquiry.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {searchResponse.results.map((item: SearchResultItem, index: number) => {
                        const citationIndex = index + 1;
                        const isHighlighted = highlightedIndex === citationIndex;

                        return (
                          <div
                            key={item.id}
                            ref={(el) => {
                              citationRefs.current[index] = el;
                            }}
                            onClick={() => handleSelectArticle(item.id)}
                            className={`p-4 border-2 rounded-xs transition-all flex flex-col justify-between cursor-pointer group shadow-xs ${
                              isHighlighted
                                ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                                : 'border-paper-border hover:border-ink bg-paper hover:bg-paper-alt'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Header Meta */}
                              <div className="flex items-center justify-between gap-2 font-mono text-[0.625rem] text-ink-secondary border-b border-paper-border pb-1.5">
                                <span className="font-bold text-accent">
                                  [{citationIndex}] {item.source_name} ({item.source_country})
                                </span>
                                <span className="font-bold bg-paper-border/60 px-1.5 py-0.5 rounded-xs">
                                  Score: {formatRelevanceScore(item.score ?? 4.0)}
                                </span>
                              </div>

                              {/* Headline */}
                              <h4 className="font-headline text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:underline">
                                {item.title_english}
                              </h4>

                              {/* Summary Excerpt */}
                              <p className="font-body text-xs text-ink-secondary line-clamp-3">
                                {item.summary || 'Full dispatch record indexed in historical morgue.'}
                              </p>
                            </div>

                            {/* Card Footer: Dual Timestamp & Action */}
                            <div className="mt-3 pt-2 border-t border-paper-border/60 flex items-center justify-between text-[0.625rem] font-ui text-ink-muted">
                              <DualTimestamp
                                layout="compact"
                                publishedAt={item.published_at}
                                ingestedAt={(item as any).ingested_at || (item as any).fetched_at}
                                isCatchup={Boolean((item as any).is_catchup)}
                              />
                              <span className="font-bold text-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                <span>Inspect</span>
                                <ArrowRight size={10} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 4. Footer Status Bar */}
        <footer className="p-3 border-t-2 border-ink bg-paper-alt flex flex-wrap items-center justify-between gap-3 text-xs font-ui text-ink-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[0.6875rem]">Morgue Status:</span>
            <span>FTS5 index online · SQLite 3.39+</span>
          </div>
          <span className="font-mono text-[0.625rem] text-ink-muted">
            Click any dispatch card to inspect in Main Reader · Press ESC to return
          </span>
        </footer>
      </div>
    </div>
  );
};

export default ArchiveChat;

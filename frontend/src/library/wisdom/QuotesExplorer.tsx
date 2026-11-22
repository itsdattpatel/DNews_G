/**
 * frontend/src/library/wisdom/QuotesExplorer.tsx
 * Philosophical Quotes explorer with author filters, tradition selectors,
 * Quote of the Day, and Random Quote picker.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuoteFolioCard, type WisdomQuote } from './QuoteFolioCard';
import { LibraryLoadingState, LibraryEmptyState, LibraryErrorState } from '../ui/LibraryStates';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { sseBus, postCrossTabSync } from '../../lib/sseBus';
import {
  quoteMatchesFilter,
  reconcileLibraryIncomingItem,
  mergePendingLibraryItems,
  capLibraryList,
  type LibraryQuoteRecord,
} from '../utils/libraryLive';
import {
  Sparkles,
  Shuffle,
  Filter,
  User,
  Brain,
} from 'lucide-react';

const TRADITIONS = [
  { id: 'all', label: 'All Traditions' },
  { id: 'Stoic', label: 'Stoicism (Rome / Greece)' },
  { id: 'Vedanta', label: 'Vedanta & Indic Wisdom' },
  { id: 'Eastern', label: 'Eastern / Chinese Classics' },
  { id: 'Classical', label: 'Classical Humanism' },
];

const AUTHORS = [
  { id: 'all', label: 'All Authors' },
  { id: 'Marcus Aurelius', label: 'Marcus Aurelius (121–180 AD)' },
  { id: 'Swami Vivekananda', label: 'Swami Vivekananda (1863–1902)' },
  { id: 'Epictetus', label: 'Epictetus (50–135 AD)' },
  { id: 'Confucius', label: 'Confucius (551–479 BCE)' },
  { id: 'Seneca', label: 'Seneca the Younger (4 BCE–65 AD)' },
  { id: 'Adi Shankara', label: 'Adi Shankara (c. 788–820 CE)' },
  { id: 'Rabindranath Tagore', label: 'Rabindranath Tagore (1861–1941)' },
  { id: 'Laozi', label: 'Laozi (c. 6th century BCE)' },
];

const THEMES = [
  { id: 'all', label: 'All Themes' },
  { id: 'resilience', label: 'Resilience & Adversity' },
  { id: 'duty', label: 'Duty & Character' },
  { id: 'truth', label: 'Truth & Knowledge' },
  { id: 'self-mastery', label: 'Self-Mastery & Mind' },
  { id: 'courage', label: 'Courage & Strength' },
  { id: 'peace', label: 'Tranquility & Peace' },
];

export const QuotesExplorer: React.FC = () => {
  const [selectedTradition, setSelectedTradition] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');

  const [quotes, setQuotes] = useState<WisdomQuote[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<WisdomQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<WisdomQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingMeaning, setSavingMeaning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const globalSearchQuery = useLibraryStore((s) => s.searchQuery);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const filterRef = useRef({ selectedAuthor, selectedTradition, selectedTheme, globalSearchQuery });
  filterRef.current = { selectedAuthor, selectedTradition, selectedTheme, globalSearchQuery };
  const quotesRef = useRef<WisdomQuote[]>(quotes);
  quotesRef.current = quotes;

  // Fetch quotes based on criteria
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedAuthor !== 'all') {
        params.append('author', selectedAuthor);
      }
      if (selectedTradition !== 'all') {
        params.append('tradition', selectedTradition);
      }
      if (selectedTheme !== 'all') {
        params.append('theme', selectedTheme);
      }
      if (globalSearchQuery && globalSearchQuery.trim()) {
        params.append('q', globalSearchQuery.trim());
      }

      const res = await fetch(`/api/library/wisdom/quotes?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load quotes (HTTP ${res.status})`);
      }
      const data = await res.json();
      const items: WisdomQuote[] = capLibraryList(data.quotes || []);
      setQuotes(items);
      setPendingQuotes([]);

      if (items.length > 0) {
        setSelectedQuote((prev) => {
          if (prev) {
            const refreshed = items.find((q) => q.id === prev.id);
            if (refreshed) return refreshed;
          }
          return items[0]!;
        });
      } else {
        setSelectedQuote(null);
      }
    } catch (err: any) {
      console.error('[QuotesExplorer] Fetch quotes failed:', err);
      setError(err instanceof Error ? err.message : 'Error loading quotes');
    } finally {
      setLoading(false);
    }
  }, [selectedAuthor, selectedTradition, selectedTheme, globalSearchQuery]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Live SSE Wisdom updates for Quotes, QOTD, Meaning Approvals & Provenance (L3, L6)
  useEffect(() => {
    const unsubWisdom = sseBus.subscribe('library_wisdom_update', ({ kind, action, record }) => {
      if (kind !== 'quote' || !record || typeof record.id !== 'number') return;
      const incoming = record as WisdomQuote;

      setSelectedQuote((prev) => (prev && prev.id === incoming.id ? { ...prev, ...incoming } : prev));

      const f = filterRef.current;
      const matches = quoteMatchesFilter(incoming as LibraryQuoteRecord, {
        author: f.selectedAuthor,
        tradition: f.selectedTradition,
        theme: f.selectedTheme,
        searchQuery: f.globalSearchQuery,
      });

      setQuotes((prevQuotes) => {
        const exists = prevQuotes.some((q) => q.id === incoming.id);
        if (action === 'updated' || exists) {
          return prevQuotes.map((q) => (q.id === incoming.id ? { ...q, ...incoming } : q));
        }
        return prevQuotes;
      });

      if (action === 'created') {
        setPendingQuotes((prevPending) => {
          if (quotesRef.current.some((q) => q.id === incoming.id)) return prevPending;
          return reconcileLibraryIncomingItem<WisdomQuote>({
            action: 'created',
            item: incoming,
            matchesFilter: matches,
            visible: quotesRef.current,
            pending: prevPending,
          }).pending;
        });
      } else {
        setPendingQuotes((prevPending) =>
          prevPending.map((q) => (q.id === incoming.id ? { ...q, ...incoming } : q)),
        );
      }
    });

    const unsubResync = sseBus.subscribe('library_resync', () => {
      fetchQuotes();
    });

    return () => {
      unsubWisdom();
      unsubResync();
    };
  }, [fetchQuotes]);

  const handleSaveQuoteMeaning = async (
    quoteId: number,
    patch: { plain_meaning: string; meaning_reviewed: number; commentary_source?: string },
  ) => {
    setSavingMeaning(true);
    try {
      const res = await fetch(`/api/library/wisdom/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record) {
          setSelectedQuote((prev) => (prev && prev.id === data.record.id ? { ...prev, ...data.record } : prev));
          setQuotes((prev) => prev.map((q) => (q.id === data.record.id ? { ...q, ...data.record } : q)));
          postCrossTabSync({
            type: 'library_wisdom_update',
            kind: 'quote',
            action: 'updated',
            record: data.record,
          });
        }
      }
    } finally {
      setSavingMeaning(false);
    }
  };

  const handleMergePendingQuotes = () => {
    const merged = pendingQuotes;
    setQuotes((prev) => mergePendingLibraryItems(merged, prev, true));
    setSelectedQuote((prev) => prev ?? merged[0] ?? null);
    setPendingQuotes([]);
  };

  // Handler for Quote of the Day
  const handleQuoteOfTheDay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/wisdom/quotes/today');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.quote) {
        setSelectedQuote(data.quote);
      }
    } catch (err: any) {
      console.error('[QuotesExplorer] Failed to load Quote of the Day:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Random Quote
  const handleRandomQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/wisdom/quotes/random');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.quote) {
        setSelectedQuote(data.quote);
      }
    } catch (err: any) {
      console.error('[QuotesExplorer] Failed to load random quote:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Discovery Bar */}
      <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] space-y-4">
        {/* Tradition Chips */}
        <div>
          <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block mb-2 font-mono uppercase tracking-wider">
            Philosophical Traditions & Lineages:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TRADITIONS.map((t) => {
              const active = t.id === selectedTradition;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTradition(t.id)}
                  className={`px-3 py-1 text-xs font-serif rounded-sm border transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--lib-surface-elevated)] border-[var(--lib-accent)] text-[var(--lib-ink)] font-medium shadow-2xs'
                      : 'bg-[var(--lib-surface)] border-[var(--lib-border)] text-[var(--lib-ink-muted)] hover:border-[var(--lib-accent)]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Author & Theme Dropdowns + Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--lib-border-soft)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Author filter */}
            <div className="flex items-center gap-1.5 text-xs font-serif text-[var(--lib-ink)]">
              <User className="w-3.5 h-3.5 text-[var(--lib-accent)]" />
              <select
                value={selectedAuthor}
                onChange={(e) => setSelectedAuthor(e.target.value)}
                className="px-2 py-1 text-xs font-serif bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] rounded text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)] cursor-pointer"
              >
                {AUTHORS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Filter */}
            <div className="flex items-center gap-1.5 text-xs font-serif text-[var(--lib-ink)]">
              <Filter className="w-3 h-3 text-[var(--lib-accent)]" />
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="px-2 py-1 text-xs font-serif bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] rounded text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)] cursor-pointer"
              >
                {THEMES.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-open-wisdom-review"
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                useAppStore.getState().setWisdomSpacedRepetitionOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-surface-elevated)] border border-[var(--lib-gold)] hover:bg-[var(--lib-gold)] hover:text-white transition-all cursor-pointer font-medium shadow-2xs"
              title="Open Spaced Repetition Flashcard Review Studio"
            >
              <Brain className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
              <span>Review Deck</span>
            </button>

            <button
              type="button"
              onClick={handleQuoteOfTheDay}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-accent-soft)] border border-[var(--lib-accent)] hover:opacity-90 transition-opacity cursor-pointer font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--lib-accent)]" />
              <span>Quote of the Day</span>
            </button>

            <button
              type="button"
              onClick={handleRandomQuote}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] hover:border-[var(--lib-accent)] transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[var(--lib-ink-muted)]" />
              <span>Random Quote</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-jumping "• N new quotes" pill */}
      {pendingQuotes.length > 0 && (
        <button
          id="btn-library-quotes-new-pill"
          type="button"
          onClick={handleMergePendingQuotes}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--lib-accent)] bg-[var(--lib-accent-soft)] text-xs font-serif font-medium text-[var(--lib-ink)] hover:opacity-90 cursor-pointer tabular-nums"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--lib-accent)]" />
          <span>• {pendingQuotes.length} new quote{pendingQuotes.length === 1 ? '' : 's'} — Click to add</span>
        </button>
      )}

      {/* Main Content Area */}
      {loading ? (
        <LibraryLoadingState rows={3} />
      ) : error ? (
        <LibraryErrorState
          error={error}
          onRetry={fetchQuotes}
        />
      ) : quotes.length === 0 ? (
        <LibraryEmptyState
          title="No Quotes Matched"
          message="Try resetting the author or tradition filter."
          actionLabel="Show All Verified Quotes"
          onAction={() => {
            setSelectedTradition('all');
            setSelectedAuthor('all');
            setSelectedTheme('all');
          }}
        />
      ) : (
        <div className="space-y-6 lib-scroll-anchor">

          {/* Quotes Selector Strip */}
          {quotes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              <span className="lib-meta text-[10px] text-[var(--lib-ink-muted)] font-mono uppercase mr-1 shrink-0 tabular-nums">
                Maxims ({quotes.length}):
              </span>
              {quotes.map((q) => {
                const active = selectedQuote?.id === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuote(q)}
                    className={`px-2.5 py-1 text-xs font-serif rounded shrink-0 border transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--lib-accent)] text-[var(--lib-surface-elevated)] border-[var(--lib-accent)] font-medium shadow-2xs'
                        : 'bg-[var(--lib-surface)] text-[var(--lib-ink-muted)] border-[var(--lib-border)] hover:border-[var(--lib-accent)]'
                    }`}
                  >
                    {q.author.split(' ').pop()} • #{q.id}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Quote Card */}
          {selectedQuote && (
            <QuoteFolioCard
              quote={selectedQuote}
              isBookmarked={isBookmarked('quote', selectedQuote.id)}
              isSaving={savingMeaning}
              onSaveMeaning={handleSaveQuoteMeaning}
              onToggleBookmark={() =>
                toggleBookmark('quote', selectedQuote.id, `"${selectedQuote.quote_text.slice(0, 50)}..." — ${selectedQuote.author}`)
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

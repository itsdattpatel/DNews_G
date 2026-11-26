/**
 * frontend/src/library/wisdom/ScriptureReader.tsx
 * Canonical Holy Book reader with chapter/section selectors, theme filters,
 * Verse of the Day, and Random Verse explorer.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VerseFolioCard, type ScriptureVerse } from './VerseFolioCard';
import { LibraryLoadingState, LibraryEmptyState, LibraryErrorState } from '../ui/LibraryStates';
import { useLibraryStore } from '../store/useLibraryStore';
import { sseBus, postCrossTabSync } from '../../lib/sseBus';
import {
  verseMatchesFilter,
  reconcileLibraryIncomingItem,
  mergePendingLibraryItems,
  capLibraryList,
  type LibraryVerseRecord,
} from '../utils/libraryLive';
import {
  Sparkles,
  Shuffle,
  Filter,
} from 'lucide-react';
import { apiFetch, apiUrl } from '../../lib/api';

export interface ScriptureBook {
  id: number;
  slug: string;
  title_english: string;
  title_original: string;
  tradition: string;
  total_sections: number;
  section_unit: string;
  description: string;
  default_translator: string;
  source_license: string;
}

const THEME_OPTIONS = [
  { id: 'all', label: 'All Themes' },
  { id: 'duty', label: 'Duty & Action' },
  { id: 'courage', label: 'Courage & Resolve' },
  { id: 'detachment', label: 'Detachment & Equanimity' },
  { id: 'peace', label: 'Inner Peace' },
  { id: 'leadership', label: 'Righteous Leadership' },
  { id: 'devotion', label: 'Devotion & Grace' },
];

export interface ScriptureReaderProps {
  onSelectBook?: (bookSlug: string) => void;
}

export const ScriptureReader: React.FC<ScriptureReaderProps> = () => {
  const [books, setBooks] = useState<ScriptureBook[]>([]);
  const [selectedBookSlug, setSelectedBookSlug] = useState<string>('bhagavad_gita');
  const [selectedSection, setSelectedSection] = useState<number | 'all'>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');

  const [verses, setVerses] = useState<ScriptureVerse[]>([]);
  const [pendingVerses, setPendingVerses] = useState<ScriptureVerse[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<ScriptureVerse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingMeaning, setSavingMeaning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const globalSearchQuery = useLibraryStore((s) => s.searchQuery);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const filterRef = useRef({ selectedBookSlug, selectedSection, selectedTheme, globalSearchQuery });
  filterRef.current = { selectedBookSlug, selectedSection, selectedTheme, globalSearchQuery };
  const versesRef = useRef<ScriptureVerse[]>(verses);
  versesRef.current = verses;

  // 1. Fetch Holy Books Registry
  const loadBooks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/library/wisdom/books');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.books?.length > 0) {
        setBooks(data.books);
      }
    } catch (err: any) {
      console.error('[ScriptureReader] Failed to load books registry:', err);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // 2. Fetch Verses based on criteria
  const fetchVerses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedBookSlug && selectedBookSlug !== 'all') {
        params.append('book', selectedBookSlug);
      }
      if (selectedSection !== 'all') {
        params.append('section', String(selectedSection));
      }
      if (selectedTheme !== 'all') {
        params.append('theme', selectedTheme);
      }
      const activeQuery = globalSearchQuery?.trim();
      if (activeQuery) {
        params.append('q', activeQuery);
      }

      const res = await apiFetch(`/api/library/wisdom/verses?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load verses (HTTP ${res.status})`);
      }
      const data = await res.json();
      const items: ScriptureVerse[] = capLibraryList(data.verses || []);
      setVerses(items);
      setPendingVerses([]);

      if (items.length > 0) {
        setSelectedVerse((prev) => {
          if (prev) {
            const refreshed = items.find((v) => v.id === prev.id);
            if (refreshed) return refreshed;
          }
          return items[0]!;
        });
      } else {
        setSelectedVerse(null);
      }
    } catch (err: any) {
      console.error('[ScriptureReader] Fetch verses failed:', err);
      setError(err instanceof Error ? err.message : 'Error loading scriptures');
    } finally {
      setLoading(false);
    }
  }, [selectedBookSlug, selectedSection, selectedTheme, globalSearchQuery]);

  useEffect(() => {
    fetchVerses();
  }, [fetchVerses]);

  // Live SSE Wisdom updates for Scripture Verses & Provenance (L3, L6)
  useEffect(() => {
    const unsubWisdom = sseBus.subscribe('library_wisdom_update', ({ kind, action, record }) => {
      if (kind !== 'verse' || !record || typeof record.id !== 'number') return;
      const incoming = record as ScriptureVerse;

      // Always update active folio in place (covers VOTD / Random outside current list)
      setSelectedVerse((prev) => (prev && prev.id === incoming.id ? { ...prev, ...incoming } : prev));

      const f = filterRef.current;
      const matches = verseMatchesFilter(incoming as LibraryVerseRecord, {
        bookId: f.selectedBookSlug,
        chapter: f.selectedSection,
        theme: f.selectedTheme,
        searchQuery: f.globalSearchQuery,
      });

      setVerses((prevVerses) => {
        const exists = prevVerses.some((v) => v.id === incoming.id);
        if (action === 'updated' || exists) {
          return prevVerses.map((v) => (v.id === incoming.id ? { ...v, ...incoming } : v));
        }
        return prevVerses;
      });

      if (action === 'created') {
        setPendingVerses((prevPending) => {
          if (versesRef.current.some((v) => v.id === incoming.id)) return prevPending;
          return reconcileLibraryIncomingItem<ScriptureVerse>({
            action: 'created',
            item: incoming,
            matchesFilter: matches,
            visible: versesRef.current,
            pending: prevPending,
          }).pending;
        });
      } else {
        setPendingVerses((prevPending) =>
          prevPending.map((v) => (v.id === incoming.id ? { ...v, ...incoming } : v)),
        );
      }
    });

    const unsubResync = sseBus.subscribe('library_resync', () => {
      loadBooks();
      fetchVerses();
    });

    return () => {
      unsubWisdom();
      unsubResync();
    };
  }, [fetchVerses, loadBooks]);

  const handleSaveVerseMeaning = async (
    verseId: number,
    patch: { plain_meaning: string; meaning_reviewed: number; commentary_source?: string },
  ) => {
    setSavingMeaning(true);
    try {
      const res = await apiFetch(`/api/library/wisdom/verses/${verseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record) {
          setSelectedVerse((prev) => (prev && prev.id === data.record.id ? { ...prev, ...data.record } : prev));
          setVerses((prev) => prev.map((v) => (v.id === data.record.id ? { ...v, ...data.record } : v)));
          postCrossTabSync({
            type: 'library_wisdom_update',
            kind: 'verse',
            action: 'updated',
            record: data.record,
          });
        }
      }
    } finally {
      setSavingMeaning(false);
    }
  };

  const handleMergePendingVerses = () => {
    const merged = pendingVerses;
    setVerses((prev) => mergePendingLibraryItems(merged, prev, true));
    setSelectedVerse((prev) => prev ?? merged[0] ?? null);
    setPendingVerses([]);
  };

  // Handler for Verse of the Day
  const handleVerseOfTheDay = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/library/wisdom/verses/today');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.verse) {
        setSelectedVerse(data.verse);
        setSelectedBookSlug(data.verse.book_slug);
      }
    } catch (err: any) {
      console.error('[ScriptureReader] Failed to load Verse of the Day:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Random Verse
  const handleRandomVerse = async () => {
    setLoading(true);
    try {
      const url = selectedBookSlug
        ? apiUrl(`/api/library/wisdom/verses/random?book=${encodeURIComponent(selectedBookSlug)}`)
        : apiUrl('/api/library/wisdom/verses/random');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.verse) {
        setSelectedVerse(data.verse);
        setSelectedBookSlug(data.verse.book_slug);
      }
    } catch (err: any) {
      console.error('[ScriptureReader] Failed to load random verse:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentBook = books.find((b) => b.slug === selectedBookSlug);

  return (
    <div className="space-y-6">
      {/* Top Filter and Discovery Bar */}
      <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] space-y-4">
        {/* Books Selector */}
        <div>
          <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block mb-2 font-mono uppercase tracking-wider">
            Canonical Holy Books Registry:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {books.map((b) => {
              const active = b.slug === selectedBookSlug;
              return (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => {
                    setSelectedBookSlug(b.slug);
                    setSelectedSection('all');
                  }}
                  className={`p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--lib-surface-elevated)] border-[var(--lib-gold)] shadow-xs'
                      : 'bg-[var(--lib-surface)] border-[var(--lib-border)] hover:border-[var(--lib-gold)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--lib-gold)] font-serif">
                    <span className="truncate">{b.title_original}</span>
                    <span className="text-[10px] font-mono text-[var(--lib-ink-muted)]">
                      {b.total_sections} {b.section_unit}s
                    </span>
                  </div>
                  <h4 className="font-serif font-medium text-sm text-[var(--lib-ink)] mt-0.5 truncate">
                    {b.title_english}
                  </h4>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section / Chapter & Theme Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--lib-border-soft)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Section selector if book selected */}
            {currentBook && (
              <div className="flex items-center gap-1.5 text-xs font-serif text-[var(--lib-ink)]">
                <span className="text-[var(--lib-ink-muted)] font-mono text-[10px] uppercase">
                  {currentBook.section_unit}:
                </span>
                <select
                  value={selectedSection}
                  onChange={(e) =>
                    setSelectedSection(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
                  }
                  className="px-2 py-1 text-xs font-serif bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] rounded text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-gold)] cursor-pointer"
                >
                  <option value="all">All {currentBook.section_unit}s</option>
                  {Array.from({ length: currentBook.total_sections }, (_, i) => i + 1).map((sec) => (
                    <option key={sec} value={sec}>
                      {currentBook.section_unit} {sec}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme Filter */}
            <div className="flex items-center gap-1.5 text-xs font-serif text-[var(--lib-ink)]">
              <Filter className="w-3 h-3 text-[var(--lib-gold)]" />
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="px-2 py-1 text-xs font-serif bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] rounded text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-gold)] cursor-pointer"
              >
                {THEME_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVerseOfTheDay}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-gold-soft)] border border-[var(--lib-gold)] hover:opacity-90 transition-opacity cursor-pointer font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
              <span>Verse of the Day</span>
            </button>

            <button
              type="button"
              onClick={handleRandomVerse}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] hover:border-[var(--lib-gold)] transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[var(--lib-ink-muted)]" />
              <span>Random Verse</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-jumping "• N new verses" pill */}
      {pendingVerses.length > 0 && (
        <button
          id="btn-library-verses-new-pill"
          type="button"
          onClick={handleMergePendingVerses}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--lib-gold)] bg-[var(--lib-gold-soft)] text-xs font-serif font-medium text-[var(--lib-ink)] hover:opacity-90 cursor-pointer tabular-nums"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
          <span>• {pendingVerses.length} new verse{pendingVerses.length === 1 ? '' : 's'} — Click to add</span>
        </button>
      )}

      {/* Main Content Area */}
      {loading ? (
        <LibraryLoadingState rows={3} />
      ) : error ? (
        <LibraryErrorState
          error={error}
          onRetry={fetchVerses}
        />
      ) : verses.length === 0 ? (
        <LibraryEmptyState
          title="No Verses Matched"
          message="Try selecting a different chapter or resetting the theme filter."
          actionLabel="View Chapter 2 of Bhagavad Gita"
          onAction={() => {
            setSelectedBookSlug('bhagavad_gita');
            setSelectedSection(2);
            setSelectedTheme('all');
          }}
        />
      ) : (
        <div className="space-y-6 lib-scroll-anchor">

          {/* Verse Selector Strip if multiple verses loaded */}
          {verses.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              <span className="lib-meta text-[10px] text-[var(--lib-ink-muted)] font-mono uppercase mr-1 shrink-0 tabular-nums">
                Folios ({verses.length}):
              </span>
              {verses.map((v) => {
                const active = selectedVerse?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVerse(v)}
                    className={`px-2.5 py-1 text-xs font-mono rounded shrink-0 border transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--lib-gold)] text-[var(--lib-surface-elevated)] border-[var(--lib-gold)] font-bold shadow-2xs'
                        : 'bg-[var(--lib-surface)] text-[var(--lib-ink-muted)] border-[var(--lib-border)] hover:border-[var(--lib-gold)]'
                    }`}
                  >
                    {v.verse_ref}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Verse Card */}
          {selectedVerse && (
            <VerseFolioCard
              verse={selectedVerse}
              isBookmarked={isBookmarked('verse', selectedVerse.id)}
              isSaving={savingMeaning}
              onSaveMeaning={handleSaveVerseMeaning}
              onToggleBookmark={() =>
                toggleBookmark('verse', selectedVerse.id, `${selectedVerse.verse_ref}: ${selectedVerse.translation.slice(0, 60)}...`)
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

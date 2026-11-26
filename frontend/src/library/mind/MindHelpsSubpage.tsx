/**
 * frontend/src/library/mind/MindHelpsSubpage.tsx
 * Complete Subpage 3 view: Evidence-based Psychology Techniques & Crisis Helplines.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { HelpCard, type MindCardData, type MindCategory } from './HelpCard';
import { CategoryFilterBar } from './CategoryFilterBar';
import { HelplinesModal } from './HelplinesModal';
import { InkStampBadge } from '../ui/InkStampBadge';
import { LibraryLoadingState, LibraryEmptyState, LibraryErrorState } from '../ui/LibraryStates';
import { useLibraryStore } from '../store/useLibraryStore';
import { sseBus } from '../../lib/sseBus';
import {
  mindCardMatchesFilter,
  reconcileLibraryIncomingItem,
  mergePendingLibraryItems,
  capLibraryList,
  type LibraryMindCardRecord,
} from '../utils/libraryLive';
import { Clock, Sparkles } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export const MindHelpsSubpage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<MindCategory | 'all'>('all');
  const [selectedTime, setSelectedTime] = useState<number | 'all'>('all');
  const [cards, setCards] = useState<MindCardData[]>([]);
  const [pendingCards, setPendingCards] = useState<MindCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<MindCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelplinesModal, setShowHelplinesModal] = useState<boolean>(false);

  const globalSearchQuery = useLibraryStore((s) => s.searchQuery);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const filterRef = useRef({ selectedCategory, selectedTime, globalSearchQuery });
  filterRef.current = { selectedCategory, selectedTime, globalSearchQuery };
  const cardsRef = useRef<MindCardData[]>(cards);
  cardsRef.current = cards;

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedTime !== 'all') {
        params.append('max_time', String(selectedTime));
      }
      if (globalSearchQuery && globalSearchQuery.trim()) {
        params.append('q', globalSearchQuery.trim());
      }

      const res = await apiFetch(`/api/library/mind/cards?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load psychological techniques (HTTP ${res.status})`);
      }

      const data = await res.json();
      const items: MindCardData[] = capLibraryList(data.cards || []);
      setCards(items);
      setPendingCards([]);

      if (items.length > 0) {
        setSelectedCard((prev) => {
          if (prev) {
            const refreshed = items.find((c) => c.id === prev.id);
            if (refreshed) return refreshed;
          }
          return items[0]!;
        });
      } else {
        setSelectedCard(null);
      }
    } catch (err: any) {
      console.error('[MindHelpsSubpage] Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Error connecting to archives');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedTime, globalSearchQuery]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Live SSE Mind Helps updates & provenance sync (L4, L6)
  useEffect(() => {
    const unsubMind = sseBus.subscribe('library_mind_update', ({ action, record }) => {
      if (!record || typeof record.id !== 'number') return;
      const incoming = record as MindCardData;

      setSelectedCard((prev) => (prev && prev.id === incoming.id ? { ...prev, ...incoming } : prev));

      const f = filterRef.current;
      const matches = mindCardMatchesFilter(incoming as LibraryMindCardRecord, {
        category: f.selectedCategory,
        maxTime: f.selectedTime,
        searchQuery: f.globalSearchQuery,
      });

      setCards((prevCards) => {
        const exists = prevCards.some((c) => c.id === incoming.id);
        if (action === 'updated' || exists) {
          return prevCards.map((c) => (c.id === incoming.id ? { ...c, ...incoming } : c));
        }
        return prevCards;
      });

      if (action === 'created') {
        setPendingCards((prevPending) => {
          if (cardsRef.current.some((c) => c.id === incoming.id)) return prevPending;
          return reconcileLibraryIncomingItem<MindCardData>({
            action: 'created',
            item: incoming,
            matchesFilter: matches,
            visible: cardsRef.current,
            pending: prevPending,
          }).pending;
        });
      } else {
        setPendingCards((prevPending) =>
          prevPending.map((c) => (c.id === incoming.id ? { ...c, ...incoming } : c)),
        );
      }
    });

    const unsubResync = sseBus.subscribe('library_resync', () => {
      fetchCards();
    });

    return () => {
      unsubMind();
      unsubResync();
    };
  }, [fetchCards]);

  const handleMergePendingCards = () => {
    const merged = pendingCards;
    setCards((prev) => mergePendingLibraryItems(merged, prev, true));
    setSelectedCard((prev) => prev ?? merged[0] ?? null);
    setPendingCards([]);
  };

  // Left Panel Content: Category Filter Bar & Techniques List
  const leftPanel = (
    <div className="space-y-5 lib-scroll-anchor">
      <CategoryFilterBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedTime={selectedTime}
        onSelectTime={setSelectedTime}
        onOpenHelplines={() => setShowHelplinesModal(true)}
      />

      {pendingCards.length > 0 && (
        <button
          id="btn-library-mind-new-pill"
          type="button"
          onClick={handleMergePendingCards}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-[var(--lib-sage)] bg-[var(--lib-surface-elevated)] text-xs font-serif font-medium text-[var(--lib-ink)] hover:opacity-90 cursor-pointer tabular-nums"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--lib-sage)]" />
          <span>• {pendingCards.length} new help card{pendingCards.length === 1 ? '' : 's'} — Click to view</span>
        </button>
      )}

      {/* Techniques Selection List */}
      <div className="space-y-2 pt-2 border-t border-[var(--lib-border-soft)]">
        <div className="flex items-center justify-between text-xs font-mono text-[var(--lib-ink-muted)]">
          <span className="uppercase tracking-wider tabular-nums">
            Techniques ({cards.length}):
          </span>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedTime('all');
              }}
              className="text-[var(--lib-sage)] hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <LibraryLoadingState rows={3} />
        ) : error ? (
          <LibraryErrorState error={error} onRetry={fetchCards} />
        ) : cards.length === 0 ? (
          <LibraryEmptyState
            title="No Techniques Matched"
            message="Try selecting a different category or resetting the time duration."
            actionLabel="View All 9 Domains"
            onAction={() => {
              setSelectedCategory('all');
              setSelectedTime('all');
            }}
          />
        ) : (
          <div className="space-y-2">
            {cards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCard(card)}
                  className={`w-full text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--lib-surface-elevated)] border-[var(--lib-sage)] shadow-xs'
                      : 'bg-[var(--lib-surface)] border-[var(--lib-border)] hover:border-[var(--lib-sage)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <InkStampBadge variant="sage" shape="pill">
                      {card.category}
                    </InkStampBadge>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--lib-ink-muted)]">
                      <Clock className="w-3 h-3 text-[var(--lib-sage)]" />
                      {card.time_needed_minutes} min
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-medium text-[var(--lib-ink)] line-clamp-1">
                    {card.title}
                  </h4>
                  <p className="font-serif text-xs text-[var(--lib-ink-muted)] line-clamp-2 mt-1">
                    {card.when_it_helps}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Right Panel Content: Primary HelpCard Folio
  const rightPanel = (
    <div>
      {selectedCard ? (
        <HelpCard
          card={selectedCard}
          isBookmarked={isBookmarked('mind', selectedCard.id)}
          onToggleBookmark={() =>
            toggleBookmark(
              'mind',
              selectedCard.id,
              `${selectedCard.title} (${selectedCard.time_needed_minutes}m)`
            )
          }
        />
      ) : (
        <LibraryEmptyState
          title="Select a Psychological Technique"
          message="Choose a domain on the left to read evidence-based cognitive and somatic exercises."
        />
      )}
    </div>
  );

  return (
    <>
      <LibraryShellLayout
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        defaultLeftSize={35}
        minLeftSize={25}
        maxLeftSize={48}
      />

      <HelplinesModal
        isOpen={showHelplinesModal}
        onClose={() => setShowHelplinesModal(false)}
      />
    </>
  );
};


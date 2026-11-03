/**
 * frontend/src/library/mind/MindHelpsSubpage.tsx
 * Complete Subpage 3 view: Evidence-based Psychology Techniques & Crisis Helplines.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { HelpCard, type MindCardData, type MindCategory } from './HelpCard';
import { CategoryFilterBar } from './CategoryFilterBar';
import { HelplinesModal } from './HelplinesModal';
import { InkStampBadge } from '../ui/InkStampBadge';
import { LibraryLoadingState, LibraryEmptyState, LibraryErrorState } from '../ui/LibraryStates';
import { useLibraryStore } from '../store/useLibraryStore';
import { Clock } from 'lucide-react';

export const MindHelpsSubpage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<MindCategory | 'all'>('all');
  const [selectedTime, setSelectedTime] = useState<number | 'all'>('all');
  const [cards, setCards] = useState<MindCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<MindCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelplinesModal, setShowHelplinesModal] = useState<boolean>(false);

  const globalSearchQuery = useLibraryStore((s) => s.searchQuery);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

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

      const res = await fetch(`/api/library/mind/cards?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load psychological techniques (HTTP ${res.status})`);
      }

      const data = await res.json();
      const items: MindCardData[] = data.cards || [];
      setCards(items);

      if (items.length > 0) {
        setSelectedCard((prev) => {
          if (prev && items.some((c) => c.id === prev.id)) return prev;
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

  // Left Panel Content: Category Filter Bar & Techniques List
  const leftPanel = (
    <div className="space-y-5">
      <CategoryFilterBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedTime={selectedTime}
        onSelectTime={setSelectedTime}
        onOpenHelplines={() => setShowHelplinesModal(true)}
      />

      {/* Techniques Selection List */}
      <div className="space-y-2 pt-2 border-t border-[var(--lib-border-soft)]">
        <div className="flex items-center justify-between text-xs font-mono text-[var(--lib-ink-muted)]">
          <span className="uppercase tracking-wider">
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


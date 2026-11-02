/**
 * frontend/src/library/history/HistorySubpage.tsx
 * Complete Subpage 1 view: Historical News Archives & Today in History.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { HistoryDatePicker } from './HistoryDatePicker';
import { TodayInHistoryFeed, type HistoryFeedItem } from './TodayInHistoryFeed';
import { HistoryArticleCard } from './HistoryArticleCard';
import { LibraryLoadingState, LibraryEmptyState, LibraryErrorState } from '../ui/LibraryStates';
import { useLibraryStore } from '../store/useLibraryStore';

export const HistorySubpage: React.FC = () => {
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [day, setDay] = useState<number>(today.getDate());
  const [selectedDecade, setSelectedDecade] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const [items, setItems] = useState<HistoryFeedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryFeedItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const globalSearchQuery = useLibraryStore((s) => s.searchQuery);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '';
      const hasFilter = selectedDecade !== 'all' || selectedCountry !== 'all' || Boolean(globalSearchQuery && globalSearchQuery.trim().length > 0);

      if (hasFilter) {
        const params = new URLSearchParams();
        if (globalSearchQuery && globalSearchQuery.trim()) params.append('q', globalSearchQuery.trim());
        if (selectedDecade !== 'all') params.append('decade', selectedDecade);
        if (selectedCountry !== 'all') params.append('country', selectedCountry);
        url = `/api/library/history/search?${params.toString()}`;
      } else {
        url = `/api/library/history/today?month=${month}&day=${day}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load historical archives (HTTP ${res.status})`);
      }

      const data = await res.json();
      const loadedItems: HistoryFeedItem[] = data.items || [];
      setItems(loadedItems);

      // Select first item or preserve current selection if still present
      if (loadedItems.length > 0) {
        setSelectedItem((prev) => {
          if (prev && loadedItems.some((it) => it.id === prev.id)) {
            return prev;
          }
          return loadedItems[0]!;
        });
      } else {
        setSelectedItem(null);
      }
    } catch (err: any) {
      console.error('[HistorySubpage] Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Archival connection error');
    } finally {
      setLoading(false);
    }
  }, [month, day, selectedDecade, selectedCountry, globalSearchQuery]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleResetToToday = () => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setDay(now.getDate());
    setSelectedDecade('all');
    setSelectedCountry('all');
  };

  const handleBookmarkToggle = () => {
    if (!selectedItem) return;
    toggleBookmark('history', selectedItem.id, selectedItem.headline);
  };

  // Left Panel Content
  const leftPanel = (
    <div className="space-y-6">
      <HistoryDatePicker
        month={month}
        day={day}
        onDateChange={(m, d) => {
          setMonth(m);
          setDay(d);
        }}
        selectedDecade={selectedDecade}
        onDecadeChange={setSelectedDecade}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        onResetToToday={handleResetToToday}
      />

      {loading ? (
        <LibraryLoadingState rows={4} />
      ) : error ? (
        <LibraryErrorState error={error} onRetry={fetchHistory} />
      ) : items.length === 0 ? (
        <LibraryEmptyState
          title="No Historical Clippings Found"
          message="No open archival dispatches matched the selected date and filters. Try clearing decade or country filters."
          actionLabel="Clear Filters"
          onAction={handleResetToToday}
        />
      ) : (
        <TodayInHistoryFeed
          items={items}
          selectedId={selectedItem?.id ?? null}
          onSelect={setSelectedItem}
        />
      )}
    </div>
  );

  // Right Panel Content (The Reading Desk)
  const rightPanel = (
    <div>
      {selectedItem ? (
        <HistoryArticleCard
          item={selectedItem}
          isBookmarked={isBookmarked('history', selectedItem.id)}
          onToggleBookmark={handleBookmarkToggle}
        />
      ) : loading ? (
        <LibraryLoadingState rows={6} />
      ) : (
        <LibraryEmptyState
          title="Archival Reading Desk"
          message="Select any historical event or newspaper clipping from the timeline index to inspect the primary document."
        />
      )}
    </div>
  );

  return <LibraryShellLayout leftPanel={leftPanel} rightPanel={rightPanel} defaultLeftSize={38} />;
};

/**
 * frontend/src/library/history/HistorySubpage.tsx
 * Complete Subpage 1 view: Historical News Archives & Today in History.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { HistoryDatePicker } from './HistoryDatePicker';
import { TodayInHistoryFeed, type HistoryFeedItem } from './TodayInHistoryFeed';
import { HistoryArticleCard } from './HistoryArticleCard';
import { LibraryLoadingState, LibraryEmptyState, LibraryErrorState } from '../ui/LibraryStates';
import { useLibraryStore } from '../store/useLibraryStore';
import { sseBus } from '../../lib/sseBus';
import {
  historyMatchesFilter,
  reconcileLibraryIncomingItem,
  mergePendingLibraryItems,
  capLibraryList,
  type HistoryEventRecord,
} from '../utils/libraryLive';
import { RefreshCw, Sparkles } from 'lucide-react';

export const HistorySubpage: React.FC = () => {
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [day, setDay] = useState<number>(today.getDate());
  const [selectedDecade, setSelectedDecade] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const [items, setItems] = useState<HistoryFeedItem[]>([]);
  const [pendingItems, setPendingItems] = useState<HistoryFeedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryFeedItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const globalSearchQuery = useLibraryStore((s) => s.searchQuery);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);
  const refreshStatus = useLibraryStore((s) => s.refreshStatus);
  const triggerHistoryRefresh = useLibraryStore((s) => s.triggerHistoryRefresh);

  const filterRef = useRef({ month, day, selectedDecade, selectedCountry, globalSearchQuery });
  filterRef.current = { month, day, selectedDecade, selectedCountry, globalSearchQuery };

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
      const loadedItems: HistoryFeedItem[] = capLibraryList(data.items || []);
      setItems(loadedItems);
      setPendingItems([]);

      // Select first item or preserve current selection if still present
      if (loadedItems.length > 0) {
        setSelectedItem((prev) => {
          if (prev) {
            const updatedMatch = loadedItems.find((it) => it.id === prev.id);
            if (updatedMatch) return updatedMatch;
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

  // Live SSE History updates & Wake Resync (L1, L2, L6, L7)
  useEffect(() => {
    const unsubUpdate = sseBus.subscribe('library_history_update', ({ action, record }) => {
      if (!record || typeof record.id !== 'number') return;
      const f = filterRef.current;
      const hasSearchOrFilter =
        f.selectedDecade !== 'all' ||
        f.selectedCountry !== 'all' ||
        Boolean(f.globalSearchQuery && f.globalSearchQuery.trim().length > 0);
      const monthDay = `${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`;

      const matches = historyMatchesFilter(record as HistoryEventRecord, {
        ...(hasSearchOrFilter ? {} : { monthDay }),
        decade: f.selectedDecade,
        country: f.selectedCountry,
        searchQuery: f.globalSearchQuery,
      });

      setItems((prevItems) => {
        // Compute inside functional update cleanly via pending ref/state cascade
        const exists = prevItems.some((it) => it.id === record.id);
        if (action === 'updated' || exists) {
          return prevItems.map((it) => (it.id === record.id ? { ...it, ...record } : it));
        }
        return prevItems;
      });

      setSelectedItem((prevSel) =>
        prevSel && prevSel.id === record.id ? { ...prevSel, ...record } : prevSel,
      );

      if (action === 'created') {
        setPendingItems((prevPending) => {
          const alreadyVisible = itemsRef.current.some((it) => it.id === record.id);
          if (alreadyVisible) return prevPending;
          const reconciled = reconcileLibraryIncomingItem<HistoryFeedItem>({
            action: 'created',
            item: record as HistoryFeedItem,
            matchesFilter: matches,
            visible: itemsRef.current,
            pending: prevPending,
          });
          return reconciled.pending;
        });
      } else {
        setPendingItems((prevPending) =>
          prevPending.map((it) => (it.id === record.id ? { ...it, ...record } : it)),
        );
      }
    });

    const unsubResync = sseBus.subscribe('library_resync', () => {
      fetchHistory();
    });

    return () => {
      unsubUpdate();
      unsubResync();
    };
  }, [fetchHistory]);

  const itemsRef = useRef<HistoryFeedItem[]>(items);
  itemsRef.current = items;

  const handleMergePending = () => {
    const merged = pendingItems;
    setItems((prev) => mergePendingLibraryItems(merged, prev, true));
    setSelectedItem((prev) => prev ?? merged[0] ?? null);
    setPendingItems([]);
  };

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

  const padMonthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Left Panel Content
  const leftPanel = (
    <div className="space-y-4 lib-scroll-anchor">
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

      {/* Archival Refresh Status Chip & Manual Sync */}
      <div
        id="library-refresh-status-chip"
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-[var(--lib-border-soft)] bg-[var(--lib-surface)] text-[11px] font-mono text-[var(--lib-ink-muted)]"
      >
        <span className="truncate tabular-nums">
          {refreshStatus?.status === 'running'
            ? `Syncing archives (${refreshStatus.month_day})...`
            : refreshStatus?.last_run_at
              ? `Synced • ${refreshStatus.total_cached} cached`
              : 'Live archival index connected'}
        </span>
        <button
          id="btn-library-history-refresh"
          type="button"
          onClick={() => void triggerHistoryRefresh(padMonthDay)}
          disabled={refreshStatus?.status === 'running'}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] hover:border-[var(--lib-gold)] cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${refreshStatus?.status === 'running' ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Non-jumping "• N new" pill */}
      {pendingItems.length > 0 && (
        <button
          id="btn-library-history-new-pill"
          type="button"
          onClick={handleMergePending}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-[var(--lib-gold)] bg-[var(--lib-gold-soft)] text-xs font-serif font-medium text-[var(--lib-ink)] hover:opacity-90 transition-opacity cursor-pointer tabular-nums"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
          <span>• {pendingItems.length} new historical record{pendingItems.length === 1 ? '' : 's'} — Click to view</span>
        </button>
      )}

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

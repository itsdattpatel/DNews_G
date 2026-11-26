/**
 * frontend/src/library/store/useLibraryStore.ts
 * Dedicated, isolated Zustand store for The Library subsystem.
 */
import { create } from 'zustand';
import { postCrossTabSync, type SseBusEventMap } from '../../lib/sseBus';
import { apiFetch } from '../../lib/api';

export type LibraryTab = 'history' | 'wisdom' | 'mind';
export type WisdomSubTab = 'scriptures' | 'quotes';
export type LibraryItemType = 'history' | 'verse' | 'quote' | 'mind';

export interface LibraryBookmarkItem {
  id: number;
  item_type: LibraryItemType;
  item_id: number;
  note: string | null;
  created_at: string;
}

export type LibraryRefreshStatus = SseBusEventMap['library_refresh_status'];

export interface LibraryProvenanceSummary {
  summary: {
    history_records: number;
    books: number;
    verses: number;
    quotes: number;
    mind_cards: number;
    reviewed_verses: number;
    reviewed_quotes: number;
  };
  licenses: Array<{ license: string; section: string; count: number }>;
  updated_at: string;
}

export interface LibraryStoreState {
  // Navigation & Subpages
  activeTab: LibraryTab;
  wisdomSubTab: WisdomSubTab;
  searchQuery: string;

  // Reading Room Theme (Day = warm parchment / Night = candlelit mahogany)
  theme: 'day' | 'night';

  // Bookmarks
  isBookmarksOpen: boolean;
  bookmarks: LibraryBookmarkItem[];
  isLoadingBookmarks: boolean;

  // Background refresh & live provenance
  refreshStatus: LibraryRefreshStatus | null;
  provenance: LibraryProvenanceSummary | null;

  // Actions
  setActiveTab: (tab: LibraryTab) => void;
  setWisdomSubTab: (subTab: WisdomSubTab) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'day' | 'night', syncCrossTab?: boolean) => void;
  toggleTheme: () => void;
  setBookmarksOpen: (open: boolean) => void;

  fetchBookmarks: () => Promise<void>;
  toggleBookmark: (itemType: LibraryItemType, itemId: number, note?: string) => Promise<boolean>;
  deleteBookmark: (id: number) => Promise<void>;
  isBookmarked: (itemType: LibraryItemType, itemId: number) => boolean;
  applyLiveBookmarkEvent: (evt: SseBusEventMap['library_bookmark_update']) => void;
  setRefreshStatus: (status: LibraryRefreshStatus) => void;
  fetchRefreshStatus: () => Promise<void>;
  triggerHistoryRefresh: (monthDay?: string) => Promise<void>;
  fetchProvenance: () => Promise<void>;
}

export const useLibraryStore = create<LibraryStoreState>((set, get) => ({
  activeTab: 'history',
  wisdomSubTab: 'scriptures',
  searchQuery: '',
  theme:
    typeof window !== 'undefined' && localStorage.getItem('lib_theme') === 'night'
      ? 'night'
      : 'day',
  isBookmarksOpen: false,
  bookmarks: [],
  isLoadingBookmarks: false,
  refreshStatus: null,
  provenance: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setWisdomSubTab: (subTab) => set({ wisdomSubTab: subTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setTheme: (theme, syncCrossTab = true) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lib_theme', theme);
    }
    set({ theme });
    if (syncCrossTab) {
      postCrossTabSync({ type: 'library_theme_update', theme });
    }
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'day' ? 'night' : 'day';
    get().setTheme(nextTheme);
  },

  setBookmarksOpen: (isBookmarksOpen) => set({ isBookmarksOpen }),

  fetchBookmarks: async () => {
    set({ isLoadingBookmarks: true });
    try {
      const res = await apiFetch('/api/library/bookmarks');
      if (res.ok) {
        const data = await res.json();
        set({ bookmarks: data.bookmarks ?? [] });
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to fetch bookmarks:', err);
    } finally {
      set({ isLoadingBookmarks: false });
    }
  },

  toggleBookmark: async (itemType, itemId, note) => {
    try {
      const res = await apiFetch('/api/library/bookmarks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, note }),
      });
      if (res.ok) {
        const data = await res.json();
        const evt: SseBusEventMap['library_bookmark_update'] = data.bookmarked
          ? {
              action: 'created',
              item_type: itemType,
              item_id: itemId,
              ...(data.bookmark ? { bookmark: data.bookmark } : {}),
            }
          : {
              action: 'deleted',
              ...(data.id !== undefined ? { bookmark_id: data.id } : {}),
              item_type: itemType,
              item_id: itemId,
            };
        get().applyLiveBookmarkEvent(evt);
        postCrossTabSync({ type: 'library_bookmark_update', ...evt });
        if (data.bookmarked && !data.bookmark) {
          await get().fetchBookmarks();
        }
        return Boolean(data.bookmarked);
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to toggle bookmark:', err);
    }
    return false;
  },

  deleteBookmark: async (id) => {
    const existing = get().bookmarks.find((b) => b.id === id);
    try {
      const res = await apiFetch(`/api/library/bookmarks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) });
        if (existing) {
          postCrossTabSync({
            type: 'library_bookmark_update',
            action: 'deleted',
            bookmark_id: id,
            item_type: existing.item_type,
            item_id: existing.item_id,
          });
        }
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to delete bookmark:', err);
    }
  },

  isBookmarked: (itemType, itemId) => {
    return get().bookmarks.some(
      (b) => b.item_type === itemType && b.item_id === itemId
    );
  },

  applyLiveBookmarkEvent: (evt) => {
    const current = get().bookmarks;
    if (evt.action === 'created' && evt.bookmark) {
      const exists = current.some(
        (b) =>
          b.id === evt.bookmark.id ||
          (b.item_type === evt.item_type && b.item_id === evt.item_id),
      );
      if (exists) {
        set({
          bookmarks: current.map((b) =>
            b.item_type === evt.item_type && b.item_id === evt.item_id ? evt.bookmark : b,
          ),
        });
      } else {
        set({ bookmarks: [evt.bookmark, ...current] });
      }
      return;
    }

    if (evt.action === 'deleted') {
      set({
        bookmarks: current.filter(
          (b) =>
            b.id !== evt.bookmark_id &&
            !(b.item_type === evt.item_type && b.item_id === evt.item_id),
        ),
      });
    }
  },

  setRefreshStatus: (refreshStatus) => set({ refreshStatus }),

  fetchRefreshStatus: async () => {
    try {
      const res = await apiFetch('/api/library/refresh/status');
      if (res.ok) {
        const data = await res.json();
        set({ refreshStatus: data });
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to fetch refresh status:', err);
    }
  },

  triggerHistoryRefresh: async (monthDay) => {
    try {
      const res = await apiFetch('/api/library/refresh/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monthDay ? { monthDay } : {}),
      });
      if (res.ok) {
        const data = await res.json();
        set({ refreshStatus: data });
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to trigger history refresh:', err);
    }
  },

  fetchProvenance: async () => {
    try {
      const res = await apiFetch('/api/library/provenance');
      if (res.ok) {
        const data = await res.json();
        set({ provenance: data });
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to fetch provenance summary:', err);
    }
  },
}));

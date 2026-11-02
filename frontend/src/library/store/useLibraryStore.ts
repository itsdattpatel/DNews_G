/**
 * frontend/src/library/store/useLibraryStore.ts
 * Dedicated, isolated Zustand store for The Library subsystem.
 */
import { create } from 'zustand';

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

  // Actions
  setActiveTab: (tab: LibraryTab) => void;
  setWisdomSubTab: (subTab: WisdomSubTab) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'day' | 'night') => void;
  toggleTheme: () => void;
  setBookmarksOpen: (open: boolean) => void;

  fetchBookmarks: () => Promise<void>;
  toggleBookmark: (itemType: LibraryItemType, itemId: number, note?: string) => Promise<boolean>;
  deleteBookmark: (id: number) => Promise<void>;
  isBookmarked: (itemType: LibraryItemType, itemId: number) => boolean;
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

  setActiveTab: (tab) => set({ activeTab: tab }),
  setWisdomSubTab: (subTab) => set({ wisdomSubTab: subTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lib_theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'day' ? 'night' : 'day';
    get().setTheme(nextTheme);
  },

  setBookmarksOpen: (isBookmarksOpen) => set({ isBookmarksOpen }),

  fetchBookmarks: async () => {
    set({ isLoadingBookmarks: true });
    try {
      const res = await fetch('/api/library/bookmarks');
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
      const res = await fetch('/api/library/bookmarks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, note }),
      });
      if (res.ok) {
        const data = await res.json();
        await get().fetchBookmarks();
        return Boolean(data.bookmarked);
      }
    } catch (err) {
      console.warn('[LibraryStore] Failed to toggle bookmark:', err);
    }
    return false;
  },

  deleteBookmark: async (id) => {
    try {
      const res = await fetch(`/api/library/bookmarks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) });
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
}));

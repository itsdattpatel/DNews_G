/**
 * frontend/src/__tests__/unit/library-shell.test.tsx
 * Unit test suite for The Library Shell & Store (PRD B Category B2).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import { LibraryHeader } from '../../library/components/LibraryHeader';
import { BookmarksDrawer } from '../../library/components/BookmarksDrawer';
import { LibraryShellLayout } from '../../library/components/LibraryShellLayout';

describe('The Library Shell & Store (PRD B Category B2)', () => {
  beforeEach(() => {
    useLibraryStore.setState({
      activeTab: 'history',
      wisdomSubTab: 'scriptures',
      searchQuery: '',
      theme: 'day',
      isBookmarksOpen: false,
      bookmarks: [],
    });
  });

  describe('useLibraryStore', () => {
    it('initializes with default state (history tab, scriptures subtab, day theme)', () => {
      const state = useLibraryStore.getState();
      expect(state.activeTab).toBe('history');
      expect(state.wisdomSubTab).toBe('scriptures');
      expect(state.theme).toBe('day');
      expect(state.isBookmarksOpen).toBe(false);
      expect(state.bookmarks).toEqual([]);
    });

    it('updates activeTab and wisdomSubTab', () => {
      const store = useLibraryStore.getState();
      store.setActiveTab('wisdom');
      expect(useLibraryStore.getState().activeTab).toBe('wisdom');

      store.setWisdomSubTab('quotes');
      expect(useLibraryStore.getState().wisdomSubTab).toBe('quotes');

      store.setActiveTab('mind');
      expect(useLibraryStore.getState().activeTab).toBe('mind');
    });

    it('toggles theme between day and night', () => {
      const store = useLibraryStore.getState();
      store.toggleTheme();
      expect(useLibraryStore.getState().theme).toBe('night');

      store.toggleTheme();
      expect(useLibraryStore.getState().theme).toBe('day');
    });

    it('manages search query', () => {
      const store = useLibraryStore.getState();
      store.setSearchQuery('karma yoga');
      expect(useLibraryStore.getState().searchQuery).toBe('karma yoga');
    });

    it('correctly reports isBookmarked status', () => {
      useLibraryStore.setState({
        bookmarks: [
          { id: 1, item_type: 'verse', item_id: 47, note: 'BG 2.47', created_at: '2026-11-02T12:00:00Z' },
          { id: 2, item_type: 'mind', item_id: 1, note: null, created_at: '2026-11-02T12:05:00Z' },
        ],
      });
      const store = useLibraryStore.getState();
      expect(store.isBookmarked('verse', 47)).toBe(true);
      expect(store.isBookmarked('mind', 1)).toBe(true);
      expect(store.isBookmarked('history', 101)).toBe(false);
    });
  });

  describe('LibraryHeader Component', () => {
    it('renders the reading room masthead and 3 main subpage tabs', () => {
      const html = renderToStaticMarkup(<LibraryHeader />);
      expect(html).toContain('THE READING ROOM');
      expect(html).toContain('Historical News');
      expect(html).toContain('Timeless Wisdom');
      expect(html).toContain('Mind Helps');
      expect(html).toContain('Plain Mode (Zero AI)');
      expect(html).toContain('Search library stacks...');
    });
  });

  describe('BookmarksDrawer Component', () => {
    it('renders closed by default', () => {
      const html = renderToStaticMarkup(<BookmarksDrawer />);
      expect(html).toBe('');
    });

    it('renders saved bookmarks when open', () => {
      const mockBookmarks = [
        { id: 10, item_type: 'verse' as const, item_id: 47, note: 'Daily anchor', created_at: '2026-11-02T10:00:00Z' },
      ];
      useLibraryStore.setState({
        isBookmarksOpen: true,
        bookmarks: mockBookmarks,
      });
      const html = renderToStaticMarkup(
        <BookmarksDrawer forceOpen={true} initialBookmarks={mockBookmarks} />
      );
      expect(html).toContain('Saved Library Folios');
      expect(html).toContain('Daily anchor');
      expect(html).toContain('Sacred Verse');
    });
  });

  describe('LibraryShellLayout Component', () => {
    it('renders resizable left and right panels with grab handle', () => {
      const html = renderToStaticMarkup(
        <LibraryShellLayout
          leftPanel={<div>Left Stacks Index</div>}
          rightPanel={<div>Right Folio Reader</div>}
        />
      );
      expect(html).toContain('Left Stacks Index');
      expect(html).toContain('Right Folio Reader');
      expect(html).toContain('data-panel-group');
    });
  });
});

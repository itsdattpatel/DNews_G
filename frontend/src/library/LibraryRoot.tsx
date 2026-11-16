/**
 * frontend/src/library/LibraryRoot.tsx
 * Production Library Shell Component ("The Reading Room").
 * Hosts the 3 subpages (History, Wisdom, Mind Helps), resizable layout, local search, and bookmarks drawer.
 */
import React, { useEffect } from 'react';
import './styles/library.css';
import { sseBus } from '../lib/sseBus';
import { useLibraryStore } from './store/useLibraryStore';
import { LibraryHeader } from './components/LibraryHeader';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { HistoryShellView } from './subpages/HistoryShellView';
import { WisdomShellView } from './subpages/WisdomShellView';
import { MindHelpsShellView } from './subpages/MindHelpsShellView';

export const LibraryRoot: React.FC = () => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const theme = useLibraryStore((s) => s.theme);
  const fetchBookmarks = useLibraryStore((s) => s.fetchBookmarks);
  const fetchRefreshStatus = useLibraryStore((s) => s.fetchRefreshStatus);
  const fetchProvenance = useLibraryStore((s) => s.fetchProvenance);

  useEffect(() => {
    fetchBookmarks();
    fetchRefreshStatus();
    fetchProvenance();

    const unsubBm = sseBus.subscribe('library_bookmark_update', (evt) => {
      useLibraryStore.getState().applyLiveBookmarkEvent(evt);
    });
    const unsubRefresh = sseBus.subscribe('library_refresh_status', (status) => {
      useLibraryStore.getState().setRefreshStatus(status);
    });
    const unsubTheme = sseBus.subscribe('library_theme_update', ({ theme: nextTheme }) => {
      useLibraryStore.getState().setTheme(nextTheme, false);
    });
    const unsubResync = sseBus.subscribe('library_resync', () => {
      useLibraryStore.getState().fetchBookmarks();
      useLibraryStore.getState().fetchRefreshStatus();
      useLibraryStore.getState().fetchProvenance();
    });
    const unsubProvenance = sseBus.subscribeMany(
      ['library_history_update', 'library_wisdom_update', 'library_mind_update'],
      () => {
        useLibraryStore.getState().fetchProvenance();
      },
    );

    return () => {
      unsubBm();
      unsubRefresh();
      unsubTheme();
      unsubResync();
      unsubProvenance();
    };
  }, [fetchBookmarks, fetchRefreshStatus, fetchProvenance]);

  return (
    <div className="lib-root" data-lib-theme={theme}>
      {/* ─── Reading Room Header & Subpage Tab Navigation ───────────────────── */}
      <LibraryHeader />

      {/* ─── Active Subpage Canvas ─────────────────────────────────────────── */}
      <main className="w-full flex-1 flex flex-col overflow-hidden">
        {activeTab === 'history' && <HistoryShellView />}
        {activeTab === 'wisdom' && <WisdomShellView />}
        {activeTab === 'mind' && <MindHelpsShellView />}
      </main>

      {/* ─── Bookmarks Slide-Over Drawer ───────────────────────────────────── */}
      <BookmarksDrawer />
    </div>
  );
};

export default LibraryRoot;

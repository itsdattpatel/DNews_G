/**
 * frontend/src/library/components/BookmarksDrawer.tsx
 * Slide-over drawer displaying saved library folios (history, verses, quotes, mind cards).
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLibraryStore, type LibraryItemType, type LibraryBookmarkItem } from '../store/useLibraryStore';
import { InkStampBadge } from '../ui/InkStampBadge';
import { LibraryEmptyState } from '../ui/LibraryStates';
import { X, Trash2, ExternalLink, Bookmark, Clock } from 'lucide-react';

export interface BookmarksDrawerProps {
  forceOpen?: boolean;
  initialBookmarks?: LibraryBookmarkItem[];
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({ forceOpen, initialBookmarks }) => {
  const storeOpen = useLibraryStore((s) => s.isBookmarksOpen);
  const isBookmarksOpen = forceOpen !== undefined ? forceOpen : storeOpen;
  const setBookmarksOpen = useLibraryStore((s) => s.setBookmarksOpen);
  const storeBookmarks = useLibraryStore((s) => s.bookmarks);
  const bookmarks = initialBookmarks ?? storeBookmarks;
  const fetchBookmarks = useLibraryStore((s) => s.fetchBookmarks);
  const deleteBookmark = useLibraryStore((s) => s.deleteBookmark);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);

  const [filterType, setFilterType] = useState<LibraryItemType | 'all'>('all');

  useEffect(() => {
    if (isBookmarksOpen) {
      fetchBookmarks();
    }
  }, [isBookmarksOpen, fetchBookmarks]);

  const filteredBookmarks = bookmarks.filter((b) => {
    if (filterType === 'all') return true;
    return b.item_type === filterType;
  });

  const getTypeLabel = (type: LibraryItemType) => {
    switch (type) {
      case 'history':
        return { label: 'Historical Clipping', variant: 'terracotta' as const };
      case 'verse':
        return { label: 'Sacred Verse', variant: 'gold' as const };
      case 'quote':
        return { label: 'Philosophical Quote', variant: 'sepia' as const };
      case 'mind':
        return { label: 'Mind Help Card', variant: 'sage' as const };
    }
  };

  const handleJumpToItem = (itemType: LibraryItemType) => {
    switch (itemType) {
      case 'history':
        setActiveTab('history');
        break;
      case 'verse':
      case 'quote':
        setActiveTab('wisdom');
        break;
      case 'mind':
        setActiveTab('mind');
        break;
    }
    setBookmarksOpen(false);
  };

  if (!isBookmarksOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setBookmarksOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Drawer Canvas */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[var(--lib-surface)] border-l border-[var(--lib-border)] h-full flex flex-col shadow-2xl z-10"
      >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[var(--lib-border)] flex items-center justify-between bg-[var(--lib-surface-elevated)]">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[var(--lib-gold)] fill-current" />
                <div>
                  <h3 className="lib-display text-lg font-medium text-[var(--lib-ink)]">
                    Saved Library Folios
                  </h3>
                  <p className="lib-meta text-[var(--lib-ink-muted)] text-[10px]">
                    {bookmarks.length} BOOKMARK{bookmarks.length === 1 ? '' : 'S'} STORED
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookmarksOpen(false)}
                className="p-1.5 rounded text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)] hover:bg-[var(--lib-surface-hover)] transition-colors"
                aria-label="Close bookmarks drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 py-2.5 border-b border-[var(--lib-border-soft)] bg-[var(--lib-bg)] flex items-center gap-1.5 overflow-x-auto lib-scrollbar">
              {(['all', 'history', 'verse', 'quote', 'mind'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-xs rounded-sm font-serif capitalize transition-colors ${
                    filterType === t
                      ? 'bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] border border-[var(--lib-border)] font-medium shadow-2xs'
                      : 'text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)] hover:bg-[var(--lib-surface-hover)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Bookmarks List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 lib-scrollbar">
              {filteredBookmarks.length === 0 ? (
                <LibraryEmptyState
                  title="No Bookmarks Saved"
                  message="Bookmark scripture verses, historical clippings, or psychological help cards while browsing the library."
                />
              ) : (
                filteredBookmarks.map((bookmark) => {
                  const meta = getTypeLabel(bookmark.item_type);
                  return (
                    <div
                      key={bookmark.id}
                      className="p-4 border border-[var(--lib-border)] rounded-md bg-[var(--lib-surface-elevated)] shadow-xs transition-colors hover:border-[var(--lib-gold)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <InkStampBadge variant={meta.variant} shape="pill">
                          {meta.label}
                        </InkStampBadge>
                        <button
                          type="button"
                          onClick={() => deleteBookmark(bookmark.id)}
                          className="text-[var(--lib-ink-muted)] hover:text-[var(--lib-accent)] p-1 rounded transition-colors"
                          aria-label="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="mt-2 text-sm text-[var(--lib-ink)] font-serif leading-snug">
                        Item #{bookmark.item_id} in {bookmark.item_type} stacks
                      </p>

                      {bookmark.note && (
                        <p className="mt-1 text-xs text-[var(--lib-ink-secondary)] italic font-serif">
                          “{bookmark.note}”
                        </p>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-[var(--lib-border-soft)] flex items-center justify-between text-xs text-[var(--lib-ink-muted)]">
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3" />
                          {new Date(bookmark.created_at).toLocaleDateString()}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleJumpToItem(bookmark.item_type)}
                          className="text-[var(--lib-ink-secondary)] hover:text-[var(--lib-gold)] font-serif flex items-center gap-1 text-xs"
                        >
                          <span>Open in Stacks</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--lib-border)] bg-[var(--lib-surface)] text-center text-xs text-[var(--lib-ink-muted)] font-serif">
              Saved locally in <code className="text-[10px]">library_bookmarks</code> · Immune to retention purge
            </div>
          </motion.div>
        </div>
  );
};

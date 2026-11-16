/**
 * frontend/src/library/components/LibraryHeader.tsx
 * Distinct Reading Room masthead & 3-subpage tab navigation bar.
 */
import React from 'react';
import { motion } from 'motion/react';
import { useLibraryStore, type LibraryTab } from '../store/useLibraryStore';
import { ParchmentButton } from '../ui/ParchmentButton';
import {
  ArrowLeft,
  Sun,
  Moon,
  Bookmark,
  Search,
  X,
  ShieldCheck,
  History,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const LibraryHeader: React.FC = () => {
  const activeTab = useLibraryStore((s) => s.activeTab);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);
  const theme = useLibraryStore((s) => s.theme);
  const toggleTheme = useLibraryStore((s) => s.toggleTheme);
  const isBookmarksOpen = useLibraryStore((s) => s.isBookmarksOpen);
  const setBookmarksOpen = useLibraryStore((s) => s.setBookmarksOpen);
  const bookmarks = useLibraryStore((s) => s.bookmarks);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

  const handleReturnToDesk = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  const tabs: { id: LibraryTab; label: string; icon: React.ReactNode; subtitle: string }[] = [
    {
      id: 'history',
      label: 'Historical News',
      icon: <History className="w-4 h-4 text-[var(--lib-accent)]" />,
      subtitle: 'Real Archives & Today in History',
    },
    {
      id: 'wisdom',
      label: 'Timeless Wisdom',
      icon: <BookOpen className="w-4 h-4 text-[var(--lib-gold)]" />,
      subtitle: 'Sacred Scriptures & Philosophical Quotes',
    },
    {
      id: 'mind',
      label: 'Mind Helps',
      icon: <Sparkles className="w-4 h-4 text-[var(--lib-sage)]" />,
      subtitle: 'Evidence-Based Psychology Cards',
    },
  ];

  return (
    <header className="border-b border-[var(--lib-border)] bg-[var(--lib-surface)] sticky top-0 z-30 transition-colors shadow-sm">
      {/* ─── Upper Masthead Row ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Return & Plain Mode Tag */}
        <div className="flex items-center gap-3">
          <ParchmentButton
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={handleReturnToDesk}
            aria-label="Return to BroadSheet News Desk"
          >
            News Desk
          </ParchmentButton>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm bg-[var(--lib-sage-soft)] text-[var(--lib-sage)] border border-[var(--lib-sage)] font-serif">
            <ShieldCheck className="w-3.5 h-3.5" />
            Plain Mode (Zero AI)
          </span>
        </div>

        {/* Center: Majestic Masthead */}
        <div className="text-center select-none">
          <h1 className="lib-display text-2xl md:text-3xl font-semibold tracking-wider text-[var(--lib-ink)]">
            THE READING ROOM
          </h1>
          <p className="lib-meta text-[var(--lib-ink-muted)] text-[10px] tracking-widest mt-0.5">
            THE LIBRARY · HISTORICAL ARCHIVES · SACRED SCRIPTURES · MIND HELPS
          </p>
        </div>

        {/* Right: Theme Toggle & Bookmarks Drawer */}
        <div className="flex items-center gap-2">
          <ParchmentButton
            variant="ghost"
            size="sm"
            icon={theme === 'day' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[var(--lib-gold)]" />}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'day' ? 'Night' : 'Day'} mode`}
          >
            {theme === 'day' ? 'Night' : 'Day'}
          </ParchmentButton>

          <div className="w-px h-5 bg-[var(--lib-border)]" />

          <ParchmentButton
            variant={isBookmarksOpen ? 'gold' : 'secondary'}
            size="sm"
            icon={<Bookmark className={`w-3.5 h-3.5 ${bookmarks.length > 0 ? 'fill-current' : ''}`} />}
            onClick={() => setBookmarksOpen(!isBookmarksOpen)}
            aria-label="Toggle Bookmarks Drawer"
          >
            <span className="tabular-nums">Bookmarks ({bookmarks.length})</span>
          </ParchmentButton>
        </div>
      </div>

      {/* ─── Subpage Navigation Bar & Search ─────────────────────────────────── */}
      <div className="border-t border-[var(--lib-border-soft)] bg-[var(--lib-bg)] px-4 md:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Subpage Tabs */}
          <nav className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto lib-scrollbar" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-sm font-serif text-sm flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-[var(--lib-ink)] font-medium bg-[var(--lib-surface)] border border-[var(--lib-border)] shadow-xs'
                      : 'text-[var(--lib-ink-secondary)] hover:text-[var(--lib-ink)] hover:bg-[var(--lib-surface-hover)] border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="library-active-tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--lib-gold)]"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[var(--lib-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library stacks..."
              aria-label="Search library stacks"
              className="w-full pl-9 pr-8 py-1.5 text-sm font-serif rounded-sm border border-[var(--lib-border)] bg-[var(--lib-surface)] text-[var(--lib-ink)] placeholder-[var(--lib-ink-muted)] focus:outline-none focus:border-[var(--lib-gold)] transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

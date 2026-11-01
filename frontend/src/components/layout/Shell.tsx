/**
 * frontend/src/components/layout/Shell.tsx
 * Broadsheet Newspaper Application Shell (v2.0)
 * Orchestrates TopBar, Bat Masthead Menu, Main Split Reader, Global Router, Bottom Ticker, and Lenis Scroll.
 */
import React, { useEffect, useRef } from 'react';
import { Toaster } from 'sonner';
import { TopBar } from './TopBar';
import { BatMenuOverlay } from '../bat/BatMenuOverlay';
import { NewsTicker } from './NewsTicker';
import { ArticlePanel } from '../article/ArticlePanel';
import { SummaryPanel } from '../article/SummaryPanel';
import { CardStrip } from '../article/CardStrip';
import { SettingsMenu } from '../bat/SettingsMenu';
import { AlertBanner } from '../alert/AlertBanner';
import { MissedNewsModal } from '../modal/MissedNewsModal';
import { CompareCoverage } from '../compare/CompareCoverage';
import { StoryTimeline } from '../timeline/StoryTimeline';
import { ArchiveChat } from '../chat/ArchiveChat';
import { WorldMap } from '../map/WorldMap';
import { MorningBriefing } from '../briefing/MorningBriefing';
import { TVView } from '../tv/TVView';
import { WatchlistDesk } from '../watchlist/WatchlistDesk';
import { CategoryRailView } from '../category/CategoryRailView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAppStore } from '../../store/useAppStore';
import { useLenisScroll } from '../../hooks/useLenisScroll';

export const Shell: React.FC = () => {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const isBatMenuOpen = useAppStore((s) => s.isBatMenuOpen);
  const setBatMenuOpen = useAppStore((s) => s.setBatMenuOpen);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const prevArticle = useAppStore((s) => s.prevArticle);
  const theme = useAppStore((s) => s.theme);

  // Sync theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global Keyboard Shortcuts (PRD §6 & UI_SPEC §Keyboard Shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName || ''
        )
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          setBatMenuOpen(!isBatMenuOpen);
          break;
        case 'j':
          e.preventDefault();
          nextArticle();
          break;
        case 'k':
          e.preventDefault();
          prevArticle();
          break;
        case 'g':
          e.preventDefault();
          useAppStore.getState().setGlobeOpen(true);
          setCurrentView('globe');
          break;
        case 't':
          e.preventDefault();
          useAppStore.getState().setTvViewOpen(true);
          setCurrentView('tv');
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.getElementById('article-search-input');
          searchInput?.focus();
          break;
        case 'escape':
          if (isBatMenuOpen) {
            setBatMenuOpen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBatMenuOpen, setBatMenuOpen, nextArticle, prevArticle, setCurrentView]);

  const mainScrollRef = useRef<HTMLElement | null>(null);
  useLenisScroll(mainScrollRef);

  return (
    <div
      id="app-shell"
      data-theme={theme}
      className="flex flex-col w-screen h-screen overflow-hidden bg-paper text-ink relative font-ui transition-colors duration-200 select-none"
    >
      {/* 1. Master TopBar (z-40) */}
      <ErrorBoundary panelName="Top Bar">
        <TopBar />
      </ErrorBoundary>

      {/* 2. Bat Menu Overlay (Unfolds like broadsheet paper) */}
      <ErrorBoundary panelName="Bat Masthead Menu">
        <BatMenuOverlay />
      </ErrorBoundary>

      {/* 3. Main Split View or Section Desks */}
      <main
        id="main-split-container"
        ref={mainScrollRef}
        className="flex-1 flex overflow-hidden relative"
      >
        {currentView === 'category' ? (
          <ErrorBoundary panelName="Category Rail Desk">
            <CategoryRailView />
          </ErrorBoundary>
        ) : (
          /* Main Reader View (Default) */
          <div className="flex-1 flex overflow-hidden w-full h-full">
            {/* Left Panel: Article Column (60%) */}
            <ErrorBoundary panelName="Article Reader Desk">
              <ArticlePanel />
            </ErrorBoundary>

            {/* Right Panel: Summary Column & Spider Mount (40%) */}
            <ErrorBoundary panelName="Summary Wire Desk">
              <SummaryPanel />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* 4. Bottom Horizontal Dispatch Strip (rendered on reader view) */}
      {currentView !== 'category' && (
        <ErrorBoundary panelName="Dispatch Wire Strip">
          <CardStrip />
        </ErrorBoundary>
      )}

      {/* 5. Continuous News Ticker (z-30) */}
      <ErrorBoundary panelName="Bottom Ticker">
        <NewsTicker />
      </ErrorBoundary>

      {/* 6. Notifications & Modals */}
      <ErrorBoundary panelName="Alert Banners">
        <AlertBanner />
      </ErrorBoundary>

      <ErrorBoundary panelName="Settings Drawer">
        <SettingsMenu />
      </ErrorBoundary>

      <ErrorBoundary panelName="Missed Dispatches Modal">
        <MissedNewsModal />
      </ErrorBoundary>

      {/* Desks triggered via Bat Menu or Shortcuts */}
      <ErrorBoundary panelName="Coverage Comparison Desk">
        <CompareCoverage />
      </ErrorBoundary>

      <ErrorBoundary panelName="Story Timeline Desk">
        <StoryTimeline />
      </ErrorBoundary>

      <ErrorBoundary panelName="Archive Search Desk">
        <ArchiveChat />
      </ErrorBoundary>

      <ErrorBoundary panelName="Global Radar Map">
        <WorldMap />
      </ErrorBoundary>

      <ErrorBoundary panelName="Morning Radio Briefing">
        <MorningBriefing />
      </ErrorBoundary>

      <ErrorBoundary panelName="Live Video Desk">
        <TVView />
      </ErrorBoundary>

      <ErrorBoundary panelName="Editorial Watchlist Desk">
        <WatchlistDesk />
      </ErrorBoundary>

      {/* 7. Broadsheet Toast Notifications */}
      <Toaster
        theme={theme === 'night' ? 'dark' : 'light'}
        position="bottom-right"
        toastOptions={{
          className:
            'border-2 border-ink bg-paper text-ink font-ui shadow-overlay rounded-xs text-xs',
        }}
      />
    </div>
  );
};

export default Shell;

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
import { SourcesSettingsDesk } from '../sources/SourcesSettingsDesk';
import { AlertBanner } from '../alert/AlertBanner';
import { AlertsCenter } from '../alert/AlertsCenter';
import { MissedNewsModal } from '../modal/MissedNewsModal';
import { CompareCoverage } from '../compare/CompareCoverage';
import { StoryTimeline } from '../timeline/StoryTimeline';
import { ArchiveChat } from '../chat/ArchiveChat';
import { WorldMap } from '../map/WorldMap';
import { MorningBriefing } from '../briefing/MorningBriefing';
import { DailyPdfDesk } from '../pdf/DailyPdfDesk';
import { TVView } from '../tv/TVView';
import { WatchlistDesk } from '../watchlist/WatchlistDesk';
import { CategoryRailView } from '../category/CategoryRailView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAppStore } from '../../store/useAppStore';
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels';

export const Shell: React.FC = () => {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const isBatMenuOpen = useAppStore((s) => s.isBatMenuOpen);
  const setBatMenuOpen = useAppStore((s) => s.setBatMenuOpen);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const prevArticle = useAppStore((s) => s.prevArticle);
  const theme = useAppStore((s) => s.theme);
  const isPlainMode = useAppStore((s) => s.settings.plain_mode_enabled ?? false);

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
        case ' ':
          e.preventDefault();
          useAppStore.getState().toggleAutoAdvanceManualPaused();
          break;
        case 'arrowright':
          e.preventDefault();
          nextArticle();
          break;
        case 'arrowleft':
          e.preventDefault();
          prevArticle();
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

  // Resizable Panels State & Handlers
  const panelSizesH = useAppStore((s) => s.panelSizesH);
  const panelSizesV = useAppStore((s) => s.panelSizesV);
  const setPanelSizesH = useAppStore((s) => s.setPanelSizesH);
  const setPanelSizesV = useAppStore((s) => s.setPanelSizesV);

  const stripPanelRef = useRef<ImperativePanelHandle>(null);
  const horizontalGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const verticalGroupRef = useRef<ImperativePanelGroupHandle>(null);

  const handleHorizontalLayout = (sizes: number[]) => {
    if (sizes.length === 2 && sizes[0] && sizes[1]) {
      setPanelSizesH([sizes[0], sizes[1]]);
    }
  };

  const handleVerticalLayout = (sizes: number[]) => {
    if (sizes.length === 2 && sizes[0] && sizes[1]) {
      setPanelSizesV([sizes[0], sizes[1]]);
    }
  };

  const handleResetH = () => {
    horizontalGroupRef.current?.setLayout([60, 40]);
    setPanelSizesH([60, 40]);
  };

  const handleResetV = () => {
    if (stripPanelRef.current?.isCollapsed()) {
      stripPanelRef.current.expand();
    }
    verticalGroupRef.current?.setLayout([78, 22]);
    setPanelSizesV([78, 22]);
  };

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
        className="flex-1 w-full h-full min-h-0 min-w-0 flex overflow-hidden relative"
      >
        {currentView === 'category' ? (
          <ErrorBoundary panelName="Category Rail Desk">
            <CategoryRailView />
          </ErrorBoundary>
        ) : (
          /* Main Reader View with Accessible Resizable Panels */
          <PanelGroup
            ref={verticalGroupRef}
            direction="vertical"
            id="reader-vertical-group"
            onLayout={handleVerticalLayout}
            className="w-full h-full min-h-0 min-w-0 flex flex-col"
          >
            {/* Top Reader Desk: Article + Summary (or Full-Width Reader in Plain Mode) */}
            <Panel
              id="reader-top-panel"
              defaultSize={panelSizesV[0]}
              minSize={50}
              maxSize={90}
              className="min-h-0 min-w-0"
            >
              {isPlainMode ? (
                <div id="reader-plain-mode-container" className="w-full h-full min-h-0 min-w-0">
                  <ErrorBoundary panelName="Article Reader Desk (Plain Mode)">
                    <ArticlePanel />
                  </ErrorBoundary>
                </div>
              ) : (
                <PanelGroup
                  ref={horizontalGroupRef}
                  direction="horizontal"
                  id="reader-horizontal-group"
                  onLayout={handleHorizontalLayout}
                  className="w-full h-full min-h-0 min-w-0 flex"
                >
                  {/* Left Panel: Article Column */}
                  <Panel
                    id="reader-article-panel"
                    defaultSize={panelSizesH[0]}
                    minSize={30}
                    maxSize={75}
                    className="min-h-0 min-w-0 h-full"
                  >
                    <ErrorBoundary panelName="Article Reader Desk">
                      <ArticlePanel />
                    </ErrorBoundary>
                  </Panel>

                  {/* Vertical Drag Handle between Article & Summary */}
                  <PanelResizeHandle
                    id="handle-article-summary"
                    onDoubleClick={handleResetH}
                    aria-label="Resize article and summary columns (Double-click to reset)"
                    className="resize-handle-vertical"
                  >
                    <div className="resize-handle-grip-v" />
                  </PanelResizeHandle>

                  {/* Right Panel: Summary Column */}
                  <Panel
                    id="reader-summary-panel"
                    defaultSize={panelSizesH[1]}
                    minSize={25}
                    maxSize={70}
                    className="min-h-0 min-w-0 h-full"
                  >
                    <ErrorBoundary panelName="Summary Wire Desk">
                      <SummaryPanel />
                    </ErrorBoundary>
                  </Panel>
                </PanelGroup>
              )}
            </Panel>

            {/* Horizontal Drag Handle between Reading Desk & Bottom Card Strip */}
            <PanelResizeHandle
              id="handle-desk-strip"
              onDoubleClick={handleResetV}
              aria-label="Resize wire dispatch strip (Double-click to reset, drag down to snap-collapse)"
              className="resize-handle-horizontal"
            >
              <div className="resize-handle-grip-h" />
            </PanelResizeHandle>

            {/* Bottom Strip: Snap-collapsible Wire Cards */}
            <Panel
              id="reader-bottom-strip-panel"
              ref={stripPanelRef}
              defaultSize={panelSizesV[1]}
              minSize={12}
              maxSize={45}
              collapsible={true}
              collapsedSize={0}
              className="min-h-0 min-w-0"
            >
              <ErrorBoundary panelName="Dispatch Wire Strip">
                <CardStrip />
              </ErrorBoundary>
            </Panel>
          </PanelGroup>
        )}
      </main>

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

      <ErrorBoundary panelName="API & Sources Settings Desk">
        <SourcesSettingsDesk />
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

      <ErrorBoundary panelName="Daily Newspaper PDF Desk">
        <DailyPdfDesk />
      </ErrorBoundary>

      <ErrorBoundary panelName="Live Video Desk">
        <TVView />
      </ErrorBoundary>

      <ErrorBoundary panelName="Editorial Watchlist Desk">
        <WatchlistDesk />
      </ErrorBoundary>

      <ErrorBoundary panelName="Alerts Center Desk">
        <AlertsCenter />
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

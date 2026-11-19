/**
 * frontend/src/components/layout/Shell.tsx
 * Broadsheet Newspaper Application Shell (v2.0)
 * Orchestrates TopBar, Bat Masthead Menu, Main Split Reader, Global Router, Bottom Ticker, and Lenis Scroll.
 */
import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { TopBar } from './TopBar';
import { StatusStrip } from './StatusStrip';
import { UpdateBanner } from './UpdateBanner';
import { RightIconRail } from './RightIconRail';
import { BatMenuOverlay } from '../bat/BatMenuOverlay';
import { NewsTicker } from './NewsTicker';
import { ArticlePanel } from '../article/ArticlePanel';
import { CircularDock } from '../article/CircularDock';
import { UnifiedSettingsDialog } from '../settings/UnifiedSettingsDialog';
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
import { ControlRoomDesk } from '../control-room/ControlRoomDesk';
import { CommandPalette } from '../common/CommandPalette';
import { TVMiniPlayer } from '../tv/TVMiniPlayer';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ZoomHUD } from '../common/ZoomHUD';
import { ThemeStudioDrawer } from '../settings/ThemeStudioDrawer';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import { THEME_CATALOG, deriveThemePalette, applyThemeToDOM } from '../../styles/themes';
import { useAppStore } from '../../store/useAppStore';

export const Shell: React.FC = () => {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const isBatMenuOpen = useAppStore((s) => s.isBatMenuOpen);
  const setBatMenuOpen = useAppStore((s) => s.setBatMenuOpen);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const prevArticle = useAppStore((s) => s.prevArticle);
  const theme = useAppStore((s) => s.theme);
  const setLayoutPreset = useAppStore((s) => s.setLayoutPreset);

  // Activate trackpad pinch-to-zoom and keyboard font scaling
  usePinchZoom();

  // Initialize and apply custom or preset broadsheet theme on mount
  useEffect(() => {
    const activeThemeId = useAppStore.getState().activeThemeId;
    const customBgColor = useAppStore.getState().customBgColor;
    if (customBgColor) {
      applyThemeToDOM(deriveThemePalette(customBgColor));
    } else {
      const preset = THEME_CATALOG.find((t) => t.id === activeThemeId) || THEME_CATALOG[10];
      applyThemeToDOM(deriveThemePalette(preset.bg, preset.accent));
    }
  }, []);


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

      // S3: Layout Presets (Alt+1, Alt+2, Alt+3)
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setLayoutPreset('balanced');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setLayoutPreset('focus');
        return;
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        setLayoutPreset('split');
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
        case 'c':
          e.preventDefault();
          useAppStore.getState().setControlRoomOpen(true);
          setCurrentView('control-room');
          break;
        case 'l':
          e.preventDefault();
          useAppStore.getState().openLibrary();
          break;
        case ',':
          e.preventDefault();
          useAppStore.getState().setSettingsOpen(true);
          break;
        case 'p':
          e.preventDefault();
          useAppStore.getState().setThemeStudioOpen(true);
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.getElementById('article-search-input');
          searchInput?.focus();
          break;
        case ' ':
          e.preventDefault();
          if (useAppStore.getState().settings.auto_advance_enabled) {
            useAppStore.getState().toggleAutoAdvanceManualPaused();
          }
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

  return (
    <div
      id="app-shell"
      className="flex flex-col w-screen h-screen overflow-hidden bg-paper text-ink relative font-ui transition-colors duration-200 select-none"
    >
      {/* 1. Master TopBar (z-40) */}
      <ErrorBoundary panelName="Top Bar">
        <TopBar />
      </ErrorBoundary>

      {/* 2. Status Strip (In-flow layout row directly under TopBar - PRD C Category 2) */}
      <ErrorBoundary panelName="Status Strip">
        <StatusStrip />
      </ErrorBoundary>

      {/* 2.5 In-App Update Notification Banner (PRD E Category 9) */}
      <ErrorBoundary panelName="Update Banner">
        <UpdateBanner />
      </ErrorBoundary>

      {/* 3. Bat Menu Overlay (Unfolds like broadsheet paper) */}
      <ErrorBoundary panelName="Bat Masthead Menu">
        <BatMenuOverlay />
      </ErrorBoundary>

      {/* 3. Central Workspace Row: Main Split View + Right Icon Rail in document flow */}
      <div id="central-workspace-row" className="flex-1 w-full min-h-0 min-w-0 flex overflow-hidden relative">
        <main
          id="main-split-container"
          className="flex-1 h-full min-h-0 min-w-0 flex overflow-hidden relative"
        >
          {currentView === 'category' ? (
            <ErrorBoundary panelName="Category Rail Desk">
              <CategoryRailView />
            </ErrorBoundary>
          ) : (
            /* Main Reader View: Unified Full-Box Broadsheet Desk with Circling Floating Docker */
            <div id="unified-reader-desk" className="relative w-full h-full min-h-0 min-w-0 overflow-hidden">
              <div id="reader-article-panel" className="w-full h-full min-h-0 min-w-0">
                <ErrorBoundary panelName="Article Reader Desk">
                  <ArticlePanel />
                </ErrorBoundary>
              </div>

              {/* Circling Bottom Docker overlaying the unified reader desk */}
              <div id="reader-bottom-strip-panel" className="absolute bottom-0 left-0 right-0 pointer-events-none z-30">
                <ErrorBoundary panelName="Circling Wire Docker">
                  <CircularDock />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </main>

        {/* 4. Right Vertical Icon Rail (PRD C Category 1) */}
        <ErrorBoundary panelName="Right Navigation Rail">
          <RightIconRail />
        </ErrorBoundary>
      </div>

      {/* 5. Continuous News Ticker (z-30) */}
      <ErrorBoundary panelName="Bottom Ticker">
        <NewsTicker />
      </ErrorBoundary>

      {/* 6. Notifications & Modals */}
      <ErrorBoundary panelName="Alert Banners">
        <AlertBanner />
      </ErrorBoundary>

      <ErrorBoundary panelName="Settings Dialog">
        <UnifiedSettingsDialog />
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

      <ErrorBoundary panelName="Desk Control Room">
        <ControlRoomDesk />
      </ErrorBoundary>

      {/* S1: Command Palette Dialog */}
      <ErrorBoundary panelName="Command Palette">
        <CommandPalette />
      </ErrorBoundary>

      {/* S4: TV Floating Mini-Player Dock */}
      <ErrorBoundary panelName="TV Mini-Player Dock">
        <TVMiniPlayer />
      </ErrorBoundary>

      {/* 50-Theme Studio Drawer & Custom RGB Studio */}
      <ErrorBoundary panelName="Theme Studio">
        <ThemeStudioDrawer />
      </ErrorBoundary>

      {/* Touchpad Pinch & Scale HUD */}
      <ZoomHUD />

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

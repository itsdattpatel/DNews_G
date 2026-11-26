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
import { MobileBottomNav } from './MobileBottomNav';
import { AdaptiveNotchPill } from './AdaptiveNotchPill';
import { TypographyStudioDrawer } from '../article/TypographyStudioDrawer';
import { MarginNotesDrawer } from '../article/MarginNotesDrawer';
import { EditorialCartoonModal } from '../reader/EditorialCartoonModal';
import { PhotojournalismDesk } from '../photojournalism/PhotojournalismDesk';
import { CustomRssStudio } from '../sources/CustomRssStudio';
import { SourceHealthDesk } from '../sources/SourceHealthDesk';
import { EntityRelationshipDesk } from '../entities/EntityRelationshipDesk';
import { SundayEditionDesk } from '../sunday/SundayEditionDesk';
import { KnowledgeMindMapModal } from '../mindmap/KnowledgeMindMapModal';
import { HistoryFrontPageModal } from '../history/HistoryFrontPageModal';
import { WisdomSpacedRepetitionModal } from '../wisdom/WisdomSpacedRepetitionModal';
import { BiasRadarModal } from '../article/BiasRadarModal';
import { ClaimCorroborationModal } from '../article/ClaimCorroborationModal';
import { InvestigativeDeskDrawer } from '../investigative/InvestigativeDeskDrawer';
import { EditorialIntelligenceDrawer } from '../editorial/EditorialIntelligenceDrawer';
import { BroadcastMediaDrawer } from '../broadcast/BroadcastMediaDrawer';
import { CartographyWarRoomDrawer } from '../cartography/CartographyWarRoomDrawer';
import { MastheadMarketTicker } from '../cartography/MastheadMarketTicker';
import { BroadsideBinderyDrawer } from '../bindery/BroadsideBinderyDrawer';
import { SovereignEnclaveDrawer } from '../sovereign/SovereignEnclaveDrawer';
import { BatMenuOverlay } from '../bat/BatMenuOverlay';
import { NewsTicker } from './NewsTicker';
import { ArticlePanel } from '../article/ArticlePanel';
import { CircularGalleryWireDock } from '../article/CircularGalleryWireDock';
import { UnifiedSettingsDialog } from '../settings/UnifiedSettingsDialog';
import { SourcesSettingsDesk } from '../sources/SourcesSettingsDesk';
import { AlertBanner } from '../alert/AlertBanner';
import { AlertsCenter } from '../alert/AlertsCenter';
import { MissedNewsModal } from '../modal/MissedNewsModal';
import { PanicWipeDialog } from '../modal/PanicWipeDialog';
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
import { AppUpdateBanner } from '../common/AppUpdateBanner';
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
  const isInvestigativeDeskOpen = useAppStore((s) => s.isInvestigativeDeskOpen);
  const setInvestigativeDeskOpen = useAppStore((s) => s.setInvestigativeDeskOpen);
  const isEditorialIntelligenceOpen = useAppStore((s) => s.isEditorialIntelligenceOpen);
  const setEditorialIntelligenceOpen = useAppStore((s) => s.setEditorialIntelligenceOpen);
  const editorialInitialTab = useAppStore((s) => s.editorialInitialTab);
  const isBroadcastDeskOpen = useAppStore((s) => s.isBroadcastDeskOpen);
  const setBroadcastDeskOpen = useAppStore((s) => s.setBroadcastDeskOpen);
  const broadcastInitialTab = useAppStore((s) => s.broadcastInitialTab);
  const isCartographyDeskOpen = useAppStore((s) => s.isCartographyDeskOpen);
  const setCartographyDeskOpen = useAppStore((s) => s.setCartographyDeskOpen);
  const cartographyInitialTab = useAppStore((s) => s.cartographyInitialTab);
  const isBinderyDeskOpen = useAppStore((s) => s.isBinderyDeskOpen);
  const setBinderyDeskOpen = useAppStore((s) => s.setBinderyDeskOpen);
  const binderyInitialTab = useAppStore((s) => s.binderyInitialTab);
  const isSovereignDeskOpen = useAppStore((s) => s.isSovereignDeskOpen);
  const setSovereignDeskOpen = useAppStore((s) => s.setSovereignDeskOpen);
  const sovereignInitialTab = useAppStore((s) => s.sovereignInitialTab);
  const paperPatina = useAppStore((s) => s.paperPatina);
  const fetchBinderyPreferences = useAppStore((s) => s.fetchBinderyPreferences);
  const fetchSovereignSettings = useAppStore((s) => s.fetchSovereignSettings);
  const capAlerts = useAppStore((s) => s.capAlerts);
  const acknowledgeCapAlert = useAppStore((s) => s.acknowledgeCapAlert);
  const selectedArticle = useAppStore((s) => s.selectedArticle);

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
    fetchBinderyPreferences();
    fetchSovereignSettings();
  }, []);

  // Hardware Volume Button Page Turning Bridge (Phase J #46)
  useEffect(() => {
    const handleVolumeTurn = (e: Event) => {
      const detail = (e as CustomEvent<{ direction?: 'prev' | 'next' }>).detail;
      if (detail?.direction === 'prev') prevArticle();
      else if (detail?.direction === 'next') nextArticle();
    };
    window.addEventListener('dnews-volume-key', handleVolumeTurn);
    return () => window.removeEventListener('dnews-volume-key', handleVolumeTurn);
  }, [nextArticle, prevArticle]);


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
        case 'i':
          e.preventDefault();
          setInvestigativeDeskOpen(!useAppStore.getState().isInvestigativeDeskOpen);
          break;
        case 'e':
          e.preventDefault();
          setEditorialIntelligenceOpen(!useAppStore.getState().isEditorialIntelligenceOpen);
          break;
        case 'm':
          e.preventDefault();
          setBroadcastDeskOpen(!useAppStore.getState().isBroadcastDeskOpen);
          break;
        case 'w':
          e.preventDefault();
          setCartographyDeskOpen(!useAppStore.getState().isCartographyDeskOpen);
          break;
        case 'y':
          e.preventDefault();
          setBinderyDeskOpen(!useAppStore.getState().isBinderyDeskOpen);
          break;
        case 's':
          e.preventDefault();
          setSovereignDeskOpen(!useAppStore.getState().isSovereignDeskOpen);
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
      className="flex flex-col w-full h-full h-[100dvh] max-w-full overflow-hidden bg-paper text-ink relative font-ui transition-colors duration-200 select-none"
      style={paperPatina > 0 ? { filter: `sepia(${(paperPatina * 0.25).toFixed(1)}%)` } : undefined}
    >
      {/* 1. Master TopBar (z-40) */}
      <ErrorBoundary panelName="Top Bar">
        <TopBar />
      </ErrorBoundary>

      {/* 2. Status Strip (In-flow layout row directly under TopBar - PRD C Category 2) */}
      <ErrorBoundary panelName="Status Strip">
        <StatusStrip />
      </ErrorBoundary>

      {/* 2.2 Masthead Commodity & Currency Ticker Tape (PRD Phase H #29) */}
      <ErrorBoundary panelName="Masthead Market Ticker">
        <MastheadMarketTicker />
      </ErrorBoundary>

      {/* 2.5 In-App Update Notification Banner (PRD E Category 9) */}
      <ErrorBoundary panelName="Update Banner">
        <UpdateBanner />
      </ErrorBoundary>

      {/* 2.6 CAP Emergency Broadcast Alert Ribbon (PRD Phase G #28) */}
      {capAlerts?.length > 0 && !capAlerts[0].acknowledged && (
        <div 
          id="cap-emergency-ribbon"
          className="w-full bg-[#C0392B] text-white px-3 py-1 flex items-center justify-between text-xs font-mono tracking-wider animate-pulse z-40 border-b border-black"
        >
          <div className="flex items-center space-x-2 truncate">
            <span className="font-bold uppercase tracking-widest bg-black px-1.5 py-0.5 text-[10px]">
              CIVIL EMERGENCY · {capAlerts[0].severity.toUpperCase()}
            </span>
            <span className="truncate font-semibold font-serif">
              {capAlerts[0].headline} ({capAlerts[0].area_desc})
            </span>
          </div>
          <button
            onClick={() => acknowledgeCapAlert(capAlerts[0].id)}
            className="ml-2 px-2 py-0.5 bg-black text-white text-[10px] uppercase font-bold hover:bg-neutral-800 transition-colors shrink-0"
          >
            Acknowledge
          </button>
        </div>
      )}

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
          ) : currentView === 'sunday-edition' ? (
            <ErrorBoundary panelName="Sunday Edition Desk">
              <SundayEditionDesk />
            </ErrorBoundary>
          ) : currentView === 'photojournalism' ? (
            <ErrorBoundary panelName="Photojournalism Desk">
              <PhotojournalismDesk />
            </ErrorBoundary>
          ) : currentView === 'custom-rss' ? (
            <ErrorBoundary panelName="Custom RSS Studio">
              <CustomRssStudio />
            </ErrorBoundary>
          ) : currentView === 'source-health' ? (
            <ErrorBoundary panelName="Source Health Desk">
              <SourceHealthDesk />
            </ErrorBoundary>
          ) : currentView === 'entities' ? (
            <ErrorBoundary panelName="Geopolitical Entity Network Desk">
              <EntityRelationshipDesk />
            </ErrorBoundary>
          ) : (
            /* Main Reader View: Unified Full-Box Broadsheet Desk with Circling Floating Docker */
            <div id="unified-reader-desk" className="relative w-full h-full min-h-0 min-w-0 overflow-hidden">
              <div id="reader-article-panel" className="w-full h-full min-h-0 min-w-0">
                <ErrorBoundary panelName="Article Reader Desk">
                  <ArticlePanel />
                </ErrorBoundary>
              </div>

              {/* React Bits Circular Gallery Docker overlaying the unified reader desk */}
              <div id="reader-bottom-strip-panel" className="absolute bottom-0 left-0 right-0 pointer-events-none z-30">
                <ErrorBoundary panelName="React Bits Circular Wire Docker">
                  <CircularGalleryWireDock />
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

      {/* 5.5 Mobile Bottom Navigation Thumb Bar (PRD Master Expansion #4) */}
      <ErrorBoundary panelName="Mobile Bottom Navigation">
        <MobileBottomNav />
      </ErrorBoundary>

      {/* 6. Notifications & Modals */}
      <ErrorBoundary panelName="Alert Banners">
        <AlertBanner />
        <AppUpdateBanner />
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

      {/* PRD Master Expansion Phase B Deliverable 2: Adaptive Notch, Typography Studio, Marginalia & Cartoon */}
      <AdaptiveNotchPill />
      <TypographyStudioDrawer />
      <MarginNotesDrawer />
      <EditorialCartoonModal />

      {/* PRD Master Expansion Phase C Deliverable 2: Bias Radar & Claim Corroboration */}
      <BiasRadarModal />
      <ClaimCorroborationModal />

      {/* PRD Master Expansion Phase D Deliverable 1: Knowledge Archive & Mind Map */}
      <KnowledgeMindMapModal />
      <HistoryFrontPageModal />
      <WisdomSpacedRepetitionModal />

      {/* PRD Master Expansion Phase D Deliverable 2: Emergency Panic Shredder */}
      <PanicWipeDialog />

      {/* PRD Master Expansion Phase E: Investigative Journalism & Verification Desk */}
      <InvestigativeDeskDrawer
        isOpen={isInvestigativeDeskOpen}
        onClose={() => setInvestigativeDeskOpen(false)}
        activeArticle={selectedArticle}
      />

      {/* PRD Master Expansion Phase F: AI Editorial Intelligence & Socratic Analysis */}
      <EditorialIntelligenceDrawer
        isOpen={isEditorialIntelligenceOpen}
        onClose={() => setEditorialIntelligenceOpen(false)}
        activeArticle={selectedArticle}
        initialTab={editorialInitialTab}
      />

      {/* PRD Master Expansion Phase G: Broadcast, Audio & Media Synthesis */}
      <BroadcastMediaDrawer
        isOpen={isBroadcastDeskOpen}
        onClose={() => setBroadcastDeskOpen(false)}
        activeArticle={selectedArticle}
        initialTab={broadcastInitialTab}
      />

      {/* PRD Master Expansion Phase H: Cartography, Chokepoints & Data Markets */}
      <CartographyWarRoomDrawer
        isOpen={isCartographyDeskOpen}
        onClose={() => setCartographyDeskOpen(false)}
        activeArticle={selectedArticle}
        initialTab={cartographyInitialTab}
      />

      {/* PRD Master Expansion Phase I: Broadside Bindery & Physical Artifacts */}
      <BroadsideBinderyDrawer
        isOpen={isBinderyDeskOpen}
        onClose={() => setBinderyDeskOpen(false)}
        activeArticle={selectedArticle}
        initialTab={binderyInitialTab}
      />

      {/* PRD Master Expansion Phase J & K: Mobile OS Integration & Sovereign Enclave */}
      <SovereignEnclaveDrawer
        isOpen={isSovereignDeskOpen}
        onClose={() => setSovereignDeskOpen(false)}
        activeArticle={selectedArticle}
        initialTab={sovereignInitialTab}
      />

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

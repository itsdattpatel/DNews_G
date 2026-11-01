/**
 * frontend/src/components/layout/Shell.tsx
 * Master layout container orchestrating TopBar, Article & Summary panels, CardStrip, and drawers.
 * Protected by editorial ErrorBoundaries across all major desks (P12-06).
 */
import React from 'react';
import { TopBar } from './TopBar';
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
import { ErrorBoundary } from '../common/ErrorBoundary';

export const Shell: React.FC = () => {
  return (
    <div
      id="app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      {/* Top Header Bar */}
      <ErrorBoundary panelName="Top Bar">
        <TopBar />
      </ErrorBoundary>

      {/* Main Two-Panel Article & Intelligence Split View */}
      <main
        id="main-split-container"
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Half: Original Full Story */}
        <ErrorBoundary panelName="Original Article Desk">
          <ArticlePanel />
        </ErrorBoundary>

        {/* Right Half: AI Summary & Spider Mount */}
        <ErrorBoundary panelName="AI Summary Desk">
          <SummaryPanel />
        </ErrorBoundary>
      </main>

      {/* Bottom Horizontal Card Strip */}
      <ErrorBoundary panelName="Dispatch Wire Strip">
        <CardStrip />
      </ErrorBoundary>

      {/* Notification Banners Stack */}
      <ErrorBoundary panelName="Alert Banners">
        <AlertBanner />
      </ErrorBoundary>

      {/* Bat Settings Drawer */}
      <ErrorBoundary panelName="Settings Drawer">
        <SettingsMenu />
      </ErrorBoundary>

      {/* Catch-Up Dispatches Modal */}
      <ErrorBoundary panelName="Missed Dispatches Modal">
        <MissedNewsModal />
      </ErrorBoundary>

      {/* Compare Coverage Across Outlets (P7-04) */}
      <ErrorBoundary panelName="Coverage Comparison Desk">
        <CompareCoverage />
      </ErrorBoundary>

      {/* Story Timeline Chronology (P7-07) */}
      <ErrorBoundary panelName="Story Timeline Desk">
        <StoryTimeline />
      </ErrorBoundary>

      {/* Historical Archive Chat & AI Synthesis Desk (P8-03, P8-05) */}
      <ErrorBoundary panelName="Archive Search & Chat Desk">
        <ArchiveChat />
      </ErrorBoundary>

      {/* Global News Radar & Wildlife Intelligence Map (Phase 9) */}
      <ErrorBoundary panelName="Global Radar Map">
        <WorldMap />
      </ErrorBoundary>

      {/* Executive Morning Radio Briefing (Phase 10) */}
      <ErrorBoundary panelName="Morning Radio Briefing">
        <MorningBriefing />
      </ErrorBoundary>

      {/* Live IPTV Channel Broadcasts & Wildlife Feeds (Phase 11) */}
      <ErrorBoundary panelName="IPTV Live Video Desk">
        <TVView />
      </ErrorBoundary>
    </div>
  );
};

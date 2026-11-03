/**
 * frontend/src/__tests__/unit/icon-rail-topbar.test.tsx
 * Unit test suite for PRD C Category 1: Top Bar & Right Icon Rail.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { TopBar } from '../../components/layout/TopBar';
import { RightIconRail } from '../../components/layout/RightIconRail';
import { useAppStore } from '../../store/useAppStore';

describe('PRD C Category 1: Top Bar & Right Icon Rail', () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedCountry: null,
      searchQuery: '',
      isBreakingOnly: false,
      currentView: 'reader',
      isRailPinned: false,
      isTvViewOpen: false,
      isGlobeOpen: false,
      isControlRoomOpen: false,
      isAlertsOpen: false,
      isSettingsOpen: false,
      settings: {
        ...useAppStore.getState().settings,
        auto_advance_enabled: false,
        plain_mode_enabled: false,
      },
    });
  });

  describe('TopBar Restrictions & Progressive Behavior', () => {
    it('renders ONLY the designated 6 core items: masthead, region, directory, breaking, auto, search', () => {
      const html = renderToStaticMarkup(<TopBar />);

      // 1. Masthead
      expect(html).toContain('The World Desk');

      // 2. Region / Country Selector
      expect(html).toContain('id="country-filter-select"');
      expect(html).toContain('All Regions');

      // 3. Directory view toggle
      expect(html).toContain('id="btn-toggle-category-view"');

      // 4. Breaking news toggle
      expect(html).toContain('id="breaking-filter-toggle"');
      expect(html).toContain('Breaking');

      // 5. Auto-advance toggle
      expect(html).toContain('id="btn-auto-advance-toggle"');
      expect(html).toContain('Auto (7s)');

      // 6. Search wire input
      expect(html).toContain('id="article-search-input"');
      expect(html).toContain('placeholder="Search wire..."');

      // Verify removed items are NOT present in TopBar
      expect(html).not.toContain('id="btn-topbar-tv"');
      expect(html).not.toContain('id="btn-topbar-control-room"');
      expect(html).not.toContain('id="btn-topbar-alerts"');
      expect(html).not.toContain('id="btn-topbar-sources"');
      expect(html).not.toContain('id="btn-topbar-plain-mode"');
      expect(html).not.toContain('id="btn-topbar-feed-counter"');
      expect(html).not.toContain('id="btn-gap-status-badge"');
    });

    it('toggles breaking filter state in store', () => {
      expect(useAppStore.getState().isBreakingOnly).toBe(false);
      useAppStore.getState().toggleBreakingOnly();
      expect(useAppStore.getState().isBreakingOnly).toBe(true);
      useAppStore.getState().toggleBreakingOnly();
      expect(useAppStore.getState().isBreakingOnly).toBe(false);
    });

    it('switches view between reader and directory in store', () => {
      expect(useAppStore.getState().currentView).toBe('reader');
      useAppStore.getState().setCurrentView('category');
      expect(useAppStore.getState().currentView).toBe('category');
      useAppStore.getState().setCurrentView('reader');
      expect(useAppStore.getState().currentView).toBe('reader');
    });
  });

  describe('Right Icon Rail Structure & Interaction', () => {
    it('renders all 4 groups with verified IDs and touch targets >= 40x40', () => {
      const html = renderToStaticMarkup(<RightIconRail />);

      // Group A: Live Status
      expect(html).toContain('id="btn-rail-feed-counter"');
      expect(html).toContain('id="btn-rail-alerts"');

      // Group B: Views
      expect(html).toContain('id="btn-rail-tv"');
      expect(html).toContain('id="btn-rail-globe"');
      expect(html).toContain('id="btn-rail-library"');
      expect(html).toContain('id="btn-rail-control-room"');

      // Group C: Modes & Theme
      expect(html).toContain('id="btn-rail-plain-mode"');
      expect(html).toContain('id="btn-rail-theme"');

      // Group D: Bottom Utilities
      expect(html).toContain('id="btn-rail-settings"');
      expect(html).toContain('id="btn-rail-pin-toggle"');

      // Touch targets check: minimum 40x40px clickable area
      expect(html).toContain('min-w-[40px]');
      expect(html).toContain('min-h-[40px]');
    });

    it('toggles pinned state between 44px and 180px', () => {
      // Initially collapsed
      expect(useAppStore.getState().isRailPinned).toBe(false);
      const collapsedHtml = renderToStaticMarkup(<RightIconRail />);
      expect(collapsedHtml).toContain('w-[44px]');
      expect(collapsedHtml).not.toContain('w-[180px]');

      // Toggle pinned
      useAppStore.getState().toggleRailPinned();
      expect(useAppStore.getState().isRailPinned).toBe(true);

      // Rerender when pinned
      const pinnedHtml = renderToStaticMarkup(<RightIconRail pinned={true} />);
      expect(pinnedHtml).toContain('w-[180px]');
      expect(pinnedHtml).not.toContain('w-[44px]');
    });

    it('verifies view toggles and modals in store', () => {
      // TV
      useAppStore.getState().setTvViewOpen(true);
      expect(useAppStore.getState().isTvViewOpen).toBe(true);

      // Globe
      useAppStore.getState().setGlobeOpen(true);
      expect(useAppStore.getState().isGlobeOpen).toBe(true);

      // Control Room
      useAppStore.getState().setControlRoomOpen(true);
      expect(useAppStore.getState().isControlRoomOpen).toBe(true);

      // Alerts
      useAppStore.getState().setAlertsOpen(true);
      expect(useAppStore.getState().isAlertsOpen).toBe(true);

      // Settings
      useAppStore.getState().setSettingsOpen(true);
      expect(useAppStore.getState().isSettingsOpen).toBe(true);

      // Plain Mode in store
      useAppStore.setState({
        settings: {
          ...useAppStore.getState().settings,
          plain_mode_enabled: true,
        },
      });
      expect(useAppStore.getState().settings.plain_mode_enabled).toBe(true);
    });
  });
});

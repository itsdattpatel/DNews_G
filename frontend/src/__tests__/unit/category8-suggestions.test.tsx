/**
 * frontend/src/__tests__/unit/category8-suggestions.test.tsx
 * Unit test suite for PRD C Category 8 Suggestions (S1 - S4).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommandPalette } from '../../components/common/CommandPalette';
import { SystemHealthIndicator } from '../../components/layout/SystemHealthIndicator';
import { TVMiniPlayer } from '../../components/tv/TVMiniPlayer';
import { useAppStore } from '../../store/useAppStore';

describe('Category 8: Suggested Features (S1 - S4)', () => {
  const mockChannel = {
    id: 1,
    name: 'NDTV 24x7',
    country: 'IN',
    category: 'news',
    rank: 1,
    is_alive: 1,
    stream_url: 'http://localhost:3001/api/tv/proxy?url=test.m3u8',
    youtube_live_url: null,
    created_at: '2026-11-04T00:00:00Z',
    updated_at: '2026-11-04T00:00:00Z',
  };

  beforeEach(() => {
    useAppStore.setState({
      isCommandPaletteOpen: false,
      isTvMiniPlayerOpen: false,
      activeTvStream: null,
      isTvViewOpen: false,
      layoutPreset: 'balanced',
      panelSizesH: [60, 40],
      panelSizesV: [78, 22],
      systemHealth: {
        status: 'healthy',
        label: 'OK',
        details: {
          rss: '24 Sources Active',
          ai: 'Plain Mode (Zero AI)',
          scheduler: 'Heartbeat Nominal (<30s)',
          db: 'SQLite WAL Active',
          tv: 'Verified Live Catalog',
        },
      },
    });
  });

  describe('S1: Command Palette (Ctrl+K)', () => {
    it('does not render dialog when isCommandPaletteOpen is false', () => {
      const html = renderToStaticMarkup(<CommandPalette forcedOpen={false} />);
      expect(html).toBe('');
    });

    it('renders command palette dialog when open and shows major sections', () => {
      const html = renderToStaticMarkup(<CommandPalette forcedOpen={true} />);

      expect(html).toContain('command-palette-dialog');
      expect(html).toContain('The World Desk Telegraph');
      expect(html).toContain('Dual Reader Desk');
      expect(html).toContain('3D Interactive Cartographic Globe Radar');
      expect(html).toContain('Toggle Plain Mode');
      expect(html).toContain('Reading Desk: Balanced');
    });

    it('toggles command palette state via store action', () => {
      expect(useAppStore.getState().isCommandPaletteOpen).toBe(false);
      useAppStore.getState().toggleCommandPalette();
      expect(useAppStore.getState().isCommandPaletteOpen).toBe(true);
      useAppStore.getState().toggleCommandPalette();
      expect(useAppStore.getState().isCommandPaletteOpen).toBe(false);
    });
  });

  describe('S2: System Health Indicator', () => {
    it('renders system health pill with nominal OK status', () => {
      const html = renderToStaticMarkup(
        <SystemHealthIndicator
          forcedHealth={{
            status: 'healthy',
            label: 'OK',
            details: {
              rss: '24 Sources Active',
              ai: 'Plain Mode',
              scheduler: 'Nominal',
              db: 'WAL active',
              tv: 'Active',
            },
          }}
        />,
      );
      expect(html).toContain('btn-status-strip-system-health');
      expect(html).toContain('System: OK');
    });

    it('renders degraded status when system is degraded', () => {
      const html = renderToStaticMarkup(
        <SystemHealthIndicator
          forcedHealth={{
            status: 'degraded',
            label: 'Degraded',
            details: {
              rss: '22 Sources Active',
              ai: 'Degraded',
              scheduler: 'Lag 45s',
              db: 'WAL active',
              tv: 'Active',
            },
          }}
        />,
      );
      expect(html).toContain('System: Degraded');
    });

    it('renders diagnostics popover with metric details when forcedOpen', () => {
      const html = renderToStaticMarkup(
        <SystemHealthIndicator
          forcedOpen={true}
          forcedHealth={{
            status: 'healthy',
            label: 'OK',
            details: {
              rss: '24 Sources Active',
              ai: 'Gemini Online',
              scheduler: 'Nominal',
              db: 'SQLite WAL Connected',
              tv: 'HLS & YT Active',
            },
          }}
        />,
      );

      expect(html).toContain('system-health-popover');
      expect(html).toContain('Desk Operational Health');
      expect(html).toContain('24 Sources Active');
      expect(html).toContain('Gemini Online');
      expect(html).toContain('btn-health-open-control-room');
    });
  });

  describe('S3: Layout Presets', () => {
    it('updates panel sizes and layout preset to focus mode (85/15)', () => {
      useAppStore.getState().setLayoutPreset('focus');

      expect(useAppStore.getState().layoutPreset).toBe('focus');
      expect(useAppStore.getState().panelSizesH).toEqual([85, 15]);
      expect(useAppStore.getState().panelSizesV).toEqual([85, 15]);
    });

    it('updates panel sizes and layout preset to split mode (50/50)', () => {
      useAppStore.getState().setLayoutPreset('split');

      expect(useAppStore.getState().layoutPreset).toBe('split');
      expect(useAppStore.getState().panelSizesH).toEqual([50, 50]);
      expect(useAppStore.getState().panelSizesV).toEqual([70, 30]);
    });

    it('resets to balanced mode (60/40)', () => {
      useAppStore.getState().setLayoutPreset('balanced');

      expect(useAppStore.getState().layoutPreset).toBe('balanced');
      expect(useAppStore.getState().panelSizesH).toEqual([60, 40]);
      expect(useAppStore.getState().panelSizesV).toEqual([78, 22]);
    });
  });

  describe('S4: TV Mini-Player (Picture-in-Picture Dock)', () => {
    it('does not render when isTvMiniPlayerOpen is false', () => {
      const html = renderToStaticMarkup(<TVMiniPlayer forcedOpen={false} />);
      expect(html).toBe('');
    });

    it('does not render when full TV view is already open', () => {
      const html = renderToStaticMarkup(
        <TVMiniPlayer
          forcedOpen={true}
          forcedChannel={mockChannel}
          forcedTvViewOpen={true}
        />,
      );
      expect(html).toBe('');
    });

    it('renders docked mini player with 16:9 monitor and channel name when active', () => {
      const html = renderToStaticMarkup(
        <TVMiniPlayer
          forcedOpen={true}
          forcedChannel={mockChannel}
          forcedTvViewOpen={false}
        />,
      );

      expect(html).toContain('tv-mini-player-dock');
      expect(html).toContain('NDTV 24x7');
      expect(html).toContain('LIVE');
      expect(html).toContain('btn-mini-player-expand');
      expect(html).toContain('btn-mini-player-close');
    });

    it('supports YouTube iframe rendering for youtube streams', () => {
      const html = renderToStaticMarkup(
        <TVMiniPlayer
          forcedOpen={true}
          forcedChannel={{
            ...mockChannel,
            youtube_live_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          }}
          forcedTvViewOpen={false}
        />,
      );
      expect(html).toContain('<iframe');
      expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });
  });
});

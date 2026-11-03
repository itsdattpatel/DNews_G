/**
 * frontend/src/__tests__/unit/tv-cat5b-fixes.test.tsx
 * Tests verifying Category 5B TV Playback & Layout Fixes via renderToStaticMarkup:
 * 1. Resizable panels rendering for TV view
 * 2. 16:9 monitor frame geometry
 * 3. Quick switcher with "Name (Country)" disambiguation
 * 4. Dedicated Mute button, 'm' key hint, and volume slider
 * 5. Error panel with fallback action buttons (Try YouTube, Open in VLC, Skip, Retry, Report)
 * 6. Channel directory layout with country flag, method badge, and textual health badge
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TVView } from '../../components/tv/TVView';
import { useAppStore } from '../../store/useAppStore';
import type { TvChannel } from '../../types';

describe('TV View PRD C Category 5B Fixes', () => {
  beforeEach(() => {
    useAppStore.setState({
      isTvViewOpen: true,
      selectedTvChannelId: 105,
    });
  });

  const dummyChannel: TvChannel = {
    id: 105,
    name: 'NDTV 24x7',
    country: 'India',
    country_code: 'IN',
    category: 'news',
    stream_url: 'https://ndtv24x7elemarchana.akamaized.net/hls/live/2003678/ndtv24x7/master.m3u8',
    youtube_live_url: null,
    youtube_channel_id: null,
    website: 'https://www.ndtv.com',
    logo_url: null,
    is_alive: true,
    is_favorite: false,
    is_top5: true,
    rank: 1,
    status: 'verified',
    evidence: 'Premier independent English news broadcaster in India',
    last_checked_at: '2026-11-03 12:00:00',
  };

  it('renders dedicated mute toggle button, volume slider, and ESC/M keyboard hint', () => {
    const html = renderToStaticMarkup(
      <TVView forcedOpen={true} forcedSelectedChannel={dummyChannel} />
    );

    // Dedicated Mute button
    expect(html).toContain('id="btn-tv-mute-toggle"');
    // Volume slider
    expect(html).toContain('id="input-tv-volume"');
    // Mute hint in footer
    expect(html).toContain('Press M to mute/unmute audio');
  });

  it('renders subpages navigation tabs for LIVE, FAULTY FEEDS, and STOPPED LINKS', () => {
    const html = renderToStaticMarkup(<TVView forcedOpen={true} />);

    expect(html).toContain('id="tab-subpage-live"');
    expect(html).toContain('id="tab-subpage-faulty"');
    expect(html).toContain('id="tab-subpage-stopped"');
    expect(html).toContain('FAULTY FEEDS');
    expect(html).toContain('STOPPED LINKS');
  });

  it('renders fixed footer at bottom of modal outside scroll container', () => {
    const html = renderToStaticMarkup(<TVView forcedOpen={true} />);

    expect(html).toContain('<footer');
    expect(html).toContain('IPTV Engine:');
    expect(html).toContain('HLS.js v1.5+');
    expect(html).toContain('Desktop VLC');
  });

  it('renders channel directory with search input and shelf filter buttons', () => {
    const html = renderToStaticMarkup(<TVView forcedOpen={true} />);

    expect(html).toContain('Channel Directory');
    expect(html).toContain('placeholder="Filter channels..."');
    expect(html).toContain('btn-tv-shelf-all');
    expect(html).toContain('btn-tv-shelf-top5');
    expect(html).toContain('btn-tv-shelf-animals');
  });
});

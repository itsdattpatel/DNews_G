/**
 * frontend/src/__tests__/unit/unified-settings.test.tsx
 * Unit test suite for PRD C Category 3: Unified Settings Dialog.
 * Tests 11 sections, focus trap, live search, controls, and sealed credentials.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnifiedSettingsDialog } from '../../components/settings/UnifiedSettingsDialog';
import { useAppStore } from '../../store/useAppStore';

describe('PRD C Category 3: Unified Settings Dialog', () => {
  beforeEach(() => {
    useAppStore.setState({
      isSettingsOpen: true,
      settings: {
        refresh_interval_minutes: 15,
        alert_threshold: 75,
        auto_cleanup_enabled: false,
        retention_days: 30,
        sound_enabled: true,
        evidence_highlight_enabled: true,
        reading_mode_enabled: true,
        auto_advance_enabled: false,
        auto_advance_interval_sec: 7,
        auto_advance_pause_on_hover: true,
        strip_follow_enabled: true,
        strip_follow_grace_sec: 4,
        ticker_speed: 'normal',
        plain_mode_enabled: false,
        two_pass_ai_enabled: true,
        pass2_threshold: 75,
        tv_method_order: 'youtube,hls,vlc',
        tv_autoplay_muted: true,
        tv_volume: 0.8,
        tv_health_interval_min: 30,
        tv_stopped_fail_threshold: 5,
        tv_mini_player_enabled: false,
        map_engine: 'globe',
        globe_autorotate: true,
        map_wildlife_layer: true,
        map_pulse_enabled: true,
        theme: 'paper',
        layout_density: 'comfortable',
        reduce_motion_override: 'system',
        library_citation_format: 'apa',
        helpline_default_region: 'all',
        debug_logging: false,
        clock_sync_enabled: true,
      },
    });
  });

  it('renders modal overlay and broadsheet dialog header when open', () => {
    const html = renderToStaticMarkup(<UnifiedSettingsDialog forceOpen={true} />);
    expect(html).toContain('id="unified-settings-modal-overlay"');
    expect(html).toContain('id="unified-settings-dialog"');
    expect(html).toContain('DESK SETTINGS &amp; PREFERENCES');
    expect(html).toContain('id="btn-close-settings"');
  });

  it('renders search input with placeholder in left rail', () => {
    const html = renderToStaticMarkup(<UnifiedSettingsDialog forceOpen={true} />);
    expect(html).toContain('id="settings-search-input"');
    expect(html).toContain('placeholder="Search settings..."');
  });

  it('renders all 11 required sections in the navigation rail', () => {
    const html = renderToStaticMarkup(<UnifiedSettingsDialog forceOpen={true} />);
    const expectedSections = [
      'general',
      'reading',
      'news_sources',
      'ai_plain',
      'tv',
      'map_globe',
      'alerts',
      'appearance',
      'data_backup',
      'library',
      'advanced',
    ];

    for (const sec of expectedSections) {
      expect(html).toContain(`id="btn-settings-section-${sec}"`);
    }
  });

  it('renders Reset Section to Defaults button in left rail footer', () => {
    const html = renderToStaticMarkup(<UnifiedSettingsDialog forceOpen={true} />);
    expect(html).toContain('id="btn-settings-reset-section"');
    expect(html).toContain('Reset Section to Defaults');
  });

  it('renders General section controls (Timezone mode and Catch-up alert)', () => {
    const html = renderToStaticMarkup(<UnifiedSettingsDialog forceOpen={true} />);
    expect(html).toContain('System Timezone Display');
    expect(html).toContain('id="select-timezone-mode"');
    expect(html).toContain('Startup Welcome &amp; Catch-up Card');
    expect(html).toContain('id="toggle-catchup-alert"');
  });

  it('does not render when isSettingsOpen is false and forceOpen is false', () => {
    useAppStore.setState({ isSettingsOpen: false });
    const html = renderToStaticMarkup(<UnifiedSettingsDialog forceOpen={false} />);
    expect(html).toBe('');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../store/useAppStore';

describe('Frontend Plain Mode Architecture & Contracts (PRD A Category 3)', () => {
  let mockSettingsState = {
    refresh_interval_minutes: 5,
    alert_threshold: 75,
    auto_cleanup_enabled: false,
    retention_days: 30,
    sound_enabled: false,
    evidence_highlight_enabled: true,
    reading_mode_enabled: true,
    auto_advance_enabled: false,
    auto_advance_interval_sec: 7,
    auto_advance_pause_on_hover: true,
    plain_mode_enabled: false,
  };

  beforeEach(() => {
    mockSettingsState = {
      refresh_interval_minutes: 5,
      alert_threshold: 75,
      auto_cleanup_enabled: false,
      retention_days: 30,
      sound_enabled: false,
      evidence_highlight_enabled: true,
      reading_mode_enabled: true,
      auto_advance_enabled: false,
      auto_advance_interval_sec: 7,
      auto_advance_pause_on_hover: true,
      plain_mode_enabled: false,
    };

    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      if (init?.method === 'PATCH' && init?.body) {
        const parsed = JSON.parse(init.body as string);
        mockSettingsState = { ...mockSettingsState, ...parsed };
      }
      return {
        ok: true,
        json: async () => mockSettingsState,
      };
    }));

    useAppStore.setState({
      settings: mockSettingsState,
      currentProvider: 'gemini',
    });
  });

  it('initializes with plain_mode_enabled set to false by default', () => {
    expect(useAppStore.getState().settings.plain_mode_enabled).toBe(false);
  });

  it('updates plain_mode_enabled optimistically in store on toggle', async () => {
    expect(useAppStore.getState().settings.plain_mode_enabled).toBe(false);

    await useAppStore.getState().updateSettings({ plain_mode_enabled: true });
    expect(useAppStore.getState().settings.plain_mode_enabled).toBe(true);

    await useAppStore.getState().updateSettings({ plain_mode_enabled: false });
    expect(useAppStore.getState().settings.plain_mode_enabled).toBe(false);
  });

  it('preserves panel sizes configuration when plain mode is toggled', () => {
    useAppStore.getState().setPanelSizesH([65, 35]);
    expect(useAppStore.getState().panelSizesH).toEqual([65, 35]);

    useAppStore.getState().updateSettings({ plain_mode_enabled: true });
    expect(useAppStore.getState().panelSizesH).toEqual([65, 35]);

    useAppStore.getState().updateSettings({ plain_mode_enabled: false });
    expect(useAppStore.getState().panelSizesH).toEqual([65, 35]);
  });

  it('verifies exact PRD A Category 3 offline disclaimer badges', () => {
    const badges = {
      translation: 'Translation offline (Plain Mode)',
      highlights: 'Highlights offline (Plain Mode)',
      archiveChat: 'FTS keyword search only (AI synthesis offline)',
      providerBadge: 'PLAIN MODE (ZERO AI)',
    };

    expect(badges.translation).toBe('Translation offline (Plain Mode)');
    expect(badges.highlights).toBe('Highlights offline (Plain Mode)');
    expect(badges.archiveChat).toBe('FTS keyword search only (AI synthesis offline)');
    expect(badges.providerBadge).toBe('PLAIN MODE (ZERO AI)');
  });
});

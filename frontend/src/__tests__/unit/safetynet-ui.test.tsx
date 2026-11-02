import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { SettingsMenu } from '../../components/bat/SettingsMenu';
import { useAppStore } from '../../store/useAppStore';

describe('Safety Net Frontend UI: Backups, Export/Import & Double-Confirmation Restore (PRD A Category 4)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ backups: [] }),
    })));

    useAppStore.setState({
      isSettingsOpen: true,
      settings: {
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
      },
    });
  });

  it('renders Safety Net section with Export/Import buttons and Backup list container', () => {
    const html = renderToStaticMarkup(<SettingsMenu forceOpen={true} />);

    expect(html).toContain('Safety Net &amp; Backups');
    expect(html).toContain('Export Settings (JSON)');
    expect(html).toContain('Import Settings');
    expect(html).toContain('Create Backup Now');
    expect(html).toContain('Database Snapshots');
    expect(html).toContain('btn-export-settings');
    expect(html).toContain('btn-import-settings');
    expect(html).toContain('btn-create-backup');
  });

  it('contains proper security and schema badges in the markup', () => {
    const html = renderToStaticMarkup(<SettingsMenu forceOpen={true} />);

    expect(html).toContain('Schema v1');
    expect(html).toContain('API keys and provider secrets are strictly redacted');
    expect(html).toContain('input-import-settings-file');
  });
});

/**
 * frontend/src/components/bat/SettingsMenu.tsx
 * Screen (l): Desk Preferences & Settings Drawer (v2.0 Broadsheet).
 * Controls theme switching (Paper vs Night), wire polling intervals, alert thresholds,
 * sound effects, and retention auto-cleanup.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { AppSettings, ThemeMode, TwoPassTelemetry } from '../../types';
import {
  Sliders,
  X,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Clock,
  Flame,
  Database,
  Save,
  RotateCcw,
  Highlighter,
  BookOpen,
  Timer,
  MousePointer,
  ZapOff,
  Sparkles,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface BackupRecord {
  filename: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  trigger: 'daily' | 'migration' | 'manual' | 'pre-restore' | 'pre-upgrade';
}

export const SettingsMenu: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const storeSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const isSettingsOpen = forceOpen ?? storeSettingsOpen;
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const storeSettings = useAppStore((s) => s.settings);
  const updateStoreSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Local draft state for form edits
  const [formData, setFormData] = useState<AppSettings>(storeSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [unenrichedCount, setUnenrichedCount] = useState<number>(0);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Backups and safety net states (PRD A Category 4)
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [twoPassTelemetry, setTwoPassTelemetry] = useState<TwoPassTelemetry | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fetchTwoPassTelemetry = async () => {
    try {
      const res = await fetch('/api/settings/two-pass-telemetry');
      if (res.ok) {
        const data = await res.json();
        setTwoPassTelemetry(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups ?? []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // Sync draft state whenever settings drawer opens
  useEffect(() => {
    if (isSettingsOpen) {
      setFormData(storeSettings);
      fetchBackups();
      fetchTwoPassTelemetry();
      fetch('/api/settings/unenriched-count')
        .then((res) => res.json())
        .then((data) => setUnenrichedCount(data.count ?? 0))
        .catch(() => {});
    }
  }, [isSettingsOpen, storeSettings]);

  const handleSummarizeUnenriched = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/settings/summarize-unenriched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      if (res.ok) {
        const data = await res.json();
        setUnenrichedCount(data.remaining ?? 0);
        toast.success(`Summarized ${data.processed} dispatch(es). Remaining: ${data.remaining}`);
      } else {
        toast.error('Failed to run summarization batch.');
      }
    } catch {
      toast.error('Network error running summarization.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup creation failed');
      toast.success(`Backup created: ${data.backup?.filename || 'Snapshot saved'}`);
      fetchBackups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create backup snapshot.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget || restoreConfirmInput !== 'RESTORE') return;
    setIsRestoring(true);
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: restoreTarget.filename,
          confirmation: 'RESTORE',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      toast.success(`Restored successfully (${data.articlesCount} articles verified).`);
      setRestoreTarget(null);
      setRestoreConfirmInput('');
      fetchBackups();
      // Reload settings & state
      const freshSettings = await fetch('/api/settings').then((r) => r.json());
      setFormData(freshSettings);
      updateStoreSettings(freshSettings);
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore backup snapshot.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportSettings = async () => {
    try {
      const res = await fetch('/api/settings/export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ai-news-desk-settings-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Settings exported (sanitized JSON).');
    } catch {
      toast.error('Failed to export settings.');
    }
  };

  const handleImportSettingsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }
      toast.success(`Settings imported: ${data.applied_count} preference(s) updated.`);
      const freshSettings = await fetch('/api/settings').then((r) => r.json());
      setFormData(freshSettings);
      updateStoreSettings(freshSettings);
    } catch (err: any) {
      toast.error(err.message || 'Invalid settings JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (restoreTarget) {
          setRestoreTarget(null);
          setRestoreConfirmInput('');
        } else if (isSettingsOpen) {
          setSettingsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, restoreTarget, setSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateStoreSettings(formData);
      toast.success('Desk preferences saved.');
      setSettingsOpen(false);
    } catch (err) {
      console.error('[SettingsMenu] Failed to save settings:', err);
      toast.error('Failed to update desk settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeToggle = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setFormData((prev) => ({ ...prev, theme: newTheme }));
    toast.info(`Theme switched to ${newTheme === 'night' ? 'Night Edition' : 'Paper Edition'}.`);
  };

  return (
    <div
      id="settings-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-drawer-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false);
      }}
    >
      <div className="flex flex-col w-full max-w-xl max-h-[90vh] bg-paper text-ink border-2 border-ink shadow-overlay overflow-hidden relative">
        {/* Masthead Header */}
        <header className="px-6 py-4 border-b-2 border-ink bg-paper-alt flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-ink bg-paper text-ink">
              <Sliders className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase bg-ink text-paper px-1.5 py-0.5 font-bold">
                  DESK CONFIG
                </span>
                <h2
                  id="settings-drawer-heading"
                  className="font-masthead text-xl tracking-tight text-ink font-black uppercase"
                >
                  Desk Preferences
                </h2>
              </div>
              <p className="font-serif text-xs text-ink-secondary italic mt-0.5">
                Editorial wire polling intervals, alert thresholds & sound
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="close-settings-btn"
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 border border-paper-border hover:border-ink hover:bg-paper text-ink transition-colors"
              aria-label="Close Desk Preferences"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSave}
          data-lenis-prevent="true"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6 bg-paper font-serif text-sm"
        >
          {/* Section 1: Edition Theme */}
          <div className="border-b border-paper-border pb-5">
            <label className="block font-serif font-bold text-ink mb-2">Edition Theme</label>
            <div className="flex items-center gap-3 font-mono text-xs">
              <button
                type="button"
                id="btn-theme-paper"
                onClick={() => handleThemeToggle('paper')}
                className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${
                  theme === 'paper'
                    ? 'border-ink bg-ink text-paper font-bold shadow-xs'
                    : 'border-paper-border bg-paper hover:border-ink text-ink'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Paper Edition (Day)</span>
              </button>

              <button
                type="button"
                id="btn-theme-night"
                onClick={() => handleThemeToggle('night')}
                className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${
                  theme === 'night'
                    ? 'border-ink bg-ink text-paper font-bold shadow-xs'
                    : 'border-paper-border bg-paper hover:border-ink text-ink'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Night Edition (Dark)</span>
              </button>
            </div>
          </div>

          {/* Timezone Configuration Indicator (Category 1 & 1B) */}
          <div className="border-b border-paper-border pb-5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-serif font-bold text-ink">System Timezone</label>
                <p className="font-ui text-xs text-ink-secondary mt-0.5">
                  All news dates and arrival times are localized to your machine's timezone
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-ink bg-paper-alt px-2 py-1 border border-paper-border rounded-xs">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
                <div className="font-mono text-[10px] text-ink-muted mt-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Wire Polling & Refresh Interval */}
          <div className="border-b border-paper-border pb-5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="refresh-interval-select" className="font-serif font-bold text-ink flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink-secondary" />
                <span>Telegraph Refresh Interval</span>
              </label>
              <span className="font-mono text-xs text-ink-secondary font-bold">
                Every {formData.refresh_interval_minutes} min
              </span>
            </div>
            <select
              id="refresh-interval-select"
              value={formData.refresh_interval_minutes}
              onChange={(e) =>
                setFormData({ ...formData, refresh_interval_minutes: parseInt(e.target.value, 10) })
              }
              className="w-full px-3 py-1.5 border border-ink bg-paper-alt text-ink font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ink"
            >
              {[1, 2, 5, 10, 15, 30, 60].map((mins) => (
                <option key={mins} value={mins}>
                  Every {mins} minute{mins > 1 ? 's' : ''} {mins === 5 ? '(Recommended)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section 3: Breaking Alert Score Threshold */}
          <div className="border-b border-paper-border pb-5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="alert-threshold-slider" className="font-serif font-bold text-ink flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-accent" />
                <span>Breaking News Threshold</span>
              </label>
              <span className="font-mono text-xs text-accent font-bold">
                {formData.alert_threshold}% breaking score
              </span>
            </div>
            <input
              id="alert-threshold-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.alert_threshold}
              onChange={(e) =>
                setFormData({ ...formData, alert_threshold: parseInt(e.target.value, 10) })
              }
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[10px] text-ink-muted mt-1">
              <span>0% (All wires)</span>
              <span>75% (Strict Breaking)</span>
              <span>100% (Critical Only)</span>
            </div>
          </div>

          {/* Section 4: Retention & Sound Effects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                {formData.sound_enabled ? (
                  <Volume2 className="w-4 h-4 text-positive" />
                ) : (
                  <VolumeX className="w-4 h-4 text-ink-muted" />
                )}
                <span>Auditory Feedback (Morse & Chimes)</span>
              </label>
              <button
                type="button"
                id="btn-toggle-sound"
                onClick={() => setFormData({ ...formData, sound_enabled: !formData.sound_enabled })}
                className={`px-3 py-0.5 border font-mono text-xs font-bold uppercase ${
                  formData.sound_enabled
                    ? 'border-ink bg-ink text-paper'
                    : 'border-paper-border bg-paper text-ink-muted'
                }`}
              >
                {formData.sound_enabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            {/* Retention Auto-Cleanup */}
            <div className="flex items-center justify-between pt-2">
              <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                <Database className="w-4 h-4 text-ink-secondary" />
                <span>Auto-Purge Stale Dispatches</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={formData.retention_days}
                  onChange={(e) =>
                    setFormData({ ...formData, retention_days: parseInt(e.target.value, 10) || 30 })
                  }
                  className="w-14 px-1.5 py-0.5 border border-ink bg-paper-alt font-mono text-xs text-center"
                />
                <span className="font-mono text-xs text-ink-secondary">days</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, auto_cleanup_enabled: !formData.auto_cleanup_enabled })
                  }
                  className={`px-2 py-0.5 border font-mono text-xs font-bold uppercase ${
                    formData.auto_cleanup_enabled
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {formData.auto_cleanup_enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Section 5: Evidence Desk & Reading Mode */}
            <div className="border-t border-paper-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                    <Highlighter className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Evidence Marker Highlights</span>
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary mt-0.5">
                    Marker highlights on verbatim text supporting summary sentences
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-evidence-highlight"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      evidence_highlight_enabled: !(formData.evidence_highlight_enabled ?? true),
                    })
                  }
                  className={`px-3 py-0.5 border font-mono text-xs font-bold uppercase ${
                    (formData.evidence_highlight_enabled ?? true)
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {(formData.evidence_highlight_enabled ?? true) ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span>Synchronized Reading Mode</span>
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary mt-0.5">
                    Sweeps evidence highlights sequentially with summary reveal
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-reading-mode"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      reading_mode_enabled: !(formData.reading_mode_enabled ?? true),
                    })
                  }
                  className={`px-3 py-0.5 border font-mono text-xs font-bold uppercase ${
                    (formData.reading_mode_enabled ?? true)
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {(formData.reading_mode_enabled ?? true) ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="font-mono text-[10px] text-ink-muted italic pt-1">
                * Both features respect system reduced-motion preferences (`prefers-reduced-motion: reduce`).
              </div>
            </div>

            {/* Section 6: Auto-Advance Reader Desk (PRD A Category 2) */}
            <div className="border-t border-paper-border pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-accent" />
                    <span>Auto-Advance Reader</span>
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary mt-0.5">
                    Automatically cycles through news items every {formData.auto_advance_interval_sec ?? 7}s
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-auto-advance"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      auto_advance_enabled: !formData.auto_advance_enabled,
                    })
                  }
                  className={`px-3 py-0.5 border font-mono text-xs font-bold uppercase transition-colors ${
                    formData.auto_advance_enabled
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {formData.auto_advance_enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Interval Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-serif text-xs font-semibold text-ink">
                    Auto-Advance Interval
                  </label>
                  <span className="font-mono text-xs font-bold text-accent">
                    {formData.auto_advance_interval_sec ?? 7} seconds
                  </span>
                </div>
                <input
                  id="auto-advance-interval-slider"
                  type="range"
                  min="3"
                  max="60"
                  step="1"
                  value={formData.auto_advance_interval_sec ?? 7}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      auto_advance_interval_sec: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[10px] text-ink-muted">
                  <span>3s (Brisk wire)</span>
                  <span>7s (Default)</span>
                  <span>60s (Slow broadsheet)</span>
                </div>
              </div>

              {/* Pause on Hover Switch */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                    <MousePointer className="w-4 h-4 text-ink-secondary" />
                    <span>Pause When Hovering Left Panel</span>
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary mt-0.5">
                    Freezes countdown while cursor is over the main reading pane
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-pause-on-hover"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      auto_advance_pause_on_hover: !(formData.auto_advance_pause_on_hover ?? true),
                    })
                  }
                  className={`px-3 py-0.5 border font-mono text-xs font-bold uppercase transition-colors ${
                    (formData.auto_advance_pause_on_hover ?? true)
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {(formData.auto_advance_pause_on_hover ?? true) ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Section 7: Plain Mode (Zero AI Desk) (PRD A Category 3) */}
            <div className="border-t border-paper-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                    <ZapOff className="w-4 h-4 text-accent" />
                    <span>Plain Mode (Zero AI Desk)</span>
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary mt-0.5">
                    Full-width reader with zero AI calls and zero quota consumption
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-plain-mode"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      plain_mode_enabled: !formData.plain_mode_enabled,
                    })
                  }
                  className={`px-3 py-0.5 border font-mono text-xs font-bold uppercase transition-colors ${
                    formData.plain_mode_enabled
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {formData.plain_mode_enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="p-2.5 border border-paper-border bg-paper-alt/60 rounded-xs space-y-1.5 font-ui text-xs text-ink-secondary">
                <p>
                  <strong>When Plain Mode is ON:</strong> The right summary pane is hidden, the main article panel expands to 100% width, and new dispatches are categorized via deterministic rule heuristics without invoking external AI providers.
                </p>
              </div>

              {/* Catch-Up Summarization Button (PRD A Category 3.2.6) */}
              {!formData.plain_mode_enabled && (
                <div className="flex items-center justify-between pt-1 border-t border-paper-border/60">
                  <div>
                    <span className="font-serif text-xs font-semibold text-ink flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Un-enriched Dispatches</span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {unenrichedCount > 0
                        ? `${unenrichedCount} item(s) pending AI summarization`
                        : 'All ingested dispatches are fully enriched'}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-summarize-unenriched"
                    disabled={unenrichedCount === 0 || isSummarizing}
                    onClick={handleSummarizeUnenriched}
                    className="px-3 py-1 border border-paper-border hover:border-ink bg-paper font-mono text-[11px] font-bold text-ink hover:bg-paper-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSummarizing ? 'Enriching…' : 'Summarize Dispatches'}
                  </button>
                </div>
              )}
            </div>

            {/* Section 8: Safety Net: Backups & Data Portability (PRD A Category 4) */}
            <div className="border-t border-paper-border pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-serif font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-positive" />
                    <span>Safety Net & Backups</span>
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary mt-0.5">
                    Automated pre-migration hooks, daily snapshots & sanitized settings portability
                  </p>
                </div>
              </div>

              {/* Data Portability (Export / Import) */}
              <div className="p-3 border border-paper-border bg-paper-alt/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xs font-semibold text-ink">
                    Settings Data Portability
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted uppercase">
                    Schema v1
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-export-settings"
                    onClick={handleExportSettings}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-paper-border hover:border-ink bg-paper font-mono text-xs font-bold text-ink hover:bg-paper-alt transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-ink-secondary" />
                    <span>Export Settings (JSON)</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportSettingsFile}
                    accept=".json,application/json"
                    className="hidden"
                    id="input-import-settings-file"
                  />
                  <button
                    type="button"
                    id="btn-import-settings"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-paper-border hover:border-ink bg-paper font-mono text-xs font-bold text-ink hover:bg-paper-alt transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-ink-secondary" />
                    <span>Import Settings</span>
                  </button>
                </div>
                <p className="font-ui text-[10px] text-ink-muted italic">
                  * API keys and provider secrets are strictly redacted and never exported or imported.
                </p>
              </div>

              {/* Database Snapshot Archives */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-ink-secondary" />
                    <span className="font-serif text-xs font-semibold text-ink">
                      Database Snapshots ({backups.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-create-backup"
                    disabled={isCreatingBackup}
                    onClick={handleCreateBackup}
                    className="flex items-center gap-1 px-2.5 py-1 border border-paper-border hover:border-ink bg-paper font-mono text-[11px] font-bold text-ink hover:bg-paper-alt disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCreatingBackup ? 'animate-spin' : ''}`} />
                    <span>{isCreatingBackup ? 'Saving Snapshot…' : 'Create Backup Now'}</span>
                  </button>
                </div>

                {/* Backups List Box */}
                <div
                  data-lenis-prevent="true"
                  className="max-h-48 overflow-y-auto overscroll-contain border border-paper-border bg-paper-alt/20 divide-y divide-paper-border/60"
                >
                  {isLoadingBackups ? (
                    <div className="p-3 text-center font-mono text-xs text-ink-muted">
                      Scanning backup archives…
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="p-4 text-center font-serif text-xs text-ink-muted italic">
                      No snapshot archives found. Click "Create Backup Now" to record one.
                    </div>
                  ) : (
                    backups.map((b, idx) => {
                      const triggerBadgeClass =
                        b.trigger === 'daily'
                          ? 'border-positive/60 text-positive bg-positive/10'
                          : b.trigger === 'migration'
                          ? 'border-ink/60 text-ink bg-paper'
                          : b.trigger === 'pre-restore'
                          ? 'border-amber-600 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
                          : b.trigger === 'pre-upgrade'
                          ? 'border-blue-600 text-blue-700 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-accent/60 text-accent bg-accent/10';

                      return (
                        <div
                          key={b.filename}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-paper-alt/60 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-mono text-[9px] font-bold uppercase px-1 py-0.2 border ${triggerBadgeClass}`}
                              >
                                {b.trigger}
                              </span>
                              <span
                                className="font-mono text-xs text-ink font-medium truncate max-w-[240px] sm:max-w-[280px]"
                                title={b.filename}
                              >
                                {b.filename}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-ink-muted mt-0.5 flex items-center gap-2">
                              <span>{b.sizeFormatted}</span>
                              <span>·</span>
                              <span>
                                {new Date(b.createdAt).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            id={`btn-restore-${idx}`}
                            onClick={() => {
                              setRestoreTarget(b);
                              setRestoreConfirmInput('');
                            }}
                            className="shrink-0 px-2.5 py-1 border border-paper-border hover:border-accent hover:text-accent bg-paper font-mono text-[11px] font-bold uppercase transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Section 9: Two-Pass AI Ingestion & Quota Telemetry (PRD A Category 10) */}
            <div className="p-4 border border-paper-border bg-paper-alt/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-paper-border">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink-muted uppercase">§ 9</span>
                  <h3 className="font-serif text-sm font-bold text-ink">
                    Two-Pass AI Ingestion & Quota Telemetry
                  </h3>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-xs border border-accent/40 bg-accent/10 text-accent font-bold">
                  PRD A §10
                </span>
              </div>

              {/* Toggle Two-Pass AI */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="two_pass_ai_enabled" className="font-serif text-xs font-semibold text-ink cursor-pointer">
                    Two-Pass AI Ingestion
                  </label>
                  <p className="font-ui text-[11px] text-ink-secondary">
                    Pass 1 scores urgency/categories cheaply in batches of 20. Pass 2 is reserved for top-tier breaking news or manual demand.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="two_pass_ai_enabled"
                  checked={formData.two_pass_ai_enabled ?? true}
                  onChange={(e) => setFormData((prev) => ({ ...prev, two_pass_ai_enabled: e.target.checked }))}
                  className="w-4 h-4 accent-ink cursor-pointer"
                />
              </div>

              {/* Pass 2 Urgency Threshold */}
              <div className="space-y-1.5 pt-2 border-t border-paper-border/60">
                <div className="flex items-center justify-between">
                  <label htmlFor="pass2_threshold" className="font-serif text-xs font-semibold text-ink cursor-pointer">
                    Pass 2 Auto-Enrichment Threshold
                  </label>
                  <span className="font-mono text-xs font-bold text-accent">
                    {formData.pass2_threshold ?? 75}%
                  </span>
                </div>
                <input
                  type="range"
                  id="pass2_threshold"
                  min={50}
                  max={100}
                  step={5}
                  value={formData.pass2_threshold ?? 75}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pass2_threshold: parseInt(e.target.value, 10) }))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[10px] text-ink-muted">
                  <span>50% (Permissive)</span>
                  <span>75% (Top 30% Stories)</span>
                  <span>100% (Strict Breaking Only)</span>
                </div>
              </div>

              {/* Live Quota Telemetry Box */}
              <div className="pt-3 border-t border-paper-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xs font-semibold text-ink">
                    Quota Telemetry & Savings
                  </span>
                  <button
                    type="button"
                    onClick={fetchTwoPassTelemetry}
                    className="font-mono text-[10px] text-ink-secondary hover:text-ink underline cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                  <div className="p-2 border border-paper-border bg-paper rounded-xs">
                    <span className="text-[10px] text-ink-muted block uppercase">Pass 1 Triaged</span>
                    <span id="telemetry-pass1-count" className="text-sm font-bold text-ink">
                      {twoPassTelemetry?.pass1_count?.toLocaleString() ?? '—'}
                    </span>
                  </div>
                  <div className="p-2 border border-paper-border bg-paper rounded-xs">
                    <span className="text-[10px] text-ink-muted block uppercase">Pass 2 Enriched</span>
                    <span id="telemetry-pass2-count" className="text-sm font-bold text-ink">
                      {twoPassTelemetry?.pass2_count?.toLocaleString() ?? '—'}
                    </span>
                  </div>
                  <div className="p-2 border border-paper-border bg-paper rounded-xs">
                    <span className="text-[10px] text-ink-muted block uppercase">Stories Deferred</span>
                    <span id="telemetry-skipped-count" className="text-sm font-bold text-accent">
                      {twoPassTelemetry?.pass2_skipped_count?.toLocaleString() ?? '—'}
                    </span>
                  </div>
                  <div className="p-2 border border-paper-border bg-paper rounded-xs">
                    <span className="text-[10px] text-ink-muted block uppercase">Tokens Saved</span>
                    <span id="telemetry-tokens-saved" className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {twoPassTelemetry?.estimated_tokens_saved?.toLocaleString() ?? '—'}
                    </span>
                  </div>
                </div>
                <p className="font-ui text-[10px] text-ink-muted text-right italic">
                  * Calculates ~740 tokens saved per Pass-1-only dispatch vs single-pass model.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Action Buttons */}
        <footer className="px-6 py-3 border-t-2 border-ink bg-paper-alt flex items-center justify-between font-mono text-xs">
          <button
            type="button"
            onClick={() => setFormData(storeSettings)}
            className="flex items-center gap-1 px-3 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink uppercase font-bold tracking-wider transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            id="btn-save-settings"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 border-2 border-ink bg-ink text-paper hover:bg-ink-secondary uppercase font-bold tracking-wider transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </footer>

        {/* Double-Confirmation Restore Modal (PRD A Category 4.2) */}
        {restoreTarget && (
          <div
            id="restore-modal-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restore-modal-title"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/80 backdrop-blur-xs"
          >
            <div className="w-full max-w-md bg-paper text-ink border-2 border-accent shadow-overlay p-6 font-serif space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-accent bg-accent/10 text-accent shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="restore-modal-title"
                    className="font-masthead text-lg font-black uppercase text-accent tracking-tight"
                  >
                    Confirm Database Restore
                  </h3>
                  <p className="font-serif text-xs text-ink-secondary mt-1">
                    You are preparing to overwrite the active database with this snapshot.
                  </p>
                </div>
              </div>

              <div className="p-2.5 border border-paper-border bg-paper-alt font-mono text-xs text-ink break-all font-semibold">
                {restoreTarget.filename}
              </div>

              <div className="space-y-1 font-ui text-xs text-ink-secondary">
                <p>
                  <strong>Safety guarantee:</strong> A safety pre-restore backup will be created immediately before overwriting so you can roll back at any time.
                </p>
              </div>

              <div className="pt-2">
                <label
                  htmlFor="input-confirm-restore"
                  className="block font-serif text-xs font-bold uppercase text-ink mb-1.5"
                >
                  To confirm, type <span className="text-accent underline">RESTORE</span> in capital letters:
                </label>
                <input
                  id="input-confirm-restore"
                  type="text"
                  value={restoreConfirmInput}
                  onChange={(e) => setRestoreConfirmInput(e.target.value)}
                  placeholder="Type RESTORE to confirm"
                  className="w-full px-3 py-1.5 border-2 border-ink bg-paper font-mono text-xs uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-border">
                <button
                  type="button"
                  id="btn-cancel-restore"
                  disabled={isRestoring}
                  onClick={() => {
                    setRestoreTarget(null);
                    setRestoreConfirmInput('');
                  }}
                  className="px-3 py-1.5 border border-paper-border hover:border-ink bg-paper font-mono text-xs font-bold text-ink uppercase transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="btn-confirm-restore"
                  disabled={restoreConfirmInput !== 'RESTORE' || isRestoring}
                  onClick={handleConfirmRestore}
                  className="px-4 py-1.5 border-2 border-accent bg-accent text-paper hover:bg-accent-dark font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  {isRestoring ? 'Restoring Snapshot…' : 'Overwrite & Restore'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsMenu;

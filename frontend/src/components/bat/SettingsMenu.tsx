/**
 * frontend/src/components/bat/SettingsMenu.tsx
 * Screen (l): Desk Preferences & Settings Drawer (v2.0 Broadsheet).
 * Controls theme switching (Paper vs Night), wire polling intervals, alert thresholds,
 * sound effects, and retention auto-cleanup.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { AppSettings, ThemeMode } from '../../types';
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
} from 'lucide-react';
import { toast } from 'sonner';

export const SettingsMenu: React.FC = () => {
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const storeSettings = useAppStore((s) => s.settings);
  const updateStoreSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Local draft state for form edits
  const [formData, setFormData] = useState<AppSettings>(storeSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Sync draft state whenever settings drawer opens
  useEffect(() => {
    if (isSettingsOpen) {
      setFormData(storeSettings);
    }
  }, [isSettingsOpen, storeSettings]);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setSettingsOpen]);

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
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 bg-paper font-serif text-sm">
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
      </div>
    </div>
  );
};

export default SettingsMenu;

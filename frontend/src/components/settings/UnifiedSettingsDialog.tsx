/**
 * frontend/src/components/settings/UnifiedSettingsDialog.tsx
 * PRD C Category 3: Unified Desk Settings & Preferences Dialog (v3.0 Broadsheet).
 * Replaces old settings drawer with a large, focus-trapped, two-finger scrollable modal.
 * 11 Categorized Sections, Live Search, Autosave with "✓ Saved", Section Resets,
 * Restart-required badges, and sealed secret keys.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { AppSettings, TwoPassTelemetry } from '../../types';
import {
  Sliders,
  X,
  Sun,
  Moon,
  Database,
  RotateCcw,
  BookOpen,
  ZapOff,
  Sparkles,
  Download,
  Upload,
  AlertTriangle,
  RefreshCw,
  Search,
  Tv,
  Radio,
  Compass,
  Bell,
  Palette,
  Library,
  Terminal,
  Check,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { SecretsManagerSection } from './SecretsManagerSection';

interface BackupRecord {
  filename: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  trigger: 'daily' | 'migration' | 'manual' | 'pre-restore' | 'pre-upgrade';
}

export type SettingsSectionId =
  | 'general'
  | 'reading'
  | 'news_sources'
  | 'ai_plain'
  | 'tv'
  | 'map_globe'
  | 'alerts'
  | 'appearance'
  | 'data_backup'
  | 'library'
  | 'advanced';

interface SectionDefinition {
  id: SettingsSectionId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  keywords: string[];
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'general',
    title: 'General',
    subtitle: 'System clock, timezones and startup alerts',
    icon: Sliders,
    keywords: ['timezone', 'utc', 'local', 'clock', 'catchup', 'startup', 'alert', 'welcome'],
  },
  {
    id: 'reading',
    title: 'Reading',
    subtitle: 'Auto-advance, story strip follow, ticker and anchors',
    icon: BookOpen,
    keywords: ['auto-advance', 'interval', 'hover', 'pause', 'strip', 'follow', 'ticker', 'speed', 'evidence', 'highlight', 'reading mode'],
  },
  {
    id: 'news_sources',
    title: 'News and Sources',
    subtitle: 'Polling intervals, regional filters, and editorial categories',
    icon: Radio,
    keywords: ['refresh', 'interval', 'country', 'region', 'categories', 'sources', 'rss', 'gdelt', 'triage', 'threshold'],
  },
  {
    id: 'ai_plain',
    title: 'AI and Plain mode',
    subtitle: 'Plain mode (zero AI), two-pass triage, and token quotas',
    icon: ZapOff,
    keywords: ['plain', 'zero ai', 'two-pass', 'pass 1', 'pass 2', 'quota', 'tokens', 'summarize', 'unenriched', 'batch'],
  },
  {
    id: 'tv',
    title: 'TV Broadcasts',
    subtitle: 'Playback order, volume, stream health probes and mini-player',
    icon: Tv,
    keywords: ['tv', 'broadcast', 'youtube', 'hls', 'vlc', 'mute', 'volume', 'probe', 'health', 'stopped', 'mini-player', 'pip'],
  },
  {
    id: 'map_globe',
    title: 'Map & Globe',
    subtitle: 'Cartographic 3D globe, auto-rotation, wildlife pins and pulse rings',
    icon: Compass,
    keywords: ['map', 'globe', '3d', 'flat', 'rotate', 'autorotate', 'wildlife', 'pulse', 'rings', 'cartography'],
  },
  {
    id: 'alerts',
    title: 'Alerts & Audio',
    subtitle: 'Breaking thresholds, acoustic chime, and desktop notifications',
    icon: Bell,
    keywords: ['alerts', 'breaking', 'threshold', 'sound', 'audio', 'chime', 'browser', 'notifications'],
  },
  {
    id: 'appearance',
    title: 'Appearance',
    subtitle: 'Broadsheet Paper vs Night Edition, layout density and motion',
    icon: Palette,
    keywords: ['theme', 'paper', 'night', 'edition', 'density', 'compact', 'comfortable', 'motion', 'reduce motion', 'typography', 'font'],
  },
  {
    id: 'data_backup',
    title: 'Data & Backup',
    subtitle: 'Retention auto-cleanup, SQLite snapshots, and settings export/import',
    icon: Database,
    keywords: ['backup', 'snapshots', 'retention', 'cleanup', 'export', 'import', 'restore', 'sqlite', 'wal', 'storage'],
  },
  {
    id: 'library',
    title: 'Library',
    subtitle: 'Historical archives citation format and crisis helpline regions',
    icon: Library,
    keywords: ['library', 'citation', 'apa', 'chicago', 'helpline', 'crisis', 'support', 'wisdom', 'mind'],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Debug logs, clock skew compensation, and sealed credentials',
    icon: Terminal,
    keywords: ['advanced', 'debug', 'logging', 'clock sync', 'skew', 'api key', 'secret', 'gemini', 'groq', 'youtube', 'diagnostics'],
  },
];

const SECTION_DEFAULTS: Record<SettingsSectionId, Partial<AppSettings>> = {
  general: {
    timezone_mode: 'local',
    catchup_alert_enabled: true,
  },
  reading: {
    auto_advance_enabled: false,
    auto_advance_interval_sec: 7,
    auto_advance_pause_on_hover: true,
    strip_follow_enabled: true,
    strip_follow_grace_sec: 4,
    ticker_speed: 'normal',
    evidence_highlight_enabled: true,
    reading_mode_enabled: true,
    gallery_bend: 2.5,
    gallery_item_size: 0.72,
    gallery_item_aspect: 2.0,
    gallery_scroll_speed: 1.8,
    gallery_scroll_ease: 0.08,
    gallery_wave: 0.2,
    gallery_fade_edges: 0.18,
    gallery_gap: 0.18,
    gallery_border_radius: 0.04,
    gallery_shadow: 0.25,
    gallery_grayscale: false,
    gallery_auto_scroll: 0,
    gallery_auto_drop_delay: 2.5,
  },
  news_sources: {
    refresh_interval_minutes: 15,
    live_refresh_interval_sec: 5,
    default_country_filter: '',
    category_filter_list: 'all',
    pass2_threshold: 75,
  },
  ai_plain: {
    plain_mode_enabled: false,
    two_pass_ai_enabled: true,
    enrich_batch_size: 20,
  },
  tv: {
    tv_method_order: 'youtube,hls,vlc',
    tv_autoplay_muted: true,
    tv_volume: 0.8,
    tv_health_interval_min: 30,
    tv_stopped_fail_threshold: 5,
    tv_mini_player_enabled: false,
  },
  map_globe: {
    map_engine: 'globe',
    globe_autorotate: true,
    map_wildlife_layer: true,
    map_pulse_enabled: true,
  },
  alerts: {
    alert_threshold: 75,
    sound_enabled: true,
    browser_notifications: false,
  },
  appearance: {
    theme: 'paper',
    layout_density: 'comfortable',
    reduce_motion_override: 'system',
  },
  data_backup: {
    auto_cleanup_enabled: false,
    retention_days: 30,
  },
  library: {
    library_citation_format: 'apa',
    helpline_default_region: 'all',
  },
  advanced: {
    debug_logging: false,
    clock_sync_enabled: true,
  },
};

export const UnifiedSettingsDialog: React.FC<{
  forceOpen?: boolean;
  initialSection?: SettingsSectionId;
}> = ({ forceOpen, initialSection }) => {
  const storeSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const isSettingsOpen = forceOpen ?? storeSettingsOpen;
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const storeSettings = useAppStore((s) => s.settings);
  const updateStoreSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Active section & search
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection ?? 'general');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Backup & Two-Pass State
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [twoPassTelemetry, setTwoPassTelemetry] = useState<TwoPassTelemetry | null>(null);
  const [unenrichedCount, setUnenrichedCount] = useState<number>(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounced autosave ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger autosave to backend and store
  const saveSetting = useCallback(
    (updates: Partial<AppSettings>) => {
      setIsSaving(true);
      updateStoreSettings(updates);
      setLastSavedTime(Date.now());

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(false);
      }, 2500);
    },
    [updateStoreSettings]
  );

  // Reset current section to defaults
  const handleResetSection = () => {
    const currentSectionDef = SECTIONS.find((s) => s.id === activeSection);
    const label = currentSectionDef ? currentSectionDef.title : 'this section';
    if (window.confirm(`Reset all ${label} preferences to factory defaults?`)) {
      const defaults = SECTION_DEFAULTS[activeSection];
      saveSetting(defaults);
      toast.info(`${label} reset to defaults.`);
    }
  };

  // Keyboard navigation & Focus trap
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setSettingsOpen]);

  // Load telemetry and backups when open
  useEffect(() => {
    if (isSettingsOpen) {
      // Focus search on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      // Fetch backups & telemetry
      const fetchAuxData = async () => {
        try {
          const [telRes, unenrichedRes, backupsRes] = await Promise.all([
            fetch('/api/settings/two-pass-telemetry'),
            fetch('/api/settings/unenriched-count'),
            fetch('/api/backups'),
          ]);
          if (telRes.ok) setTwoPassTelemetry(await telRes.json());
          if (unenrichedRes.ok) {
            const data = await unenrichedRes.json();
            setUnenrichedCount(data.count ?? 0);
          }
          if (backupsRes.ok) {
            const data = await backupsRes.json();
            setBackups(data.backups ?? []);
          }
        } catch {
          // offline safe
        }
      };
      fetchAuxData();
    }
  }, [isSettingsOpen]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return SECTIONS;
    return SECTIONS.filter(
      (sec) =>
        sec.title.toLowerCase().includes(query) ||
        sec.subtitle.toLowerCase().includes(query) ||
        sec.keywords.some((k) => k.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Catch-Up Summarize Batch
  const handleSummarizeBatch = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/settings/summarize-unenriched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: storeSettings.enrich_batch_size || 20 }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Catch-up enriched ${result.summarized_count} articles.`);
        const cRes = await fetch('/api/settings/unenriched-count');
        if (cRes.ok) {
          const cData = await cRes.json();
          setUnenrichedCount(cData.count ?? 0);
        }
      } else {
        toast.error('Failed to summarize batch.');
      }
    } catch {
      toast.error('Network error during catch-up enrichment.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Manual Backup Creation
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Backup snapshot created: ${data.backup?.filename || 'Snapshot'}`);
        // Refresh backups
        const bRes = await fetch('/api/backups');
        if (bRes.ok) {
          const bData = await bRes.json();
          setBackups(bData.backups ?? []);
        }
      } else {
        toast.error('Failed to create manual backup.');
      }
    } catch {
      toast.error('Network error creating backup.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore Backup
  const handleExecuteRestore = async () => {
    if (!restoreTarget || restoreConfirmInput !== 'RESTORE') {
      toast.error('Please type RESTORE exactly to confirm.');
      return;
    }
    setIsRestoring(true);
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: restoreTarget.filename, confirmation: 'RESTORE' }),
      });
      if (res.ok) {
        toast.success('Database restored successfully! Reloading...');
        setRestoreTarget(null);
        setRestoreConfirmInput('');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Restore failed.');
      }
    } catch {
      toast.error('Network error during database restore.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Export Settings JSON
  const handleExportSettings = async () => {
    try {
      const res = await fetch('/api/settings/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-news-desk-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Settings exported successfully (API keys sealed).');
      }
    } catch {
      toast.error('Failed to export settings.');
    }
  };

  // Import Settings JSON
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.applied_keys?.length || 0} settings successfully.`);
        if (data.settings) {
          updateStoreSettings(data.settings);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Import rejected.');
      }
    } catch {
      toast.error('Invalid settings JSON format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div
      id="unified-settings-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        id="unified-settings-dialog"
        className="w-full max-w-5xl h-[88vh] max-h-[820px] bg-[var(--color-paper-card,#fbf9f4)] text-[var(--color-ink,#111827)] rounded-none border-2 border-[var(--color-ink,#111827)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-serif"
      >
        {/* Broadsheet Masthead Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b-2 border-[var(--color-ink,#111827)] bg-[var(--color-paper-card,#f4efe6)] select-none">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] rounded-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="settings-dialog-title"
                className="font-black text-lg uppercase tracking-wider leading-none"
              >
                DESK SETTINGS & PREFERENCES
              </h2>
              <p className="font-sans text-[11px] text-[var(--color-ink-muted,#6b7280)] mt-0.5">
                Local system configuration & operational controls • Press Esc to close
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-settings"
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 hover:bg-[var(--color-ink,#111827)]/10 text-[var(--color-ink,#111827)] rounded-xs transition-colors cursor-pointer"
              title="Close settings (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dialog Body (Split: Left Rail + Right Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Rail */}
          <aside className="w-64 border-r border-[var(--color-ink-border,#d1d5db)] flex flex-col bg-[var(--color-paper-card,#f7f4ed)] select-none">
            {/* Search Input */}
            <div className="p-3 border-b border-[var(--color-ink-border,#d1d5db)]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted,#6b7280)]" />
                <input
                  ref={searchInputRef}
                  id="settings-search-input"
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs font-sans bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs focus:outline-none focus:border-[var(--color-ink,#111827)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted,#6b7280)] hover:text-[var(--color-ink,#111827)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Section Item List */}
            <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5 font-sans text-xs">
              {filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    id={`btn-settings-section-${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] font-semibold shadow-xs'
                        : 'text-[var(--color-ink,#111827)] hover:bg-[var(--color-ink,#111827)]/10 font-normal'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-paper-card,#f4efe6)]' : 'text-[var(--color-ink-muted,#6b7280)]'}`} />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="p-4 text-center text-xs text-[var(--color-ink-muted,#6b7280)] font-sans italic">
                  No matching settings found.
                </div>
              )}
            </nav>

            {/* Section Reset Button at Bottom Left */}
            <div className="p-3 border-t border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper-card,#f4efe6)]">
              <button
                id="btn-settings-reset-section"
                onClick={handleResetSection}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-sans font-medium text-[var(--color-ink-muted,#6b7280)] hover:text-[var(--color-ink,#111827)] border border-[var(--color-ink-border,#d1d5db)] hover:border-[var(--color-ink,#111827)] rounded-xs transition-colors cursor-pointer"
                title="Reset current section to defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Section to Defaults</span>
              </button>
            </div>
          </aside>

          {/* Right Content Pane (Two-Finger Scrollable) */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-paper,#fff)]">
            <div
              id="settings-content-scrollable-area"
              className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
            >
              {/* Section Header */}
              {SECTIONS.find((s) => s.id === activeSection) && (
                <div className="border-b border-[var(--color-ink-border,#d1d5db)] pb-3">
                  <h3 className="text-xl font-bold uppercase tracking-tight text-[var(--color-ink,#111827)]">
                    {SECTIONS.find((s) => s.id === activeSection)?.title}
                  </h3>
                  <p className="font-sans text-xs text-[var(--color-ink-muted,#6b7280)] mt-0.5">
                    {SECTIONS.find((s) => s.id === activeSection)?.subtitle}
                  </p>
                </div>
              )}

              {/* ─── 1. GENERAL SECTION ─── */}
              {activeSection === 'general' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Timezone Mode */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">System Timezone Display</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Choose whether dispatches render in your local browser timezone or standard UTC.
                      </div>
                    </div>
                    <select
                      id="select-timezone-mode"
                      value={storeSettings.timezone_mode || 'local'}
                      onChange={(e) => saveSetting({ timezone_mode: e.target.value as 'local' | 'utc' })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="local">Local Browser Time</option>
                      <option value="utc">Universal Coordinated Time (UTC)</option>
                    </select>
                  </div>

                  {/* Startup Catchup Alert */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Startup Welcome & Catch-up Card</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Displays missed dispatch summary if the app was closed for 5+ minutes.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-catchup-alert"
                        type="checkbox"
                        checked={storeSettings.catchup_alert_enabled ?? true}
                        onChange={(e) => saveSetting({ catchup_alert_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>
                </div>
              )}

              {/* ─── 2. READING DESK SECTION ─── */}
              {activeSection === 'reading' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Auto-Advance Ambient Reading */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Auto-Advance Ambient Reading</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Automatically cycles to the next news dispatch every N seconds.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-auto-advance"
                        type="checkbox"
                        checked={storeSettings.auto_advance_enabled ?? false}
                        onChange={(e) => saveSetting({ auto_advance_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Auto-Advance Interval Slider */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Auto-Advance Interval (Seconds)</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Reading cadence before advancing (3 to 60 seconds).
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.auto_advance_interval_sec || 7}s
                      </span>
                    </div>
                    <input
                      id="slider-auto-advance-interval"
                      type="range"
                      min={3}
                      max={60}
                      step={1}
                      value={storeSettings.auto_advance_interval_sec || 7}
                      onChange={(e) => saveSetting({ auto_advance_interval_sec: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Pause on Reader Hover */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Pause Timer on Article Hover</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Suspends countdown while cursor is over the active reader pane.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-pause-on-hover"
                        type="checkbox"
                        checked={storeSettings.auto_advance_pause_on_hover ?? true}
                        onChange={(e) => saveSetting({ auto_advance_pause_on_hover: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Follow Current Story in Strip (PRD C Cat 4) */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Follow Current Story in Wire Strip</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Smoothly centers the active card in the bottom card strip as news advances.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-strip-follow"
                        type="checkbox"
                        checked={storeSettings.strip_follow_enabled ?? true}
                        onChange={(e) => saveSetting({ strip_follow_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Follow Scroll Grace Period Slider */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">User-Scroll Grace Period (Seconds)</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Grace period after two-finger trackpad drag before auto-following resumes (2s to 15s).
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.strip_follow_grace_sec || 4}s
                      </span>
                    </div>
                    <input
                      id="slider-strip-follow-grace"
                      type="range"
                      min={2}
                      max={15}
                      step={1}
                      value={storeSettings.strip_follow_grace_sec || 4}
                      onChange={(e) => saveSetting({ strip_follow_grace_sec: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Ticker Scroll Speed */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Breaking News Ticker Speed</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Controls marquee animation pace in the bottom wire ticker.
                      </div>
                    </div>
                    <select
                      id="select-ticker-speed"
                      value={storeSettings.ticker_speed || 'normal'}
                      onChange={(e) => saveSetting({ ticker_speed: e.target.value as 'slow' | 'normal' | 'fast' })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="slow">Slow Cadence</option>
                      <option value="normal">Standard Broadsheet</option>
                      <option value="fast">Fast Wire</option>
                    </select>
                  </div>

                  {/* Evidence Highlighting */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Verbatim Evidence Highlighting</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Highlights exact source quotes corresponding to active summary claims.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-evidence-highlight"
                        type="checkbox"
                        checked={storeSettings.evidence_highlight_enabled ?? true}
                        onChange={(e) => saveSetting({ evidence_highlight_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* React Bits CircularGallery Orbit Tuning */}
                  <div className="p-4 rounded-lg border-2 border-[var(--color-ink-border,#e5e7eb)] bg-[var(--color-paper-card,#f4efe6)]/60 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm font-serif flex items-center gap-1.5">
                          <Compass size={14} className="text-accent" />
                          <span>Orbit Wire Gallery Tuning (React Bits 3D)</span>
                        </div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Complete 3D cylindrical geometry, card scaling, inertia, auto-stow delay, and visual controls for the bottom dispatch dock.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          saveSetting({
                            gallery_bend: 2.5,
                            gallery_item_size: 0.72,
                            gallery_item_aspect: 2.0,
                            gallery_scroll_speed: 1.8,
                            gallery_scroll_ease: 0.08,
                            gallery_wave: 0.2,
                            gallery_fade_edges: 0.18,
                            gallery_gap: 0.18,
                            gallery_border_radius: 0.04,
                            gallery_shadow: 0.25,
                            gallery_grayscale: false,
                            gallery_auto_scroll: 0,
                            gallery_auto_drop_delay: 2.5,
                          });
                          toast.success('Gallery reset to broadsheet defaults');
                        }}
                        className="px-2 py-1 text-[10px] font-mono border border-[var(--color-ink-border,#d1d5db)] hover:border-ink rounded-xs bg-paper text-ink-muted hover:text-ink transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reset 3D Gallery to broadsheet defaults"
                      >
                        <RotateCcw size={10} />
                        <span>Reset Defaults</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Arc Curvature (Bend) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Arc Bend (Curvature)</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_bend ?? 2.5}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-bend"
                          type="range"
                          min={-4}
                          max={5}
                          step={0.5}
                          value={storeSettings.gallery_bend ?? 2.5}
                          onChange={(e) => saveSetting({ gallery_bend: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Inverted (-3)</span>
                          <span>Flat (0)</span>
                          <span>Standard (2.5)</span>
                          <span>Deep (5)</span>
                        </div>
                      </div>

                      {/* Card Scale (Item Size) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Card Height Scale</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_item_size ?? 0.72}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-size"
                          type="range"
                          min={0.3}
                          max={1.3}
                          step={0.02}
                          value={storeSettings.gallery_item_size ?? 0.72}
                          onChange={(e) => saveSetting({ gallery_item_size: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Compact (0.4)</span>
                          <span>Default (0.72)</span>
                          <span>Prominent (1.1)</span>
                        </div>
                      </div>

                      {/* Card Aspect Ratio */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Card Aspect Ratio</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_item_aspect ?? 2.0}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-aspect"
                          type="range"
                          min={1.0}
                          max={2.8}
                          step={0.1}
                          value={storeSettings.gallery_item_aspect ?? 2.0}
                          onChange={(e) => saveSetting({ gallery_item_aspect: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Square (1.0)</span>
                          <span>Broadsheet (2.0)</span>
                          <span>Wide Ticker (2.8)</span>
                        </div>
                      </div>

                      {/* Card Spacing (Gap) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Card Spacing (Gap)</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_gap ?? 0.18}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-gap"
                          type="range"
                          min={0.05}
                          max={0.5}
                          step={0.01}
                          value={storeSettings.gallery_gap ?? 0.18}
                          onChange={(e) => saveSetting({ gallery_gap: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Tight (0.08)</span>
                          <span>Standard (0.18)</span>
                          <span>Airy (0.4)</span>
                        </div>
                      </div>

                      {/* Card Corner Radius */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Card Corner Radius</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_border_radius ?? 0.04}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-radius"
                          type="range"
                          min={0.0}
                          max={0.2}
                          step={0.01}
                          value={storeSettings.gallery_border_radius ?? 0.04}
                          onChange={(e) => saveSetting({ gallery_border_radius: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Sharp (0.0)</span>
                          <span>Slight (0.04)</span>
                          <span>Curved (0.15)</span>
                        </div>
                      </div>

                      {/* Scroll Fluidity (Scroll Ease) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Scroll Damping (Fluidity)</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_scroll_ease ?? 0.08}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-ease"
                          type="range"
                          min={0.01}
                          max={0.25}
                          step={0.01}
                          value={storeSettings.gallery_scroll_ease ?? 0.08}
                          onChange={(e) => saveSetting({ gallery_scroll_ease: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Floaty (0.03)</span>
                          <span>Smooth (0.08)</span>
                          <span>Instant (0.2)</span>
                        </div>
                      </div>

                      {/* Scroll / Drag Speed */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Scroll & Drag Speed</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_scroll_speed ?? 1.8}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-speed"
                          type="range"
                          min={0.5}
                          max={4.0}
                          step={0.1}
                          value={storeSettings.gallery_scroll_speed ?? 1.8}
                          onChange={(e) => saveSetting({ gallery_scroll_speed: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Gentle (1.0)</span>
                          <span>Standard (1.8)</span>
                          <span>Swift (3.2)</span>
                        </div>
                      </div>

                      {/* Motion Wave Ripple */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Motion Wave Ripple</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_wave ?? 0.2}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-wave"
                          type="range"
                          min={0.0}
                          max={1.0}
                          step={0.05}
                          value={storeSettings.gallery_wave ?? 0.2}
                          onChange={(e) => saveSetting({ gallery_wave: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Flat (0.0)</span>
                          <span>Subtle (0.2)</span>
                          <span>Dynamic (0.6)</span>
                        </div>
                      </div>

                      {/* Edge Fade */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Flank Edge Fade</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_fade_edges ?? 0.18}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-fade"
                          type="range"
                          min={0.0}
                          max={0.4}
                          step={0.02}
                          value={storeSettings.gallery_fade_edges ?? 0.18}
                          onChange={(e) => saveSetting({ gallery_fade_edges: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>None (0.0)</span>
                          <span>Standard (0.18)</span>
                          <span>Deep Vignette (0.35)</span>
                        </div>
                      </div>

                      {/* Drop Shadow */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Card Drop Shadow</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_shadow ?? 0.25}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-shadow"
                          type="range"
                          min={0.0}
                          max={0.8}
                          step={0.05}
                          value={storeSettings.gallery_shadow ?? 0.25}
                          onChange={(e) => saveSetting({ gallery_shadow: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Flat Print (0.0)</span>
                          <span>Standard (0.25)</span>
                          <span>Deep Elevation (0.6)</span>
                        </div>
                      </div>

                      {/* Auto-Scroll Drift */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Automatic Drift (Auto-Scroll)</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_auto_scroll ?? 0}
                          </span>
                        </div>
                        <input
                          id="slider-gallery-autoscroll"
                          type="range"
                          min={0.0}
                          max={1.0}
                          step={0.05}
                          value={storeSettings.gallery_auto_scroll ?? 0}
                          onChange={(e) => saveSetting({ gallery_auto_scroll: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Off (0)</span>
                          <span>Slow Drift (0.2)</span>
                          <span>Steady (0.6)</span>
                        </div>
                      </div>

                      {/* Dock Auto-Stow Idle Delay */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs font-serif">Dock Auto-Stow Delay</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-paper border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                            {storeSettings.gallery_auto_drop_delay ?? 2.5}s
                          </span>
                        </div>
                        <input
                          id="slider-gallery-autodrop"
                          type="range"
                          min={1.0}
                          max={7.0}
                          step={0.5}
                          value={storeSettings.gallery_auto_drop_delay ?? 2.5}
                          onChange={(e) => saveSetting({ gallery_auto_drop_delay: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                          <span>Fast (1.0s)</span>
                          <span>Standard (2.5s)</span>
                          <span>Relaxed (7.0s)</span>
                        </div>
                      </div>

                      {/* Inactive Cards Grayscale */}
                      <div className="flex items-center justify-between p-2 rounded border border-[var(--color-ink-border,#d1d5db)] bg-paper/50">
                        <div>
                          <div className="font-semibold text-xs font-serif">Mute Inactive Cards</div>
                          <div className="text-[10px] text-ink-muted">Show flanking cards in monochrome ink</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={storeSettings.gallery_grayscale ?? false}
                            onChange={(e) => saveSetting({ gallery_grayscale: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── 3. NEWS AND SOURCES SECTION ─── */}
              {activeSection === 'news_sources' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Refresh Polling Interval */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm font-serif">News Wire Polling Interval</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs uppercase tracking-wider font-semibold">
                            Restart Required for Scheduler
                          </span>
                        </div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Minutes between background RSS & GDELT wire syncs (1 to 60 minutes).
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.refresh_interval_minutes || 15}m
                      </span>
                    </div>
                    <input
                      id="slider-refresh-interval"
                      type="range"
                      min={1}
                      max={60}
                      step={1}
                      value={storeSettings.refresh_interval_minutes || 15}
                      onChange={(e) => saveSetting({ refresh_interval_minutes: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Live Refresh Batch Interval */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <div>
                        <div className="font-semibold text-sm font-serif">Live refresh interval</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Batches incoming live wire updates (2s to 30s, default 5s). Feed counter &amp; gap chip update instantly.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          id="value-live-refresh-interval"
                          className="font-mono text-sm font-bold tabular-nums px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs"
                        >
                          {storeSettings.live_refresh_interval_sec ?? 5}s
                        </span>
                        <button
                          id="btn-reset-live-refresh"
                          type="button"
                          onClick={() => saveSetting({ live_refresh_interval_sec: 5 })}
                          disabled={(storeSettings.live_refresh_interval_sec ?? 5) === 5}
                          className="px-2 py-0.5 text-[11px] font-mono border border-[var(--color-ink-border,#d1d5db)] rounded-xs bg-[var(--color-paper,#fff)] hover:border-ink disabled:opacity-45 cursor-pointer disabled:cursor-default transition-colors"
                        >
                          Reset to default
                        </button>
                      </div>
                    </div>
                    <input
                      id="slider-live-refresh-interval"
                      type="range"
                      min={2}
                      max={30}
                      step={1}
                      value={storeSettings.live_refresh_interval_sec ?? 5}
                      onChange={(e) => saveSetting({ live_refresh_interval_sec: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Startup Country Focus */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Default Startup Region / Country</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Pre-selects country wire feed on desk boot.
                      </div>
                    </div>
                    <select
                      id="select-country-filter"
                      value={storeSettings.default_country_filter || ''}
                      onChange={(e) => saveSetting({ default_country_filter: e.target.value })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="">Global Wire (All Countries)</option>
                      <option value="IN">India (IN)</option>
                      <option value="US">United States (US)</option>
                      <option value="CN">China (CN)</option>
                      <option value="JP">Japan (JP)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="FR">France (FR)</option>
                    </select>
                  </div>

                  {/* Two-Pass Triage Threshold */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Two-Pass AI Triage Threshold</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Minimum urgency score (50-100) required to trigger Pass 2 full summarization.
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.pass2_threshold || 75}
                      </span>
                    </div>
                    <input
                      id="slider-pass2-threshold"
                      type="range"
                      min={50}
                      max={100}
                      step={1}
                      value={storeSettings.pass2_threshold || 75}
                      onChange={(e) => saveSetting({ pass2_threshold: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Link to Source Desk */}
                  <div className="p-3 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs font-serif">Editorial Source Roster</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Configure 24 global wire agencies, custom RSS feeds, and scraping cadences.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        useAppStore.getState().setSourcesOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] text-xs font-medium rounded-xs hover:bg-[var(--color-ink,#111827)]/90 transition-colors cursor-pointer"
                    >
                      <span>Manage Sources</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── 4. AI AND PLAIN MODE SECTION ─── */}
              {activeSection === 'ai_plain' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* In-App Secrets Manager (PRD E Category 11) */}
                  <SecretsManagerSection />

                  {/* Plain Mode Switch */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Plain Mode (Zero AI Engine)</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Completely disables external LLM API calls. Reads full wire dispatches with rule-based heuristics.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-plain-mode"
                        type="checkbox"
                        checked={storeSettings.plain_mode_enabled ?? false}
                        onChange={(e) => saveSetting({ plain_mode_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
                    </label>
                  </div>

                  {/* Two-Pass AI Ingestion Engine */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Two-Pass AI Ingestion & Quota Guard</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Batches Pass 1 triage scoring to conserve ~740 LLM tokens per non-critical article.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-two-pass-ai"
                        type="checkbox"
                        checked={storeSettings.two_pass_ai_enabled ?? true}
                        onChange={(e) => saveSetting({ two_pass_ai_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Quota Telemetry Scorecard */}
                  {twoPassTelemetry && (
                    <div className="p-4 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-[var(--color-ink-border,#d1d5db)] pb-1.5">
                        <span className="font-serif font-bold text-xs uppercase tracking-wide">
                          AI Token Quota Telemetry
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-ink-muted,#6b7280)]">
                          Pass 2 Threshold: {twoPassTelemetry.pass2_threshold}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono">
                        <div className="p-2 bg-[var(--color-paper,#fff)] border border-[var(--color-ink-border,#e5e7eb)] rounded-xs">
                          <div className="text-sm font-bold">{twoPassTelemetry.pass1_count}</div>
                          <div className="text-[10px] text-[var(--color-ink-muted,#6b7280)] font-sans">Pass 1 Triaged</div>
                        </div>
                        <div className="p-2 bg-[var(--color-paper,#fff)] border border-[var(--color-ink-border,#e5e7eb)] rounded-xs">
                          <div className="text-sm font-bold text-amber-600">{twoPassTelemetry.pass2_count}</div>
                          <div className="text-[10px] text-[var(--color-ink-muted,#6b7280)] font-sans">Pass 2 Full</div>
                        </div>
                        <div className="p-2 bg-[var(--color-paper,#fff)] border border-[var(--color-ink-border,#e5e7eb)] rounded-xs">
                          <div className="text-sm font-bold text-emerald-600">{twoPassTelemetry.pass2_skipped_count}</div>
                          <div className="text-[10px] text-[var(--color-ink-muted,#6b7280)] font-sans">Pass 2 Saved</div>
                        </div>
                        <div className="p-2 bg-[var(--color-paper,#fff)] border border-[var(--color-ink-border,#e5e7eb)] rounded-xs">
                          <div className="text-sm font-bold text-blue-600">
                            {(twoPassTelemetry.estimated_tokens_saved / 1000).toFixed(1)}k
                          </div>
                          <div className="text-[10px] text-[var(--color-ink-muted,#6b7280)] font-sans">Tokens Conserved</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Catch-Up Summarize Batch */}
                  <div className="p-3 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs font-serif">Catch-Up Summarization</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        {unenrichedCount > 0
                          ? `${unenrichedCount} dispatches ingested without AI summaries.`
                          : 'All current news dispatches have been enriched.'}
                      </div>
                    </div>
                    <button
                      onClick={handleSummarizeBatch}
                      disabled={isSummarizing || unenrichedCount === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] text-xs font-medium rounded-xs hover:bg-[var(--color-ink,#111827)]/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSummarizing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Summarizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Summarize Batch ({storeSettings.enrich_batch_size || 20})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── 5. TV BROADCASTS SECTION ─── */}
              {activeSection === 'tv' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Preferred Playback Method Order */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Default Playback Method Sequence</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Order of stream resolution attempts for world news channels.
                      </div>
                    </div>
                    <select
                      id="select-tv-method-order"
                      value={storeSettings.tv_method_order || 'youtube,hls,vlc'}
                      onChange={(e) => saveSetting({ tv_method_order: e.target.value })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="youtube,hls,vlc">YouTube → HLS Proxy → External VLC</option>
                      <option value="hls,youtube,vlc">HLS Proxy → YouTube → External VLC</option>
                      <option value="youtube,vlc">YouTube Only (Fallback VLC)</option>
                    </select>
                  </div>

                  {/* Autoplay Muted */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Start Autoplay Muted</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Starts video muted on desk channel switches to comply with browser audio policies.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-tv-autoplay-muted"
                        type="checkbox"
                        checked={storeSettings.tv_autoplay_muted ?? true}
                        onChange={(e) => saveSetting({ tv_autoplay_muted: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Remembered Audio Volume */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Remembered Audio Volume</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Persistent volume level remembered across restarts.
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {Math.round((storeSettings.tv_volume ?? 0.8) * 100)}%
                      </span>
                    </div>
                    <input
                      id="slider-tv-volume"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round((storeSettings.tv_volume ?? 0.8) * 100)}
                      onChange={(e) => saveSetting({ tv_volume: parseInt(e.target.value, 10) / 100 })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Stream Health-Check Interval */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Stream Probe Interval (Minutes)</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Frequency of automated background probes of HLS and YouTube links (5 to 180 min).
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.tv_health_interval_min || 30}m
                      </span>
                    </div>
                    <input
                      id="slider-tv-health-interval"
                      type="range"
                      min={5}
                      max={180}
                      step={5}
                      value={storeSettings.tv_health_interval_min || 30}
                      onChange={(e) => saveSetting({ tv_health_interval_min: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Stopped Links Fail Threshold */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Auto-Stopped Fail Threshold</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Consecutive failed health probes before a channel is moved to Stopped Links.
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.tv_stopped_fail_threshold || 5} fails
                      </span>
                    </div>
                    <input
                      id="slider-tv-stopped-threshold"
                      type="range"
                      min={2}
                      max={20}
                      step={1}
                      value={storeSettings.tv_stopped_fail_threshold || 5}
                      onChange={(e) => saveSetting({ tv_stopped_fail_threshold: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Floating Mini-Player (PRD C S4) */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">TV Floating Mini-Player (PiP)</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Keeps news channel playing in a draggable bottom-right mini frame when switching away from TV desk.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-tv-mini-player"
                        type="checkbox"
                        checked={storeSettings.tv_mini_player_enabled ?? false}
                        onChange={(e) => saveSetting({ tv_mini_player_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>
                </div>
              )}

              {/* ─── 6. MAP & GLOBE SECTION ─── */}
              {activeSection === 'map_globe' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Cartographic Engine */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Cartographic Visualization Engine</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Switch between the new 3D Interactive WebGL Globe and the lightweight 2D Flat Map.
                      </div>
                    </div>
                    <select
                      id="select-map-engine"
                      value={storeSettings.map_engine || 'globe'}
                      onChange={(e) => saveSetting({ map_engine: e.target.value as 'globe' | 'flat' })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="globe">3D Interactive Globe (react-globe.gl)</option>
                      <option value="flat">2D Mercator Flat Map (SimpleMap)</option>
                    </select>
                  </div>

                  {/* Ambient Auto-Rotation */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Globe Ambient Auto-Rotation</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Slowly rotates globe when not interacting; pauses automatically on hover or drag.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-globe-autorotate"
                        type="checkbox"
                        checked={storeSettings.globe_autorotate ?? true}
                        onChange={(e) => saveSetting({ globe_autorotate: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Wildlife Overlay Layer */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Wildlife Crisis & Sanctuary Pins</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Plots crimson marker pins and coordinates for wildlife dispatches.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-map-wildlife"
                        type="checkbox"
                        checked={storeSettings.map_wildlife_layer ?? true}
                        onChange={(e) => saveSetting({ map_wildlife_layer: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Story Pulse Rings */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">New Arrival Pulse Rings</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Radiates subtle concentric rings over locations of dispatches arrived in the last 5 minutes.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-map-pulse"
                        type="checkbox"
                        checked={storeSettings.map_pulse_enabled ?? true}
                        onChange={(e) => saveSetting({ map_pulse_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>
                </div>
              )}

              {/* ─── 7. ALERTS & AUDIO SECTION ─── */}
              {activeSection === 'alerts' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Breaking Alert Threshold */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Breaking Alert Urgency Threshold</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Minimum editorial score (0-100) to trigger the crimson banner and audio alert.
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.alert_threshold || 75}
                      </span>
                    </div>
                    <input
                      id="slider-alert-threshold"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={storeSettings.alert_threshold || 75}
                      onChange={(e) => saveSetting({ alert_threshold: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Broadsheet Acoustic Sound Effects</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Plays subtle mechanical typewriter and telegraph chimes on breaking alerts and switches.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-sound-effects"
                        type="checkbox"
                        checked={storeSettings.sound_enabled ?? true}
                        onChange={(e) => saveSetting({ sound_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Desktop Browser Notifications */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Desktop System Notifications</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Triggers OS-level notifications for major breaking global dispatches.
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (typeof window !== 'undefined' && 'Notification' in window) {
                          const perm = await Notification.requestPermission();
                          saveSetting({ browser_notifications: perm === 'granted' });
                          if (perm === 'granted') toast.success('Desktop notifications enabled.');
                          else toast.error('Notification permission denied.');
                        }
                      }}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] hover:border-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      {storeSettings.browser_notifications ? 'Enabled' : 'Request Permission'}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── 8. APPEARANCE & TYPOGRAPHY SECTION ─── */}
              {activeSection === 'appearance' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Theme Switch */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Broadsheet Edition Theme</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Paper Edition (warm daylight broadsheet) or Night Edition (high contrast ink).
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        id="btn-theme-paper"
                        onClick={() => {
                          setTheme('paper');
                          saveSetting({ theme: 'paper' });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs cursor-pointer ${
                          theme === 'paper'
                            ? 'bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] border-[var(--color-ink,#111827)] font-bold'
                            : 'border-[var(--color-ink-border,#d1d5db)] hover:bg-gray-100 text-[var(--color-ink,#111827)]'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Paper Edition</span>
                      </button>
                      <button
                        id="btn-theme-night"
                        onClick={() => {
                          setTheme('night');
                          saveSetting({ theme: 'night' });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs cursor-pointer ${
                          theme === 'night'
                            ? 'bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] border-[var(--color-ink,#111827)] font-bold'
                            : 'border-[var(--color-ink-border,#d1d5db)] hover:bg-gray-100 text-[var(--color-ink,#111827)]'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Night Edition</span>
                      </button>
                    </div>
                  </div>

                  {/* Layout Density */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Desk Layout Density</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Adjusts padding and spacing across article cards and sidebars.
                      </div>
                    </div>
                    <select
                      id="select-layout-density"
                      value={storeSettings.layout_density || 'comfortable'}
                      onChange={(e) => saveSetting({ layout_density: e.target.value as 'comfortable' | 'compact' })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="comfortable">Comfortable Broadsheet</option>
                      <option value="compact">Compact Wire Terminal</option>
                    </select>
                  </div>

                  {/* Motion Rules */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Animation & Motion Override</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Honors system reduce-motion preferences or enforces instant jump cuts.
                      </div>
                    </div>
                    <select
                      id="select-reduce-motion"
                      value={storeSettings.reduce_motion_override || 'system'}
                      onChange={(e) => saveSetting({ reduce_motion_override: e.target.value as 'system' | 'reduce' | 'allow' })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="system">Follow System Setting</option>
                      <option value="reduce">Force Reduced Motion (Instant jumps)</option>
                      <option value="allow">Allow All Animations</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ─── 9. DATA, BACKUPS & STORAGE SECTION ─── */}
              {activeSection === 'data_backup' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Auto-Cleanup Switch */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Automated Database Retention Cleanup</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Purges unbookmarked dispatches older than retention threshold during daily maintenance.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-auto-cleanup"
                        type="checkbox"
                        checked={storeSettings.auto_cleanup_enabled ?? false}
                        onChange={(e) => saveSetting({ auto_cleanup_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Retention Period Slider */}
                  <div className="py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="font-semibold text-sm font-serif">Retention Period (Days)</div>
                        <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                          Archive retention threshold before purge (7 to 365 days).
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs">
                        {storeSettings.retention_days || 30} days
                      </span>
                    </div>
                    <input
                      id="slider-retention-days"
                      type="range"
                      min={7}
                      max={365}
                      step={1}
                      value={storeSettings.retention_days || 30}
                      onChange={(e) => saveSetting({ retention_days: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--color-ink,#111827)] cursor-pointer"
                    />
                  </div>

                  {/* Manual Snapshot & Export/Import Controls */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      id="btn-create-manual-backup"
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-ink,#111827)] text-[var(--color-paper-card,#f4efe6)] rounded-xs hover:bg-[var(--color-ink,#111827)]/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isCreatingBackup ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Snapshot...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          <span>Create Snapshot Now</span>
                        </>
                      )}
                    </button>

                    <button
                      id="btn-export-settings"
                      onClick={handleExportSettings}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-ink-border,#d1d5db)] hover:border-[var(--color-ink,#111827)] text-[var(--color-ink,#111827)] rounded-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Settings JSON</span>
                    </button>

                    <label
                      id="btn-import-settings-label"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-ink-border,#d1d5db)] hover:border-[var(--color-ink,#111827)] text-[var(--color-ink,#111827)] rounded-xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import Settings JSON</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Backups List Table */}
                  <div className="border border-[var(--color-ink-border,#d1d5db)] rounded-xs overflow-hidden">
                    <div className="px-3 py-2 bg-[var(--color-paper-card,#f4efe6)] border-b border-[var(--color-ink-border,#d1d5db)] flex items-center justify-between font-serif font-bold text-xs">
                      <span>Available SQLite Snapshots ({backups.length})</span>
                      <span className="font-sans text-[10px] text-[var(--color-ink-muted,#6b7280)] font-normal">
                        Stored in /backups
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {backups.length > 0 ? (
                        <table className="w-full text-left border-collapse text-[11px] font-mono">
                          <thead>
                            <tr className="border-b border-[var(--color-ink-border,#e5e7eb)] bg-gray-50/50 text-[var(--color-ink-muted,#6b7280)]">
                              <th className="p-2">Filename</th>
                              <th className="p-2">Trigger</th>
                              <th className="p-2">Size</th>
                              <th className="p-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backups.map((b) => (
                              <tr key={b.filename} className="border-b border-[var(--color-ink-border,#e5e7eb)] hover:bg-gray-50">
                                <td className="p-2 truncate max-w-[180px]" title={b.filename}>{b.filename}</td>
                                <td className="p-2 uppercase text-[10px] text-[var(--color-ink-muted,#6b7280)]">{b.trigger}</td>
                                <td className="p-2">{b.sizeFormatted}</td>
                                <td className="p-2 text-right">
                                  <button
                                    onClick={() => {
                                      setRestoreTarget(b);
                                      setRestoreConfirmInput('');
                                    }}
                                    className="px-2 py-0.5 text-[10px] bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xs cursor-pointer font-sans"
                                  >
                                    Restore
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-[var(--color-ink-muted,#6b7280)] text-xs italic">
                          No backup snapshots found in /backups.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restore Double Confirmation Dialog */}
                  {restoreTarget && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xs space-y-3 font-sans">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-red-900 font-serif text-sm">
                            Confirm Database Restore
                          </div>
                          <div className="text-red-700 text-xs mt-0.5">
                            Restoring will overwrite current newsdesk data with snapshot <strong>{restoreTarget.filename}</strong>. An automatic pre-restore safety snapshot will be taken.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-800 font-medium">Type RESTORE to confirm:</span>
                        <input
                          type="text"
                          value={restoreConfirmInput}
                          onChange={(e) => setRestoreConfirmInput(e.target.value)}
                          placeholder="RESTORE"
                          className="px-2.5 py-1 text-xs border border-red-300 rounded-xs font-mono bg-white text-red-900 uppercase"
                        />
                        <button
                          onClick={handleExecuteRestore}
                          disabled={restoreConfirmInput !== 'RESTORE' || isRestoring}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xs text-xs font-bold transition-colors cursor-pointer"
                        >
                          {isRestoring ? 'Restoring...' : 'Confirm Restore'}
                        </button>
                        <button
                          onClick={() => setRestoreTarget(null)}
                          className="px-2.5 py-1 text-xs text-gray-600 hover:text-black cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── 10. LIBRARY ARCHIVES SECTION ─── */}
              {activeSection === 'library' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Citation Format */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Default Citation Format</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Pre-selects bibliography format when copying quotes and historical events in The Library.
                      </div>
                    </div>
                    <select
                      id="select-citation-format"
                      value={storeSettings.library_citation_format || 'apa'}
                      onChange={(e) => saveSetting({ library_citation_format: e.target.value as 'apa' | 'chicago' })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="apa">APA Style (7th Edition)</option>
                      <option value="chicago">Chicago Manual of Style (17th Edition)</option>
                    </select>
                  </div>

                  {/* Crisis Helpline Default Region */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Crisis Helpline Default Region</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Default regional filter for Mind Helps international crisis hotlines.
                      </div>
                    </div>
                    <select
                      id="select-helpline-region"
                      value={storeSettings.helpline_default_region || 'all'}
                      onChange={(e) => saveSetting({ helpline_default_region: e.target.value })}
                      className="px-2.5 py-1 text-xs border border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] rounded-xs cursor-pointer"
                    >
                      <option value="all">Global (All Regions)</option>
                      <option value="IN">India (Tele-MANAS, Vandrevala)</option>
                      <option value="US">United States (988 Lifeline, Crisis Text)</option>
                      <option value="GB">United Kingdom (Samaritans, Shout)</option>
                      <option value="CA">Canada (Talk Suicide, Kids Help)</option>
                      <option value="AU">Australia (Lifeline, Beyond Blue)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ─── 11. ADVANCED & DEVELOPER SECTION ─── */}
              {activeSection === 'advanced' && (
                <div className="space-y-5 font-sans text-xs">
                  {/* Debug Logging Switch */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm font-serif">Verbose Debug & Trace Logging</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs uppercase tracking-wider font-semibold">
                          Restart Required for Scheduler
                        </span>
                      </div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Emits detailed ingestion timestamps and SSE socket frames to backend console.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-debug-logging"
                        type="checkbox"
                        checked={storeSettings.debug_logging ?? false}
                        onChange={(e) => saveSetting({ debug_logging: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Clock Skew Compensation */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-ink-border,#e5e7eb)]">
                    <div>
                      <div className="font-semibold text-sm font-serif">Server Clock Skew Compensation</div>
                      <div className="text-[var(--color-ink-muted,#6b7280)] text-[11px]">
                        Synchronizes client countdowns against /api/time with half-roundtrip latency adjustment.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-clock-sync"
                        type="checkbox"
                        checked={storeSettings.clock_sync_enabled ?? true}
                        onChange={(e) => saveSetting({ clock_sync_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-ink,#111827)]" />
                    </label>
                  </div>

                  {/* Sealed API Credentials Readout */}
                  <div className="p-4 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs space-y-2">
                    <div className="flex items-center gap-2 border-b border-[var(--color-ink-border,#d1d5db)] pb-1.5">
                      <Lock className="w-4 h-4 text-emerald-700" />
                      <span className="font-serif font-bold text-xs uppercase tracking-wide">
                        Sealed API Provider Credentials
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px] pt-1">
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="font-sans font-medium">Google Gemini 1.5 Flash:</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-xs text-gray-700">••••••••••••••••••••••••••••••••</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="font-sans font-medium">Groq Llama-3.3-70b (Fallback):</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-xs text-gray-700">••••••••••••••••••••••••••••••••</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-sans font-medium">YouTube Live IFrame API:</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-xs text-gray-700">Client Keyless / Sealed</span>
                      </div>
                    </div>
                    <p className="font-sans text-[10px] text-[var(--color-ink-muted,#6b7280)] pt-1 italic">
                      API tokens are permanently sealed in server-side process memory (.env) and never transmitted to the client or exported in backup archives.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Bar with "✓ Saved" Toast */}
            <div className="px-8 py-2.5 border-t border-[var(--color-ink-border,#d1d5db)] bg-[var(--color-paper-card,#f4efe6)] flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 font-sans font-medium animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing preferences...</span>
                  </div>
                ) : lastSavedTime ? (
                  <div
                    id="settings-saved-confirmation"
                    className="flex items-center gap-1.5 text-xs text-emerald-800 font-sans font-medium animate-in fade-in duration-200"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Saved to local desk configuration</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-[var(--color-ink-muted,#6b7280)] font-sans">
                    All adjustments save automatically to SQLite database.
                  </span>
                )}
              </div>

              <div className="font-sans text-[11px] text-[var(--color-ink-muted,#6b7280)]">
                AI World News Desk • v3.0 Broadsheet
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

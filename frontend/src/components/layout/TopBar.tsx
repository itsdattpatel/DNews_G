/**
 * frontend/src/components/layout/TopBar.tsx
 * Master Broadsheet Top Navigation Header (PRD C Category 1).
 * Top bar keeps ONLY:
 * 1. Logo / Masthead
 * 2. Region Selector
 * 3. Directory view toggle
 * 4. Breaking news toggle
 * 5. Auto-advance quick toggle
 * 6. Search wire input
 *
 * Guaranteed never to overflow: search shrinks first, then button labels collapse to icons.
 * All other controls have been migrated to RightIconRail or StatusStrip.
 */
import React from 'react';
import { BatIcon } from '../bat/BatIcon';
import { useAppStore } from '../../store/useAppStore';
import { Search, Flame, X, Layers, Play, Pause, Settings, ShieldAlert } from 'lucide-react';

const COUNTRIES = [
  { label: 'All Regions', value: null },
  { label: 'India', value: 'India' },
  { label: 'USA', value: 'USA' },
  { label: 'China', value: 'China' },
  { label: 'Japan', value: 'Japan' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Wildlife Wire', value: 'Animals' },
];

export const TopBar: React.FC = () => {
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const isBreakingOnly = useAppStore((s) => s.isBreakingOnly);
  const toggleBreakingOnly = useAppStore((s) => s.toggleBreakingOnly);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const isIncognitoMode = useAppStore((s) => s.isIncognitoMode);
  const setIncognitoMode = useAppStore((s) => s.setIncognitoMode);
  const mastheadTitle = useAppStore((s) => s.mastheadTitle);
  const mastheadMotto = useAppStore((s) => s.mastheadMotto);

  return (
    <header
      id="top-bar"
      className="h-12 sm:h-14 min-h-12 sm:min-h-14 w-full bg-paper/95 backdrop-blur-md border-b-2 border-ink flex items-center justify-between px-2 sm:px-4 z-40 gap-1.5 sm:gap-3 text-ink select-none overflow-hidden"
    >
      {/* 1. Masthead: Bat SVG Icon + Logotype */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <BatIcon size={32} className="sm:scale-105" />
        <button
          type="button"
          onClick={() => setCurrentView('reader')}
          className="flex flex-col text-left focus:outline-none group cursor-pointer"
          title="Return to Reading Desk"
        >
          <span className="font-masthead text-lg sm:text-2xl md:text-3xl tracking-tight leading-none text-ink group-hover:text-ink/80 transition-colors whitespace-nowrap">
            {mastheadTitle}
          </span>
          <span className="hidden sm:inline font-ui text-[0.5625rem] md:text-[0.6rem] font-bold uppercase tracking-widest text-ink-secondary whitespace-nowrap">
            {mastheadMotto}
          </span>
        </button>
      </div>

      {/* 2-6. Right-aligned Top Bar Essential Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 font-ui text-xs">
        {/* 2. Region / Country Selector (Hidden on narrow mobile, available in Masthead menu) */}
        <select
          id="country-filter-select"
          value={selectedCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value || null)}
          className="hidden sm:block bg-paper-alt border border-paper-border rounded-xs text-ink text-xs px-1.5 sm:px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer max-w-[100px] sm:max-w-none"
          title="Filter dispatches by region or country"
        >
          {COUNTRIES.map((c) => (
            <option key={c.label} value={c.value ?? ''}>
              {c.label}
            </option>
          ))}
        </select>

        {/* 3. View Switcher: Dual Reader ↔ Category Directory (Hidden on narrow mobile, available in Masthead menu) */}
        <button
          id="btn-toggle-category-view"
          type="button"
          onClick={() => setCurrentView(currentView === 'category' ? 'reader' : 'category')}
          title={currentView === 'category' ? 'Return to Dual Reader Desk' : 'Open Section Directory Grid'}
          className={`hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold transition-all shadow-xs cursor-pointer ${
            currentView === 'category'
              ? 'border-ink bg-ink text-paper'
              : 'border-paper-border bg-paper hover:border-ink text-ink'
          }`}
        >
          <Layers size={13} className="shrink-0" />
          <span className="hidden md:inline">
            {currentView === 'category' ? 'Reader' : 'Directory'}
          </span>
        </button>

        {/* 4. Breaking Only Filter Toggle (Always visible) */}
        <button
          id="breaking-filter-toggle"
          type="button"
          onClick={toggleBreakingOnly}
          title="Toggle Breaking News Filter (Threshold >= 75)"
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold transition-all cursor-pointer shrink-0 ${
            isBreakingOnly
              ? 'border-accent bg-accent text-white shadow-xs'
              : 'border-paper-border text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          <Flame size={13} className={isBreakingOnly ? 'text-white' : 'text-accent shrink-0'} />
          <span className="hidden md:inline">Breaking</span>
        </button>

        {/* 5. Auto-Advance Quick Toggle Button (Hidden on narrow mobile) */}
        <button
          id="btn-auto-advance-toggle"
          type="button"
          onClick={() => {
            const currentEnabled = Boolean(settings.auto_advance_enabled);
            updateSettings({ auto_advance_enabled: !currentEnabled });
          }}
          title={
            settings.auto_advance_enabled
              ? `Disable Auto-Advance (${settings.auto_advance_interval_sec ?? 7}s interval)`
              : `Enable Auto-Advance (${settings.auto_advance_interval_sec ?? 7}s ambient reading)`
          }
          className={`hidden sm:flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold tabular-nums min-w-[3.4ch] md:min-w-[82px] transition-all cursor-pointer ${
            settings.auto_advance_enabled
              ? 'border-ink bg-ink text-paper shadow-xs'
              : 'border-paper-border text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          {settings.auto_advance_enabled ? <Pause size={12} className="shrink-0" /> : <Play size={12} className="shrink-0" />}
          <span className="hidden md:inline">Auto ({settings.auto_advance_interval_sec ?? 7}s)</span>
          <span className="inline md:hidden">{settings.auto_advance_interval_sec ?? 7}s</span>
        </button>

        {/* 6. Search Wire Input (Shrinks first if horizontal space is constrained) */}
        <div className="flex items-center bg-paper-alt border border-paper-border rounded-xs px-2 py-0.5 w-24 sm:w-32 md:w-40 lg:w-48 focus-within:ring-1 focus-within:ring-accent transition-all shrink">
          <Search size={13} className="text-ink-muted mr-1 sm:mr-1.5 shrink-0" />
          <input
            id="article-search-input"
            type="text"
            placeholder="Search wire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-ink text-xs w-full placeholder:text-ink-muted/80 min-w-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-ink-muted hover:text-ink shrink-0 ml-1"
              title="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* 6.5 Incognito Reading Mode Quick Toggle (PRD Master Expansion #49) */}
        <button
          id="btn-topbar-incognito"
          type="button"
          onClick={() => setIncognitoMode(!isIncognitoMode)}
          title={
            isIncognitoMode
              ? 'Incognito Active: Article reading history & search logging paused'
              : 'Switch to Incognito Reading Desk (Zero-Tracking)'
          }
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold transition-all cursor-pointer shrink-0 ${
            isIncognitoMode
              ? 'border-ink bg-ink text-paper shadow-xs'
              : 'border-paper-border text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          <ShieldAlert size={13} className={isIncognitoMode ? 'text-accent shrink-0' : 'text-ink-secondary shrink-0'} />
          <span className="hidden md:inline font-mono uppercase text-[11px] tracking-wider">
            {isIncognitoMode ? 'Incognito' : 'Shield'}
          </span>
        </button>

        {/* 7. Dedicated Upside Settings Button (Always accessible on Mobile Portrait, Landscape & Desktop) */}
        <button
          id="btn-topbar-settings"
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Open Broadsheet Desk Settings (Upside Settings)"
          className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1 rounded-xs border border-paper-border bg-paper hover:border-ink hover:text-ink text-ink-secondary transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Settings size={14} className="shrink-0" />
          <span className="hidden xl:inline text-xs font-bold ml-1">Settings</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;

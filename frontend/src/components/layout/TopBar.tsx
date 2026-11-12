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
import { Search, Flame, X, Layers, Play, Pause } from 'lucide-react';

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

  return (
    <header
      id="top-bar"
      className="h-14 min-h-14 w-full bg-paper/95 backdrop-blur-md border-b-2 border-ink flex items-center justify-between px-3 sm:px-4 z-40 gap-2 sm:gap-3 text-ink select-none overflow-hidden"
    >
      {/* 1. Masthead: Bat SVG Icon + Logotype */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <BatIcon size={34} />
        <button
          type="button"
          onClick={() => setCurrentView('reader')}
          className="flex flex-col text-left focus:outline-none group cursor-pointer"
          title="Return to Reading Desk"
        >
          <span className="font-masthead text-xl sm:text-2xl md:text-3xl tracking-tight leading-none text-ink group-hover:text-ink/80 transition-colors whitespace-nowrap">
            The World Desk
          </span>
          <span className="hidden sm:inline font-ui text-[0.5625rem] md:text-[0.6rem] font-bold uppercase tracking-widest text-ink-secondary whitespace-nowrap">
            Global Dispatch &amp; Wire
          </span>
        </button>
      </div>

      {/* 2-6. Right-aligned Top Bar Essential Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 font-ui text-xs">
        {/* 2. Region / Country Selector */}
        <select
          id="country-filter-select"
          value={selectedCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value || null)}
          className="bg-paper-alt border border-paper-border rounded-xs text-ink text-xs px-1.5 sm:px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer max-w-[100px] sm:max-w-none"
          title="Filter dispatches by region or country"
        >
          {COUNTRIES.map((c) => (
            <option key={c.label} value={c.value ?? ''}>
              {c.label}
            </option>
          ))}
        </select>

        {/* 3. View Switcher: Dual Reader ↔ Category Directory */}
        <button
          id="btn-toggle-category-view"
          type="button"
          onClick={() => setCurrentView(currentView === 'category' ? 'reader' : 'category')}
          title={currentView === 'category' ? 'Return to Dual Reader Desk' : 'Open Section Directory Grid'}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold transition-all shadow-xs cursor-pointer ${
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

        {/* 4. Breaking Only Filter Toggle */}
        <button
          id="breaking-filter-toggle"
          type="button"
          onClick={toggleBreakingOnly}
          title="Toggle Breaking News Filter (Threshold >= 75)"
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold transition-all cursor-pointer ${
            isBreakingOnly
              ? 'border-accent bg-accent text-white shadow-xs'
              : 'border-paper-border text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          <Flame size={13} className={isBreakingOnly ? 'text-white' : 'text-accent shrink-0'} />
          <span className="hidden sm:inline">Breaking</span>
        </button>

        {/* 5. Auto-Advance Quick Toggle Button */}
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
          className={`flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-xs border text-xs font-bold tabular-nums min-w-[3.4ch] md:min-w-[82px] transition-all cursor-pointer ${
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
      </div>
    </header>
  );
};

export default TopBar;

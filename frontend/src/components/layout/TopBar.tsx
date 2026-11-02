/**
 * frontend/src/components/layout/TopBar.tsx
 * Master Broadsheet Top Navigation Header
 * Features Bat Masthead, Ink-Stamp Category Tabs, Country Filter, Search, & Live Status.
 */
import React, { useEffect } from 'react';
import { BatIcon } from '../bat/BatIcon';
import { ProviderBadge } from '../quota/ProviderBadge';
import { FeedCounterPopover } from '../telemetry/FeedCounterPopover';
import { useAppStore } from '../../store/useAppStore';
import { Search, Flame, X, Clock, RadioTower, Layers, Bell, Play, Pause, Tv, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  'All',
  'World',
  'Politics',
  'Business',
  'Tech',
  'Science',
  'Health',
  'Sports',
  'Entertainment',
  'Environment',
  'Animals',
  'Crime',
];

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
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const isBreakingOnly = useAppStore((s) => s.isBreakingOnly);
  const toggleBreakingOnly = useAppStore((s) => s.toggleBreakingOnly);
  const startupStatus = useAppStore((s) => s.startupStatus);
  const setMissedNewsModalOpen = useAppStore((s) => s.setMissedNewsModalOpen);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setAlertsOpen = useAppStore((s) => s.setAlertsOpen);
  const setSourcesOpen = useAppStore((s) => s.setSourcesOpen);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const feedCounter = useAppStore((s) => s.feedCounter);
  const fetchFeedCounter = useAppStore((s) => s.fetchFeedCounter);
  const isFeedCounterOpen = useAppStore((s) => s.isFeedCounterOpen);
  const setFeedCounterOpen = useAppStore((s) => s.setFeedCounterOpen);

  useEffect(() => {
    fetchFeedCounter();
  }, [fetchFeedCounter]);

  return (
    <header
      id="top-bar"
      className="h-14 min-h-14 w-full bg-paper/95 backdrop-blur-md border-b-2 border-ink flex items-center justify-between px-4 z-40 gap-3 text-ink select-none"
    >
      {/* Left: Bat + Broadsheet Logotype */}
      <div className="flex items-center gap-2.5 shrink-0">
        <BatIcon size={36} />
        <button
          onClick={() => setCurrentView('reader')}
          className="flex flex-col text-left focus:outline-none group"
        >
          <span className="font-masthead text-2xl sm:text-3xl tracking-tight leading-none text-ink group-hover:text-ink/80 transition-colors">
            The World Desk
          </span>
          <span className="font-ui text-[0.6rem] font-bold uppercase tracking-widest text-ink-secondary">
            Global Dispatch & Wire
          </span>
        </button>
      </div>

      {/* Middle: Category Ink-Stamp Rail */}
      <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {CATEGORIES.map((cat) => {
          const isActive = cat === 'All' ? selectedCategory === null : selectedCategory === cat;
          return (
            <button
              key={cat}
              id={`cat-pill-${cat.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
              className="focus:outline-none"
            >
              {cat === 'All' ? (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-sm font-ui text-[0.6875rem] font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'border border-ink bg-ink text-paper shadow-xs'
                      : 'border border-paper-border text-ink-secondary hover:border-ink hover:text-ink'
                  }`}
                >
                  All
                </span>
              ) : (
                <Badge
                  category={cat}
                  className={`cursor-pointer transition-transform ${
                    isActive
                      ? 'ring-2 ring-ink scale-105 shadow-sm'
                      : 'opacity-85 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  {cat}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Controls: Filters, Search, Provider, & Live Indicator */}
      <div className="flex items-center gap-2.5 shrink-0 font-ui text-xs">
        {/* Country Selector */}
        <select
          id="country-filter-select"
          value={selectedCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value || null)}
          className="bg-paper-alt border border-paper-border rounded-xs text-ink text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
        >
          {COUNTRIES.map((c) => (
            <option key={c.label} value={c.value ?? ''}>
              {c.label}
            </option>
          ))}
        </select>

        {/* View Toggle: Dual Reader ↔ Category Directory */}
        <button
          id="btn-toggle-category-view"
          onClick={() => setCurrentView(currentView === 'category' ? 'reader' : 'category')}
          title={currentView === 'category' ? 'Return to Dual Reader Desk' : 'Open Section Directory Grid'}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-xs font-bold transition-all shadow-xs ${
            currentView === 'category'
              ? 'border-ink bg-ink text-paper'
              : 'border-paper-border bg-paper hover:border-ink text-ink'
          }`}
        >
          <Layers size={12} />
          <span>{currentView === 'category' ? 'Reader' : 'Directory'}</span>
        </button>

        {/* Breaking Only Filter Toggle */}
        <button
          id="breaking-filter-toggle"
          onClick={toggleBreakingOnly}
          title="Toggle Breaking News Filter (Threshold >= 75)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xs border text-xs font-bold transition-all ${
            isBreakingOnly
              ? 'border-accent bg-accent text-white shadow-xs'
              : 'border-paper-border text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          <Flame size={13} className={isBreakingOnly ? 'text-white' : 'text-accent'} />
          <span>Breaking</span>
        </button>

        {/* Auto-Advance Quick Toggle Button (PRD A Category 2) */}
        <button
          id="btn-auto-advance-toggle"
          onClick={() => {
            const currentEnabled = Boolean(settings.auto_advance_enabled);
            updateSettings({ auto_advance_enabled: !currentEnabled });
          }}
          title={
            settings.auto_advance_enabled
              ? 'Disable Auto-Advance (7s interval)'
              : 'Enable Auto-Advance (7s ambient reading)'
          }
          className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xs border text-xs font-bold transition-all ${
            settings.auto_advance_enabled
              ? 'border-ink bg-ink text-paper shadow-xs'
              : 'border-paper-border text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          {settings.auto_advance_enabled ? <Pause size={12} /> : <Play size={12} />}
          <span>Auto ({settings.auto_advance_interval_sec ?? 7}s)</span>
        </button>

        {/* Search Input */}
        <div className="hidden sm:flex items-center bg-paper-alt border border-paper-border rounded-xs px-2 py-0.5 w-36 md:w-44 focus-within:ring-1 focus-within:ring-accent transition-all">
          <Search size={13} className="text-ink-muted mr-1.5 shrink-0" />
          <input
            id="article-search-input"
            type="text"
            placeholder="Search wire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-ink text-xs w-full placeholder:text-ink-muted/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-ink-muted hover:text-ink shrink-0"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Startup Gap Status Badge */}
        {startupStatus?.detected && startupStatus.missed_minutes > 0 && (
          <button
            id="btn-gap-status-badge"
            onClick={() => setMissedNewsModalOpen(true)}
            className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-xs border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[0.6875rem] font-bold"
            title={`Offline for ${startupStatus.missed_minutes}m — Click to open Catch-Up Dispatches`}
          >
            <Clock size={11} />
            <span>Gap: {startupStatus.missed_minutes}m</span>
          </button>
        )}

        {/* Quick Plain Mode Switch */}
        <button
          id="btn-topbar-plain-mode"
          onClick={() => updateSettings({ plain_mode_enabled: !settings.plain_mode_enabled })}
          className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-xs border text-[0.6875rem] font-mono font-bold transition-all shadow-xs ${
            settings.plain_mode_enabled
              ? 'border-ink bg-ink text-paper'
              : 'border-paper-border bg-paper-alt hover:border-ink text-ink-secondary hover:text-ink'
          }`}
          title={settings.plain_mode_enabled ? "Plain Mode is ON (Zero AI, Full-Width Reader). Click to switch to Standard Mode." : "Switch to Plain Mode (Zero AI, Zero Quota, Full-Width Reader)."}
        >
          <span>Plain: {settings.plain_mode_enabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Provider Badge */}
        <ProviderBadge />

        {/* Live Feed Counter & Velocity Telemetry (PRD A Category 8) */}
        <button
          id="btn-topbar-feed-counter"
          onClick={() => setFeedCounterOpen(!isFeedCounterOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-xs border text-[0.6875rem] font-mono font-bold transition-all shadow-xs ${
            isFeedCounterOpen
              ? 'border-ink bg-ink text-paper'
              : 'border-paper-border bg-paper-alt hover:border-ink text-ink hover:text-accent'
          }`}
          title="Live Feed Counter (Rolling 24h intake, sparkline & lifetime telemetry)"
          aria-label="Open Feed Counter Telemetry"
        >
          <Radio size={12} className={feedCounter && feedCounter.rolling24h.total > 0 ? "text-positive" : "text-ink-muted"} />
          <span id="topbar-feed-counter-value" className="font-extrabold">{feedCounter ? feedCounter.rolling24h.total.toLocaleString() : '—'}</span>
          <span className="hidden sm:inline font-ui text-[10px] text-ink-muted">24H</span>
        </button>

        {/* Live Status Indicator (Pulse) */}
        <div
          className="flex items-center gap-1.5 bg-paper-alt border border-paper-border px-2 py-1 rounded-xs"
          title="Server-Sent Events: Connected Live"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-positive" />
          </span>
          <span className="font-mono text-[0.625rem] font-bold uppercase tracking-wider text-ink-secondary">
            Live
          </span>
        </div>

        {/* Live TV Broadcast Wire Quick Button */}
        <button
          id="btn-topbar-tv"
          onClick={() => useAppStore.getState().setTvViewOpen(true)}
          className="p-1 rounded-xs border border-paper-border hover:bg-paper-alt text-ink-secondary hover:text-ink transition-colors flex items-center gap-1 font-mono text-[11px]"
          title="Live TV Broadcasts & Curated Top 5 (Press 't')"
          aria-label="Open Live TV Broadcast Wire"
        >
          <Tv size={15} />
          <span className="hidden xl:inline font-bold">TV</span>
        </button>

        {/* Alerts Center Quick Button */}
        <button
          id="btn-topbar-alerts"
          onClick={() => setAlertsOpen(true)}
          className="relative p-1 rounded-xs border border-paper-border hover:bg-paper-alt text-ink-secondary hover:text-ink transition-colors"
          title="Alerts Center (Breaking, Quota, Errors)"
          aria-label="Open Alerts Center"
        >
          <Bell size={15} />
        </button>

        {/* Quick API & Sources Button */}
        <button
          id="btn-topbar-sources"
          onClick={() => setSourcesOpen(true)}
          className="p-1 rounded-xs border border-paper-border hover:bg-paper-alt text-ink-secondary hover:text-ink transition-colors"
          title="API & Sources Settings"
          aria-label="API Sources Settings"
        >
          <RadioTower size={15} />
        </button>
      </div>

      {/* Live Feed Counter Popover (PRD A Category 8) */}
      <FeedCounterPopover />
    </header>
  );
};

export default TopBar;

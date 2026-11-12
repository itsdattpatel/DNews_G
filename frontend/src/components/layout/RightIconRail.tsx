/**
 * frontend/src/components/layout/RightIconRail.tsx
 * Master Right Vertical Icon Navigation Rail (PRD C Category 1).
 * Features:
 * - Fixed 44px width (collapsed) / 180px width (pinned open) in normal document layout flow.
 * - Grouped sections: (a) Live status, (b) Views, (c) Modes & theme, (d) Settings at bottom.
 * - 40x40px minimum clickable touch targets for all icons.
 * - High-contrast broadsheet active highlights, badges, and left-popping accessible tooltips.
 * - Feed Counter downward popover integrated cleanly without edge clipping.
 */
import React, { useState, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FeedCounterPopover } from '../telemetry/FeedCounterPopover';
import {
  Radio,
  Bell,
  Tv,
  Globe,
  BookOpen,
  Activity,
  ZapOff,
  Sparkles,
  Sun,
  Moon,
  Sliders,
  Pin,
  PinOff,
} from 'lucide-react';

interface RailItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  shortcut?: string;
  badge?: React.ReactNode;
  isActive?: boolean;
  isPinned: boolean;
  onClick: () => void;
}

const RailItem = memo<RailItemProps>(({
  id,
  icon,
  label,
  sublabel,
  shortcut,
  badge,
  isActive,
  isPinned,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        id={id}
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`group relative min-w-[40px] min-h-[40px] h-10 rounded-xs transition-all flex items-center focus-visible:ring-2 focus-visible:ring-ink focus:outline-none cursor-pointer ${
          isPinned
            ? 'w-full px-2.5 justify-start gap-2.5 text-left'
            : 'w-10 justify-center'
        } ${
          isActive
            ? 'bg-ink text-paper shadow-xs border border-ink'
            : 'text-ink-secondary hover:text-ink hover:bg-paper border border-transparent hover:border-paper-border'
        }`}
      >
        {/* Visual Icon with Clickable Target >= 40x40 */}
        <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
          {icon}
          {/* Badge in collapsed mode */}
          {!isPinned && badge && (
            <div className="absolute -top-1 -right-2 pointer-events-none">
              {badge}
            </div>
          )}
        </div>

        {/* Inline Label & Badges when Pinned Open */}
        {isPinned && (
          <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
            <div className="flex flex-col min-w-0">
              <span className="font-ui text-xs font-bold leading-tight truncate">
                {label}
              </span>
              {sublabel && (
                <span className="font-mono text-[9px] text-ink-muted leading-tight truncate">
                  {sublabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {shortcut && (
                <kbd className="font-mono text-[9px] px-1 py-0.2 rounded-2xs border border-paper-border/60 bg-paper/40 text-ink-muted">
                  {shortcut}
                </kbd>
              )}
              {badge}
            </div>
          </div>
        )}
      </button>

      {/* Flyout Tooltip when Collapsed (Floats to the left into viewport so it is never clipped) */}
      {!isPinned && isHovered && (
        <div
          role="tooltip"
          className="absolute right-full mr-2 z-50 pointer-events-none whitespace-nowrap bg-paper text-ink border border-ink rounded-xs shadow-overlay px-2.5 py-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
        >
          <div className="flex items-center gap-1.5 font-ui text-xs font-bold">
            <span>{label}</span>
            {shortcut && (
              <kbd className="font-mono text-[9px] px-1 py-0.2 rounded-2xs border border-ink/40 bg-paper-alt font-semibold text-ink">
                {shortcut}
              </kbd>
            )}
          </div>
          {sublabel && (
            <span className="font-mono text-[10px] text-ink-secondary">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

RailItem.displayName = 'RailItem';

export interface RightIconRailProps {
  pinned?: boolean;
  forcedUnreadAlertsCount?: number;
}

export const RightIconRail: React.FC<RightIconRailProps> = ({
  pinned: propPinned,
  forcedUnreadAlertsCount,
}) => {
  const storePinned = useAppStore((s) => s.isRailPinned);
  const isRailPinned = propPinned !== undefined ? propPinned : storePinned;
  const toggleRailPinned = useAppStore((s) => s.toggleRailPinned);

  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const isTvViewOpen = useAppStore((s) => s.isTvViewOpen);
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const isGlobeOpen = useAppStore((s) => s.isGlobeOpen);
  const setGlobeOpen = useAppStore((s) => s.setGlobeOpen);
  const isControlRoomOpen = useAppStore((s) => s.isControlRoomOpen);
  const setControlRoomOpen = useAppStore((s) => s.setControlRoomOpen);
  const isAlertsOpen = useAppStore((s) => s.isAlertsOpen);
  const setAlertsOpen = useAppStore((s) => s.setAlertsOpen);

  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const feedCounter = useAppStore((s) => s.feedCounter);
  const isFeedCounterOpen = useAppStore((s) => s.isFeedCounterOpen);
  const setFeedCounterOpen = useAppStore((s) => s.setFeedCounterOpen);
  const storeUnreadAlertsCount = useAppStore((s) => s.unreadAlertsCount);
  const unreadAlertsCount = forcedUnreadAlertsCount ?? storeUnreadAlertsCount;

  // Formatter for 24h count badge
  const rolling24Total = feedCounter?.rolling24h.total ?? 0;
  const compactCount =
    rolling24Total >= 1000
      ? `${(rolling24Total / 1000).toFixed(1)}k`
      : rolling24Total.toString();

  // Navigation handlers
  const handleOpenLibrary = () => {
    window.history.pushState(null, '', '/library');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const isLibraryActive =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/library') ||
      window.location.hash.startsWith('#/library'));

  return (
    <aside
      id="right-icon-rail"
      role="navigation"
      aria-label="Workspace Icon Rail"
      className={`shrink-0 h-full bg-paper-alt border-l-2 border-ink flex flex-col justify-between py-2.5 px-0.5 z-30 transition-[width] duration-150 select-none ${
        isRailPinned ? 'w-[180px]' : 'w-[44px]'
      }`}
    >
      {/* Top Stack: Live Status & Alternate Views */}
      <div className="flex flex-col items-center w-full space-y-1">
        {/* GROUP A: Live Status & Telemetry */}
        <div className="w-full flex flex-col items-center space-y-1">
          {/* Feed Counter */}
          <RailItem
            id="btn-rail-feed-counter"
            icon={<Radio size={16} className={rolling24Total > 0 ? 'text-positive' : 'text-ink-muted'} />}
            label="Live Feed Telemetry"
            sublabel={`${rolling24Total.toLocaleString()} dispatches in 24h`}
            isActive={isFeedCounterOpen}
            isPinned={isRailPinned}
            onClick={() => setFeedCounterOpen(!isFeedCounterOpen)}
            badge={
              <span className="font-mono text-[8px] font-extrabold px-1 py-0.2 bg-ink text-paper rounded-2xs border border-paper-border">
                {compactCount}
              </span>
            }
          />

          {/* Alerts Bell */}
          <RailItem
            id="btn-rail-alerts"
            icon={<Bell size={16} />}
            label="Alerts Center"
            sublabel={
              unreadAlertsCount > 0
                ? `${unreadAlertsCount} unread · Breaking, Quota & Errors`
                : 'All Clear · Breaking, Quota & Errors'
            }
            isActive={isAlertsOpen}
            isPinned={isRailPinned}
            onClick={() => setAlertsOpen(true)}
            badge={
              unreadAlertsCount > 0 ? (
                <span
                  id="badge-rail-unread-alerts"
                  data-testid="unread-alerts-badge"
                  className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-2xs bg-accent text-paper font-mono text-[9px] font-extrabold tabular-nums border border-paper-border leading-none"
                >
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              ) : undefined
            }
          />
        </div>

        {/* Divider A -> B */}
        <div className="w-4/5 h-px bg-paper-border my-1.5" />

        {/* GROUP B: Views */}
        <div className="w-full flex flex-col items-center space-y-1">
          {/* TV Wire */}
          <RailItem
            id="btn-rail-tv"
            icon={<Tv size={16} />}
            label="Live TV Wire"
            sublabel="IPTV & Curated Top 5"
            shortcut="t"
            isActive={isTvViewOpen || currentView === 'tv'}
            isPinned={isRailPinned}
            onClick={() => {
              setTvViewOpen(true);
              setCurrentView('tv');
            }}
          />

          {/* 3D Globe Radar */}
          <RailItem
            id="btn-rail-globe"
            icon={<Globe size={16} />}
            label="Global Radar"
            sublabel="Cartography & Wildlife"
            shortcut="g"
            isActive={isGlobeOpen || currentView === 'globe'}
            isPinned={isRailPinned}
            onClick={() => {
              setGlobeOpen(true);
              setCurrentView('globe');
            }}
          />

          {/* The Library */}
          <RailItem
            id="btn-rail-library"
            icon={<BookOpen size={16} />}
            label="The Library"
            sublabel="Archives, Wisdom, Mind"
            shortcut="l"
            isActive={Boolean(isLibraryActive)}
            isPinned={isRailPinned}
            onClick={handleOpenLibrary}
          />

          {/* Control Room */}
          <RailItem
            id="btn-rail-control-room"
            icon={<Activity size={16} />}
            label="Control Room"
            sublabel="Telemetry & System Health"
            shortcut="c"
            isActive={isControlRoomOpen || currentView === 'control-room'}
            isPinned={isRailPinned}
            onClick={() => {
              setControlRoomOpen(true);
              setCurrentView('control-room');
            }}
          />
        </div>

        {/* Divider B -> C */}
        <div className="w-4/5 h-px bg-paper-border my-1.5" />

        {/* GROUP C: Modes & Aesthetics */}
        <div className="w-full flex flex-col items-center space-y-1">
          {/* Plain Mode Toggle */}
          <RailItem
            id="btn-rail-plain-mode"
            icon={settings.plain_mode_enabled ? <ZapOff size={16} className="text-accent" /> : <Sparkles size={16} />}
            label="Plain Mode"
            sublabel={settings.plain_mode_enabled ? 'Zero AI · Full-Width Reader' : 'Standard AI Mode'}
            isActive={Boolean(settings.plain_mode_enabled)}
            isPinned={isRailPinned}
            onClick={() => updateSettings({ plain_mode_enabled: !settings.plain_mode_enabled })}
            badge={
              <span
                className={`font-mono text-[7px] font-bold px-0.8 py-0.2 rounded-2xs border ${
                  settings.plain_mode_enabled
                    ? 'bg-accent text-white border-accent'
                    : 'bg-paper-alt text-ink-muted border-paper-border'
                }`}
              >
                {settings.plain_mode_enabled ? 'ON' : 'OFF'}
              </span>
            }
          />

          {/* Theme Switcher */}
          <RailItem
            id="btn-rail-theme"
            icon={theme === 'paper' ? <Moon size={16} /> : <Sun size={16} />}
            label={theme === 'paper' ? 'Night Edition' : 'Paper Edition'}
            sublabel="Toggle Theme Palette"
            isPinned={isRailPinned}
            onClick={() => setTheme(theme === 'paper' ? 'night' : 'paper')}
          />
        </div>
      </div>

      {/* Bottom Stack: Settings & Pin Control */}
      <div className="flex flex-col items-center w-full space-y-1">
        {/* Divider C -> D */}
        <div className="w-4/5 h-px bg-paper-border my-1.5" />

        {/* GROUP D: Settings */}
        <RailItem
          id="btn-rail-settings"
          icon={<Sliders size={16} />}
          label="Desk Settings"
          sublabel="Preferences & Data"
          shortcut=","
          isActive={isSettingsOpen}
          isPinned={isRailPinned}
          onClick={() => setSettingsOpen(true)}
        />

        {/* Pin Rail Open / Collapse Toggle */}
        <RailItem
          id="btn-rail-pin-toggle"
          icon={isRailPinned ? <PinOff size={15} /> : <Pin size={15} />}
          label={isRailPinned ? 'Unpin Rail' : 'Pin Rail Open'}
          sublabel={isRailPinned ? 'Collapse to 44px' : 'Lock open at 180px'}
          isPinned={isRailPinned}
          onClick={toggleRailPinned}
        />
      </div>

      {/* Downward Popover for Feed Counter Telemetry (PRD C Item 6) */}
      <FeedCounterPopover />
    </aside>
  );
};

export default RightIconRail;

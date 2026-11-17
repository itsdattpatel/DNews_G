/**
 * frontend/src/components/common/CommandPalette.tsx
 * Quick Command Palette (PRD C Category 8 / Suggestion S1).
 *
 * Built with cmdk@1.0.4 (MIT) & Broadsheet typography.
 * Shortcut: Ctrl+K / Cmd+K.
 * Allows quick jumping to any view, toggling modes, switching layout presets,
 * and executing editorial actions.
 */
import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '../../store/useAppStore';
import {
  Search,
  Newspaper,
  Tv,
  Globe2,
  BookOpen,
  Activity,
  Zap,
  Moon,
  Sun,
  Play,
  Pause,
  Settings,
  Flame,
  FileText,
  Columns,
  Maximize2,
  Radio,
  X,
  Volume2,
  MessageSquare,
} from 'lucide-react';

export interface CommandPaletteProps {
  forcedOpen?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ forcedOpen }) => {
  const storeIsOpen = useAppStore((s) => s.isCommandPaletteOpen);
  const isOpen = forcedOpen !== undefined ? forcedOpen : storeIsOpen;
  const setIsOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isPlainMode = useAppStore((s) => s.settings.plain_mode_enabled ?? false);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const autoAdvance = useAppStore((s) => s.settings.auto_advance_enabled ?? false);

  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setGlobeOpen = useAppStore((s) => s.setGlobeOpen);
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const setControlRoomOpen = useAppStore((s) => s.setControlRoomOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setAlertsOpen = useAppStore((s) => s.setAlertsOpen);
  const setPdfOpen = useAppStore((s) => s.setPdfOpen);
  const setBriefingOpen = useAppStore((s) => s.setBriefingOpen);
  const setArchiveChatOpen = useAppStore((s) => s.setArchiveChatOpen);
  const setLayoutPreset = useAppStore((s) => s.setLayoutPreset);
  const isBreakingOnly = useAppStore((s) => s.isBreakingOnly);
  const toggleBreakingOnly = useAppStore((s) => s.toggleBreakingOnly);

  // Global Ctrl+K / Cmd+K trigger + Escape close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const runCommand = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        id="command-palette-dialog"
        className="relative w-full max-w-xl bg-paper border-2 border-ink text-ink rounded-xs shadow-overlay overflow-hidden flex flex-col font-ui animate-in zoom-in-95 duration-150"
      >
        {/* Broadsheet Masthead Header */}
        <div className="px-4 py-2 bg-paper-alt border-b border-paper-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-headline text-xs font-bold tracking-wider uppercase text-ink">
              The World Desk Telegraph
            </span>
            <span className="text-[0.625rem] font-mono text-ink-muted">
              [Ctrl+K]
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-paper rounded-2xs text-ink-secondary hover:text-ink transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* cmdk Root */}
        <Command label="Editorial Command Palette" className="flex flex-col flex-1">
          {/* Search Input Bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-ink">
            <Search size={16} className="text-ink-muted shrink-0" />
            <Command.Input
              autoFocus
              id="command-palette-input"
              placeholder="Search actions, views, settings, or modes..."
              className="w-full bg-transparent text-sm font-ui text-ink placeholder:text-ink-muted outline-none"
            />
          </div>

          {/* Results List */}
          <Command.List
            id="command-palette-list"
            className="max-h-80 overflow-y-auto p-2 font-ui text-xs divide-y divide-paper-border/40"
          >
            <Command.Empty className="py-6 text-center text-xs text-ink-muted font-mono">
              No matching editorial commands found.
            </Command.Empty>

            {/* Group 1: Workspace Views */}
            <Command.Group
              heading="Workspace Desks & Views"
              className="py-1 text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted px-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => setCurrentView('reader'))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Newspaper size={14} className="shrink-0 text-ink-secondary" />
                  <span>Dual Reader Desk (Article & Summary)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Default</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setCurrentView('category'))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Columns size={14} className="shrink-0 text-ink-secondary" />
                  <span>Category Directory Grid</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Directory</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => { setTvViewOpen(true); setCurrentView('tv'); })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Tv size={14} className="shrink-0 text-ink-secondary" />
                  <span>Live TV Broadcast & Nature Desk</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Key 't'</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => { setGlobeOpen(true); setCurrentView('globe'); })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Globe2 size={14} className="shrink-0 text-ink-secondary" />
                  <span>3D Interactive Cartographic Globe Radar</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Key 'g'</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => {
                  useAppStore.getState().openLibrary();
                })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen size={14} className="shrink-0 text-ink-secondary" />
                  <span>The Library (Historical News & Timeless Wisdom)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Key 'l'</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => { setControlRoomOpen(true); setCurrentView('control-room'); })}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity size={14} className="shrink-0 text-ink-secondary" />
                  <span>Control Room & Ingest Diagnostics</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Key 'c'</span>
              </Command.Item>
            </Command.Group>

            {/* Group 2: Layout Presets (Suggestion S3) */}
            <Command.Group
              heading="Layout Presets (S3)"
              className="py-1 text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted px-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => setLayoutPreset('balanced'))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Columns size={14} className="shrink-0 text-ink-secondary" />
                  <span>Reading Desk: Balanced (60% Article / 40% Summary)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Alt+1</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setLayoutPreset('focus'))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Maximize2 size={14} className="shrink-0 text-ink-secondary" />
                  <span>Focus Reader Desk (85% Article / 15% Summary)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Alt+2</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setLayoutPreset('split'))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Columns size={14} className="shrink-0 text-ink-secondary" />
                  <span>Split Wire Desk: Equal (50% Article / 50% Summary)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Alt+3</span>
              </Command.Item>
            </Command.Group>

            {/* Group 3: Modes & Automation */}
            <Command.Group
              heading="Editorial Modes & Automation"
              className="py-1 text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted px-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => updateSettings({ plain_mode_enabled: !isPlainMode }))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Zap size={14} className="shrink-0 text-accent" />
                  <span>Toggle Plain Mode (Zero AI, Full-Width Reader)</span>
                </div>
                <span className="font-mono text-[0.625rem] font-bold text-accent">
                  {isPlainMode ? 'Currently: ON' : 'Currently: OFF'}
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setTheme(theme === 'night' ? 'paper' : 'night'))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'night' ? (
                    <Sun size={14} className="shrink-0 text-amber-500" />
                  ) : (
                    <Moon size={14} className="shrink-0 text-ink-secondary" />
                  )}
                  <span>Toggle Theme (Paper ↔ Night Edition)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">
                  {theme === 'night' ? 'Night Edition' : 'Paper Edition'}
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => updateSettings({ auto_advance_enabled: !autoAdvance }))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {autoAdvance ? (
                    <Pause size={14} className="shrink-0 text-accent" />
                  ) : (
                    <Play size={14} className="shrink-0 text-positive" />
                  )}
                  <span>Toggle Auto-Advance (7 Seconds)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">
                  {autoAdvance ? 'Running' : 'Off'}
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => toggleBreakingOnly())}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Flame size={14} className="shrink-0 text-accent" />
                  <span>Filter Breaking News Dispatches</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">
                  {isBreakingOnly ? 'Filter Active' : 'All Stories'}
                </span>
              </Command.Item>
            </Command.Group>

            {/* Group 4: Settings & Utilities */}
            <Command.Group
              heading="Desk Settings & Utilities"
              className="py-1 text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted px-2"
            >
              <Command.Item
                onSelect={() => runCommand(() => setSettingsOpen(true))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={14} className="shrink-0 text-ink-secondary" />
                  <span>Open Unified Desk Settings Dialog</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Key ','</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setAlertsOpen(true))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Radio size={14} className="shrink-0 text-ink-secondary" />
                  <span>Open Alerts Center</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Alerts</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setPdfOpen(true))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={14} className="shrink-0 text-ink-secondary" />
                  <span>Print & Export Daily Newspaper PDF</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">PDF Desk</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setBriefingOpen(true))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Volume2 size={14} className="shrink-0 text-ink-secondary" />
                  <span>Listen to Morning Radio Briefing</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Radio</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => setArchiveChatOpen(true))}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-2xs cursor-pointer text-ink hover:bg-paper-alt aria-selected:bg-paper-alt aria-selected:text-accent font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={14} className="shrink-0 text-ink-secondary" />
                  <span>Ask the Archival Wire (Historical Chat)</span>
                </div>
                <span className="font-mono text-[0.625rem] text-ink-muted">Archive</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Navigation Bar */}
          <div className="px-4 py-2 bg-paper-alt border-t border-paper-border flex items-center justify-between text-[0.625rem] font-mono text-ink-muted">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <span>Broadsheet Dispatch Telegraph</span>
          </div>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;


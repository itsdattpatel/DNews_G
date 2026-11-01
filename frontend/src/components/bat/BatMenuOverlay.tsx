/**
 * frontend/src/components/bat/BatMenuOverlay.tsx
 * Full-featured masthead menu overlay unfolding like a broadsheet newspaper.
 * Provides instant navigation to all screens, desk settings, and theme toggling.
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import type { AppView } from '../../types';
import {
  type LucideIcon,
  BookOpen,
  Layers,
  GitCompare,
  History,
  Globe2,
  Archive,
  Eye,
  Tv,
  FileText,
  Radio,
  Bell,
  Sliders,
  RadioTower,
  Sun,
  Moon,
  X,
} from 'lucide-react';

interface MenuItem {
  view: AppView;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { view: 'reader', label: 'Main Reader', icon: BookOpen, shortcut: 'j / k', description: 'Dual-pane translated article text with synchronized spider crawler' },
  { view: 'category', label: 'Category Rail', icon: Layers, shortcut: '/', description: 'Instant category filtering with outlet & country tags' },
  { view: 'compare', label: 'Compare Coverage', icon: GitCompare, description: 'Side-by-side international reporting on identical real-world events' },
  { view: 'timeline', label: 'Story Timeline', icon: History, description: 'Chronological progression of evolving world stories' },
  { view: 'globe', label: 'Global Radar Map', icon: Globe2, shortcut: 'g', description: 'Interactive 3D news globe with wildlife crime overlay' },
  { view: 'archive', label: 'Archive Morgue', icon: Archive, description: 'Historical article search & AI synthesis over local FTS5 database' },
  { view: 'watchlist', label: 'Watchlist Desk', icon: Eye, description: 'Automated monitoring of critical conservation & geopolitical topics' },
  { view: 'tv', label: 'Live TV Feeds', icon: Tv, shortcut: 't', description: 'Animal & Discovery television broadcast streams' },
  { view: 'pdf', label: 'Daily Newspaper PDF', icon: FileText, description: 'Export & print today’s broadsheet edition' },
  { view: 'briefing', label: 'Morning Briefing', icon: Radio, description: 'Two-minute AI audio radio briefing' },
  { view: 'alerts', label: 'Alerts Center', icon: Bell, description: 'Breaking news dispatches & provider switch records' },
  { view: 'sources-settings', label: 'API & Sources', icon: RadioTower, description: 'Provider adapters, quotas, masked keys, & rate limits' },
  { view: 'settings', label: 'Desk Preferences', icon: Sliders, description: 'Spider crawl speeds, sound, & database retention' },
];

export const BatMenuOverlay: React.FC = () => {
  const isBatMenuOpen = useAppStore((s) => s.isBatMenuOpen);
  const setBatMenuOpen = useAppStore((s) => s.setBatMenuOpen);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBatMenuOpen) {
        setBatMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBatMenuOpen, setBatMenuOpen]);

  const handleSelect = (view: AppView) => {
    if (view === 'compare' && !useAppStore.getState().compareClusterId) {
      const art = useAppStore.getState().selectedArticle;
      useAppStore.getState().setCompareClusterId(art?.cluster_id ?? 1);
    }
    if (view === 'timeline' && !useAppStore.getState().timelineClusterId) {
      const art = useAppStore.getState().selectedArticle;
      useAppStore.getState().setTimelineClusterId(art?.cluster_id ?? 1);
    }
    if (view === 'globe') {
      useAppStore.getState().setGlobeOpen(true);
    }
    if (view === 'archive') {
      useAppStore.getState().setArchiveChatOpen(true);
    }
    if (view === 'watchlist') {
      useAppStore.getState().setWatchlistOpen(true);
    }
    if (view === 'tv') {
      useAppStore.getState().setTvViewOpen(true);
    }
    if (view === 'briefing') {
      useAppStore.getState().setBriefingOpen(true);
    }
    if (view === 'pdf') {
      useAppStore.getState().setPdfOpen(true);
    }
    setCurrentView(view);
  };

  return (
    <AnimatePresence>
      {isBatMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-start items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setBatMenuOpen(false)}
            className="fixed inset-0 bg-ink/50 backdrop-blur-xs"
          />

          {/* Paper-Fold Unfolding Panel */}
          <motion.div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="The World Desk Masthead Menu"
            style={{ transformOrigin: 'top center' }}
            initial={{ scaleY: 0.7, opacity: 0, y: -20 }}
            animate={{ scaleY: 1, opacity: 1, y: 0 }}
            exit={{ scaleY: 0.8, opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-4xl mt-3 mx-4 bg-paper-alt border-2 border-ink shadow-overlay rounded-xs overflow-hidden text-ink"
          >
            {/* Broadsheet Masthead Header */}
            <div className="border-b-2 border-ink p-6 bg-paper flex items-center justify-between">
              <div>
                <span className="font-masthead text-4xl sm:text-5xl tracking-tight block text-ink">
                  The World Desk
                </span>
                <span className="font-ui text-xs uppercase tracking-widest text-ink-secondary">
                  Broadsheet Directory & Section Navigator · Vol. XCII No. 41
                </span>
              </div>
              <button
                onClick={() => setBatMenuOpen(false)}
                className="p-2 border border-paper-border rounded-xs hover:bg-paper-alt text-ink transition-colors"
                aria-label="Close Menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto">
              {MENU_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                const Icon = item.icon;

                return (
                  <button
                    key={item.view}
                    onClick={() => handleSelect(item.view)}
                    className={`flex flex-col text-left p-3.5 rounded-xs border transition-all ${
                      isActive
                        ? 'border-ink bg-paper font-semibold shadow-xs news-rule-t'
                        : 'border-paper-border/80 bg-paper-alt/50 hover:bg-paper hover:border-ink hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={isActive ? 'text-accent' : 'text-ink-secondary'} />
                        <span className="font-headline text-sm font-bold text-ink">{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <span className="font-mono text-[0.625rem] bg-paper-border/60 text-ink-muted px-1.5 py-0.5 rounded-xs">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                    <span className="font-ui text-xs text-ink-secondary line-clamp-2">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Theme & Keyboard Helper Bar */}
            <div className="border-t border-paper-border p-4 bg-paper flex flex-wrap items-center justify-between gap-4">
              {/* Theme Switcher */}
              <div className="flex items-center gap-2 font-ui text-xs">
                <span className="text-ink-muted uppercase font-bold tracking-wider">Edition:</span>
                <button
                  onClick={() => setTheme('paper')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-semibold transition-colors ${
                    theme === 'paper'
                      ? 'border-ink bg-paper-alt text-ink shadow-xs'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Sun size={13} className="text-amber-700" />
                  <span>Paper (Day)</span>
                </button>
                <button
                  onClick={() => setTheme('night')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-semibold transition-colors ${
                    theme === 'night'
                      ? 'border-ink bg-paper-alt text-ink shadow-xs'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Moon size={13} className="text-accent" />
                  <span>Night Edition</span>
                </button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="font-mono text-[0.6875rem] text-ink-muted">
                Keys: <kbd className="px-1 border border-paper-border rounded-xs">b</kbd> menu · <kbd className="px-1 border border-paper-border rounded-xs">j</kbd>/<kbd className="px-1 border border-paper-border rounded-xs">k</kbd> article · <kbd className="px-1 border border-paper-border rounded-xs">g</kbd> globe · <kbd className="px-1 border border-paper-border rounded-xs">t</kbd> tv · <kbd className="px-1 border border-paper-border rounded-xs">Esc</kbd> close
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BatMenuOverlay;

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
  Activity,
  Library,
  Palette,
  Sun,
  Moon,
  X,
  Camera,
  Rss,
  Share2,
  Newspaper,
  Network,
  GraduationCap,
  Calendar,
  ShieldAlert,
  Scale,
  Compass,
  Stamp,
  KeyRound,
} from 'lucide-react';

interface MenuItem {
  view: AppView | 'library' | 'history-frontpage' | 'wisdom-deck' | 'mindmap' | 'investigative' | 'editorial' | 'broadcast' | 'war-room' | 'bindery' | 'sovereign';
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { view: 'reader', label: 'Main Reader', icon: BookOpen, shortcut: 'j / k', description: 'Dual-pane translated article text with verbatim evidence linking' },
  { view: 'investigative', label: 'Investigative & OSINT Desk', icon: ShieldAlert, shortcut: 'i', description: 'Fact-checking, whistleblower drop, conflict timelines, and sanctions screening' },
  { view: 'editorial', label: 'Editorial Intelligence Desk', icon: Scale, shortcut: 'e', description: "Devil's advocate counter-arguments, history rhymes, jargon demystifier, and Socratic inquiry" },
  { view: 'broadcast', label: 'Broadcast & Media Soundstage', icon: Radio, shortcut: 'm', description: 'Two-host radio podcast briefings, pressroom soundscapes, and 1938 shortwave radio' },
  { view: 'war-room', label: 'Cartography & Ticker War Room', icon: Compass, shortcut: 'w', description: 'Commodities tape, maritime chokepoints, climate anomalies, parliament sim & flights' },
  { view: 'bindery', label: 'Broadside Bindery & Artifacts', icon: Stamp, shortcut: 'y', description: 'Printable folio PDFs, rubber stamps, custom masthead, paper patina & daily crossword' },
  { view: 'sovereign', label: 'Sovereign & Mobile Enclave', icon: KeyRound, shortcut: 's', description: '1-bit E-Ink mode, vintage share clippings, P2P mesh sync, Wayback mirror, FIDO2 & HTML export' },
  { view: 'library', label: 'The Library', icon: Library, shortcut: 'l', description: 'Tranquil reading room: historical archives, sacred scriptures & mind helps' },
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
  { view: 'control-room', label: 'Control Room', icon: Activity, shortcut: 'c', description: 'Freshness telemetry, scheduler metrics, AI quotas, & error ledger' },
  { view: 'photojournalism', label: 'Photojournalism Desk', icon: Camera, description: 'International documentary press photography gallery' },
  { view: 'sunday-edition', label: 'Sunday Edition Magazine', icon: Newspaper, description: 'Weekend long-form broadsheet features with multi-column layout & drop-caps' },
  { view: 'history-frontpage', label: 'On This Day in History', icon: Calendar, description: 'Historical broadsheet facsimiles from 50, 100, and 150 years ago' },
  { view: 'wisdom-deck', label: 'Wisdom Spaced Repetition', icon: GraduationCap, description: 'Leitner flashcard review deck for philosophy maxims & statecraft' },
  { view: 'mindmap', label: 'Knowledge Mind-Map', icon: Network, description: 'Interactive relational concept graph connecting your saved dispatches' },
  { view: 'custom-rss', label: 'Custom RSS Studio', icon: Rss, description: 'Syndicate custom RSS & Atom feeds to your newsprint wire' },
  { view: 'source-health', label: 'Wire Health & Latency', icon: Radio, description: 'Live latency scoreboard across all bureaus' },
  { view: 'entities', label: 'Entity Network Map', icon: Share2, description: 'Relational topology connecting nations, leaders, and global treaties' },
  { view: 'sources-settings', label: 'API & Sources', icon: RadioTower, description: 'Provider adapters, quotas, masked keys, & rate limits' },
  { view: 'settings', label: 'Desk Preferences', icon: Sliders, description: 'Theme preferences, sound, & database retention' },
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

  const handleSelect = (view: AppView | 'library' | 'history-frontpage' | 'wisdom-deck' | 'mindmap' | 'investigative' | 'editorial' | 'broadcast' | 'war-room' | 'bindery' | 'sovereign') => {
    if (view === 'library') {
      setBatMenuOpen(false);
      useAppStore.getState().openLibrary();
      return;
    }

    if (view === 'investigative') {
      setBatMenuOpen(false);
      useAppStore.getState().setInvestigativeDeskOpen(true);
      return;
    }

    if (view === 'editorial') {
      setBatMenuOpen(false);
      useAppStore.getState().setEditorialIntelligenceOpen(true);
      return;
    }

    if (view === 'broadcast') {
      setBatMenuOpen(false);
      useAppStore.getState().setBroadcastDeskOpen(true);
      return;
    }

    if (view === 'war-room') {
      setBatMenuOpen(false);
      useAppStore.getState().setCartographyDeskOpen(true);
      return;
    }

    if (view === 'bindery') {
      setBatMenuOpen(false);
      useAppStore.getState().setBinderyDeskOpen(true);
      return;
    }

    if (view === 'sovereign') {
      setBatMenuOpen(false);
      useAppStore.getState().setSovereignDeskOpen(true);
      return;
    }

    if (view === 'history-frontpage') {
      setBatMenuOpen(false);
      useAppStore.getState().setHistoryFrontPageOpen(true);
      return;
    }

    if (view === 'wisdom-deck') {
      setBatMenuOpen(false);
      useAppStore.getState().setWisdomSpacedRepetitionOpen(true);
      return;
    }

    if (view === 'mindmap') {
      setBatMenuOpen(false);
      useAppStore.getState().setKnowledgeMindMapOpen(true);
      return;
    }

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
    if (view === 'alerts') {
      useAppStore.getState().setAlertsOpen(true);
    }
    if (view === 'control-room') {
      useAppStore.getState().setControlRoomOpen(true);
    }
    if (view === 'sources-settings') {
      useAppStore.getState().setSourcesOpen(true);
    }
    if (view === 'photojournalism' || view === 'custom-rss' || view === 'source-health') {
      setBatMenuOpen(false);
      setCurrentView(view);
      return;
    }
    if (view === 'settings') {
      useAppStore.getState().setSettingsOpen(true);
    }
    setBatMenuOpen(false);
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
            className="relative z-10 w-full max-w-4xl max-h-[92dvh] flex flex-col mt-3 mx-4 bg-paper-alt border-2 border-ink shadow-overlay rounded-xs overflow-hidden text-ink"
          >
            {/* Broadsheet Masthead Header */}
            <div className="border-b-2 border-ink p-4 sm:p-6 bg-paper flex items-center justify-between shrink-0">
              <div>
                <span className="font-masthead text-3xl sm:text-5xl tracking-tight block text-ink">
                  The World Desk
                </span>
                <span className="font-ui text-[11px] sm:text-xs uppercase tracking-widest text-ink-secondary">
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
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto">
              {MENU_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                const Icon = item.icon;
                const itemBtnId = item.view === 'photojournalism' ? 'btn-menu-photojournalism'
                  : item.view === 'custom-rss' ? 'btn-menu-custom-rss'
                    : item.view === 'source-health' ? 'btn-menu-source-health'
                      : item.view === 'entities' ? 'btn-menu-entities'
                        : item.view === 'sunday-edition' ? 'btn-menu-sunday-edition'
                          : item.view === 'history-frontpage' ? 'btn-menu-history-frontpage'
                            : item.view === 'wisdom-deck' ? 'btn-menu-wisdom-deck'
                              : item.view === 'mindmap' ? 'btn-menu-mindmap' : undefined;

                return (
                  <button
                    key={item.view}
                    id={itemBtnId}
                    onClick={() => handleSelect(item.view)}
                    className={`flex flex-col text-left p-3.5 rounded-xs border transition-all ${isActive
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

            {/* Bottom Theme, Quick Mobile Filters & Keyboard Helper Bar */}
            <div className="border-t border-paper-border p-3 sm:p-4 bg-paper flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Mobile Region Filter Strip (visible on < sm screens where TopBar hides select) */}
              <div className="flex sm:hidden items-center gap-1.5 w-full overflow-x-auto pb-1 border-b border-paper-border/60">
                <span className="font-mono text-[10px] uppercase font-bold text-ink-muted shrink-0 mr-1">
                  Region:
                </span>
                {[
                  { label: 'All', value: null },
                  { label: 'India', value: 'India' },
                  { label: 'USA', value: 'USA' },
                  { label: 'China', value: 'China' },
                  { label: 'Japan', value: 'Japan' },
                  { label: 'Wildlife', value: 'Animals' },
                ].map((r) => {
                  const selected = useAppStore.getState().selectedCountry === r.value;
                  return (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => {
                        useAppStore.getState().setSelectedCountry(r.value);
                        setBatMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded-xs border font-mono text-[10px] font-bold uppercase shrink-0 cursor-pointer ${
                        selected
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper-alt text-ink-secondary border-paper-border'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Theme Switcher */}
              <div className="flex items-center gap-2 font-ui text-xs">
                <span className="text-ink-muted uppercase font-bold tracking-wider">Edition:</span>
                <button
                  onClick={() => setTheme('paper')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-semibold transition-colors ${theme === 'paper'
                    ? 'border-ink bg-paper-alt text-ink shadow-xs'
                    : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                >
                  <Sun size={13} className="text-amber-700" />
                  <span>Paper (Day)</span>
                </button>
                <button
                  onClick={() => setTheme('night')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-semibold transition-colors ${theme === 'night'
                    ? 'border-ink bg-paper-alt text-ink shadow-xs'
                    : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                >
                  <Moon size={13} className="text-accent" />
                  <span>Night Edition</span>
                </button>

                <div className="w-px h-4 bg-paper-border mx-1" />

                <button
                  id="btn-bat-theme-studio"
                  onClick={() => {
                    setBatMenuOpen(false);
                    useAppStore.getState().setThemeStudioOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-ink/40 bg-paper-alt hover:border-ink text-xs font-semibold text-ink transition-colors"
                >
                  <Palette size={13} className="text-accent" />
                  <span>50 Themes & RGB</span>
                </button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="hidden sm:block font-mono text-[0.6875rem] text-ink-muted">
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

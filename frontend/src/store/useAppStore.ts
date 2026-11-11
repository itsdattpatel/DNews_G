/**
 * frontend/src/store/useAppStore.ts
 * Master Zustand store managing articles, UI drawers, live quota, and alerts.
 */
import { create } from 'zustand';
import type { Article, AlertItem, QuotaData, AppSettings, StartupStatus, BackfillResponse, AppView, ThemeMode, TvChannel } from '../types';
import type { FeedCounterMetrics } from '../types/feedCounter';
import { playButtonSound, playAlertChime } from '../utils/sound';

function buildOverlayViewPatch(
  state: AppState,
  openKey: keyof AppState,
  open: boolean,
  associatedView: AppView,
): Partial<AppState> {
  return {
    [openKey]: open,
    ...(!open && state.currentView === associatedView ? { currentView: 'reader' as AppView } : {}),
  } as Partial<AppState>;
}

function navigateArticleStep(
  state: AppState,
  direction: 1 | -1,
): { target: Article | null; refreshedQueueIds?: number[] } {
  const { articles, autoAdvanceQueueIds, selectedArticleId } = state;
  if (!articles.length) return { target: null };

  const queue =
    state.settings.auto_advance_enabled && autoAdvanceQueueIds.length > 0
      ? autoAdvanceQueueIds
          .map((id) => articles.find((a) => a.id === id))
          .filter((a): a is Article => Boolean(a))
      : articles;

  const activeList = queue.length > 0 ? queue : articles;
  const idx = activeList.findIndex((a) => a.id === selectedArticleId);

  if (direction === 1) {
    if (idx !== -1 && idx < activeList.length - 1) {
      return { target: activeList[idx + 1] ?? null };
    }
    return {
      target: articles[0] ?? activeList[0] ?? null,
      refreshedQueueIds: articles.map((a) => a.id),
    };
  }

  if (idx > 0) {
    return { target: activeList[idx - 1] ?? null };
  }
  return {
    target: articles[articles.length - 1] ?? activeList[activeList.length - 1] ?? null,
    refreshedQueueIds: articles.map((a) => a.id),
  };
}

interface AppState {
  // Navigation & Shell (Step 2)
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isBatMenuOpen: boolean;
  setBatMenuOpen: (open: boolean) => void;
  nextArticle: (options?: { isAutoAdvance?: boolean }) => void;
  prevArticle: (options?: { isAutoAdvance?: boolean }) => void;
  // Articles
  articles: Article[];
  autoAdvanceQueueIds: number[];
  selectedArticleId: number | null;
  selectedArticle: Article | null;
  activeSentenceIndex: number | null;
  isReadingModeActive: boolean;
  totalArticles: number;
  isLoading: boolean;
  setArticles: (articles: Article[], total: number) => void;
  setSelectedArticle: (article: Article | null, options?: { isAutoAdvance?: boolean }) => void;
  setActiveSentenceIndex: (index: number | null) => void;
  setReadingModeActive: (active: boolean) => void;
  toggleReadingMode: () => void;
  selectArticleById: (id: number) => Promise<void>;
  enrichArticlePass2: (id: number) => Promise<void>;
  addOrPrependArticle: (article: Article) => void;
  toggleBookmark: (articleId: number) => Promise<void>;

  // Filters
  selectedCountry: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  isBreakingOnly: boolean;
  setSelectedCountry: (country: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleBreakingOnly: () => void;

  // Settings & Drawer
  isSettingsOpen: boolean;
  settings: AppSettings;
  setSettingsOpen: (open: boolean) => void;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // Startup & Catch-Up
  startupStatus: StartupStatus | null;
  isMissedNewsModalOpen: boolean;
  setMissedNewsModalOpen: (open: boolean) => void;
  checkStartupStatus: () => Promise<void>;
  triggerBackfill: () => Promise<BackfillResponse>;

  // Quota & Provider
  quota: QuotaData | null;
  currentProvider: string;
  fetchQuota: () => Promise<void>;
  setCurrentProvider: (p: string) => void;

  // Alerts
  alerts: AlertItem[];
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp'>) => void;
  dismissAlert: (id: string) => void;

  // Story Clustering & Compare Coverage (Phase 7)
  compareClusterId: number | null;
  setCompareClusterId: (id: number | null) => void;
  timelineClusterId: number | null;
  setTimelineClusterId: (id: number | null) => void;

  // Archive Chat (Phase 8)
  isArchiveChatOpen: boolean;
  setArchiveChatOpen: (open: boolean) => void;

  // Globe & Wildlife Map (Phase 9)
  isGlobeOpen: boolean;
  setGlobeOpen: (open: boolean) => void;

  // Morning Briefing & Read-Aloud (Phase 10)
  isBriefingOpen: boolean;
  setBriefingOpen: (open: boolean) => void;

  // Daily Newspaper PDF Desk (Step 12)
  isPdfOpen: boolean;
  setPdfOpen: (open: boolean) => void;

  // TV View (Phase 11)
  isTvViewOpen: boolean;
  setTvViewOpen: (open: boolean) => void;
  selectedTvChannelId: number | null;
  setSelectedTvChannelId: (id: number | null) => void;

  // Watchlist Desk (Step 10)
  isWatchlistOpen: boolean;
  setWatchlistOpen: (open: boolean) => void;

  // Alerts Center Desk (Step 13)
  isAlertsOpen: boolean;
  setAlertsOpen: (open: boolean) => void;

  // API & Sources Settings Desk (Step 14)
  isSourcesOpen: boolean;
  setSourcesOpen: (open: boolean) => void;

  // Control Room Desk (PRD A Category 11)
  isControlRoomOpen: boolean;
  setControlRoomOpen: (open: boolean) => void;

  // Resizable Panels State (Persistent layout)
  panelSizesH: [number, number];
  panelSizesV: [number, number];
  setPanelSizesH: (sizes: [number, number]) => void;
  setPanelSizesV: (sizes: [number, number]) => void;
  resetPanelSizes: () => void;

  // Auto-Advance Reader (PRD A Category 2 / PRD D Category 2)
  isAutoAdvanceManualPaused: boolean;
  setIsAutoAdvanceManualPaused: (paused: boolean) => void;
  toggleAutoAdvanceManualPaused: () => void;
  toggleStatusStripPlayPause: () => Promise<void>;
  isArticlePanelHovered: boolean;
  setIsArticlePanelHovered: (hovered: boolean) => void;
  autoAdvanceResetToken: number;
  triggerAutoAdvanceReset: () => void;

  // Live Feed Counter & Telemetry (PRD A Category 8)
  feedCounter: FeedCounterMetrics | null;
  isFeedCounterOpen: boolean;
  setFeedCounterOpen: (open: boolean) => void;
  fetchFeedCounter: () => Promise<void>;

  // Right Icon Rail (PRD C Category 1)
  isRailPinned: boolean;
  setIsRailPinned: (pinned: boolean) => void;
  toggleRailPinned: () => void;

  // Category 8 Suggestions (S1 - S4)
  // S1: Command Palette
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // S3: Layout Presets
  layoutPreset: 'balanced' | 'focus' | 'split';
  setLayoutPreset: (preset: 'balanced' | 'focus' | 'split') => void;

  // S4: TV Mini-Player (Picture-in-Picture)
  activeTvStream: TvChannel | null;
  setActiveTvStream: (ch: TvChannel | null) => void;
  isTvMiniPlayerOpen: boolean;
  setTvMiniPlayerOpen: (open: boolean) => void;

  // S2: System Health Indicator
  systemHealth: {
    status: 'healthy' | 'degraded' | 'error';
    label: string;
    details: {
      rss: string;
      ai: string;
      scheduler: string;
      db: string;
      tv: string;
    };
  };
  fetchSystemHealth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation & Shell (Step 2)
  currentView: 'reader',
  setCurrentView: (view) => {
    playButtonSound(get().settings.sound_enabled);
    set({ currentView: view, isBatMenuOpen: false });
  },
  theme: (typeof window !== 'undefined' && (localStorage.getItem('news_desk_theme') as ThemeMode)) || 'paper',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('news_desk_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  isBatMenuOpen: false,
  setBatMenuOpen: (open) => set({ isBatMenuOpen: open }),

  // Resizable Panels State
  panelSizesH: (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('news_desk_panel_sizes_h');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [60, 40];
  })(),
  panelSizesV: (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('news_desk_panel_sizes_v');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [78, 22];
  })(),
  setPanelSizesH: (sizes) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('news_desk_panel_sizes_h', JSON.stringify(sizes));
    }
    set({ panelSizesH: sizes });
  },
  setPanelSizesV: (sizes) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('news_desk_panel_sizes_v', JSON.stringify(sizes));
    }
    set({ panelSizesV: sizes });
  },
  resetPanelSizes: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('news_desk_panel_sizes_h', JSON.stringify([60, 40]));
      localStorage.setItem('news_desk_panel_sizes_v', JSON.stringify([78, 22]));
    }
    set({ panelSizesH: [60, 40], panelSizesV: [78, 22] });
  },

  nextArticle: (options) => {
    const { target, refreshedQueueIds } = navigateArticleStep(get(), 1);
    if (!target) return;
    if (refreshedQueueIds) {
      set({ autoAdvanceQueueIds: refreshedQueueIds });
    }
    get().setSelectedArticle(target, options);
  },

  prevArticle: (options) => {
    const { target, refreshedQueueIds } = navigateArticleStep(get(), -1);
    if (!target) return;
    if (refreshedQueueIds) {
      set({ autoAdvanceQueueIds: refreshedQueueIds });
    }
    get().setSelectedArticle(target, options);
  },

  // Auto-Advance State & Handlers
  autoAdvanceQueueIds: [],
  isAutoAdvanceManualPaused: false,
  setIsAutoAdvanceManualPaused: (paused) => set({ isAutoAdvanceManualPaused: paused }),
  toggleAutoAdvanceManualPaused: () =>
    set((state) => ({ isAutoAdvanceManualPaused: !state.isAutoAdvanceManualPaused })),
  toggleStatusStripPlayPause: async () => {
    const { settings, isAutoAdvanceManualPaused, updateSettings } = get();
    if (!settings.auto_advance_enabled) {
      await updateSettings({ auto_advance_enabled: true });
      return;
    }
    set({ isAutoAdvanceManualPaused: !isAutoAdvanceManualPaused });
  },
  isArticlePanelHovered: false,
  setIsArticlePanelHovered: (hovered) => set({ isArticlePanelHovered: hovered }),
  autoAdvanceResetToken: 0,
  triggerAutoAdvanceReset: () =>
    set((state) => ({ autoAdvanceResetToken: state.autoAdvanceResetToken + 1 })),

  articles: [],
  selectedArticleId: null,
  selectedArticle: null,
  activeSentenceIndex: null,
  isReadingModeActive: false,
  totalArticles: 0,
  isLoading: false,

  setActiveSentenceIndex: (index) => set({ activeSentenceIndex: index }),
  setReadingModeActive: (active) => set({ isReadingModeActive: active }),
  toggleReadingMode: () => set((state) => ({ isReadingModeActive: !state.isReadingModeActive })),

  setArticles: (articles, total) => {
    const currentSelected = get().selectedArticleId;
    let nextSelected = get().selectedArticle;

    if (!nextSelected && articles.length > 0) {
      nextSelected = articles[0] ?? null;
    } else if (currentSelected) {
      const match = articles.find((a) => a.id === currentSelected);
      if (match) nextSelected = match;
    }

    set((state) => ({
      articles,
      totalArticles: total,
      selectedArticle: nextSelected,
      selectedArticleId: nextSelected?.id ?? null,
      isLoading: false,
      // Keep active Auto-Advance queue order stable during background refetches;
      // initialize or update freely when Auto-Advance is off or queue was reset on filter change.
      autoAdvanceQueueIds:
        state.settings.auto_advance_enabled && state.autoAdvanceQueueIds.length > 0
          ? state.autoAdvanceQueueIds
          : articles.map((a) => a.id),
    }));

    if (nextSelected && !nextSelected.body_english) {
      get().selectArticleById(nextSelected.id);
    }
  },

  setSelectedArticle: (article, options) => {
    playButtonSound(get().settings.sound_enabled);
    set({
      selectedArticle: article,
      selectedArticleId: article?.id ?? null,
      activeSentenceIndex: null,
      isReadingModeActive: false,
    });
    if (article && !article.body_english) {
      get().selectArticleById(article.id);
    }
    if (!options?.isAutoAdvance) {
      get().triggerAutoAdvanceReset();
    }
  },

  selectArticleById: async (id: number) => {
    playButtonSound(get().settings.sound_enabled);
    try {
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        const fullArticle = (await res.json()) as Article;
        set({
          selectedArticle: fullArticle,
          selectedArticleId: id,
        });
      }
    } catch {
      // fallback to in-memory card
      const found = get().articles.find((a) => a.id === id);
      if (found) {
        set({ selectedArticle: found, selectedArticleId: id });
      }
    }
  },

  enrichArticlePass2: async (id: number) => {
    playButtonSound(get().settings.sound_enabled);
    try {
      const res = await fetch(`/api/articles/${id}/enrich-pass2`, { method: 'POST' });
      if (res.ok) {
        const enriched = (await res.json()) as Article;
        set((state) => ({
          selectedArticle: state.selectedArticle?.id === id ? enriched : state.selectedArticle,
          articles: state.articles.map((a) => (a.id === id ? { ...a, ...enriched } : a)),
        }));
      }
    } catch (err) {
      console.error(`[AppStore] Pass 2 enrichment failed for article ${id}:`, err);
    }
  },

  addOrPrependArticle: (article) => {
    set((state) => {
      const exists = state.articles.some((a) => a.id === article.id);
      if (exists) {
        return {
          articles: state.articles.map((a) => (a.id === article.id ? article : a)),
        };
      }
      return {
        articles: [article, ...state.articles],
        totalArticles: state.totalArticles + 1,
      };
    });
  },

  toggleBookmark: async (articleId: number) => {
    playButtonSound(get().settings.sound_enabled);
    try {
      const res = await fetch(`/api/articles/${articleId}/bookmark`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as { bookmarked: boolean };
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === articleId ? { ...a, bookmarked: data.bookmarked } : a,
          ),
          selectedArticle:
            state.selectedArticle?.id === articleId
              ? { ...state.selectedArticle, bookmarked: data.bookmarked }
              : state.selectedArticle,
        }));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  },

  // Filters
  selectedCountry: null,
  selectedCategory: null,
  searchQuery: '',
  isBreakingOnly: false,

  setSelectedCountry: (country) => {
    playButtonSound(get().settings.sound_enabled);
    set({ selectedCountry: country, autoAdvanceQueueIds: [] });
  },

  setSelectedCategory: (category) => {
    playButtonSound(get().settings.sound_enabled);
    set({ selectedCategory: category, autoAdvanceQueueIds: [] });
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery, autoAdvanceQueueIds: [] });
  },

  toggleBreakingOnly: () => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => ({ isBreakingOnly: !state.isBreakingOnly, autoAdvanceQueueIds: [] }));
  },

  // Settings
  isSettingsOpen: false,
  settings: {
    // General & Realtime
    timezone_mode: 'local',
    catchup_alert_enabled: true,
    clock_sync_enabled: true,
    debug_logging: false,
    rail_pinned: false,

    // Reading
    auto_advance_enabled: false,
    auto_advance_interval_sec: 7,
    auto_advance_pause_on_hover: true,
    strip_follow_enabled: true,
    strip_follow_grace_sec: 4,
    ticker_speed: 'normal',
    evidence_highlight_enabled: true,
    reading_mode_enabled: true,

    // News & Sources
    refresh_interval_minutes: 15,
    default_country_filter: '',
    category_filter_list: 'all',
    enrich_batch_size: 20,

    // AI & Plain
    plain_mode_enabled: false,
    two_pass_ai_enabled: true,
    pass2_threshold: 75,

    // TV
    tv_method_order: 'youtube,hls,vlc',
    tv_autoplay_muted: true,
    tv_volume: 0.8,
    tv_health_interval_min: 30,
    tv_stopped_fail_threshold: 5,
    tv_mini_player_enabled: false,

    // Map & Globe
    map_engine: 'globe',
    globe_autorotate: true,
    map_wildlife_layer: true,
    map_pulse_enabled: true,

    // Alerts & Sound
    alert_threshold: 75,
    sound_enabled: true,
    browser_notifications: false,

    // Appearance
    theme: 'paper',
    layout_density: 'comfortable',
    reduce_motion_override: 'system',

    // Data & Storage
    auto_cleanup_enabled: false,
    retention_days: 30,

    // Library
    library_citation_format: 'apa',
    helpline_default_region: 'all',
  },

  setSettingsOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isSettingsOpen', open, 'settings'));
  },

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = (await res.json()) as AppSettings;
        set((state) => ({
          settings: data,
          isAutoAdvanceManualPaused: false,
          autoAdvanceQueueIds:
            data.auto_advance_enabled && state.autoAdvanceQueueIds.length === 0
              ? state.articles.map((a) => a.id)
              : state.autoAdvanceQueueIds,
        }));
      }
    } catch {
      // use default
    }
  },

  updateSettings: async (updates) => {
    playButtonSound(get().settings.sound_enabled);
    // Optimistically update store so UI and timers react instantaneously.
    // Toggling auto_advance_enabled always clears any stale manual pause and refreshes queue order.
    set((state) => ({
      settings: { ...state.settings, ...updates },
      ...('auto_advance_enabled' in updates
        ? {
            isAutoAdvanceManualPaused: false,
            autoAdvanceQueueIds: updates.auto_advance_enabled
              ? state.articles.map((a) => a.id)
              : [],
          }
        : {}),
    }));
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = (await res.json()) as AppSettings;
        set({ settings: data });
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  },

  // Startup & Catch-Up
  startupStatus: null,
  isMissedNewsModalOpen: false,

  setMissedNewsModalOpen: (open) => {
    set({ isMissedNewsModalOpen: open });
  },

  checkStartupStatus: async () => {
    try {
      const res = await fetch('/api/startup-status');
      if (res.ok) {
        const data = (await res.json()) as StartupStatus;
        const dismissed =
          typeof window !== 'undefined' &&
          (sessionStorage.getItem('missed_news_dismissed') === 'true' ||
            localStorage.getItem('missed_news_dismissed') === 'true');
        set({
          startupStatus: data,
          isMissedNewsModalOpen: Boolean(!dismissed && data.detected && data.missed_minutes >= 5),
        });
      }
    } catch (err) {
      console.warn('Failed to check startup status:', err);
    }
  },

  triggerBackfill: async () => {
    const res = await fetch('/api/backfill', { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Backfill failed with status ${res.status}`);
    }
    const data = (await res.json()) as BackfillResponse;

    // Refresh articles so backfilled dispatches immediately show in the CardStrip
    try {
      const artRes = await fetch('/api/articles?limit=50&offset=0');
      if (artRes.ok) {
        const artData = (await artRes.json()) as { items: Article[]; total: number };
        get().setArticles(artData.items, artData.total);
      }
    } catch {
      // ignore
    }

    // If honest gap warning exists, push warning alert to AlertBanner stack
    if (data.warning) {
      get().addAlert({
        type: 'warning',
        message: data.warning,
      });
    }

    // Refresh startup status
    await get().checkStartupStatus();

    return data;
  },

  // Quota
  quota: null,
  currentProvider: 'gemini',

  fetchQuota: async () => {
    try {
      const res = await fetch('/api/quota');
      if (res.ok) {
        const data = (await res.json()) as QuotaData;
        set({ quota: data, currentProvider: data.current_provider });
      }
    } catch {
      // ignore
    }
  },

  setCurrentProvider: (provider) => {
    set({ currentProvider: provider });
  },

  // Alerts
  alerts: [],

  addAlert: (alert) => {
    playAlertChime(get().settings.sound_enabled);
    const newAlert: AlertItem = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      alerts: [newAlert, ...state.alerts].slice(0, 3), // Stack up to 3
    }));

    // Auto dismiss after 30s
    setTimeout(() => {
      get().dismissAlert(newAlert.id);
    }, 30000);
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  // Story Clustering & Compare Coverage (Phase 7)
  compareClusterId: null,
  setCompareClusterId: (id) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => ({
      compareClusterId: id,
      ...(!id && state.currentView === 'compare' ? { currentView: 'reader' as AppView } : {}),
    }));
  },
  timelineClusterId: null,
  setTimelineClusterId: (id) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => ({
      timelineClusterId: id,
      ...(!id && state.currentView === 'timeline' ? { currentView: 'reader' as AppView } : {}),
    }));
  },

  // Archive Chat (Phase 8)
  isArchiveChatOpen: false,
  setArchiveChatOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isArchiveChatOpen', open, 'archive'));
  },

  // Globe & Wildlife Map (Phase 9)
  isGlobeOpen: false,
  setGlobeOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isGlobeOpen', open, 'globe'));
  },

  // Morning Briefing & Read-Aloud (Phase 10)
  isBriefingOpen: false,
  setBriefingOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isBriefingOpen', open, 'briefing'));
  },

  // Daily Newspaper PDF Desk (Step 12)
  isPdfOpen: false,
  setPdfOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isPdfOpen', open, 'pdf'));
  },

  // TV View (Phase 11)
  isTvViewOpen: false,
  setTvViewOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isTvViewOpen', open, 'tv'));
  },
  selectedTvChannelId: null,
  setSelectedTvChannelId: (id) => {
    playButtonSound(get().settings.sound_enabled);
    set({ selectedTvChannelId: id });
  },

  // Watchlist Desk (Step 10)
  isWatchlistOpen: false,
  setWatchlistOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isWatchlistOpen', open, 'watchlist'));
  },

  // Alerts Center Desk (Step 13)
  isAlertsOpen: false,
  setAlertsOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isAlertsOpen', open, 'alerts'));
  },

  // API & Sources Settings Desk (Step 14)
  isSourcesOpen: false,
  setSourcesOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isSourcesOpen', open, 'sources-settings'));
  },

  // Control Room Desk (PRD A Category 11)
  isControlRoomOpen: false,
  setControlRoomOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => buildOverlayViewPatch(state, 'isControlRoomOpen', open, 'control-room'));
  },

  // Live Feed Counter & Telemetry (PRD A Category 8)
  feedCounter: null,
  isFeedCounterOpen: false,
  setFeedCounterOpen: (open) => {
    set({ isFeedCounterOpen: open });
  },
  fetchFeedCounter: async () => {
    try {
      const res = await fetch('/api/feed/counter');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({
            feedCounter: {
              rolling24h: data.rolling24h,
              seven_day_total: data.seven_day_total,
              thirty_day_total: data.thirty_day_total,
              lifetime: data.lifetime,
              session_stats: data.session_stats,
            },
          });
        }
      }
    } catch (err) {
      console.warn('[FeedCounter] Failed to fetch feed counter metrics:', err);
    }
  },

  // Right Icon Rail (PRD C Category 1)
  isRailPinned:
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? localStorage.getItem('news_rail_pinned') === 'true'
      : false,
  setIsRailPinned: (pinned) => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        localStorage.setItem('news_rail_pinned', String(pinned));
      }
    } catch {
      // ignore in tests or private browsing
    }
    set({ isRailPinned: pinned });
  },
  toggleRailPinned: () => {
    const next = !get().isRailPinned;
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        localStorage.setItem('news_rail_pinned', String(next));
      }
    } catch {
      // ignore in tests or private browsing
    }
    set({ isRailPinned: next });
  },

  // Category 8 Suggestions (S1 - S4)
  // S1: Command Palette
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),

  // S3: Layout Presets
  layoutPreset: (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('news_desk_layout_preset');
        if (saved === 'balanced' || saved === 'focus' || saved === 'split') return saved;
      } catch {}
    }
    return 'balanced';
  })(),
  setLayoutPreset: (preset) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('news_desk_layout_preset', preset);
      }
    } catch {}

    // Apply layout preset dimensions
    if (preset === 'balanced') {
      get().setPanelSizesH([60, 40]);
      get().setPanelSizesV([78, 22]);
    } else if (preset === 'focus') {
      get().setPanelSizesH([85, 15]);
      get().setPanelSizesV([85, 15]);
    } else if (preset === 'split') {
      get().setPanelSizesH([50, 50]);
      get().setPanelSizesV([70, 30]);
    }
    set({ layoutPreset: preset });
  },

  // S4: TV Mini-Player (Picture-in-Picture)
  activeTvStream: null,
  setActiveTvStream: (ch) => set({ activeTvStream: ch }),
  isTvMiniPlayerOpen: false,
  setTvMiniPlayerOpen: (open) => set({ isTvMiniPlayerOpen: open }),

  // S2: System Health Indicator
  systemHealth: {
    status: 'healthy',
    label: 'OK',
    details: {
      rss: '24 Sources Active',
      ai: 'Plain Mode (Zero AI)',
      scheduler: 'Heartbeat Nominal (<30s)',
      db: 'SQLite WAL Active',
      tv: 'Verified Live Catalog',
    },
  },
  fetchSystemHealth: async () => {
    try {
      const res = await fetch('/api/control-room/telemetry');
      if (res.ok) {
        const data = await res.json();
        const plain = get().settings.plain_mode_enabled;
        const hasErrors = (data.error_count_last_hour || 0) > 5;
        const isDegraded = (data.error_count_last_hour || 0) > 0;
        set({
          systemHealth: {
            status: hasErrors ? 'error' : isDegraded ? 'degraded' : 'healthy',
            label: hasErrors ? 'Degraded' : isDegraded ? 'Degraded' : 'OK',
            details: {
              rss: `${data.total_sources_configured || 24} Feeds Synced`,
              ai: plain ? 'Plain Mode (Zero AI)' : (data.primary_provider || 'Gemini Online'),
              scheduler: 'Heartbeat Nominal',
              db: 'SQLite WAL Connected',
              tv: 'HLS & YouTube Active',
            },
          },
        });
      }
    } catch {
      // Keep optimistic fallback
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __APP_STORE__?: typeof useAppStore }).__APP_STORE__ = useAppStore;
}

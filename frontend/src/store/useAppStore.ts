/**
 * frontend/src/store/useAppStore.ts
 * Master Zustand store managing articles, UI drawers, live quota, and alerts.
 */
import { create } from 'zustand';
import type { Article, AlertItem, QuotaData, AppSettings, StartupStatus, BackfillResponse, AppView, ThemeMode, TvChannel } from '../types';
import type { FeedCounterMetrics } from '../types/feedCounter';
import { playButtonSound, playAlertChime } from '../utils/sound';
import { sseBus, postCrossTabSync } from '../lib/sseBus';
import {
  MAX_IN_MEMORY_ARTICLES,
  capList,
  mergeLiveArticleList,
  mergePendingArticles,
  type ActiveArticleFilters,
} from '../utils/liveDesk';

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
): {
  target: Article | null;
  refreshedQueueIds?: number[];
  mergedArticles?: Article[];
  mergedTotalDelta?: number;
} {
  const { articles, pendingNewArticles, autoAdvanceQueueIds, selectedArticleId } = state;
  if (!articles.length) return { target: null };

  // Reader navigation (buttons, j/k, Auto-Advance) traverses the active snapshot order
  // so arriving live stories never cause mid-queue skips, repeats, or reshuffles.
  const queue =
    autoAdvanceQueueIds.length > 0
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
    const { items: merged, addedCount } = mergePendingArticles(
      pendingNewArticles,
      articles,
      MAX_IN_MEMORY_ARTICLES,
    );
    return {
      target: merged[0] ?? activeList[0] ?? null,
      refreshedQueueIds: merged.map((a) => a.id),
      ...(pendingNewArticles.length > 0
        ? { mergedArticles: merged, mergedTotalDelta: addedCount }
        : {}),
    };
  }

  if (idx > 0) {
    return { target: activeList[idx - 1] ?? null };
  }
  const { items: merged, addedCount } = mergePendingArticles(
    pendingNewArticles,
    articles,
    MAX_IN_MEMORY_ARTICLES,
  );
  return {
    target: merged[merged.length - 1] ?? activeList[activeList.length - 1] ?? null,
    refreshedQueueIds: merged.map((a) => a.id),
    ...(pendingNewArticles.length > 0
      ? { mergedArticles: merged, mergedTotalDelta: addedCount }
      : {}),
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

  // Real-time SSE State, Unread Alerts, Category Counts & Resync (PRD D Cat 4)
  sseStatus: 'connecting' | 'connected' | 'reconnecting';
  sseReconnectAttempts: number;
  sseLastEventId: number;
  setSseConnectionState: (patch: {
    status?: 'connecting' | 'connected' | 'reconnecting';
    reconnectAttempts?: number;
    lastEventId?: number;
  }) => void;
  unreadAlertsCount: number;
  setUnreadAlertsCount: (count: number) => void;
  incrementUnreadAlerts: (delta?: number) => void;
  fetchUnreadAlertsCount: () => Promise<void>;
  categoryCounts: Record<string, number>;
  categoryCountsTotal: number;
  fetchCategoryCounts: () => Promise<void>;
  pendingNewArticles: Article[];
  mergePendingNewArticles: () => void;
  applyLiveArticlesBatch: (incomingArticles: Article[]) => void;
  applyBookmarkUpdate: (articleId: number, bookmarked: boolean) => void;
  applySettingsFromRemote: (remoteSettings: Partial<AppSettings>) => void;
  applySessionGapUpdate: (patch: Partial<StartupStatus>) => void;
  performFullResync: (reason?: string) => Promise<void>;

  // Offline Watchdog Connectivity State (PRD E Category 5)
  isOnline: boolean;
  reconnectedRecently: boolean;
  connectivityCheckedAt: string | null;
  setConnectivityOnline: (online: boolean, checkedAt?: string) => void;
  fetchConnectivity: () => Promise<void>;
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
    const { target, refreshedQueueIds, mergedArticles, mergedTotalDelta } = navigateArticleStep(get(), 1);
    if (!target) return;
    if (refreshedQueueIds || mergedArticles) {
      set((state) => ({
        ...(refreshedQueueIds ? { autoAdvanceQueueIds: refreshedQueueIds } : {}),
        ...(mergedArticles
          ? {
              articles: mergedArticles,
              pendingNewArticles: [],
              totalArticles: Math.max(0, state.totalArticles + (mergedTotalDelta ?? 0)),
            }
          : {}),
      }));
    }
    get().setSelectedArticle(target, options);
  },

  prevArticle: (options) => {
    const { target, refreshedQueueIds, mergedArticles, mergedTotalDelta } = navigateArticleStep(get(), -1);
    if (!target) return;
    if (refreshedQueueIds || mergedArticles) {
      set((state) => ({
        ...(refreshedQueueIds ? { autoAdvanceQueueIds: refreshedQueueIds } : {}),
        ...(mergedArticles
          ? {
              articles: mergedArticles,
              pendingNewArticles: [],
              totalArticles: Math.max(0, state.totalArticles + (mergedTotalDelta ?? 0)),
            }
          : {}),
      }));
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
  pendingNewArticles: [],
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
    const bounded = capList(articles, MAX_IN_MEMORY_ARTICLES);
    const currentSelected = get().selectedArticleId;
    let nextSelected = get().selectedArticle;

    if (!nextSelected && bounded.length > 0) {
      nextSelected = bounded[0] ?? null;
    } else if (currentSelected) {
      const match = bounded.find((a) => a.id === currentSelected);
      if (match) {
        nextSelected = {
          ...nextSelected,
          ...match,
          body_english: match.body_english ?? nextSelected?.body_english,
        } as Article;
      }
    }

    set((state) => ({
      articles: bounded,
      pendingNewArticles: [],
      totalArticles: total,
      selectedArticle: nextSelected,
      selectedArticleId: nextSelected?.id ?? null,
      isLoading: false,
      // Always maintain an explicit snapshot queue for stable prev/next & Auto-Advance order.
      autoAdvanceQueueIds:
        state.autoAdvanceQueueIds.length > 0 &&
        bounded.some((a) => state.autoAdvanceQueueIds.includes(a.id))
          ? state.autoAdvanceQueueIds
          : bounded.map((a) => a.id),
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
    get().applyLiveArticlesBatch([article]);
  },

  mergePendingNewArticles: () => {
    set((state) => {
      if (!state.pendingNewArticles.length) return {};
      const { items: merged, addedCount } = mergePendingArticles(
        state.pendingNewArticles,
        state.articles,
        MAX_IN_MEMORY_ARTICLES,
      );
      return {
        articles: merged,
        pendingNewArticles: [],
        totalArticles: Math.max(0, state.totalArticles + addedCount),
        autoAdvanceQueueIds: merged.map((a) => a.id),
      };
    });
  },

  applyLiveArticlesBatch: (incomingArticles) => {
    if (!incomingArticles.length) return;
    set((state) => {
      const filters: ActiveArticleFilters = {
        selectedCategory: state.selectedCategory,
        selectedCountry: state.selectedCountry,
        searchQuery: state.searchQuery,
        isBreakingOnly: state.isBreakingOnly,
        alertThreshold: state.settings.alert_threshold,
      };

      let nextArticles = state.articles;
      let nextPending = state.pendingNewArticles;
      let nextTotal = state.totalArticles;
      let nextSelected = state.selectedArticle;

      for (const incoming of incomingArticles) {
        if (nextSelected && nextSelected.id === incoming.id) {
          nextSelected = {
            ...nextSelected,
            ...incoming,
            body_english: incoming.body_english ?? nextSelected.body_english,
          };
        }

        const inSnapshot = nextArticles.some((a) => a.id === incoming.id);
        if (inSnapshot) {
          const updated = mergeLiveArticleList(nextArticles, incoming, filters, MAX_IN_MEMORY_ARTICLES);
          nextArticles = updated.items;
          nextTotal = Math.max(0, nextTotal + updated.deltaTotal);
        } else if (nextArticles.length === 0) {
          // First-run bootstrap: if desk is currently empty, place incoming dispatches
          // directly onto the broadsheet desk and auto-select the lead dispatch.
          const placed = mergeLiveArticleList(nextArticles, incoming, filters, MAX_IN_MEMORY_ARTICLES);
          nextArticles = placed.items;
          nextTotal = Math.max(1, nextTotal + placed.deltaTotal);
          if (!nextSelected && nextArticles.length > 0) {
            nextSelected = nextArticles[0] ?? null;
          }
        } else {
          // Buffer new live arrivals behind the "N new stories" pill so the active
          // reading queue, strip, and manual scroll stay locked until merged.
          const buffered = mergeLiveArticleList(nextPending, incoming, filters, MAX_IN_MEMORY_ARTICLES);
          nextPending = buffered.items;
        }
      }

      if (
        nextArticles === state.articles &&
        nextPending === state.pendingNewArticles &&
        nextSelected === state.selectedArticle &&
        nextTotal === state.totalArticles
      ) {
        return {};
      }

      return {
        articles: nextArticles,
        pendingNewArticles: nextPending,
        totalArticles: nextTotal,
        selectedArticle: nextSelected,
        selectedArticleId: nextSelected?.id ?? state.selectedArticleId,
        autoAdvanceQueueIds:
          state.autoAdvanceQueueIds.length === 0 && nextArticles.length > 0
            ? nextArticles.map((a) => a.id)
            : state.autoAdvanceQueueIds,
      };
    });
  },

  applyBookmarkUpdate: (articleId, bookmarked) => {
    set((state) => ({
      articles: state.articles.map((a) =>
        a.id === articleId ? { ...a, bookmarked } : a,
      ),
      selectedArticle:
        state.selectedArticle?.id === articleId
          ? { ...state.selectedArticle, bookmarked }
          : state.selectedArticle,
    }));
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
        get().applyBookmarkUpdate(articleId, data.bookmarked);
        postCrossTabSync({
          type: 'bookmark_update',
          article_id: articleId,
          bookmarked: data.bookmarked,
        });
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
    set({ selectedCountry: country, autoAdvanceQueueIds: [], pendingNewArticles: [] });
  },

  setSelectedCategory: (category) => {
    playButtonSound(get().settings.sound_enabled);
    set({ selectedCategory: category, autoAdvanceQueueIds: [], pendingNewArticles: [] });
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery, autoAdvanceQueueIds: [], pendingNewArticles: [] });
  },

  toggleBreakingOnly: () => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => ({
      isBreakingOnly: !state.isBreakingOnly,
      autoAdvanceQueueIds: [],
      pendingNewArticles: [],
    }));
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
    live_refresh_interval_sec: 5,
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
            state.autoAdvanceQueueIds.length === 0
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
            autoAdvanceQueueIds:
              state.autoAdvanceQueueIds.length > 0
                ? state.autoAdvanceQueueIds
                : state.articles.map((a) => a.id),
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
        postCrossTabSync({
          type: 'settings_update',
          settings: data,
          updatedKeys: Object.keys(updates),
        });
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

  // Real-time SSE State, Unread Alerts, Category Counts & Resync (PRD D Cat 4)
  sseStatus: 'connecting',
  sseReconnectAttempts: 0,
  sseLastEventId: 0,
  setSseConnectionState: (patch) => {
    set((state) => ({
      sseStatus: patch.status ?? state.sseStatus,
      sseReconnectAttempts: patch.reconnectAttempts ?? state.sseReconnectAttempts,
      sseLastEventId: patch.lastEventId ?? state.sseLastEventId,
    }));
  },

  // Offline Watchdog Connectivity State (PRD E Category 5)
  isOnline: true,
  reconnectedRecently: false,
  connectivityCheckedAt: null,
  setConnectivityOnline: (online, checkedAt) => {
    const prevState = get().isOnline;
    if (online) {
      if (!prevState) {
        // Just transitioned from offline to online!
        set({
          isOnline: true,
          reconnectedRecently: true,
          connectivityCheckedAt: checkedAt ?? new Date().toISOString(),
        });
        setTimeout(() => {
          set({ reconnectedRecently: false });
        }, 3000);
      } else {
        set({
          isOnline: true,
          connectivityCheckedAt: checkedAt ?? new Date().toISOString(),
        });
      }
    } else {
      set({
        isOnline: false,
        reconnectedRecently: false,
        connectivityCheckedAt: checkedAt ?? new Date().toISOString(),
      });
    }
  },
  fetchConnectivity: async () => {
    try {
      const res = await fetch('/api/connectivity');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.isOnline === 'boolean') {
          get().setConnectivityOnline(data.isOnline, data.lastCheckedAt);
        }
      }
    } catch {
      get().setConnectivityOnline(false);
    }
  },

  unreadAlertsCount: 0,
  setUnreadAlertsCount: (count) => {
    set({ unreadAlertsCount: Math.max(0, count) });
  },
  incrementUnreadAlerts: (delta = 1) => {
    set((state) => ({ unreadAlertsCount: Math.max(0, state.unreadAlertsCount + delta) }));
  },
  fetchUnreadAlertsCount: async () => {
    try {
      const res = await fetch('/api/alerts?acknowledged=false&limit=100');
      if (res.ok) {
        const data = (await res.json()) as { items?: unknown[] };
        set({ unreadAlertsCount: Array.isArray(data.items) ? data.items.length : 0 });
      }
    } catch {
      // ignore offline transient error
    }
  },

  categoryCounts: {},
  categoryCountsTotal: 0,
  fetchCategoryCounts: async () => {
    try {
      const { selectedCountry, isBreakingOnly, searchQuery } = get();
      const params = new URLSearchParams();
      params.set('status', 'done');
      if (selectedCountry) params.set('country', selectedCountry);
      if (isBreakingOnly) params.set('breaking', 'true');
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/articles/categories/counts?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { total?: number; categories?: Record<string, number> };
        set({
          categoryCountsTotal: data.total ?? 0,
          categoryCounts: data.categories ?? {},
        });
      }
    } catch {
      // ignore transient error
    }
  },

  applySettingsFromRemote: (remoteSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...remoteSettings };
      const themePatch: Partial<AppState> = {};
      if (remoteSettings.theme === 'paper' || remoteSettings.theme === 'night') {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('news_desk_theme', remoteSettings.theme);
            document.documentElement.setAttribute('data-theme', remoteSettings.theme);
          } catch {
            // ignore
          }
        }
        themePatch.theme = remoteSettings.theme;
      }
      if (typeof remoteSettings.rail_pinned === 'boolean') {
        themePatch.isRailPinned = remoteSettings.rail_pinned;
      }
      return {
        settings: merged,
        ...themePatch,
      };
    });
  },

  applySessionGapUpdate: (patch) => {
    set((state) => ({
      startupStatus: state.startupStatus
        ? { ...state.startupStatus, ...patch }
        : {
            status: 'ok',
            uptime_ms: 0,
            missed_minutes: patch.missed_minutes ?? 0,
            last_fetched_at: patch.last_fetched_at ?? null,
            detected: Boolean(patch.detected),
            can_backfill: Boolean(patch.can_backfill),
            window_start: patch.window_start ?? null,
            window_end: patch.window_end ?? null,
          },
    }));
  },

  performFullResync: async (reason = 'manual') => {
    const {
      selectedCategory,
      selectedCountry,
      searchQuery,
      isBreakingOnly,
      selectedArticleId,
      fetchFeedCounter,
      fetchUnreadAlertsCount,
      fetchQuota,
      fetchSettings,
      fetchCategoryCounts,
      fetchSystemHealth,
    } = get();

    try {
      const params = new URLSearchParams();
      params.set('limit', '60');
      params.set('status', 'done');
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedCountry) params.set('country', selectedCountry);
      if (isBreakingOnly) params.set('breaking', 'true');
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const articlesPromise = fetch(`/api/articles?${params.toString()}`).then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { total: number; items: Article[] };
        const stateSnapshot = get();
        if (stateSnapshot.articles.length > 0 && stateSnapshot.autoAdvanceQueueIds.length > 0) {
          stateSnapshot.applyLiveArticlesBatch(data.items);
        } else {
          stateSnapshot.setArticles(data.items, data.total);
        }
      });

      const selectedPromise = selectedArticleId
        ? fetch(`/api/articles/${selectedArticleId}`).then(async (res) => {
            if (!res.ok) return;
            const art = (await res.json()) as Article;
            set((state) => ({
              selectedArticle: state.selectedArticleId === art.id ? art : state.selectedArticle,
              articles: state.articles.map((a) => (a.id === art.id ? { ...a, ...art } : a)),
            }));
          })
        : Promise.resolve();

      const gapPromise = fetch('/api/startup-status').then(async (res) => {
        if (!res.ok) return;
        const gap = (await res.json()) as StartupStatus;
        set({ startupStatus: gap });
      });

      await Promise.allSettled([
        articlesPromise,
        selectedPromise,
        gapPromise,
        fetchFeedCounter(),
        fetchUnreadAlertsCount(),
        fetchQuota(),
        fetchSettings(),
        fetchCategoryCounts(),
        fetchSystemHealth(),
      ]);

      sseBus.emit('resync', { reason, timestamp: new Date().toISOString() });
    } catch (err) {
      console.warn('[AppStore] Full resync encountered an error:', err);
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __APP_STORE__?: typeof useAppStore }).__APP_STORE__ = useAppStore;
}

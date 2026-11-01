/**
 * frontend/src/store/useAppStore.ts
 * Master Zustand store managing articles, UI drawers, live quota, and alerts.
 */
import { create } from 'zustand';
import type { Article, AlertItem, QuotaData, AppSettings, StartupStatus, BackfillResponse, AppView, ThemeMode } from '../types';
import { playButtonSound, playAlertChime } from '../utils/sound';

interface AppState {
  // Navigation & Shell (Step 2)
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isBatMenuOpen: boolean;
  setBatMenuOpen: (open: boolean) => void;
  nextArticle: () => void;
  prevArticle: () => void;
  // Articles
  articles: Article[];
  selectedArticleId: number | null;
  selectedArticle: Article | null;
  activeSentenceIndex: number | null;
  totalArticles: number;
  isLoading: boolean;
  setArticles: (articles: Article[], total: number) => void;
  setSelectedArticle: (article: Article | null) => void;
  setActiveSentenceIndex: (index: number | null) => void;
  selectArticleById: (id: number) => Promise<void>;
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

  nextArticle: () => {
    const { articles, selectedArticleId } = get();
    if (!articles.length) return;
    const idx = articles.findIndex((a) => a.id === selectedArticleId);
    if (idx !== -1 && idx < articles.length - 1) {
      get().setSelectedArticle(articles[idx + 1]);
    }
  },

  prevArticle: () => {
    const { articles, selectedArticleId } = get();
    if (!articles.length) return;
    const idx = articles.findIndex((a) => a.id === selectedArticleId);
    if (idx > 0) {
      get().setSelectedArticle(articles[idx - 1]);
    }
  },

  articles: [],
  selectedArticleId: null,
  selectedArticle: null,
  activeSentenceIndex: null,
  totalArticles: 0,
  isLoading: false,

  setActiveSentenceIndex: (index) => set({ activeSentenceIndex: index }),

  setArticles: (articles, total) => {
    const currentSelected = get().selectedArticleId;
    let nextSelected = get().selectedArticle;

    if (!nextSelected && articles.length > 0) {
      nextSelected = articles[0] ?? null;
    } else if (currentSelected) {
      const match = articles.find((a) => a.id === currentSelected);
      if (match) nextSelected = match;
    }

    set({
      articles,
      totalArticles: total,
      selectedArticle: nextSelected,
      selectedArticleId: nextSelected?.id ?? null,
      isLoading: false,
    });
  },

  setSelectedArticle: (article) => {
    playButtonSound(get().settings.sound_enabled);
    set({
      selectedArticle: article,
      selectedArticleId: article?.id ?? null,
    });
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
    set({ selectedCountry: country });
  },

  setSelectedCategory: (category) => {
    playButtonSound(get().settings.sound_enabled);
    set({ selectedCategory: category });
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  toggleBreakingOnly: () => {
    playButtonSound(get().settings.sound_enabled);
    set((state) => ({ isBreakingOnly: !state.isBreakingOnly }));
  },

  // Settings
  isSettingsOpen: false,
  settings: {
    refresh_interval_minutes: 5,
    max_spiders: 6,
    alert_threshold: 75,
    auto_cleanup_enabled: false,
    retention_days: 30,
    sound_enabled: true,
  },

  setSettingsOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isSettingsOpen: open });
  },

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = (await res.json()) as AppSettings;
        set({ settings: data });
      }
    } catch {
      // use default
    }
  },

  updateSettings: async (updates) => {
    playButtonSound(get().settings.sound_enabled);
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
        set({
          startupStatus: data,
          isMissedNewsModalOpen: Boolean(data.detected && data.missed_minutes >= 5),
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
    set({ compareClusterId: id });
  },
  timelineClusterId: null,
  setTimelineClusterId: (id) => {
    playButtonSound(get().settings.sound_enabled);
    set({ timelineClusterId: id });
  },

  // Archive Chat (Phase 8)
  isArchiveChatOpen: false,
  setArchiveChatOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isArchiveChatOpen: open });
  },

  // Globe & Wildlife Map (Phase 9)
  isGlobeOpen: false,
  setGlobeOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isGlobeOpen: open });
  },

  // Morning Briefing & Read-Aloud (Phase 10)
  isBriefingOpen: false,
  setBriefingOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isBriefingOpen: open });
  },

  // Daily Newspaper PDF Desk (Step 12)
  isPdfOpen: false,
  setPdfOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isPdfOpen: open });
  },

  // TV View (Phase 11)
  isTvViewOpen: false,
  setTvViewOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isTvViewOpen: open });
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
    set({ isWatchlistOpen: open });
  },

  // Alerts Center Desk (Step 13)
  isAlertsOpen: false,
  setAlertsOpen: (open) => {
    playButtonSound(get().settings.sound_enabled);
    set({ isAlertsOpen: open });
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __APP_STORE__?: typeof useAppStore }).__APP_STORE__ = useAppStore;
}

/**
 * frontend/src/lib/queries.ts
 * TanStack Query hooks and query keys factory per FRONTEND_BACKEND_CONTRACT.md
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { AppSettings } from '../types';

export const queryKeys = {
  articles: {
    all: ['articles'] as const,
    list: (params?: { category?: string; q?: string; status?: string; limit?: number; offset?: number }) =>
      ['articles', 'list', params] as const,
    detail: (id: number) => ['articles', 'detail', id] as const,
  },
  clusters: {
    all: ['clusters'] as const,
    detail: (id: number) => ['clusters', 'detail', id] as const,
  },
  watchlist: {
    all: ['watchlist'] as const,
  },
  tv: {
    channels: (params?: { category?: string; is_favorite?: boolean }) =>
      ['tv', 'channels', params] as const,
  },
  alerts: {
    all: (params?: { acknowledged?: boolean }) => ['alerts', params] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  quota: {
    all: ['quota'] as const,
  },
  startup: {
    status: ['startup', 'status'] as const,
  },
  briefing: {
    current: ['briefing', 'current'] as const,
  },
};

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useArticlesQuery(params?: {
  category?: string;
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.articles.list(params),
    queryFn: () => api.getArticles(params),
  });
}

export function useArticleQuery(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.articles.detail(id ?? 0),
    queryFn: () => (id ? api.getArticle(id) : Promise.reject('No ID provided')),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useClustersQuery() {
  return useQuery({
    queryKey: queryKeys.clusters.all,
    queryFn: () => api.getClusters(),
  });
}

export function useClusterQuery(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.clusters.detail(id ?? 0),
    queryFn: () => (id ? api.getCluster(id) : Promise.reject('No cluster ID')),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useWatchlistQuery() {
  return useQuery({
    queryKey: queryKeys.watchlist.all,
    queryFn: () => api.getWatchlist(),
  });
}

export function useTvChannelsQuery(params?: { category?: string; is_favorite?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tv.channels(params),
    queryFn: () => api.getTvChannels(params),
  });
}

export function useAlertsQuery(params?: { acknowledged?: boolean }) {
  return useQuery({
    queryKey: queryKeys.alerts.all(params),
    queryFn: () => api.getAlerts(params),
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => api.getSettings(),
  });
}

export function useQuotaQuery() {
  return useQuery({
    queryKey: queryKeys.quota.all,
    queryFn: () => api.getQuota(),
  });
}

export function useStartupStatusQuery() {
  return useQuery({
    queryKey: queryKeys.startup.status,
    queryFn: () => api.getStartupStatus(),
  });
}

export function useBriefingQuery() {
  return useQuery({
    queryKey: queryKeys.briefing.current,
    queryFn: () => api.getMorningBriefing(),
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useToggleBookmarkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bookmarked }: { id: number; bookmarked: boolean }) =>
      api.toggleBookmark(id, bookmarked),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.articles.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.articles.all });
    },
  });
}

export function useUpdateSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<AppSettings>) => api.updateSettings(settings),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.settings.all, updated);
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useCreateWatchlistItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: { topic: string; keywords: string[]; priority: string }) =>
      api.createWatchlistItem(item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}

export function useDeleteWatchlistItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteWatchlistItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}

export function useToggleTvFavoriteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_favorite }: { id: number; is_favorite: boolean }) =>
      api.toggleTvFavorite(id, is_favorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tv'] });
    },
  });
}

export function useAcknowledgeAlertMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.acknowledgeAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

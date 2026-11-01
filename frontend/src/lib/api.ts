/**
 * frontend/src/lib/api.ts
 * Strongly-typed API client matching FRONTEND_BACKEND_CONTRACT.md
 */
import { toast } from 'sonner';
import type {
  Article,
  ArticleFull,
  Cluster,
  WatchlistItem,
  TvChannel,
  Alert,
  AppSettings,
  QuotaResponse,
  SearchResponse,
  StartupStatus,
  BackfillResponse,
} from '../types';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    let errorCode: string | undefined;

    try {
      const json = await res.json();
      if (json && typeof json.error === 'string') {
        errorMsg = json.error;
      }
      if (json && typeof json.code === 'string') {
        errorCode = json.code;
      }
    } catch {
      // Body not JSON
    }

    if (res.status === 429) {
      toast.error('AI / API Rate limit reached. Backing off request...');
    }

    throw new ApiError(errorMsg, res.status, errorCode);
  }

  // Handle empty responses (e.g. 204 No Content)
  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export const api = {
  // ─── Articles ─────────────────────────────────────────────────────────────
  async getArticles(params?: {
    category?: string;
    q?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Article[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    const url = `/api/articles${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
    return handleResponse<Article[]>(res);
  },

  async getArticle(id: number): Promise<ArticleFull | Article> {
    const res = await fetch(`/api/articles/${id}`);
    return handleResponse<ArticleFull | Article>(res);
  },

  async toggleBookmark(id: number, bookmarked: boolean): Promise<{ success: boolean; bookmarked: boolean }> {
    const res = await fetch(`/api/articles/${id}/bookmark`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmarked }),
    });
    return handleResponse<{ success: boolean; bookmarked: boolean }>(res);
  },

  // ─── Clusters ─────────────────────────────────────────────────────────────
  async getClusters(): Promise<Cluster[]> {
    const res = await fetch('/api/clusters');
    return handleResponse<Cluster[]>(res);
  },

  async getCluster(id: number): Promise<Cluster> {
    const res = await fetch(`/api/clusters/${id}`);
    return handleResponse<Cluster>(res);
  },

  // ─── Watchlist ────────────────────────────────────────────────────────────
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await fetch('/api/watchlist');
    const data = await handleResponse<{ items: WatchlistItem[] } | WatchlistItem[]>(res);
    return Array.isArray(data) ? data : data.items || [];
  },

  async createWatchlistItem(item: {
    topic: string;
    keywords: string[];
    priority: string;
  }): Promise<WatchlistItem> {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<WatchlistItem>(res);
  },

  async updateWatchlistItem(id: number, updates: Partial<WatchlistItem>): Promise<WatchlistItem> {
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<WatchlistItem>(res);
  },

  async deleteWatchlistItem(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // ─── TV Channels ──────────────────────────────────────────────────────────
  async getTvChannels(params?: { category?: string; is_favorite?: boolean }): Promise<TvChannel[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.is_favorite !== undefined) searchParams.set('is_favorite', String(params.is_favorite));

    const qs = searchParams.toString();
    const res = await fetch(`/api/tv/channels${qs ? `?${qs}` : ''}`);
    return handleResponse<TvChannel[]>(res);
  },

  async toggleTvFavorite(id: number, is_favorite: boolean): Promise<TvChannel> {
    const res = await fetch(`/api/tv/channels/${id}/favorite`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite }),
    });
    return handleResponse<TvChannel>(res);
  },

  async checkTvHealth(id: number): Promise<{ is_alive: boolean; latency_ms?: number }> {
    const res = await fetch(`/api/tv/channels/${id}/health-check`, {
      method: 'POST',
    });
    return handleResponse<{ is_alive: boolean; latency_ms?: number }>(res);
  },

  // ─── Alerts ───────────────────────────────────────────────────────────────
  async getAlerts(params?: { acknowledged?: boolean }): Promise<Alert[]> {
    const searchParams = new URLSearchParams();
    if (params?.acknowledged !== undefined) {
      searchParams.set('acknowledged', String(params.acknowledged));
    }
    const qs = searchParams.toString();
    const res = await fetch(`/api/alerts${qs ? `?${qs}` : ''}`);
    return handleResponse<Alert[]>(res);
  },

  async acknowledgeAlert(id: number): Promise<Alert> {
    const res = await fetch(`/api/alerts/${id}/acknowledge`, {
      method: 'PATCH',
    });
    return handleResponse<Alert>(res);
  },

  // ─── Settings & Quotas ────────────────────────────────────────────────────
  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings');
    return handleResponse<AppSettings>(res);
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return handleResponse<AppSettings>(res);
  },

  async getQuota(): Promise<QuotaResponse> {
    const res = await fetch('/api/quota');
    return handleResponse<QuotaResponse>(res);
  },

  // ─── Archive Search ───────────────────────────────────────────────────────
  async searchArchive(query: string): Promise<SearchResponse> {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return handleResponse<SearchResponse>(res);
  },

  // ─── Startup & Backfill ───────────────────────────────────────────────────
  async getStartupStatus(): Promise<StartupStatus> {
    const res = await fetch('/api/startup-status');
    return handleResponse<StartupStatus>(res);
  },

  async triggerBackfill(): Promise<BackfillResponse> {
    const res = await fetch('/api/backfill', {
      method: 'POST',
    });
    return handleResponse<BackfillResponse>(res);
  },

  // ─── Exports ──────────────────────────────────────────────────────────────
  async getMorningBriefing(): Promise<{ briefing: string; generated_at: string }> {
    const res = await fetch('/api/export/briefing');
    return handleResponse<{ briefing: string; generated_at: string }>(res);
  },

  async exportPdf(articleIds: number[]): Promise<Blob> {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleIds }),
    });
    if (!res.ok) {
      throw new ApiError(`PDF export failed with status ${res.status}`, res.status);
    }
    return res.blob();
  },
};


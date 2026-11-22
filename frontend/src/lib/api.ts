/**
 * frontend/src/lib/api.ts
 * Strongly-typed API client matching FRONTEND_BACKEND_CONTRACT.md
 */
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { autonomousEngine } from './autonomousEngine';
import type {
  Article,
  ArticleFull,
  Cluster,
  WatchlistItem,
  TvChannel,
  Alert,
  AppSettings,
  Source,
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

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. User-configured remote desk URL (e.g. from mobile or desktop settings)
    const userRemoteUrl = localStorage.getItem('dnews_remote_desk_url');
    if (userRemoteUrl && userRemoteUrl.trim().startsWith('http')) {
      return userRemoteUrl.trim().replace(/\/+$/, '');
    }

    // 2. Electron file:// protocol or custom port
    if (window.location.protocol === 'file:') {
      const cachedPort = sessionStorage.getItem('dnews_backend_port') || '3001';
      return `http://127.0.0.1:${cachedPort}`;
    }
  }

  // 3. Same origin (web development) or native mobile without remote desk
  return '';
}

function shouldAttemptRemote(baseUrl: string): boolean {
  if (baseUrl) return true;
  if (typeof window === 'undefined') return true; // Node/test environment
  return !Capacitor.isNativePlatform() && window.location.protocol !== 'file:';
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
    const baseUrl = getApiBaseUrl();
    if (shouldAttemptRemote(baseUrl)) {
      try {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.q) searchParams.set('q', params.q);
        if (params?.status) searchParams.set('status', params.status);
        if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
        if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

        const qs = searchParams.toString();
        const url = `${baseUrl}/api/articles${qs ? `?${qs}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : data.items || [];
        }
      } catch {
        // Fall back to autonomousEngine
      }
    }

    const res = autonomousEngine.getArticles({
      category: params?.category,
      q: params?.q,
      limit: params?.limit,
      offset: params?.offset,
    });
    return res.items;
  },

  async getArticle(id: number): Promise<ArticleFull | Article> {
    const baseUrl = getApiBaseUrl();
    if (shouldAttemptRemote(baseUrl)) {
      try {
        const url = `${baseUrl}/api/articles/${id}`;
        const res = await fetch(url);
        return await handleResponse<ArticleFull>(res);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        // Fall back
      }
    }

    const item = autonomousEngine.getArticle(id);
    if (item) return item;
    throw new ApiError('Article not found', 404, 'ERR_NOT_FOUND');
  },

  async toggleBookmark(id: number, bookmarked: boolean): Promise<{ success: boolean; bookmarked: boolean }> {
    autonomousEngine.toggleBookmark(id, bookmarked);
    const baseUrl = getApiBaseUrl();
    if (shouldAttemptRemote(baseUrl)) {
      try {
        const res = await fetch(`${baseUrl}/api/articles/${id}/bookmark`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookmarked }),
        });
        if (res.ok) return await handleResponse<{ success: boolean; bookmarked: boolean }>(res);
      } catch {
        // Handled locally
      }
    }
    return { success: true, bookmarked };
  },

  // ─── Clusters ─────────────────────────────────────────────────────────────
  async getClusters(): Promise<Cluster[]> {
    const baseUrl = getApiBaseUrl();
    if (shouldAttemptRemote(baseUrl)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${baseUrl}/api/clusters`, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          return await handleResponse<Cluster[]>(res);
        }
      } catch {
        // Fall back
      }
    }

    // Synthesize clusters from autonomous stories
    const articles = autonomousEngine.getArticles({ limit: 20 }).items;
    const clusters: Cluster[] = articles
      .filter((a) => a.cluster_id)
      .map((a) => ({
        id: a.cluster_id || a.id,
        headline: a.title_english,
        first_seen_at: a.published_at || new Date().toISOString(),
        last_updated_at: a.published_at || new Date().toISOString(),
        outlet_count: a.cluster_outlet_count || 2,
        country_count: a.cluster_country_count || 1,
        is_breaking: a.cluster_is_breaking || false,
        confirmation: a.confirmation,
        articles: [a],
      }));
    return clusters;
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
  async getAlerts(params?: { acknowledged?: boolean; type?: string; limit?: number }): Promise<Alert[]> {
    const searchParams = new URLSearchParams();
    if (params?.acknowledged !== undefined) {
      searchParams.set('acknowledged', String(params.acknowledged));
    }
    if (params?.type) {
      searchParams.set('type', params.type);
    }
    if (params?.limit) {
      searchParams.set('limit', String(params.limit));
    }
    const qs = searchParams.toString();
    const res = await fetch(`/api/alerts${qs ? `?${qs}` : ''}`);
    const data = await handleResponse<{ items: Alert[] } | Alert[]>(res);
    return Array.isArray(data) ? data : data.items || [];
  },

  async acknowledgeAlert(id: number): Promise<{ acknowledged: boolean }> {
    const res = await fetch(`/api/alerts/${id}/acknowledge`, {
      method: 'PATCH',
    });
    return handleResponse<{ acknowledged: boolean }>(res);
  },

  async acknowledgeAllAlerts(): Promise<{ acknowledged: boolean }> {
    const res = await fetch('/api/alerts/acknowledge-all', {
      method: 'POST',
    });
    return handleResponse<{ acknowledged: boolean }>(res);
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

  // ─── News Sources ─────────────────────────────────────────────────────────
  async getSources(): Promise<Source[]> {
    const res = await fetch('/api/sources');
    const data = await handleResponse<{ items: Source[] } | Source[]>(res);
    return Array.isArray(data) ? data : data.items || [];
  },

  async toggleSource(id: number, enabled: boolean): Promise<Source> {
    const res = await fetch(`/api/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return handleResponse<Source>(res);
  },

  async testSourceFeed(url: string): Promise<{
    success: boolean;
    title?: string;
    description?: string;
    link?: string;
    targetUrl?: string;
    faviconUrl?: string;
    total_items?: number;
    sample_items?: Array<{ title: string; link: string; pubDate: string; snippet: string }>;
    error?: string;
  }> {
    const res = await fetch('/api/sources/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async addCustomSource(source: { name: string; url: string; country?: string; fetch_type?: string; region?: string; language?: string }): Promise<{ success: boolean; source: Source }> {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    return handleResponse<{ success: boolean; source: Source }>(res);
  },

  async deleteSource(id: number): Promise<{ success: boolean; deletedId: number }> {
    const res = await fetch(`/api/sources/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; deletedId: number }>(res);
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


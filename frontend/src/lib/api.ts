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
  // 1. User-configured remote desk URL (works in browser, Capacitor, and Node test mocks)
  if (typeof localStorage !== 'undefined') {
    const userRemoteUrl = localStorage.getItem('dnews_remote_desk_url');
    if (userRemoteUrl && userRemoteUrl.trim().startsWith('http')) {
      return userRemoteUrl.trim().replace(/\/+$/, '');
    }
  }

  if (typeof window !== 'undefined') {
    // 2. Electron file:// protocol or custom port
    if (window.location.protocol === 'file:') {
      const cachedPort = sessionStorage.getItem('dnews_backend_port') || '3001';
      return `http://127.0.0.1:${cachedPort}`;
    }
  }

  // 3. Same origin (web development) or native mobile without remote desk
  return '';
}

export function shouldAttemptRemote(baseUrl: string = getApiBaseUrl()): boolean {
  if (baseUrl) return true;
  if (typeof window === 'undefined') return true; // Node/test environment
  return !Capacitor.isNativePlatform() && window.location.protocol !== 'file:';
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
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
    const res = await apiFetch(`/api/clusters/${id}`);
    return handleResponse<Cluster>(res);
  },

  // ─── Watchlist ────────────────────────────────────────────────────────────
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await apiFetch('/api/watchlist');
    const data = await handleResponse<{ items: WatchlistItem[] } | WatchlistItem[]>(res);
    return Array.isArray(data) ? data : data.items || [];
  },

  async createWatchlistItem(item: {
    topic: string;
    keywords: string[];
    priority: string;
  }): Promise<WatchlistItem> {
    const res = await apiFetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<WatchlistItem>(res);
  },

  async updateWatchlistItem(id: number, updates: Partial<WatchlistItem>): Promise<WatchlistItem> {
    const res = await apiFetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<WatchlistItem>(res);
  },

  async deleteWatchlistItem(id: number): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/watchlist/${id}`, {
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
    const res = await apiFetch(`/api/tv/channels${qs ? `?${qs}` : ''}`);
    return handleResponse<TvChannel[]>(res);
  },

  async toggleTvFavorite(id: number, is_favorite: boolean): Promise<TvChannel> {
    const res = await apiFetch(`/api/tv/channels/${id}/favorite`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite }),
    });
    return handleResponse<TvChannel>(res);
  },

  async checkTvHealth(id: number): Promise<{ is_alive: boolean; latency_ms?: number }> {
    const res = await apiFetch(`/api/tv/channels/${id}/health-check`, {
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
    const res = await apiFetch(`/api/alerts${qs ? `?${qs}` : ''}`);
    const data = await handleResponse<{ items: Alert[] } | Alert[]>(res);
    return Array.isArray(data) ? data : data.items || [];
  },

  async acknowledgeAlert(id: number): Promise<{ acknowledged: boolean }> {
    const res = await apiFetch(`/api/alerts/${id}/acknowledge`, {
      method: 'PATCH',
    });
    return handleResponse<{ acknowledged: boolean }>(res);
  },

  async acknowledgeAllAlerts(): Promise<{ acknowledged: boolean }> {
    const res = await apiFetch('/api/alerts/acknowledge-all', {
      method: 'POST',
    });
    return handleResponse<{ acknowledged: boolean }>(res);
  },

  // ─── Settings & Quotas ────────────────────────────────────────────────────
  async getSettings(): Promise<AppSettings> {
    const res = await apiFetch('/api/settings');
    return handleResponse<AppSettings>(res);
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await apiFetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return handleResponse<AppSettings>(res);
  },

  async getQuota(): Promise<QuotaResponse> {
    const res = await apiFetch('/api/quota');
    return handleResponse<QuotaResponse>(res);
  },

  // ─── News Sources ─────────────────────────────────────────────────────────
  async getSources(): Promise<Source[]> {
    const res = await apiFetch('/api/sources');
    const data = await handleResponse<{ items: Source[] } | Source[]>(res);
    return Array.isArray(data) ? data : data.items || [];
  },

  async toggleSource(id: number, enabled: boolean): Promise<Source> {
    const res = await apiFetch(`/api/sources/${id}`, {
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
    const res = await apiFetch('/api/sources/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async addCustomSource(source: { name: string; url: string; country?: string; fetch_type?: string; region?: string; language?: string }): Promise<{ success: boolean; source: Source }> {
    const res = await apiFetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    return handleResponse<{ success: boolean; source: Source }>(res);
  },

  async deleteSource(id: number): Promise<{ success: boolean; deletedId: number }> {
    const res = await apiFetch(`/api/sources/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; deletedId: number }>(res);
  },

  // ─── Archive Search ───────────────────────────────────────────────────────
  async searchArchive(query: string): Promise<SearchResponse> {
    const res = await apiFetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return handleResponse<SearchResponse>(res);
  },

  // ─── Startup & Backfill ───────────────────────────────────────────────────
  async getStartupStatus(): Promise<StartupStatus> {
    const res = await apiFetch('/api/startup-status');
    return handleResponse<StartupStatus>(res);
  },

  async triggerBackfill(): Promise<BackfillResponse> {
    const res = await apiFetch('/api/backfill', {
      method: 'POST',
    });
    return handleResponse<BackfillResponse>(res);
  },

  // ─── Exports ──────────────────────────────────────────────────────────────
  async getMorningBriefing(): Promise<{ briefing: string; generated_at: string }> {
    const res = await apiFetch('/api/export/briefing');
    return handleResponse<{ briefing: string; generated_at: string }>(res);
  },

  async exportPdf(articleIds: number[]): Promise<Blob> {
    const res = await apiFetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleIds }),
    });
    if (!res.ok) {
      throw new ApiError(`PDF export failed with status ${res.status}`, res.status);
    }
    return res.blob();
  },

  // ─── Investigative Journalism & OSINT (Phase E) ──────────────────────────
  async scrubDocument(filename: string, fileContentBase64: string, mimeType?: string): Promise<{
    success: boolean;
    originalSize: number;
    scrubbedSize: number;
    scrubbedFields: string[];
    cleanBase64: string;
    documentHash: string;
    vaultStatus: string;
    notice: string;
  }> {
    const res = await apiFetch('/api/investigate/scrub-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileContentBase64, mimeType }),
    });
    return handleResponse(res);
  },

  async getArticleTimeline(articleId: number): Promise<{
    articleId: number;
    headline: string;
    milestones: Array<{ timeLabel: string; timestamp: string; event: string; source: string; confidence: number }>;
  }> {
    const res = await apiFetch(`/api/investigate/timeline/${articleId}`);
    return handleResponse(res);
  },

  async crossCompareClaims(claimA: string, claimB: string, sourceA?: string, sourceB?: string): Promise<{
    contradictionScore: number;
    status: 'contradiction' | 'consensus' | 'differing_estimate';
    analysis: string;
    keyDiscrepancies: string[];
    comparison: { sourceA: string; claimA: string; sourceB: string; claimB: string };
  }> {
    const res = await apiFetch('/api/investigate/cross-compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimA, claimB, sourceA, sourceB }),
    });
    return handleResponse(res);
  },

  async getCorporateOwnership(entityName: string): Promise<{
    found: boolean;
    entityName: string;
    parentConglomerate: string;
    ultimateOwner: string;
    politicalLean: string;
    totalDonations: string;
    subsidiaries: string[];
    notes: string;
  }> {
    const res = await apiFetch(`/api/investigate/ownership/${encodeURIComponent(entityName)}`);
    return handleResponse(res);
  },

  async getSatelliteOsint(lat?: number, lon?: number, eventType?: string): Promise<{
    location: { latitude: number; longitude: number; coordinatesFormatted: string };
    satelliteConstellation: string;
    baselinePass: { date: string; cloudCoverage: string; resolution: string; status: string };
    currentPass: { date: string; cloudCoverage: string; resolution: string; status: string };
    detectedChangeIndex: number;
    analysisSummary: string;
  }> {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set('lat', String(lat));
    if (lon !== undefined) params.set('lon', String(lon));
    if (eventType) params.set('eventType', eventType);
    const res = await apiFetch(`/api/investigate/satellite-compare?${params.toString()}`);
    return handleResponse(res);
  },

  async verifyQuote(quote: string, speaker?: string): Promise<{
    verified: boolean;
    quote: string;
    speaker: string;
    fidelityScore: number;
    contextStatus: string;
    authenticatedSource: string;
    surroundingContext: string;
    editorialVerdict: string;
  }> {
    const res = await apiFetch('/api/investigate/verify-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote, speaker }),
    });
    return handleResponse(res);
  },

  async getFoiaRequests(): Promise<{ requests: Array<{
    id: number;
    agency_name: string;
    subject: string;
    tracking_number: string;
    filed_at: string;
    statutory_deadline: string;
    status: string;
    response_notes?: string;
  }> }> {
    const res = await apiFetch('/api/investigate/foia');
    return handleResponse(res);
  },

  async createFoiaRequest(agencyName: string, subject: string, trackingNumber?: string, statutoryDeadlineDays?: number): Promise<{
    success: boolean;
    id: number;
    statutoryDeadline: string;
    message: string;
  }> {
    const res = await apiFetch('/api/investigate/foia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyName, subject, trackingNumber, statutoryDeadlineDays }),
    });
    return handleResponse(res);
  },

  async updateFoiaRequest(id: number, status?: string, responseNotes?: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`/api/investigate/foia/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, responseNotes }),
    });
    return handleResponse(res);
  },

  async screenSanctions(query: string): Promise<{
    screenedQuery: string;
    hasMatch: boolean;
    matches: Array<{
      id: number;
      name: string;
      aliases?: string;
      entity_type: string;
      jurisdiction: string;
      program: string;
      listed_date?: string;
      reason: string;
    }>;
  }> {
    const res = await apiFetch('/api/investigate/sanctions/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
    });
    return handleResponse(res);
  },

  async desensationalizeHeadline(headline: string): Promise<{
    originalHeadline: string;
    calmHeadline: string;
    sensationalismScore: number;
    changesApplied: string[];
  }> {
    const res = await apiFetch('/api/investigate/desensationalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline }),
    });
    return handleResponse(res);
  },

  async getArticleRevisions(articleId: number): Promise<{
    articleId: number;
    currentHeadline: string;
    currentLength: number;
    snapshotCount: number;
    snapshots: Array<{
      id: number;
      capturedAt: string;
      headline: string;
      hash: string;
      contentLength: number;
      hasEdits: boolean;
    }>;
  }> {
    const res = await apiFetch(`/api/investigate/revisions/${articleId}`);
    return handleResponse(res);
  },

  async createArticleSnapshot(articleId: number): Promise<{ success: boolean; message: string; hash: string }> {
    const res = await apiFetch(`/api/investigate/revisions/${articleId}/snapshot`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Phase F: AI Editorial Intelligence, Socratic Analysis & Jargon Decoders (Features 11–20)
  async getDevilsAdvocate(title?: string, text?: string): Promise<{
    rubric: string;
    coreThesisRebuttal: string;
    counterArguments: Array<{ point: string; rationale: string; precedentCite: string }>;
    editorialVerdict: string;
    confidenceScore: number;
  }> {
    const res = await apiFetch('/api/editorial/devils-advocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text }),
    });
    return handleResponse(res);
  },

  async getHistoricalRhymes(query?: string, articleId?: number): Promise<{
    query: string;
    hasPrecedent: boolean;
    parallel: {
      eventName: string;
      era: string;
      precedentYear: number;
      summary: string;
      historicalOutcome: string;
      parallelLesson: string;
    } | null;
    allPrecedents: Array<{ eventName: string; precedentYear: number; era: string }>;
  }> {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (articleId) params.set('articleId', String(articleId));
    const res = await apiFetch(`/api/editorial/historical-rhymes?${params.toString()}`);
    return handleResponse(res);
  },

  async getGlobalPerspectives(articleId: number): Promise<{
    articleId: number;
    headline: string;
    perspectives: Array<{
      bureau: string;
      outlet: string;
      flag: string;
      leadExcerpt: string;
      translatedAnalysis: string;
      keyConcern: string;
    }>;
  }> {
    const res = await apiFetch(`/api/editorial/perspectives/${articleId}`);
    return handleResponse(res);
  },

  async explainLegislation(query: string): Promise<{
    found: boolean;
    actName: string;
    clauseReference: string;
    plainExplanation: string;
    realWorldImpact: string;
    category: string;
  }> {
    const res = await apiFetch('/api/editorial/explain-legislation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return handleResponse(res);
  },

  async getNarrativeArc(articleId: number): Promise<{
    articleId: number;
    headline: string;
    clusterSize: number;
    classification: '24_HOUR_FLASH' | 'DEVELOPING_INVESTIGATION' | 'STRUCTURAL_SHIFT';
    velocityScore: number;
    projectedLifespan: string;
    editorialAdvice: string;
  }> {
    const res = await apiFetch(`/api/editorial/narrative-arc/${articleId}`);
    return handleResponse(res);
  },

  async factcheckDraft(text: string): Promise<{
    totalSentencesChecked: number;
    verifiedCount: number;
    fidelityRatio: number;
    checkedSentences: Array<{
      sentence: string;
      status: 'verified' | 'unconfirmed' | 'disputed';
      citedArticleId?: number;
      citationTitle?: string;
      matchConfidence: number;
    }>;
    guidance: string;
  }> {
    const res = await apiFetch('/api/editorial/factcheck-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  async demystifyTerm(term: string): Promise<{
    term: string;
    field: string;
    plainMeaning: string;
    everydayAnalogy: string;
  }> {
    const res = await apiFetch(`/api/editorial/demystify?term=${encodeURIComponent(term)}`);
    return handleResponse(res);
  },

  async getSentimentDrift(): Promise<{
    topics: Array<{
      topic: string;
      latestScore: number;
      direction: 'WARMING' | 'COOLING' | 'STABLE';
      velocity: number;
      dataPoints: Array<{ date: string; score: number; sampleSize: number }>;
    }>;
  }> {
    const res = await apiFetch('/api/editorial/sentiment-drift');
    return handleResponse(res);
  },

  async getLatestExecutiveDossier(): Promise<{
    title: string;
    weekLabel: string;
    executiveSummary: string;
    riskMatrix: Array<{ threat: string; level: string; trend: string }>;
    strategicForecast: string;
    corpusArticlesAnalyzed: number;
    generatedAt: string;
  }> {
    const res = await apiFetch('/api/editorial/executive-dossier/latest');
    return handleResponse(res);
  },

  async runSocraticTutor(articleId?: number, userReply?: string, stage?: number): Promise<{
    currentStage: number;
    seniorEditorPersona: string;
    inquiry: string;
    followUpOptions: string[];
  }> {
    const res = await apiFetch('/api/editorial/socratic-tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, userReply, stage }),
    });
    return handleResponse(res);
  },

  // Phase G: Broadcast, Audio & Media Synthesis (Features 21–28)
  async getPodcastDialogue(articleId?: number, title?: string, summary?: string): Promise<{
    articleId: number | null;
    episodeTitle: string;
    estimatedDurationSeconds: number;
    dialogue: Array<{ speaker: 'anchor' | 'reporter'; name: string; text: string; voiceHint: string }>;
    hostA: { name: string; role: string; persona: string };
    hostB: { name: string; role: string; persona: string };
  }> {
    const res = await apiFetch('/api/broadcast/podcast-dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, title, summary }),
    });
    return handleResponse(res);
  },

  async getTvSubtitles(channelId: number): Promise<{
    channelId: number;
    engine: string;
    transcripts: Array<{
      id: number;
      channel_id: number;
      segment_title: string;
      text_content: string;
      speaker_label: string;
      timestamp_utc: string;
    }>;
  }> {
    const res = await apiFetch(`/api/broadcast/tv-subtitles/${channelId}`);
    return handleResponse(res);
  },

  async archiveTvSubtitle(channelId: number, text: string, segmentTitle?: string, speaker?: string): Promise<{
    success: boolean;
    transcriptId: number;
    message: string;
  }> {
    const res = await apiFetch('/api/broadcast/tv-subtitles/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, text, segmentTitle, speaker }),
    });
    return handleResponse(res);
  },

  async getAudioChapters(articleId: number): Promise<{
    articleId: number;
    totalDurationSeconds: number;
    formattedDuration: string;
    chapters: Array<{
      index: number;
      title: string;
      timeOffsetSeconds: number;
      formattedTime: string;
      sectionCategory: string;
      summarySnippet: string;
    }>;
  }> {
    const res = await apiFetch(`/api/broadcast/audio-chapters/${articleId}`);
    return handleResponse(res);
  },

  async getSoundscapePresets(): Promise<{
    engine: string;
    synthesizers: string[];
    presets: Array<{
      id: string;
      name: string;
      description: string;
      defaultLevels: { rain: number; press: number; hearth: number };
    }>;
  }> {
    const res = await apiFetch('/api/broadcast/soundscape-presets');
    return handleResponse(res);
  },

  async getShortwaveSpecs(): Promise<{
    era: string;
    bandpassRangeHz: [number, number];
    tubeHumFrequencyHz: number;
    tubeHumGain: number;
    vinylCrackleDensity: number;
    distortionThreshold: number;
    audioNodeChain: string[];
  }> {
    const res = await apiFetch('/api/broadcast/shortwave-specs');
    return handleResponse(res);
  },

  async getReelScript(articleId: number): Promise<{
    articleId: number;
    aspectRatio: string;
    totalDurationSeconds: number;
    scenes: Array<{
      sceneIndex: number;
      durationSeconds: number;
      visualLayout: string;
      caption: string;
      highlightText: string;
      kenBurnsEffect: string;
    }>;
    audioTrackSuggestion: string;
  }> {
    const res = await apiFetch(`/api/broadcast/reel-script/${articleId}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async getCapAlerts(): Promise<{
    count: number;
    alerts: Array<{
      id: number;
      event: string;
      severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
      headline: string;
      description: string;
      area_desc: string;
      effective_at: string;
      expires_at: string;
      source_agency: string;
      acknowledged: number;
    }>;
    telegraphChirpEnabled: boolean;
    lastPolledUtc: string;
  }> {
    const res = await apiFetch('/api/broadcast/cap-alerts');
    return handleResponse(res);
  },

  async acknowledgeCapAlert(id: number): Promise<{ success: boolean; id: number; message: string }> {
    const res = await apiFetch('/api/broadcast/cap-alerts/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return handleResponse(res);
  },

  // Phase H: Cartography, Chokepoints & Data Markets (Features 29–35)
  async getMarketTickers(refresh = false): Promise<{
    tickers: Array<{
      id: number;
      symbol: string;
      name: string;
      category: 'Commodity' | 'Currency' | 'Crypto' | 'Index';
      price: number;
      unit: string;
      change_24h: number;
      change_pct: number;
      updated_at: string;
    }>;
    lastUpdatedUtc: string;
  }> {
    const res = await apiFetch(`/api/cartography/markets${refresh ? '?refresh=1' : ''}`);
    return handleResponse(res);
  },

  async getMaritimeChokepoints(): Promise<{
    chokepoints: Array<{
      id: number;
      slug: string;
      name: string;
      region: string;
      lat: number;
      lng: number;
      status: 'Normal' | 'Elevated Tension' | 'Congested' | 'Disrupted';
      risk_level: number;
      daily_transits: number;
      global_trade_pct: number;
      incident_summary: string;
      keywords: string[];
      matchedDispatches: number;
      matchedArticleIds: number[];
    }>;
    totalGlobalTradePctMonitored: number;
  }> {
    const res = await apiFetch('/api/cartography/chokepoints');
    return handleResponse(res);
  },

  async getClimateAnomalies(): Promise<{
    anomalies: Array<{
      id: number;
      slug: string;
      title: string;
      anomaly_type: 'Thermal' | 'Storm Track' | 'Drought' | 'Cryosphere' | 'Flooding';
      region: string;
      lat: number;
      lng: number;
      delta_celsius: number;
      severity: 'Extreme' | 'Severe' | 'Moderate' | 'Watch';
      summary: string;
      source_agency: string;
      recorded_at: string;
    }>;
    layerSource: string;
    updatedUtc: string;
  }> {
    const res = await apiFetch('/api/cartography/climate');
    return handleResponse(res);
  },

  async getSupplyChainDag(params: { articleId?: number; sector?: string; commodity?: string }): Promise<{
    articleId: number | null;
    headline: string;
    sector: string;
    criticalBottleneck: string;
    estimatedRetailLagWeeks: number;
    nodes: Array<{ id: string; tier: number; label: string; detail: string; risk: 'Low' | 'Medium' | 'High' | 'Critical' }>;
    edges: Array<{ from: string; to: string; label: string }>;
    generatedAt: string;
  }> {
    const res = await apiFetch('/api/cartography/supply-chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  async getEpidemiologicalBulletins(): Promise<{
    bulletins: Array<{
      id: number;
      slug: string;
      pathogen: string;
      region: string;
      country: string;
      lat: number;
      lng: number;
      alert_level: 'Emergency' | 'High' | 'Elevated' | 'Monitoring';
      confirmed_cases: number;
      trend: 'Accelerating' | 'Stable' | 'Declining' | 'Contained';
      source_agency: string;
      summary: string;
      reported_at: string;
    }>;
    network: string;
    updatedUtc: string;
  }> {
    const res = await apiFetch('/api/cartography/epidemics');
    return handleResponse(res);
  },

  async getElectoralPresets(): Promise<{
    presets: Array<{
      id: number;
      slug: string;
      name: string;
      country: string;
      total_seats: number;
      threshold_pct: number;
      parties: Array<{ id: string; name: string; color: string; votePct: number }>;
    }>;
  }> {
    const res = await apiFetch('/api/cartography/elections');
    return handleResponse(res);
  },

  async simulateElection(params: {
    totalSeats: number;
    thresholdPct: number;
    method: 'dhondt' | 'sainte_lague';
    parties: Array<{ id: string; name: string; color: string; votePct: number }>;
  }): Promise<{
    totalSeats: number;
    thresholdPct: number;
    method: 'dhondt' | 'sainte_lague';
    majorityRequired: number;
    results: Array<{ id: string; name: string; color: string; votePct: number; seats: number; qualified: boolean }>;
  }> {
    const res = await apiFetch('/api/cartography/elections/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  async getDiplomaticFlights(): Promise<{
    flights: Array<{
      id: number;
      callsign: string;
      icao24: string;
      operator: string;
      aircraft_type: string;
      origin: string;
      destination: string;
      origin_lat: number;
      origin_lng: number;
      dest_lat: number;
      dest_lng: number;
      cur_lat: number;
      cur_lng: number;
      altitude_ft: number;
      speed_kts: number;
      mission_type: 'Diplomatic Envoy' | 'Head of State' | 'Humanitarian Relief' | 'Treaty Observer';
      status: string;
      updated_at: string;
    }>;
    source: string;
    updatedUtc: string;
  }> {
    const res = await apiFetch('/api/cartography/flights');
    return handleResponse(res);
  },

  // Phase I: Broadside Bindery & Physical Artifacts (Features 36–42)
  async generateBroadsheetPdf(params: {
    articleId?: number;
    date?: string;
    pageSize?: 'A4' | 'LETTER';
    mastheadTitle?: string;
    mastheadMotto?: string;
  }): Promise<Blob> {
    const res = await apiFetch('/api/bindery/broadsheet-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  },

  async getArticleStamps(articleId: number): Promise<{
    articleId: number;
    stamps: Array<{ id: string; label: string; color: string; xPct: number; yPct: number; rotation: number }>;
    redactions: Array<{ id: string; xPct: number; yPct: number; widthPct: number; heightPct: number }>;
    updatedAt: string | null;
  }> {
    const res = await apiFetch(`/api/bindery/stamps/${articleId}`);
    return handleResponse(res);
  },

  async saveArticleStamps(
    articleId: number,
    stamps: Array<{ id: string; label: string; color: string; xPct: number; yPct: number; rotation: number }>,
    redactions: Array<{ id: string; xPct: number; yPct: number; widthPct: number; heightPct: number }>
  ): Promise<{ success: boolean; articleId: number; stampCount: number; redactionCount: number }> {
    const res = await apiFetch(`/api/bindery/stamps/${articleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stamps, redactions }),
    });
    return handleResponse(res);
  },

  async getBinderyPreferences(): Promise<{
    masthead_title: string;
    masthead_motto: string;
    paper_patina: number;
    press_audio_enabled: number;
    exlibris_initials: string;
    exlibris_motto: string;
  }> {
    const res = await apiFetch('/api/bindery/preferences');
    return handleResponse(res);
  },

  async updateBinderyPreferences(patch: {
    masthead_title?: string;
    masthead_motto?: string;
    paper_patina?: number;
    press_audio_enabled?: boolean;
    exlibris_initials?: string;
    exlibris_motto?: string;
  }): Promise<{
    masthead_title: string;
    masthead_motto: string;
    paper_patina: number;
    press_audio_enabled: number;
    exlibris_initials: string;
    exlibris_motto: string;
  }> {
    const res = await apiFetch('/api/bindery/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return handleResponse(res);
  },

  getBookplateSvgUrl(initials: string, motto: string, title?: string): string {
    const qs = new URLSearchParams({ initials, motto });
    if (title) qs.set('title', title);
    return apiUrl(`/api/bindery/bookplate-svg?${qs.toString()}`);
  },

  async getDailyCrossword(): Promise<{
    editionDate: string;
    title: string;
    gridSize: number;
    grid: Array<Array<{ char: string | null; number?: number }>>;
    clues: {
      across: Array<{ number: number; clue: string; answer: string; row: number; col: number; length: number }>;
      down: Array<{ number: number; clue: string; answer: string; row: number; col: number; length: number }>;
    };
  }> {
    const res = await apiFetch('/api/bindery/crossword');
    return handleResponse(res);
  },

  // Phase J & K: Mobile Power-User OS Integration & Archival Sovereignty (Features 43–50)
  async getAndroidWidgetPayload(): Promise<{
    widgetLayout: string;
    masthead: string;
    leadArticleId: number | null;
    leadHeadline: string;
    leadSource: string;
    leadBreakingScore: number;
    unreadWireCount: number;
    updatedUtc: string;
  }> {
    const res = await apiFetch('/api/sovereign/android-widget');
    return handleResponse(res);
  },

  async getSovereignSettings(): Promise<{
    e_ink_mode: number;
    volume_key_nav: number;
    enclave_locked: number;
    mesh_node_id: string;
    mesh_sync_enabled: number;
  }> {
    const res = await apiFetch('/api/sovereign/settings');
    return handleResponse(res);
  },

  async updateSovereignSettings(patch: {
    e_ink_mode?: boolean;
    volume_key_nav?: boolean;
    mesh_sync_enabled?: boolean;
    enclave_locked?: boolean;
  }): Promise<{
    e_ink_mode: number;
    volume_key_nav: number;
    enclave_locked: number;
    mesh_node_id: string;
    mesh_sync_enabled: number;
  }> {
    const res = await apiFetch('/api/sovereign/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return handleResponse(res);
  },

  async getMeshBundle(): Promise<{
    nodeId: string;
    meshSyncEnabled: boolean;
    bundleSha256: string;
    articleCount: number;
    articles: any[];
    peers: Array<{ id: number; peer_id: string; peer_label: string; bundle_sha256: string; article_count: number; synced_at: string }>;
    generatedUtc: string;
  }> {
    const res = await apiFetch('/api/sovereign/mesh/bundle');
    return handleResponse(res);
  },

  async syncMeshPeer(peerId: string, peerLabel: string, bundleSha256: string, articleCount: number): Promise<{
    success: boolean;
    verifiedSha256: string;
    peers: any[];
  }> {
    const res = await apiFetch('/api/sovereign/mesh/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, peerLabel, bundleSha256, articleCount }),
    });
    return handleResponse(res);
  },

  async getWaybackMirror(articleId: number): Promise<{ articleId: number; mirror: any | null }> {
    const res = await apiFetch(`/api/sovereign/wayback/${articleId}`);
    return handleResponse(res);
  },

  async snapshotWaybackArticle(articleId: number): Promise<{ success: boolean; mirror: any }> {
    const res = await apiFetch(`/api/sovereign/wayback/${articleId}/snapshot`, { method: 'POST' });
    return handleResponse(res);
  },

  async getFido2Status(): Promise<{ enclaveLocked: boolean; credentials: any[] }> {
    const res = await apiFetch('/api/sovereign/fido2/status');
    return handleResponse(res);
  },

  async registerFido2Key(label: string, credentialId?: string, publicKeySpki?: string): Promise<{ success: boolean; credential: any }> {
    const res = await apiFetch('/api/sovereign/fido2/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, credentialId, publicKeySpki }),
    });
    return handleResponse(res);
  },

  async lockFido2Enclave(): Promise<{ success: boolean; enclaveLocked: boolean }> {
    const res = await apiFetch('/api/sovereign/fido2/lock', { method: 'POST' });
    return handleResponse(res);
  },

  async unlockFido2Enclave(credentialId?: string): Promise<{ success: boolean; enclaveLocked: boolean }> {
    const res = await apiFetch('/api/sovereign/fido2/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId }),
    });
    return handleResponse(res);
  },

  async exportSingleFileHtml(title: string, bookmarkedOnly: boolean, limit = 25): Promise<Blob> {
    const res = await apiFetch('/api/sovereign/export-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, bookmarkedOnly, limit }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  },
};


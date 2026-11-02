/**
 * frontend/src/types/index.ts
 * Frontend data models matching backend API contracts & FRONTEND_BACKEND_CONTRACT.md
 */

// ─── Source ───────────────────────────────────────────────────────────────────
export interface Source {
  id: number;
  slug?: string;
  name: string;
  country: string;
  url?: string;
  fetch_type?: 'rss' | 'gdelt' | 'scrape';
  enabled?: boolean;
  last_fetched_at?: string | null;
}

// ─── Categories & Themes ──────────────────────────────────────────────────────
export type Category =
  | 'World'
  | 'Politics'
  | 'Business'
  | 'Tech'
  | 'Science'
  | 'Health'
  | 'Sports'
  | 'Entertainment'
  | 'Environment'
  | 'Crime'
  | 'Animals';

export type ThemeMode = 'paper' | 'night';

export type AppView =
  | 'reader'
  | 'category'
  | 'compare'
  | 'timeline'
  | 'globe'
  | 'archive'
  | 'watchlist'
  | 'tv'
  | 'pdf'
  | 'briefing'
  | 'alerts'
  | 'sources-settings'
  | 'settings';

// ─── AnchorPhrase (NEW — Step 5) ──────────────────────────────────────────────
export interface AnchorPhrase {
  phrase: string;          // verbatim substring of body_english
  sentence_index: number;  // 0-based index into summary sentences
}

// ─── Confirmation & Corroboration (PRD A Category 9) ──────────────────────────
export type ConfirmationTier = 'single_source' | 'two_outlets' | 'multi_outlet_single_nation' | 'confirmed';

export interface ConfirmationStatus {
  tier: ConfirmationTier;
  label: string;
  outletCount: number;
  countryCount: number;
  isConfirmed: boolean;
  isBreaking: boolean;
  breakingLabel?: 'Unconfirmed Breaking' | 'Confirmed Breaking';
}

// ─── Article Models ───────────────────────────────────────────────────────────
export interface ArticleListItem {
  id: number;
  url: string;
  title_english: string | null;
  summary: string | null;
  keywords: string[];
  categories: Category[];
  breaking_score: number;
  cluster_id: number | null;
  cluster_outlet_count?: number;
  cluster_country_count?: number;
  cluster_is_breaking?: boolean;
  confirmation?: ConfirmationStatus;
  source: Pick<Source, 'id' | 'name' | 'country'>;
  published_at: string | null;
  ingested_at?: string;
  is_catchup?: boolean;
  pass1_completed_at?: string | null;
  pass2_completed_at?: string | null;
  fetched_at: string;
  delayed?: boolean;
}

export interface ArticleFull extends ArticleListItem {
  title_original: string | null;
  body_original: string | null;
  body_english: string | null;
  language_detected: string | null;
  bookmarked: boolean;
  anchor_phrases: AnchorPhrase[];
  source: Source;
}

// Legacy Article interface for compatibility across all UI components
export interface Article {
  id: number;
  url: string;
  title_original?: string | null;
  title_english: string;
  body_original?: string | null;
  body_english?: string | null;
  summary: string;
  language_detected?: string | null;
  breaking_score: number;
  cluster_id: number | null;
  cluster_outlet_count?: number;
  cluster_country_count?: number;
  cluster_is_breaking?: boolean;
  confirmation?: ConfirmationStatus;
  bookmarked: boolean;
  published_at: string | null;
  ingested_at?: string;
  is_catchup?: boolean;
  pass1_completed_at?: string | null;
  pass2_completed_at?: string | null;
  fetched_at: string;
  source: Source;
  categories: string[];
  keywords: string[];
  anchor_phrases?: AnchorPhrase[];
}

// ─── Cluster ──────────────────────────────────────────────────────────────────
export interface Cluster {
  id: number;
  headline: string | null;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: boolean;
  confirmation?: ConfirmationStatus;
  articles?: ArticleListItem[] | Array<{
    id: number;
    url?: string;
    title_english: string;
    summary?: string;
    source: Source;
  }>;
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export type AlertType = 'breaking' | 'quota' | 'provider_switch' | 'error' | 'warning' | 'watchlist';

export interface Alert {
  id: number;
  type: AlertType;
  message: string;
  cluster_id: number | null;
  fired_at: string;
  acknowledged: boolean;
  confirmation?: ConfirmationStatus;
}

export interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  cluster_id?: number;
  article_id?: number;
  breaking_score?: number;
  fromProvider?: string;
  toProvider?: string;
  confirmation?: ConfirmationStatus;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────
export interface WatchlistItem {
  id: number;
  topic: string;
  keywords: string[];
  priority: 'low' | 'normal' | 'high';
  enabled: boolean;
  created_at: string;
}

// ─── Search / Archive Chat ────────────────────────────────────────────────────
export interface SearchResultItem {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  breaking_score: number;
  source_name: string;
  source_country: string;
  score?: number;
  source?: Pick<Source, 'name' | 'country'>;
}

export type SearchResult = SearchResultItem;

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  ai_answer: string | null;
}

// ─── TV Channel ───────────────────────────────────────────────────────────────
export interface TvChannel {
  id: number;
  name: string;
  slug?: string | null;
  country: string | null;
  country_code?: string | null;
  category: string | null;
  stream_url: string;
  youtube_live_url?: string | null;
  youtube_channel_id?: string | null;
  website?: string | null;
  logo_url: string | null;
  is_alive: boolean;
  is_favorite: boolean;
  is_top5?: boolean;
  rank?: number | null;
  status?: string | null;
  evidence?: string | null;
  last_checked_at: string | null;
}

// ─── Quota & Providers ────────────────────────────────────────────────────────
export interface ProviderQuota {
  calls_today: number;
  tokens_today: number;
  errors_today: number;
}

export interface QuotaData {
  current_provider: string;
  providers: Record<string, ProviderQuota>;
}

export interface QuotaResponse {
  current_provider: string;
  providers: Record<string, ProviderQuota>;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface AppSettings {
  refresh_interval_minutes: number;
  alert_threshold: number;
  auto_cleanup_enabled: boolean;
  retention_days: number;
  sound_enabled: boolean;
  // UI-only tokens
  theme?: 'paper' | 'night';
  evidence_highlight_enabled?: boolean;
  reading_mode_enabled?: boolean;
  // Auto-advance reader settings (PRD A Category 2)
  auto_advance_enabled?: boolean;
  auto_advance_interval_sec?: number;
  auto_advance_pause_on_hover?: boolean;
  // Plain Mode (PRD A Category 3)
  plain_mode_enabled?: boolean;
  // Two-Pass AI Ingestion & Quota Telemetry (PRD A Category 10)
  two_pass_ai_enabled?: boolean;
  pass2_threshold?: number;
}

export interface TwoPassTelemetry {
  two_pass_ai_enabled: boolean;
  pass2_threshold: number;
  pass1_count: number;
  pass2_count: number;
  pass2_skipped_count: number;
  estimated_tokens_saved: number;
  last_updated_at: string;
}

// ─── Startup & Backfill ───────────────────────────────────────────────────────
export interface StartupStatus {
  status: string;
  uptime_ms: number;
  missed_minutes: number;
  last_fetched_at: string | null;
  detected: boolean;
  can_backfill: boolean;
  window_start: string | null;
  window_end: string | null;
}

export interface BackfillResponse {
  status: string;
  covered_minutes: number;
  total_missed_minutes: number;
  articles_fetched: number;
  articles_inserted: number;
  gdelt_coverage: boolean;
  rss_coverage: boolean;
  warning?: string;
}

// ─── Paginated wrapper ────────────────────────────────────────────────────────
export interface Paginated<T> {
  total: number;
  items: T[];
}

// ─── SSE Events ───────────────────────────────────────────────────────────────
export interface SSENewArticle {
  type: 'new_article';
  article_id: number;
}

export interface SSEClusterUpdate {
  type: 'cluster_update';
  cluster_id: number;
  outlet_count: number;
}

export interface SSEAlert {
  type: 'alert';
  alert: Alert;
}

export interface SSEProviderSwitch {
  type: 'provider_switch';
  from: string;
  to: string;
  reason: string;
}

export interface SSEQuotaUpdate {
  type: 'quota_update';
  data: QuotaResponse;
}

export interface SSEHeartbeat {
  type: 'heartbeat';
}

export type SSEEvent =
  | SSENewArticle
  | SSEClusterUpdate
  | SSEAlert
  | SSEProviderSwitch
  | SSEQuotaUpdate
  | SSEHeartbeat;

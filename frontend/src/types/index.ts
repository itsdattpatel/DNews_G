/**
 * frontend/src/types/index.ts
 * Frontend data models matching backend API contracts
 */

export interface Source {
  id: number;
  slug?: string;
  name: string;
  country: string;
  url?: string;
}

export type SpiderType = 'Reader' | 'Scout' | 'Weaver' | 'RedAlert' | 'Archive' | 'Swarm';

export type SpiderMode = 'reading' | 'breaking' | 'compare' | 'archive';

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

export interface AnchorPhrase {
  phrase: string;
  sentence_index: number;
}

export interface Article {
  id: number;
  url: string;
  title_original?: string;
  title_english: string;
  body_original?: string;
  body_english?: string;
  summary: string;
  language_detected?: string;
  breaking_score: number;
  spider_type: SpiderType;
  cluster_id: number | null;
  bookmarked: boolean;
  published_at: string | null;
  fetched_at: string;
  source: Source;
  categories: string[];
  keywords: string[];
}

export interface Cluster {
  id: number;
  headline: string;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: boolean;
  articles?: Array<{
    id: number;
    url?: string;
    title_english: string;
    summary?: string;
    source: Source;
  }>;
}

export interface AlertItem {
  id: string;
  type: 'breaking' | 'provider_switch' | 'quota' | 'error' | 'warning' | 'watchlist';
  message: string;
  timestamp: string;
  cluster_id?: number;
  article_id?: number;
  breaking_score?: number;
  fromProvider?: string;
  toProvider?: string;
}

export interface WatchlistItem {
  id: number;
  topic: string;
  keywords: string[];
  priority: 'low' | 'normal' | 'high';
  enabled: boolean;
  created_at: string;
}

export interface SearchResultItem {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  breaking_score: number;
  source_name: string;
  source_country: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  ai_answer: string | null;
}

export interface TvChannel {
  id: number;
  name: string;
  country: string | null;
  category: string | null;
  stream_url: string;
  logo_url: string | null;
  is_alive: boolean;
  is_favorite: boolean;
  last_checked_at: string | null;
}

export interface ProviderQuota {
  calls_today: number;
  tokens_today: number;
  errors_today: number;
}

export interface QuotaData {
  current_provider: 'gemini' | 'groq' | 'mistral' | 'cerebras';
  providers: Record<string, ProviderQuota>;
}

export interface AppSettings {
  refresh_interval_minutes: number;
  max_spiders: number;
  alert_threshold: number;
  auto_cleanup_enabled: boolean;
  retention_days: number;
  sound_enabled: boolean;
}

export interface StartupStatus {
  status: string;
  uptime_ms: number;
  missed_minutes: number;
  last_fetched_at: string | null;
  detected: boolean;
  can_backfill: boolean;
  window_start: string | null;
  window_end: string;
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

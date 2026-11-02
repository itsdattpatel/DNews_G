/**
 * backend/src/db/types.ts
 * TypeScript interfaces mirroring every DB table row.
 */

export type ArticleStatus = 'pending' | 'processing' | 'done' | 'ai_failed' | 'skipped';
export type Category =
  | 'World' | 'Politics' | 'Business' | 'Tech' | 'Science'
  | 'Health' | 'Sports' | 'Entertainment' | 'Environment' | 'Crime' | 'Animals';
export type AlertType = 'breaking' | 'quota' | 'provider_switch' | 'error' | 'watchlist';
export type FetchType = 'rss' | 'gdelt' | 'scrape';
export type Priority = 'low' | 'normal' | 'high';

export interface DbSource {
  id: number;
  slug: string;
  name: string;
  country: string;
  url: string;
  fetch_type: FetchType;
  enabled: number;
  last_fetched_at: string | null;
  created_at: string;
}

export interface DbCluster {
  id: number;
  headline: string | null;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: number;
}

export interface DbArticle {
  id: number;
  source_id: number;
  url: string;
  title_original: string | null;
  title_english: string | null;
  body_original: string | null;
  body_english: string | null;
  summary: string | null;
  language_detected: string | null;
  published_at: string | null;
  fetched_at: string;
  ingested_at?: string | null;
  is_catchup?: number;
  ai_processed_at: string | null;
  status: ArticleStatus;
  breaking_score: number;
  cluster_id: number | null;
  bookmarked: number;
  anchor_phrases?: string | null;
  created_at: string;
}

export interface DbKeyword {
  id: number;
  article_id: number;
  keyword: string;
  position: number | null;
  created_at: string;
}

export interface DbArticleCategory {
  article_id: number;
  category: Category;
}

export interface DbAlert {
  id: number;
  type: AlertType;
  message: string;
  cluster_id: number | null;
  fired_at: string;
  acknowledged: number;
}

export interface DbWatchlistItem {
  id: number;
  topic: string;
  keywords: string; // JSON array string
  priority: Priority;
  enabled: number;
  created_at: string;
}

export interface DbQuotaLog {
  id: number;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  success: number;
  called_at: string;
}

export interface DbAppSession {
  id: number;
  started_at: string;
  last_heartbeat_at: string;
  ended_at: string | null;
  clean_shutdown: number;
  end_reason: string | null;
  missed_window_start: string | null;
  missed_window_end: string | null;
  articles_ingested_in_session: number;
}

export interface DbIngestHourly {
  bucket_utc: string;
  count: number;
  catchup_count: number;
  duplicates_skipped: number;
}

export interface DbIngestDaily {
  date_utc: string;
  count: number;
  catchup_count: number;
  duplicates_skipped: number;
}

export interface DbLifetimeCounter {
  id: number;
  tracking_since: string;
  total_ingested: number;
  total_catchup: number;
  total_duplicates_skipped: number;
  last_updated_at: string;
}


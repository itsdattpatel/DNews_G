/**
 * backend/src/db/types.ts
 * TypeScript interfaces mirroring every DB table row.
 */

export type ArticleStatus = 'pending' | 'processing' | 'done' | 'ai_failed' | 'skipped';
export type SpiderType = 'Reader' | 'Scout' | 'Weaver' | 'RedAlert' | 'Archive' | 'Swarm';
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
  ai_processed_at: string | null;
  status: ArticleStatus;
  breaking_score: number;
  spider_type: SpiderType;
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

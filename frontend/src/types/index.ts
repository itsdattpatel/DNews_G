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
  | 'control-room'
  | 'sources-settings'
  | 'settings'
  | 'photojournalism'
  | 'custom-rss'
  | 'source-health'
  | 'entities'
  | 'sunday-edition';

export interface EntityGraphNode {
  id: string;
  name: string;
  type: 'nation' | 'organization' | 'leader' | 'topic';
  mentions: number;
  urgency: number;
  rank: number;
}

export interface EntityGraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface EntityGraphResponse {
  success: boolean;
  nodes: EntityGraphNode[];
  links: EntityGraphLink[];
  total_entities: number;
  total_connections: number;
  generated_at: string;
}

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
  // General & Realtime
  timezone_mode?: 'local' | 'utc';
  catchup_alert_enabled?: boolean;
  clock_sync_enabled?: boolean;
  debug_logging?: boolean;
  rail_pinned?: boolean;

  // Reading Desk (PRD A Cat 2 & PRD C Cat 4)
  auto_advance_enabled?: boolean;
  auto_advance_interval_sec?: number;
  auto_advance_pause_on_hover?: boolean;
  strip_follow_enabled?: boolean;
  strip_follow_grace_sec?: number;
  ticker_speed?: 'slow' | 'normal' | 'fast';
  evidence_highlight_enabled?: boolean;
  reading_mode_enabled?: boolean;

  // News & Sources
  refresh_interval_minutes: number;
  live_refresh_interval_sec?: number;
  default_country_filter?: string;
  category_filter_list?: string;
  enrich_batch_size?: number;

  // AI & Plain Mode (PRD A Cat 3 & 10)
  plain_mode_enabled?: boolean;
  two_pass_ai_enabled?: boolean;
  pass2_threshold?: number;

  // TV Broadcasts (PRD C Cat 5)
  tv_method_order?: string;
  tv_autoplay_muted?: boolean;
  tv_volume?: number;
  tv_health_interval_min?: number;
  tv_stopped_fail_threshold?: number;
  tv_mini_player_enabled?: boolean;

  // Map & Globe (PRD C Cat 7)
  map_engine?: 'globe' | 'flat';
  globe_autorotate?: boolean;
  map_wildlife_layer?: boolean;
  map_pulse_enabled?: boolean;

  // Alerts & Sound
  alert_threshold: number;
  sound_enabled: boolean;
  browser_notifications?: boolean;
  breaking_notifications_enabled?: boolean;
  breaking_audio_enabled?: boolean;
  audio_volume?: number;
  audio_teletype_enabled?: boolean;

  // Appearance & Broadsheet Typography
  theme?: 'paper' | 'night';
  layout_density?: 'comfortable' | 'compact';
  reduce_motion_override?: 'system' | 'reduce' | 'allow';

  // Telegraph Scramble Animation (React-Bits ScrambledText)
  scramble_enabled?: boolean;
  scramble_speed?: number;
  scramble_max_iterations?: number;
  scramble_sequential?: boolean;
  scramble_charset?: 'telegraph' | 'crypto' | 'matrix' | 'numbers' | string;

  // React Bits CircularGallery Settings
  gallery_bend?: number;
  gallery_item_size?: number;
  gallery_item_aspect?: number;
  gallery_scroll_speed?: number;
  gallery_scroll_ease?: number;
  gallery_wave?: number;
  gallery_fade_edges?: number;
  gallery_gap?: number;
  gallery_border_radius?: number;
  gallery_shadow?: number;
  gallery_grayscale?: boolean;
  gallery_auto_scroll?: number;
  gallery_auto_drop_delay?: number;

  // Data & Storage (PRD A Cat 4)
  auto_cleanup_enabled: boolean;
  retention_days: number;

  // Library & Mind (PRD B)
  library_citation_format?: 'apa' | 'chicago';
  helpline_default_region?: string;
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

export interface SSEControlRoomUpdate {
  type: 'control_room_update';
  data?: unknown;
}

export interface SSESystemError {
  type: 'system_error';
  data: SystemErrorRecord;
}

export interface SSEGenericEvent {
  type:
    | 'connected'
    | 'resync_required'
    | 'article_updated'
    | 'article_enriched_pass2'
    | 'alert_acknowledged'
    | 'feed_counter_update'
    | 'tv_health_update'
    | 'watchlist_update'
    | 'settings_update'
    | 'bookmark_update'
    | 'session_gap_update';
  data?: unknown;
}

export type SSEEvent =
  | SSENewArticle
  | SSEClusterUpdate
  | SSEAlert
  | SSEProviderSwitch
  | SSEQuotaUpdate
  | SSEHeartbeat
  | SSEControlRoomUpdate
  | SSESystemError
  | SSEGenericEvent;

// ─── Control Room Telemetry & Error Ledger (Category 11) ──────────────────────
export type SubsystemName = 'fetcher' | 'ai' | 'scheduler' | 'db' | 'tv' | 'system';
export type ErrorLevel = 'error' | 'warn' | 'info';
export type FreshnessTier = 'fresh' | 'delayed' | 'failing' | 'disabled';

export interface SystemErrorRecord {
  id: number;
  timestamp: string;
  subsystem: SubsystemName;
  level: ErrorLevel;
  message: string;
  details: string | null;
  created_at: string;
}

export interface SourceTelemetryItem {
  id: number;
  name: string;
  slug: string;
  country: string;
  url: string;
  fetch_type: string;
  enabled: boolean;
  last_fetched_at: string | null;
  last_latency_ms: number | null;
  error_count: number;
  last_error: string | null;
  last_error_at: string | null;
  last_status: string;
  freshness_tier: FreshnessTier;
  minutes_since_fetch: number | null;
}

export interface ControlRoomTelemetry {
  server_time: string;
  sources: SourceTelemetryItem[];
  source_summary: {
    total: number;
    enabled: number;
    fresh: number;
    delayed: number;
    failing: number;
    disabled: number;
    avg_latency_ms: number;
  };
  scheduler: {
    is_running: boolean;
    last_cycle_started_at: string | null;
    last_cycle_completed_at: string | null;
    last_cycle_duration_ms: number | null;
    last_cycle_articles_fetched: number;
    last_cycle_new_articles: number;
    next_cycle_expected_at: string | null;
    interval_minutes: number;
    startup_gap: {
      detected: boolean;
      missed_minutes: number;
    };
  };
  ai_providers: {
    chain: Array<{
      name: string;
      model: string;
      enabled: boolean;
      timeout_ms: number;
    }>;
    current_provider: string;
    throttled: Record<string, { throttled: boolean; remainingSec: number }>;
    stats_today: Record<string, {
      callsToday: number;
      tokensToday: number;
      errorsToday: number;
    }>;
    two_pass: {
      pass1_count: number;
      pass2_count: number;
      pass2_skipped_count: number;
      estimated_tokens_saved: number;
    };
  };
  queues: {
    pending: number;
    processing: number;
    done: number;
    ai_failed: number;
    pass1_triaged: number;
    pass2_enriched: number;
    pass2_deferred: number;
  };
  storage: {
    db_path: string;
    db_size_bytes: number;
    db_size_mb: number;
    db_size_formatted: string;
    warning_threshold_mb: number;
    limit_threshold_mb: number;
    storage_health: 'optimal' | 'warning' | 'critical';
    total_articles: number;
    total_clusters: number;
    total_sources: number;
    backups_count: number;
    latest_backup: {
      filename: string;
      createdAt: string;
      sizeFormatted: string;
      trigger: string;
    } | null;
  };
  modes: {
    plain_mode_enabled: boolean;
    two_pass_ai_enabled: boolean;
    pass2_threshold: number;
    auto_advance_enabled: boolean;
    auto_advance_interval_sec: number;
    refresh_interval_minutes: number;
  };
  error_summary: {
    total_24h: number;
    by_subsystem: Record<SubsystemName, number>;
    by_level: Record<ErrorLevel, number>;
    latest_error: SystemErrorRecord | null;
  };
}

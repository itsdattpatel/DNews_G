# Frontend-Backend Contract — AI World News Desk
*Version 1.0 · 2026-11-01*

Base URL: `http://127.0.0.1:3001/api`
All requests from frontend use TanStack Query (GET) or `fetch` + mutation (POST/PATCH/DELETE).
SSE via one persistent connection at `/api/sse` (auto-reconnect hook).

---

## 1. Shared TypeScript Types

Lives in `frontend/src/types/index.ts` (update existing file).

```typescript
// ─── Source ───────────────────────────────────────────────────────────────────
export interface Source {
  id: number;
  slug: string;
  name: string;
  country: string;
  url: string;
  fetch_type: 'rss' | 'gdelt' | 'scrape';
  enabled: boolean;
  last_fetched_at: string | null;
}

// ─── AnchorPhrase (NEW — Step 5) ──────────────────────────────────────────────
export interface AnchorPhrase {
  phrase: string;          // verbatim substring of body_english
  sentence_index: number;  // 0-based index into summary sentences
}

// ─── Article ──────────────────────────────────────────────────────────────────
export interface ArticleListItem {
  id: number;
  url: string;
  title_english: string | null;
  summary: string | null;
  keywords: string[];
  categories: Category[];
  breaking_score: number;
  cluster_id: number | null;
  source: Pick<Source, 'id' | 'name' | 'country'>;
  published_at: string | null;     // from feed or null if unverified/missing
  ingested_at: string;             // UTC ISO-8601 with trailing 'Z' (arrival time)
  is_catchup: boolean;             // true if arrived during catch-up window
  fetched_at: string;
  delayed?: boolean;               // true if from delayed free-tier source
}

export interface ArticleFull extends ArticleListItem {
  title_original: string | null;
  body_original: string | null;
  body_english: string | null;
  language_detected: string | null;
  bookmarked: boolean;
  anchor_phrases: AnchorPhrase[];   // from migration 003
  source: Source;
}

// ─── App Session (Category 1B) ────────────────────────────────────────────────
export interface AppSession {
  id: number;
  started_at: string;              // UTC ISO-8601 with 'Z'
  last_heartbeat_at: string;       // UTC ISO-8601 with 'Z'
  ended_at: string | null;         // UTC ISO-8601 with 'Z'
  end_reason: 'clean' | 'unclean' | 'crash' | 'sleep' | null;
}

// ─── Ingest Velocity Stats (Category 8) ────────────────────────────────────────
export interface HourlySparklinePoint {
  hour: string;                    // UTC ISO-8601 bucket
  count: number;
  is_app_off: boolean;             // true if app was off during this hour
}

export interface IngestStats {
  rolling_24h: number;             // new unique articles saved in last 24h
  duplicates_skipped: number;      // rejected duplicates in last 24h
  catchup_count: number;           // arrivals marked is_catchup = 1 in last 24h
  hourly_sparkline: HourlySparklinePoint[];
  total_30d: number;               // 30-day cumulative count from ingest_daily
  all_time: number;                // lifetime total from lifetime_counter
  first_run_at: string;            // UTC ISO-8601 with 'Z'
  total_running_sec: number;       // lifetime running seconds from app_sessions
  total_away_sec: number;          // lifetime away seconds from app_sessions
}

// ─── Category ─────────────────────────────────────────────────────────────────
export type Category =
  | 'World' | 'Politics' | 'Business' | 'Tech' | 'Science'
  | 'Health' | 'Sports' | 'Entertainment' | 'Environment' | 'Crime' | 'Animals';

// ─── Cluster ──────────────────────────────────────────────────────────────────
export interface Cluster {
  id: number;
  headline: string | null;
  first_seen_at: string;
  last_updated_at: string;
  outlet_count: number;
  country_count: number;
  is_breaking: boolean;
  articles: ArticleListItem[];
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export type AlertType = 'breaking' | 'quota' | 'provider_switch' | 'error';
export interface Alert {
  id: number;
  type: AlertType;
  message: string;
  cluster_id: number | null;
  fired_at: string;
  acknowledged: boolean;
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

// ─── TV Channel ───────────────────────────────────────────────────────────────
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

// ─── Quota ────────────────────────────────────────────────────────────────────
export interface ProviderQuota {
  calls_today: number;
  tokens_today: number;
  errors_today: number;
}
export interface QuotaResponse {
  current_provider: string;
  providers: Record<string, ProviderQuota>;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface AppSettings {
  refresh_interval_minutes: number;
  max_spiders: number;
  alert_threshold: number;
  auto_cleanup_enabled: boolean;
  retention_days: number;
  // UI-only settings (stored in backend settings table):
  theme: 'paper' | 'night';
}

// ─── Search / Archive Chat ────────────────────────────────────────────────────
export interface SearchResult {
  id: number;
  title_english: string | null;
  summary: string | null;
  score: number;
  source: Pick<Source, 'name' | 'country'>;
  published_at: string | null;
}
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  ai_answer: string | null;
}

// ─── Paginated wrapper ────────────────────────────────────────────────────────
export interface Paginated<T> {
  total: number;
  items: T[];
}

// ─── SSE Events (PRD D Category 4: Unified Main Desk Real-Time Layer) ─────────
// All domain frames carry a monotonic numeric `id: <seq>` (1,000-entry server ring buffer)
// supporting `Last-Event-ID` / `?since=<seq>` cursor replay on reconnect.
// `connected` and `heartbeat` frames intentionally omit `id:` per SSE spec.
export interface SSEConnected           { type: 'connected';             clientId: string; latestEventId: number; }
export interface SSEResyncRequired      { type: 'resync_required';       reason: 'cursor_expired' | 'server_restarted'; earliestAvailableId?: number; clientCursor?: number; latestId: number; }
export interface SSENewArticle          { type: 'new_article';           article_id: number; }
export interface SSEArticleUpdated      { type: 'article_updated';       article_id: number; }
export interface SSEArticleEnrichedP2   { type: 'article_enriched_pass2'; article_id: number; }
export interface SSEClusterUpdate       { type: 'cluster_update';        cluster_id: number; outlet_count: number; country_count?: number; is_breaking?: boolean; headline?: string; article_id?: number; }
export interface SSEAlert               { type: 'alert';                 id?: number; type_kind?: string; message: string; article_id?: number; cluster_id?: number | null; breaking_score?: number; }
export interface SSEAlertAcknowledged   { type: 'alert_acknowledged';    id?: number; all?: boolean; }
export interface SSEProviderSwitch      { type: 'provider_switch';       from: string; to: string; reason: string; }
export interface SSEQuotaUpdate         { type: 'quota_update';          data: QuotaResponse | Record<string, unknown>; }
export interface SSEControlRoomUpdate   { type: 'control_room_update';   data: Record<string, unknown>; }
export interface SSESystemError         { type: 'system_error';          data: Record<string, unknown>; }
export interface SSEFeedCounterUpdate   { type: 'feed_counter_update';   data: Record<string, unknown>; }
export interface SSETvHealthUpdate      { type: 'tv_health_update';      action?: string; channel_id?: number; is_alive?: boolean; latency_ms?: number; method?: string; channel?: Record<string, unknown>; }
export interface SSEWatchlistUpdate     { type: 'watchlist_update';      action: 'created' | 'updated' | 'deleted'; item?: Record<string, unknown>; deleted_id?: number; }
export interface SSESettingsUpdate      { type: 'settings_update';       updatedKeys?: string[]; settings: Record<string, unknown>; }
export interface SSEBookmarkUpdate      { type: 'bookmark_update';       article_id: number; bookmarked: boolean; }
export interface SSESessionGapUpdate    { type: 'session_gap_update';    detected: boolean; missed_minutes: number; can_backfill: boolean; }
export interface SSEHeartbeat           { type: 'heartbeat';             ts?: string; }

export type SSEEvent =
  | SSEConnected | SSEResyncRequired | SSENewArticle | SSEArticleUpdated | SSEArticleEnrichedP2
  | SSEClusterUpdate | SSEAlert | SSEAlertAcknowledged | SSEProviderSwitch | SSEQuotaUpdate
  | SSEControlRoomUpdate | SSESystemError | SSEFeedCounterUpdate | SSETvHealthUpdate
  | SSEWatchlistUpdate | SSESettingsUpdate | SSEBookmarkUpdate | SSESessionGapUpdate | SSEHeartbeat;

// ─── Startup ──────────────────────────────────────────────────────────────────
export interface StartupStatus {
  status: 'ok' | 'error';
  uptime_ms: number;
  missed_minutes: number;
  last_fetched_at: string | null;
  detected: boolean;
  can_backfill: boolean;
  window_start: string | null;
  window_end: string | null;
}
```

---

## 2. Endpoint-to-Screen Map

### Screen (a) Main Reader `/`

| Method | Endpoint | Purpose | Query hook |
|--------|----------|---------|-----------|
| GET | `/api/articles` | Article list for card strip | `useArticles()` |
| GET | `/api/articles/:id` | Full article (body + anchor_phrases) | `useArticle(id)` |
| PATCH | `/api/articles/:id/bookmark` | Bookmark toggle | mutation |
| GET | `/api/sse` | Live new_article events | `useSSE()` |

**SSE events consumed**: `new_article`, `alert`, `provider_switch`, `heartbeat`

---

### Screen (b) Category Rail `/category/:name`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/articles?category=X&limit=50&offset=N` | Filtered article list |
| GET | `/api/articles?q=search` | Full-text search |
| GET | `/api/sse` | New articles trigger list refresh |

**SSE events consumed**: `new_article`

---

### Screen (c) Compare Coverage `/compare/:cluster_id`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/clusters/:id` | Full cluster with all articles |
| GET | `/api/articles/:id` | Each article's body (lazy, on expand) |

---

### Screen (d) Story Timeline `/timeline/:cluster_id`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/clusters/:id` | Cluster articles sorted by published_at |

---

### Screen (e) Globe/Map `/globe`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/articles?status=done&limit=500` | Articles with location_tags for pins |
| GET | `/api/sse` | New pins on new_article |

**SSE events consumed**: `new_article`

---

### Screen (f) Archive Chat `/archive`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/search` | FTS5 search + AI synthesis |

---

### Screen (g) Watchlist `/watchlist`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/watchlist` | List all watchlist items |
| POST | `/api/watchlist` | Add item |
| PATCH | `/api/watchlist/:id` | Update item |
| DELETE | `/api/watchlist/:id` | Remove item |
| GET | `/api/sse` | new_article → check against watchlist keywords |

**SSE events consumed**: `new_article`

---

### Screen (h) TV View `/tv`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tv/channels?category=documentary` | Animal/Discovery shelf |
| GET | `/api/tv/channels?is_favorite=true` | Favorites |
| GET | `/api/tv/channels` | All channels |
| PATCH | `/api/tv/channels/:id/favorite` | Toggle favorite |
| POST | `/api/tv/channels/:id/health-check` | Test stream health |

---

### Screen (i) PDF Preview `/pdf`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/export/pdf` | Generate PDF (returns binary) |

---

### Screen (j) Morning Briefing `/briefing`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/export/briefing` | Fetch briefing text |

---

### Screen (k) Alerts Center `/alerts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/alerts?acknowledged=false` | Unread alerts |
| GET | `/api/alerts` | All alerts |
| PATCH | `/api/alerts/:id/acknowledge` | Mark read |
| GET | `/api/sse` | Real-time alert events |

**SSE events consumed**: `alert`, `quota_update`, `provider_switch`

---

### Screen (l) Settings Overlay

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/settings` | Load all settings |
| PATCH | `/api/settings` | Save settings |
| GET | `/api/quota` | Provider quota display |

**SSE events consumed**: `quota_update`

---

### Screen (m) API & Sources `/settings/sources`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sources` | List news sources |
| PATCH | `/api/sources/:id` | Enable/disable source |
| GET | `/api/quota` | Provider quota |
| GET | `/api/providers` | NEW — list all providers + status |
| POST | `/api/providers/:id/test` | NEW — test a provider |
| PATCH | `/api/providers/:id` | NEW — enable/disable provider |
| POST | `/api/providers/wizard` | NEW — save custom provider |

---

### Startup / Missed News & Real-Time Foundation (Category 1B)

| Method | Endpoint | Screen |
|--------|----------|--------|
| GET | `/api/startup-status` | App shell on mount |
| POST | `/api/backfill` | MissedNewsModal action |
| GET | `/api/time` | System clock sync & offset calculation |
| GET | `/api/sessions/current` | Active session & away window recovery metrics |
| GET | `/api/sessions/summary` | Cumulative running & away time |

---

### Ingest Telemetry & Velocity Counter (Category 8)

| Method | Endpoint | Screen |
|--------|----------|--------|
| GET | `/api/stats/ingest` | TopBar feed counter & hover sparkline panel |

---

## 3. SSE & Event Bus Spec (PRD D Category 4)

```typescript
// frontend/src/hooks/useSSE.ts + frontend/src/lib/sseBus.ts

interface UseSSEOptions {
  onNewArticle?: (article: Article) => void;
  onAlert?: (alert: SseBusEventMap['alert']) => void;
}

export function useSSE(options?: UseSSEOptions): {
  connected: boolean;
  reconnectAttempts: number;
  lastEvent: SSEEvent | null;
}
```

**Behavior & Reliability Guarantees**:
- Single global `EventSource` mounted in `App.tsx` with stable `[]` dependency lifecycle (`optionsRef` prevents teardown/recreate loops).
- Connects to `/api/sse` (first boot) and `/api/sse?since=<lastEventId>` across exponential backoff retries (1s → 2s → 4s → max 30s).
- Server maintains a 1,000-entry monotonic ring buffer and replays missed frames via `Last-Event-ID` or `?since=`; emits `resync_required` (`cursor_expired` / `server_restarted`) if replay cannot satisfy the cursor.
- Client deduplicates frames with bounded `CappedIdSet(2000)` (`${eventType}:${numericId}`).
- Non-blocking `Reconnecting...` chip in `StatusStrip` reflects `sseStatus === 'reconnecting'`.
- Full resync (`performFullResync`) triggers on `resync_required`, reconnect after extended disconnect (>= 15s), tab wake (`visibilitychange`), or browser `online`.
- Immediate pass-through (zero layout shift): `feed_counter_update`, `session_gap_update`, `settings_update`, `bookmark_update`, `alert_acknowledged`, `resync_required`.
- Configurable UI batching: `live_refresh_interval_sec` (`2s–30s`, default `5s`, configured in `Settings > News and Sources` with Reset to default) batches `new_article`, `article_updated`, `article_enriched_pass2`, `cluster_update`, `alert`, `provider_switch`, `quota_update`, `control_room_update`, `system_error`, `tv_health_update`, and `watchlist_update`.
- Domain updates are broadcast through `sseBus` (`subscribe` / `subscribeMany`) to Compare Coverage, Story Timeline, Watchlist, Archive Chat, TV View, Alerts Center, Control Room, System Health, and Category Rail without per-component unconditional polling.
- Cross-tab instant synchronization via `BroadcastChannel('ai-world-news-desk-sync')` with `localStorage` fallback for `settings_update`, `bookmark_update`, `alert_acknowledged`, `watchlist_update`, and `session_gap_update`.

---

## 4. State Sync & Bounded Memory Rules

- Zustand store caps `articles` at `MAX_IN_MEMORY_ARTICLES = 200` and alerts/errors at `100` each.
- `applyLiveArticlesBatch` enforces active region (`selectedCountry`), category (`selectedCategory`), `searchQuery`, and `isBreakingOnly` filters before upserting, updates `selectedArticle` in-place when its article updates, and preserves `autoAdvanceQueueIds` order cleanly.
- Long UI lists (`CategoryRailView`, `AlertsCenter`, `ControlRoomDesk` error ledger) slice rows incrementally via `useWindowedList`.

---

## 5. Error Handling

All API errors follow:
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

Frontend error handling:
- 404: show empty state component
- 429: show "Rate limited — retrying in Ns" toast via sonner
- 500: show error state with [Retry] button; log to console in dev
- Network failure: show "Connection lost" banner

---

## 6. New Endpoints Needed (must be built in specified steps)

| Step | Endpoint | Rationale |
|------|----------|-----------|
| Step 5 | DB migration 003 (anchor_phrases) | Verbatim evidence linking |
| Step 7 | GET /api/providers | API & Sources page |
| Step 7 | POST /api/providers/:id/test | Test button |
| Step 7 | PATCH /api/providers/:id | Enable/disable |
| Step 7 | POST /api/providers/wizard | Add custom provider |
| Step 7 | POST /api/providers/:id/key | Set API key (backend only; masked in response) |
| Cat 1 | Migration 006 (dual timestamps) | `ingested_at` & `is_catchup` |
| Cat 1B | GET /api/time | Frontend clock synchronization |
| Cat 1B | GET /api/sessions/current | Welcome-back card away metrics |
| Cat 1B | GET /api/sessions/summary | Lifetime running & away statistics |
| Cat 6 | GET /api/tv/proxy | HLS streaming proxy with SSRF check |
| Cat 6 | POST /api/tv/channels/youtube-preview | Official YouTube oEmbed preview |
| Cat 8 | GET /api/stats/ingest | Rolling 24h count & sparkline telemetry |
| Cat 11 | GET /api/control-room/telemetry | Operational status & source freshness |
| PRD D Cat 4 | GET /api/articles/categories/counts | Live filtered article counts per category |
| PRD D Cat 4 | PATCH /api/articles/:id | Editorial article field update with `article_updated` / `new_article` SSE emission |
| PRD D Cat 4 | GET /api/sse?since=<id> / Last-Event-ID | Cursor-based SSE replay & `resync_required` recovery |
| PRD D Cat 4 | PATCH /api/settings (`live_refresh_interval_sec`) | Batched UI live-refresh interval (`2–30s`, default `5s`) with `settings_update` SSE broadcast |


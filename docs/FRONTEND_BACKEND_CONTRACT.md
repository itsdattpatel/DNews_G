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
  published_at: string | null;
  fetched_at: string;
  delayed?: boolean;       // true if from delayed free-tier source
}

export interface ArticleFull extends ArticleListItem {
  title_original: string | null;
  body_original: string | null;
  body_english: string | null;
  language_detected: string | null;
  bookmarked: boolean;
  anchor_phrases: AnchorPhrase[];   // NEW — from migration 002
  source: Source;
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

// ─── SSE Events ───────────────────────────────────────────────────────────────
export interface SSENewArticle     { type: 'new_article';     article_id: number; }
export interface SSEClusterUpdate  { type: 'cluster_update';  cluster_id: number; outlet_count: number; }
export interface SSEAlert          { type: 'alert';           alert: Alert; }
export interface SSEProviderSwitch { type: 'provider_switch'; from: string; to: string; reason: string; }
export interface SSEQuotaUpdate    { type: 'quota_update';    data: QuotaResponse; }
export interface SSEHeartbeat      { type: 'heartbeat'; }

export type SSEEvent =
  | SSENewArticle | SSEClusterUpdate | SSEAlert
  | SSEProviderSwitch | SSEQuotaUpdate | SSEHeartbeat;

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

### Startup / Missed News

| Method | Endpoint | Screen |
|--------|----------|--------|
| GET | `/api/startup-status` | App shell on mount |
| POST | `/api/backfill` | MissedNewsModal action |

---

## 3. SSE Hook Spec

```typescript
// frontend/src/hooks/useSSE.ts

interface UseSSEOptions {
  onNewArticle?: (event: SSENewArticle) => void;
  onClusterUpdate?: (event: SSEClusterUpdate) => void;
  onAlert?: (event: SSEAlert) => void;
  onProviderSwitch?: (event: SSEProviderSwitch) => void;
  onQuotaUpdate?: (event: SSEQuotaUpdate) => void;
}

export function useSSE(options: UseSSEOptions): {
  connected: boolean;
  lastEvent: SSEEvent | null;
}
```

**Behavior**:
- Auto-connects on mount to `http://127.0.0.1:3001/api/sse`
- Reconnects with exponential backoff (1s → 2s → 4s → max 30s) on disconnect
- Shows "connection lost" banner (`sonner` toast) after 2 failed reconnects
- Heartbeat event resets backoff timer
- Single global instance (provided at App root, consumed via context or Zustand)

---

## 4. TanStack Query Setup

```typescript
// frontend/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 minute
      gcTime: 5 * 60_000,         // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Invalidation strategy**:
- SSE `new_article` → `queryClient.invalidateQueries({ queryKey: ['articles'] })`
- SSE `cluster_update` → invalidate `['clusters', clusterId]`
- SSE `quota_update` → update quota in Zustand store directly (no refetch needed)

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


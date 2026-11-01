# API Contract — AI World News Desk
*Version 1.0 · 2026-10-30*

Base URL: `http://127.0.0.1:3001/api`
All responses: `Content-Type: application/json` unless noted.
All list endpoints support `?limit=50&offset=0` pagination defaults.

---

## 1. Articles

### GET /api/articles

Returns paginated list of processed articles.

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | int | 50 | Max results |
| offset | int | 0 | Pagination |
| country | string | — | Filter by source country |
| category | string | — | Filter by category |
| status | string | done | `pending\|done\|ai_failed` |
| cluster_id | int | — | Filter to one cluster |
| q | string | — | Full-text search (FTS5) |
| breaking | bool | — | Only breaking score >= threshold |

**Response 200**
```json
{
  "total": 1240,
  "items": [
    {
      "id": 42,
      "url": "https://example.com/article",
      "title_english": "...",
      "summary": "...",
      "keywords": ["keyword1","keyword2"],
      "categories": ["World","Politics"],
      "breaking_score": 88,
      "cluster_id": 7,
      "source": { "id": 3, "name": "The Hindu", "country": "India" },
      "published_at": "2026-10-30T10:00:00Z",
      "fetched_at": "2026-10-30T10:05:00Z"
    }
  ]
}
```

---

### GET /api/articles/:id

Returns full article including original and translated body.

**Response 200**
```json
{
  "id": 42,
  "url": "...",
  "title_original": "...",
  "title_english": "...",
  "body_original": "...",
  "body_english": "...",
  "summary": "...",
  "language_detected": "hi",
  "keywords": ["keyword1"],
  "categories": ["World"],
  "breaking_score": 88,
  "cluster_id": 7,
  "bookmarked": false,
  "source": { "id": 3, "name": "The Hindu", "country": "India", "url": "..." },
  "published_at": "2026-10-30T10:00:00Z"
}
```

---

### PATCH /api/articles/:id/bookmark

Toggle bookmark.

**Body** `{ "bookmarked": true }`
**Response 200** `{ "bookmarked": true }`

---

## 2. Clusters

### GET /api/clusters

Returns deduplicated story clusters.

**Query params**: `limit`, `offset`, `category`, `breaking` (bool)

**Response 200**
```json
{
  "total": 88,
  "items": [
    {
      "id": 7,
      "headline": "Floods hit southern India",
      "first_seen_at": "2026-10-30T08:00:00Z",
      "last_updated_at": "2026-10-30T10:30:00Z",
      "outlet_count": 4,
      "country_count": 2,
      "is_breaking": true,
      "articles": [ { "id": 42, "source": { "name": "The Hindu", "country": "India" } } ]
    }
  ]
}
```

---

### GET /api/clusters/:id

Full cluster with all member articles (for Compare Coverage screen).

**Response 200** — same as above with full `articles[]` array.

---

## 3. Search (Archive Chat)

### POST /api/search

Full-text search + optional AI synthesis.

**Body**
```json
{
  "query": "bear bile trade China 2026",
  "use_ai": true,
  "limit": 20
}
```

**Response 200**
```json
{
  "query": "bear bile trade China 2026",
  "results": [
    { "id": 99, "title_english": "...", "summary": "...", "score": 4.2 }
  ],
  "ai_answer": "Based on stored articles... (AI-synthesised paragraph)"
}
```

---

## 4. Watchlist

### GET /api/watchlist
**Response 200** `{ "items": [ { "id":1, "topic":"bear bile", "keywords":["bear","bile","trade"], "priority":"high", "enabled":true } ] }`

### POST /api/watchlist
**Body** `{ "topic": "bear bile trade", "keywords": ["bear","bile"], "priority": "high" }`
**Response 201** `{ "id": 1, ... }`

### PATCH /api/watchlist/:id
**Body** `{ "enabled": false }` (partial update)
**Response 200** Updated watchlist item.

### DELETE /api/watchlist/:id
**Response 204**

---

## 5. Sources

### GET /api/sources
Returns all configured sources with live/dead status.

**Response 200**
```json
{
  "items": [
    { "id":1, "slug":"india_thehindu", "name":"The Hindu", "country":"India",
      "url":"https://...", "fetch_type":"rss", "enabled":true, "last_fetched_at":"..." }
  ]
}
```

### PATCH /api/sources/:id
**Body** `{ "enabled": false }`
**Response 200** Updated source.

---

## 6. Quota

### GET /api/quota

Returns per-provider usage for current day.

**Response 200**
```json
{
  "current_provider": "gemini",
  "providers": {
    "gemini":   { "calls_today": 120, "tokens_today": 85000, "errors_today": 2 },
    "groq":     { "calls_today": 5,   "tokens_today": 3500,  "errors_today": 0 },
    "mistral":  { "calls_today": 0,   "tokens_today": 0,     "errors_today": 0 },
    "cerebras": { "calls_today": 0,   "tokens_today": 0,     "errors_today": 0 },
    "ollama":   { "calls_today": 0,   "tokens_today": 0,     "errors_today": 0 }
  }
}
```

---

## 7. Settings

### GET /api/settings
**Response 200** `{ "refresh_interval_minutes": 5, "alert_threshold": 75, "auto_cleanup_enabled": false, "retention_days": 30 }`

### PATCH /api/settings
**Body** `{ "refresh_interval_minutes": 10 }` (partial update; validates ranges)
**Response 200** All settings.

---

## 8. Alerts

### GET /api/alerts
**Query** `?acknowledged=false&limit=20`
**Response 200**
```json
{
  "items": [
    { "id":1, "type":"breaking", "message":"...", "cluster_id":7, "fired_at":"...", "acknowledged":false }
  ]
}
```

### PATCH /api/alerts/:id/acknowledge
**Response 200** `{ "acknowledged": true }`

---

## 9. TV

### GET /api/tv/channels
**Query** `?category=documentary&country=AU&q=wildlife`
**Response 200** `{ "items": [ { "id":1, "name":"Animal Planet", "stream_url":"...", "is_alive":true, "is_favorite":false } ] }`

### PATCH /api/tv/channels/:id/favorite
**Body** `{ "is_favorite": true }`
**Response 200** Channel object.

### POST /api/tv/channels/:id/health-check
**Response 200** `{ "is_alive": true, "latency_ms": 320 }`

---

## 10. Export

### POST /api/export/pdf
Generates PDF and returns it as `application/pdf` binary stream.
**Body** `{ "date": "2026-10-30" }` (optional; defaults to today)

### GET /api/export/briefing
Returns 2-minute briefing text.
**Response 200** `{ "text": "Good morning. Here are today's top stories..." }`

---

## 11. Startup & Resume

### GET /api/startup-status

Returns downtime gap and backfill capability on startup.

**Response 200**
```json
{
  "status": "ok",
  "uptime_ms": 14200,
  "missed_minutes": 120,
  "last_fetched_at": "2026-10-30T10:00:00.000Z",
  "detected": true,
  "can_backfill": true,
  "window_start": "2026-10-30T10:00:00.000Z",
  "window_end": "2026-10-30T12:00:00.000Z"
}
```

### POST /api/backfill

Executes GDELT date-range backfill for missed time window.

**Response 200**
```json
{
  "status": "ok",
  "covered_minutes": 120,
  "total_missed_minutes": 120,
  "articles_fetched": 15,
  "articles_inserted": 12,
  "gdelt_coverage": true,
  "rss_coverage": false,
  "warning": "RSS has no backfill; GDELT covered 120 of 120 minutes"
}
```

---

## 12. Server-Sent Events

### GET /api/sse

Opens an SSE stream. The client must reconnect on close.

**Event types**

| Event | Data |
|-------|------|
| `new_article` | `{ "article_id": 42 }` |
| `cluster_update` | `{ "cluster_id": 7, "outlet_count": 4 }` |
| `alert` | `{ "type": "breaking", "message": "...", "cluster_id": 7 }` |
| `provider_switch` | `{ "from": "gemini", "to": "groq", "reason": "rate_limit" }` |
| `quota_update` | Same shape as GET /api/quota response |
| `heartbeat` | `{}` (every 30 s to keep connection alive) |

---

## 13. Error Shape

All errors return:
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

| HTTP | Code | When |
|------|------|------|
| 400 | VALIDATION_ERROR | Bad input params |
| 404 | NOT_FOUND | Resource missing |
| 429 | RATE_LIMITED | AI provider throttled |
| 500 | INTERNAL_ERROR | Unexpected server error |

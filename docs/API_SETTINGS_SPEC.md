# API & Sources Settings Spec — AI World News Desk
*Version 1.0 · 2026-11-01*

---

## 1. ProviderAdapter Interface

All news and AI providers implement one common interface so new providers can be added without modifying core code.

```typescript
// backend/src/providers/ProviderAdapter.ts

export type AuthType = 'none' | 'api_key_header' | 'api_key_query' | 'bearer';
export type ProviderKind = 'news' | 'ai';
export type ProviderStatus = 'live' | 'degraded' | 'down' | 'unconfigured';

export interface ProviderTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  sampleData?: unknown;
}

export interface ProviderAdapter {
  readonly id: string;             // e.g. "guardian", "gdelt", "gemini"
  readonly name: string;           // Display name
  readonly kind: ProviderKind;
  readonly docsUrl: string;
  readonly baseUrl: string;
  readonly authType: AuthType;
  readonly authHeader?: string;    // e.g. "api-key", "Authorization"
  readonly freeQuota?: {
    requestsPerDay?: number;
    delayHours?: number;           // 0 = real-time; 12-24 = delayed free tier
  };
  readonly rateLimitMs: number;    // minimum ms between requests

  isConfigured(): boolean;         // checks env var is set
  test(): Promise<ProviderTestResult>;
  fetch(params: FetchParams): Promise<RawArticle[]>;
  getStatus(): ProviderStatus;
}
```

### 1.1 FetchParams

```typescript
export interface FetchParams {
  category?: string;
  country?: string;
  q?: string;
  from?: string;    // ISO date
  to?: string;
  limit?: number;
}

export interface RawArticle {
  url: string;
  title: string;
  body?: string;
  publishedAt?: string;
  sourceCountry?: string;
  sourceName?: string;
  language?: string;
}
```

---

## 2. No-Key Sources (always enabled)

### 2.1 RSS Feeds

Rate limit: respectful crawl only (≥ 5 minute interval per feed).

Verified RSS feed registry lives in `backend/src/config/sources.ts`.
Current sources (verify URLs in Step 7):

| Name | Country | Category | URL pattern |
|------|---------|----------|-------------|
| The Hindu | India | World/Politics | `https://www.thehindu.com/feeder/default.rss` |
| BBC News | UK | World | `http://feeds.bbci.co.uk/news/world/rss.xml` |
| Al Jazeera | Qatar | World | `https://www.aljazeera.com/xml/rss/all.xml` |
| Reuters | US | World | `https://feeds.reuters.com/reuters/topNews` |
| DW | Germany | World | `https://rss.dw.com/rdf/rss-en-all` |
| France 24 | France | World | `https://www.france24.com/en/rss` |
| Straits Times | Singapore | Asia | `https://www.straitstimes.com/news/world/rss.xml` |
| NHK World | Japan | Asia | `https://www3.nhk.or.jp/rss/news/cat0.xml` |
| CGTN | China | World | `https://www.cgtn.com/subscribe/feeds/englishnews.xml` |
| Times of India | India | India | `https://timesofindia.indiatimes.com/rssfeedstopstories.cms` |
| WCS (Wildlife) | US | Animals | `https://www.wcs.org/rss` |
| WWF News | Global | Animals/Environment | `https://wwf.panda.org/index.cfm?uNewsID=latest` |
| Traffic (Wildlife) | Global | Animals/Crime | `https://www.traffic.org/feed/` |

> **Note**: All RSS URLs must be verified live in Step 7. Add more per country/category/animals as part of that step.

### 2.2 GDELT DOC 2.0

```typescript
class GdeltAdapter implements ProviderAdapter {
  readonly id = 'gdelt';
  readonly rateLimitMs = 5000;  // PRD: max 1 request per 5 seconds
  // API: https://api.gdeltproject.org/api/v2/doc/doc
  // No key required
  // Free, real-time
}
```

Parameters: `?query=...&mode=artlist&maxrecords=25&format=json`

---

## 3. Optional Keyed News Sources

Each key lives in backend `.env` only. Never in frontend bundle, never in git.

### 3.1 Guardian Open Platform

- **Docs**: https://open-platform.theguardian.com/documentation/
- **Free tier**: 12 calls/sec, 5000/day, **real-time** (no delay)
- **Auth**: `api-key` query param
- **Env var**: `GUARDIAN_API_KEY`

```typescript
class GuardianAdapter implements ProviderAdapter {
  readonly id = 'guardian';
  readonly baseUrl = 'https://content.guardianapis.com';
  readonly authType = 'api_key_query';
  readonly freeQuota = { requestsPerDay: 5000, delayHours: 0 };
  readonly rateLimitMs = 84;  // 12/sec
}
```

### 3.2 NewsData.io

- **Docs**: https://newsdata.io/documentation
- **Free tier**: 200 req/day, **up to 48h delay** on some sources
- **Auth**: `X-ACCESS-KEY` header
- **Env var**: `NEWSDATA_API_KEY`
- **UI label**: "Delayed (up to 48h)"

### 3.3 GNews

- **Docs**: https://gnews.io/docs/v4
- **Free tier**: 100 req/day, real-time
- **Auth**: `apikey` query param
- **Env var**: `GNEWS_API_KEY`

### 3.4 Currents API

- **Docs**: https://currentsapi.services/en/docs/
- **Free tier**: 600 req/day, real-time
- **Auth**: `apiKey` query param
- **Env var**: `CURRENTS_API_KEY`

### 3.5 New York Times

- **Docs**: https://developer.nytimes.com/docs/articlesearch-product/1/overview
- **Free tier**: 500 req/day, 10 req/min, real-time
- **Auth**: `api-key` query param
- **Env var**: `NYT_API_KEY`

> **⚠️ Note**: Free tier limits above are from Step 0 research. Verify CURRENT limits when implementing each adapter in Step 7 by fetching the official docs URL before writing code.

---

## 4. AI Providers (existing fallback chain)

These are already implemented in the backend. The Settings screen exposes them with:
- Enable/disable toggle
- Key field (masked, with reveal button)
- Test button
- Daily quota meter
- Last error message

| Provider | Env var | Model | Notes |
|----------|---------|-------|-------|
| Gemini Flash | `GEMINI_API_KEY` | gemini-1.5-flash | Primary |
| Groq | `GROQ_API_KEY` | llama3-8b | Fallback 1 |
| Mistral | `MISTRAL_API_KEY` | mistral-small | Fallback 2 |
| Cerebras | `CEREBRAS_API_KEY` | llama3.1-8b | Fallback 3 |
| Ollama | (no key) | user-configured | Local fallback |

---

## 5. API & Sources Settings Page (screen m)

### 5.1 Backend Endpoints Needed (new in Step 7)

```
GET  /api/providers           → list all providers with status, quota, last error
POST /api/providers/:id/test  → run test() on provider; return ProviderTestResult
PATCH /api/providers/:id      → enable/disable (does NOT accept keys — keys via .env only)
POST /api/providers/wizard    → save a new custom provider config (name, baseUrl, authType, docsUrl, responseMapping) to DB
```

> **Security**: The frontend NEVER sends or receives API keys. Key validation happens exclusively on the backend. The key field in the UI only shows masked value (`****`) and provides a one-time "paste new key" flow that sends to a dedicated backend endpoint (not visible in URL/logs).

### 5.2 "Add Provider" Wizard

Modal with 5 steps:

```
Step 1: Name + Kind
  Name: [__________________]
  Type: [News ●] [AI]

Step 2: Endpoint
  Base URL: [https://...]
  Docs URL: [https://...]

Step 3: Auth
  Auth type: [None ●] [API Key Header] [API Key Query] [Bearer]
  Header/param name: [api-key]

Step 4: Response Mapping
  Articles array path:  [articles]
  Title field:          [title]
  Body field:           [content]
  URL field:            [url]
  PublishedAt field:    [publishedAt]

Step 5: Test
  [Run test request →]
  ✓ Connected. 3 sample articles fetched.
  [Save provider]
```

The response mapping is stored as JSON in the DB (`providers` table — new table needed).

### 5.3 Rate Limiting & Reliability

All providers wrapped in:

```typescript
class ProviderRunner {
  private lastCall: Map<string, number> = new Map();
  private retryCount: Map<string, number> = new Map();
  
  async run(adapter: ProviderAdapter, params: FetchParams): Promise<RawArticle[]> {
    // 1. Rate limit: enforce adapter.rateLimitMs between calls
    // 2. Retry: up to 3 retries with exponential backoff (1s, 2s, 4s)
    // 3. Dedupe: hash article.url across all providers; skip duplicates
    // 4. Alert: if all retries fail, fire SSE alert event
    // 5. Log: write to quota_log with success/failure
  }
}
```

### 5.4 "Delayed" Article Label

Articles from sources where `freeQuota.delayHours > 0` get:
- `delayed: true` in article response
- "⏱ Delayed" badge in UI (ink-stamp style, muted color)

---

## 6. Security Rules

1. API keys live **only** in `backend/.env` (or encrypted local store on the user's machine)
2. Backend never sends raw keys to frontend — only masked versions (`****`)
3. "Paste new key" → sent via `POST /api/providers/:id/key` with key in request body (HTTPS only, not logged)
4. Keys never appear in git, URLs, console.log, SSE events, or error messages
5. `.gitignore` must include `.env` and `*.env.local`


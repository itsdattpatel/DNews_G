# Architecture — AI World News Desk
*Version 1.0 · 2026-10-30*

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAPTOP                              │
│                                                                 │
│  ┌──────────────┐   HTTP/SSE   ┌──────────────────────────┐   │
│  │  React/Vite  │◄────────────►│   Express API Server     │   │
│  │  Frontend    │              │   (Node.js + TypeScript)  │   │
│  │  :5173       │              │   :3001                   │   │
│  └──────────────┘              └────────────┬─────────────┘   │
│                                             │                   │
│                        ┌────────────────────┼──────────────┐   │
│                        │                    │              │   │
│                   ┌────▼─────┐    ┌─────────▼──┐  ┌──────▼─┐ │
│                   │ SQLite   │    │  AI Router  │  │ Fetch  │ │
│                   │ (FTS5)   │    │  (fallback) │  │ Engine │ │
│                   └──────────┘    └─────────────┘  └────────┘ │
│                                         │                       │
│                         ┌───────────────┼───────────────┐      │
│                         ▼               ▼               ▼      │
│                    Gemini Flash       Groq           Mistral    │
│                    (primary)       (fallback 1)  (fallback 2)  │
│                                         │                       │
│                                   Cerebras / Ollama             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Layout

```
DNews_G/
├── .env                        # Secrets — never committed
├── .env.example                # Template committed to git
├── package.json                # Root workspace (npm workspaces)
├── config/
│   ├── sources.ts              # One object per outlet (add a country here)
│   ├── features.ts             # Boolean feature flags
│   └── ai-providers.ts        # Provider order, model names, base URLs
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express entry point
│   │   ├── db/
│   │   │   ├── schema.sql      # SQLite DDL
│   │   │   ├── migrations/     # Numbered .sql files
│   │   │   └── db.ts           # better-sqlite3 singleton
│   │   ├── fetch/
│   │   │   ├── rss.ts          # RSS fetch + parse
│   │   │   ├── gdelt.ts        # GDELT API client
│   │   │   ├── scraper.ts      # Readability HTML extraction
│   │   │   └── scheduler.ts    # setInterval wrapper + cron
│   │   ├── ai/
│   │   │   ├── router.ts       # Provider fallback logic
│   │   │   ├── gemini.ts       # Gemini Flash adapter
│   │   │   ├── groq.ts         # Groq adapter (OpenAI-compat)
│   │   │   ├── mistral.ts      # Mistral adapter
│   │   │   ├── cerebras.ts     # Cerebras adapter
│   │   │   ├── ollama.ts       # Ollama adapter (optional)
│   │   │   ├── prompts.ts      # All prompt templates
│   │   │   └── quota.ts        # Per-provider request counter
│   │   ├── pipeline/
│   │   │   ├── dedup.ts        # URL dedup
│   │   │   ├── cluster.ts      # TF-IDF / embedding similarity
│   │   │   └── enricher.ts     # Orchestrates AI pass on batch
│   │   ├── alerts/
│   │   │   └── detector.ts     # Breaking-news trigger logic
│   │   ├── tv/
│   │   │   ├── iptv.ts         # Fetch & parse iptv-org playlists
│   │   │   └── health.ts       # HLS stream health checker
│   │   ├── export/
│   │   │   ├── pdf.ts          # Puppeteer/PDFKit newspaper export
│   │   │   └── briefing.ts     # Morning briefing text generation
│   │   └── routes/
│   │       ├── articles.ts
│   │       ├── clusters.ts
│   │       ├── search.ts
│   │       ├── watchlist.ts
│   │       ├── quota.ts
│   │       ├── tv.ts
│   │       └── sse.ts          # Server-Sent Events stream
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── store/              # Zustand global state
│   │   ├── hooks/              # useSSE, useArticles, useQuota …
│   │   ├── components/
│   │   │   ├── layout/         # Shell, Sidebar, TopBar
│   │   │   ├── article/        # ArticlePanel, SummaryPanel
│   │   │   ├── spider/         # SpiderCanvas, IKLeg, spiderTypes/
│   │   │   ├── bat/            # BatIcon, SettingsMenu
│   │   │   ├── alert/          # AlertBanner, NotificationHelper
│   │   │   ├── tv/             # TVView, ChannelList, HLSPlayer
│   │   │   ├── globe/          # GlobeView, WildlifeLayer
│   │   │   ├── compare/        # CompareCoverage
│   │   │   ├── timeline/       # StoryTimeline
│   │   │   ├── chat/           # ArchiveChat
│   │   │   └── quota/          # QuotaMeter
│   │   ├── canvas/
│   │   │   ├── engine.ts       # rAF loop, FPS monitor
│   │   │   └── ik.ts           # Inverse kinematics solver
│   │   └── styles/
│   │       └── global.css
└── docs/                       # This folder
```

---

## 3. Data Flow

```
Scheduler (every N min)
  └─► rss.ts / gdelt.ts / scraper.ts
        └─► dedup.ts (skip known URLs)
              └─► DB: articles (status = 'pending')
                    └─► enricher.ts (batch AI pass via router.ts)
                          └─► DB: update translated, summary, keywords, categories,
                                   breaking_score, spider_type, cluster_id
                                └─► detector.ts (check alert conditions)
                                      └─► SSE push to frontend
```

---

## 4. Frontend State Machine

```
App Load
  ├─► Fetch recent articles (REST GET /api/articles)
  ├─► Open SSE connection (/api/sse)
  │     SSE events: new_article | alert | provider_switch | quota_update
  └─► Render MainScreen
        ├─► ArticlePanel (left)
        ├─► SummaryPanel (right)
        └─► SpiderCanvas (overlay)
              rAF loop → IK solver → canvas draw
```

---

## 5. AI Router Flow

```
enricher.ts calls router.ts with batch payload
  1. Try primary provider (Gemini Flash)
     - OK → store result
     - 429 / 503 / timeout → mark provider throttled
  2. Try Groq
  3. Try Mistral
  4. Try Cerebras
  5. Try Ollama (if OLLAMA_ENABLED=true)
  6. All failed → store articles with status='ai_failed'; retry next cycle
```

Provider switch → emit `provider_switch` SSE event → frontend shows alert banner.

---

## 6. Module Toggle System

`config/features.ts` exports a `FEATURES` object:

```typescript
export const FEATURES = {
  rss: true,
  gdelt: true,
  scraper: true,
  ai_translation: true,
  spider_animation: true,
  alerts: true,
  tv_view: true,
  globe_view: true,
  pdf_export: true,
  read_aloud: true,
  archive_chat: true,
  auto_cleanup: false,    // delete > 30 days
  ollama: false,          // local LLM
};
```

Every feature module checks its flag at runtime; disabled modules are no-ops.

---

## 7. Technology Choices Rationale

| Choice | Reason |
|--------|--------|
| SQLite + FTS5 | Zero-config, single file, full-text search built-in |
| better-sqlite3 | Synchronous API simplifies transaction logic |
| Express + SSE | Lightweight; SSE avoids WebSocket complexity |
| Vite + React | Fast HMR; familiar ecosystem |
| Zustand | Minimal boilerplate for single-user app |
| Canvas API | Fine-grained IK animation control; no framework overhead |
| hls.js | Browser HLS without native support |
| OpenAI SDK (configured per provider) | Unified client; base URL swap = new provider |

---

## 8. Security (local-only)

- Express binds to `127.0.0.1` only — never `0.0.0.0`
- `.env` listed in `.gitignore`
- No user authentication (single user, local machine)
- CSP headers added for defence-in-depth against XSS

---

## 9. Performance Targets

| Metric | Target |
|--------|--------|
| Article list render | < 100 ms for 1000 rows (virtualised list) |
| AI batch (20 articles) | < 30 s end-to-end |
| Spider canvas FPS | >= 30 FPS on Intel Iris Xe |
| SQLite query (FTS) | < 200 ms for 100k articles |
| SSE latency | < 500 ms from DB insert to UI update |

# Wiring Checklist — AI World News Desk Frontend Overhaul
*Version 1.0 · 2026-11-01 · Updated as each step is completed*

Each item is ticked when: (a) the UI control is wired to the real endpoint, AND (b) proof exists (screenshot or passing test).

Legend: `[ ]` pending · `[~]` in progress · `[x]` done with proof

---

## Step 3: Backend Wiring Layer

- [ ] TanStack Query `QueryClient` configured at App root
- [ ] `useSSE()` hook connects to `/api/sse` with auto-reconnect
- [ ] SSE `connected` state shown in TopBar (● live indicator)
- [ ] SSE reconnect shows "Connection lost" banner via sonner
- [ ] SSE `heartbeat` keeps connection alive (verified in browser devtools)
- [ ] All shared TypeScript types in `frontend/src/types/index.ts` match API contract
- [ ] `useArticles()` query hook reads `GET /api/articles`
- [ ] `useArticle(id)` query hook reads `GET /api/articles/:id`
- [ ] `useSettings()` query hook reads `GET /api/settings`

---

## Step 4: Main Reader (screen a)

- [ ] Article list renders from real `GET /api/articles`
- [ ] Article full body renders from real `GET /api/articles/:id`
- [ ] `body_english` displayed in left panel (Source Serif 4)
- [ ] `body_original` displayed when language toggle flipped
- [ ] `language_detected` shown in toggle label
- [ ] Summary sentences rendered from real `article.summary`
- [ ] Bookmark toggle calls `PATCH /api/articles/:id/bookmark` + updates UI
- [ ] SSE `new_article` triggers articles list refresh without page reload
- [ ] Bottom ticker shows real articles (rolling)
- [ ] Outlet + country + published_at shown in byline (real data)
- [ ] Breaking score mapped to correct spider mode (≥75 → breaking mode)

---

## Step 5: Spider + Anchor Phrases

- [ ] Migration `002_anchor_phrases.sql` applied on backend startup
- [ ] AI prompt updated to return `anchor_phrases`
- [ ] Backend validator drops phrases not found verbatim in `body_english`
- [ ] `GET /api/articles/:id` returns `anchor_phrases: AnchorPhrase[]`
- [ ] `anchor_phrases: []` for old articles (NULL → empty array)
- [ ] SpiderCrawler receives real `anchor_phrases` from article
- [ ] Spider locates each phrase in DOM (only verified phrases)
- [ ] Spider fires `onPhraseLand` only for phrases that exist in text
- [ ] Summary sentence reveals in sync with spider landing
- [ ] `prefers-reduced-motion`: spider hidden, summary still reveals
- [ ] FPS monitor: effects disabled at < 45 FPS
- [ ] FPS monitor: spider paused at < 30 FPS
- [ ] Old spider files confirmed deleted (no references in codebase)
- [ ] Old spider tests (`ik.test.ts`, `spiders.test.ts`) deleted

---

## Step 6: Category Rail (screen b)

- [ ] Category tabs filter articles via `GET /api/articles?category=X`
- [ ] Filter is instant (no full-page reload, TanStack Query `keepPreviousData`)
- [ ] Search field queries `GET /api/articles?q=...`
- [ ] Article cards show real outlet + country from `source`
- [ ] Ink-stamp category tags show correct category colors
- [ ] Breaking score dots are accurate (≥ 75 → accent colored)
- [ ] Virtualized list handles 50+ articles without jank
- [ ] SSE `new_article` prepends new card to list

---

## Step 7: API & Sources (screen m)

- [ ] `GET /api/sources` renders all configured sources
- [ ] Source enable/disable calls `PATCH /api/sources/:id`
- [ ] `GET /api/quota` renders per-provider quota bars
- [ ] `GET /api/providers` renders all providers (news + AI)
- [ ] Provider enable/disable calls `PATCH /api/providers/:id`
- [ ] Test button calls `POST /api/providers/:id/test` + shows result inline
- [ ] Key field shows masked value only (never raw key)
- [ ] "Add provider" wizard saves via `POST /api/providers/wizard`
- [ ] All RSS URLs verified live (attempt fetch; mark broken ones)
- [ ] GDELT rate limit enforced (max 1 req/5s logged)
- [ ] "Delayed" badge shows for sources with `freeQuota.delayHours > 0`
- [ ] SSE `provider_switch` shown as toast + updates current provider badge

---

## Step 8: Compare, Timeline, Archive Chat, Watchlist

### Compare Coverage (screen c)
- [ ] `GET /api/clusters/:id` renders full cluster
- [ ] All member articles shown with real outlet/country
- [ ] Shared keywords highlighted across panels
- [ ] Spider compare mode draws thread between matching phrases

### Story Timeline (screen d)
- [ ] `GET /api/clusters/:id` articles sorted by `published_at`
- [ ] Timeline events positioned by real timestamps
- [ ] Click event shows real article detail

### Archive Chat (screen f)
- [ ] `POST /api/search` called on form submit (real FTS5 query)
- [ ] AI synthesis toggle passes `use_ai: true`
- [ ] Result source cards show real outlet + BM25 score
- [ ] Empty result handled with message

### Watchlist (screen g)
- [ ] `GET /api/watchlist` renders all items
- [ ] `POST /api/watchlist` creates new item
- [ ] `PATCH /api/watchlist/:id` toggles enabled / updates item
- [ ] `DELETE /api/watchlist/:id` removes item
- [ ] SSE `new_article` triggers "N new matches" badge update

---

## Step 9: Globe / Map (screen e)

- [ ] `GET /api/articles?status=done&limit=500` fetches pin data
- [ ] Pins placed using real `location_tags` coordinates (geocoded)
- [ ] Hover tooltip shows real article count + headline
- [ ] Wildlife layer filters real Animals-category articles
- [ ] SSE `new_article` adds new pin without full reload
- [ ] Globe lazy-loaded (bundle split)
- [ ] Flat map fallback for non-WebGL browsers

---

## Step 10: TV View (screen h)

- [ ] `GET /api/tv/channels` renders channel list
- [ ] Animal & Discovery shelf filtered by category
- [ ] Favorites shelf shows `is_favorite: true` channels
- [ ] `PATCH /api/tv/channels/:id/favorite` persists to DB
- [ ] `POST /api/tv/channels/:id/health-check` updates stream health dots
- [ ] `is_alive: false` channels shown greyed with badge
- [ ] hls.js player plays real stream URL
- [ ] "Open in VLC" generates real `vlc://stream_url` link

---

## Step 11: PDF, Briefing, Alerts (screens i, j, k)

### PDF (screen i)
- [ ] `POST /api/export/pdf` generates real PDF
- [ ] PDF preview renders in iframe (real content)
- [ ] Download triggers real PDF binary save

### Morning Briefing (screen j)
- [ ] `GET /api/export/briefing` fetches real AI-generated text
- [ ] Web Speech API speaks real briefing
- [ ] Speed control changes real TTS rate
- [ ] Sentence highlight syncs with speech position

### Alerts Center (screen k)
- [ ] `GET /api/alerts?acknowledged=false` renders unread alerts
- [ ] `PATCH /api/alerts/:id/acknowledge` marks as read
- [ ] Breaking alert links to real cluster
- [ ] SSE `alert` event shows real-time banner + adds to list
- [ ] TopBar bat icon shows unread count badge (real count)

---

## Step 12: QA (proof column)

| Screen | Light screenshot | Dark screenshot | Notes |
|--------|-----------------|-----------------|-------|
| Main Reader | [ ] | [ ] | |
| Category Rail | [ ] | [ ] | |
| Compare Coverage | [ ] | [ ] | |
| Story Timeline | [ ] | [ ] | |
| Globe/Map | [ ] | [ ] | |
| Archive Chat | [ ] | [ ] | |
| Watchlist | [ ] | [ ] | |
| TV View | [ ] | [ ] | |
| PDF Preview | [ ] | [ ] | |
| Morning Briefing | [ ] | [ ] | |
| Alerts Center | [ ] | [ ] | |
| Settings Overlay | [ ] | [ ] | |
| API & Sources | [ ] | [ ] | |

### Acceptance Gates
- [ ] Lighthouse Performance ≥ 85 (screenshot of report)
- [ ] 0 browser console errors in production build
- [ ] `grep -r "BaseSpider\|SpiderCanvas\|SpiderGlyph\|ScoutBadge\|ik.ts\|engine.ts" frontend/src` returns 0 results
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] `npm run test` passes all suites
- [ ] CREDITS.md has every installed package + license
- [ ] No API key appears in browser bundle, network requests, or console


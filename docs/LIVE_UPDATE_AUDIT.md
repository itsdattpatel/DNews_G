# Live-Update Audit & Architectural Diagnosis (PRD D — Category 3)
*Version 2.0 · 2026-11-11 · AI World News Desk & The Library*

---

## 1. Executive Summary

- **Audit Scope**: All **21 Main Desk surfaces (`M1–M21`)**, **7 Library surfaces (`L1–L7`)**, and **3 resilience scenarios (`RES-1–RES-3`)** tested empirically against an isolated TEST SQLite copy (`test_audit_live.sqlite`, cloned from `news_pre_prd_d_step0_20261111.sqlite`) via headless Playwright Chromium with **zero browser reloads**. Production SQLite (`backend/data/news.sqlite`) remained completely untouched.
- **Main Desk Result Summary (21 Surfaces)**: **5 PASS** (`M2`, `M4`, `M8`, `M10`, `M15`), **5 PARTIAL** (`M1`, `M3`, `M5`, `M13`, `M18`), **11 FAIL** (`M6`, `M7`, `M9`, `M11`, `M12`, `M14`, `M16`, `M17`, `M19`, `M20`, `M21`).
- **The Library Result Summary (7 Surfaces)**: **0 PASS**, **0 PARTIAL**, **7 FAIL** (`L1–L7`).
- **Resilience & Multi-Tab Result Summary**: **3 FAIL** (`RES-1`, `RES-2`, `RES-3` + `M20`, `M21`, `L5`).
- **Console Errors**: Only 1 external resource `403` during Library external media loading; zero uncaught JS exceptions or React errors.

> **Core Conclusion**: Live updates currently work only for raw `new_article` prepends into unfiltered Zustand `articles` state (which simultaneously causes filter contamination on Category/Region/Search views and layout shifts on the bottom strip), single-article Pass 2 summary completion, breaking alert banners, feed counter metrics, and polling fallbacks in Control Room (`15s`) and System Health (`30s`). All modal/detail desks, cross-tab state, connection recovery/replay, sleep/wake resync, and the entire Library subsystem have no live push path.

---

## 2. Systemic Root Causes Identified

### `SSE-RC1`: Dead TanStack Query Invalidations vs. Raw `fetch()` + Local `useState`
- **Evidence**: [`useSSE.ts`](file:///e:/DNews_G/frontend/src/hooks/useSSE.ts#L108-L249) calls `queryClient.invalidateQueries(...)` for `['alerts']`, `['clusters']`, `['quota']`, `['control-room']`, and `['articles']`. However, [`ControlRoomDesk.tsx`](file:///e:/DNews_G/frontend/src/components/control-room/ControlRoomDesk.tsx#L75-L135), [`AlertsCenter.tsx`](file:///e:/DNews_G/frontend/src/components/alert/AlertsCenter.tsx#L1-L85), [`CompareCoverage.tsx`](file:///e:/DNews_G/frontend/src/components/compare/CompareCoverage.tsx#L80-L135), [`StoryTimeline.tsx`](file:///e:/DNews_G/frontend/src/components/timeline/StoryTimeline.tsx#L55-L120), [`TVView.tsx`](file:///e:/DNews_G/frontend/src/components/tv/TVView.tsx#L82-L95), [`WatchlistDesk.tsx`](file:///e:/DNews_G/frontend/src/components/watchlist/WatchlistDesk.tsx#L38-L71), [`ArchiveChat.tsx`](file:///e:/DNews_G/frontend/src/components/chat/ArchiveChat.tsx#L1-L85), [`HistorySubpage.tsx`](file:///e:/DNews_G/frontend/src/library/history/HistorySubpage.tsx#L1-L125), [`ScriptureReader.tsx`](file:///e:/DNews_G/frontend/src/library/wisdom/ScriptureReader.tsx#L96-L125), [`QuotesExplorer.tsx`](file:///e:/DNews_G/frontend/src/library/wisdom/QuotesExplorer.tsx#L61-L95), and [`MindHelpsSubpage.tsx`](file:///e:/DNews_G/frontend/src/library/mind/MindHelpsSubpage.tsx#L81-L150) all use imperative `fetch()` into local `useState` on mount/filter change only. Invalidating React Query keys triggers **zero** UI updates on those views.

### `SSE-RC2`: Unfiltered & Unbatched `addOrPrependArticle()` Mutations
- **Evidence**: [`useSSE.ts`](file:///e:/DNews_G/frontend/src/hooks/useSSE.ts#L90-L92) calls [`addOrPrependArticle(article)`](file:///e:/DNews_G/frontend/src/store/useAppStore.ts#L414-L427) immediately on every `new_article` event without batching and without checking `selectedCountry`, `selectedCategory`, `searchQuery`, or `isBreakingOnly`.
- **Empirical Impact**: In Category 3 testing, a `"Japan"` article leaked into the `"India"` Region filter in **82 ms** (`M6`), a `"World"` article leaked into the `"Tech"` Category tab in **306 ms** (`M5`), and an unrelated dispatch leaked into an active FTS5 search query in **71 ms** (`M7`). Moreover, [`CardStrip`](file:///e:/DNews_G/frontend/src/components/article/CardStrip.tsx) prepends new cards immediately while `autoAdvanceQueueIds` freezes navigation (`M3`), and [`addOrPrependArticle()`](file:///e:/DNews_G/frontend/src/store/useAppStore.ts#L417-L420) only updates `state.articles`—never `state.selectedArticle` (`M1` headline mutation missed `>3500 ms`).

### `SSE-RC3`: Missing Backend SSE Producers for 7 Subsystems
- **Evidence**: Repository scan of `emitSseEvent` across `backend/src/` proves the backend emits only 7 event types (`connected`, `heartbeat`, `new_article`, `article_enriched_pass2`, `alert`, `provider_switch`, `feed_counter_update`, `control_room_update`, `system_error`).
- **Missing Emissions**: Zero emissions exist for `cluster_update` (even though `useSSE.ts:108` listens for it!), `quota_update` (`useSSE.ts:252` listens for it!), `tv_health_update`, `watchlist_update`, `settings_update`, `bookmark_update`, `session_gap_update`, or any `library_*` event.

### `SSE-RC4`: No Event IDs, No Replay Buffer, and Broken Native `Last-Event-ID` Reconnect
- **Evidence**: [`backend/src/routes/sse.ts`](file:///e:/DNews_G/backend/src/routes/sse.ts#L44-L49) writes only `event:` and `data:` lines with zero numeric `id:` field and zero replay history. On the client, [`useSSE.ts`](file:///e:/DNews_G/frontend/src/hooks/useSSE.ts#L286-L291) explicitly calls `es.close()` inside `es.onerror` and creates a brand-new `new EventSource('/api/sse')` on an exponential timer (`2s`, `4s`, `8s`, ...). Destroying the `EventSource` instance wipes any browser `Last-Event-ID` state, sends no `Last-Event-ID` or `?since=` cursor (`RES-2`: `0/2` missed articles replayed), and hides disconnects from [`StatusStrip.tsx`](file:///e:/DNews_G/frontend/src/components/layout/StatusStrip.tsx) (only showing a Sonner toast after `attempts >= 2`).

### `SSE-RC5`: No `visibilitychange` / Sleep-Wake Resync & No Cross-Tab Sync
- **Evidence**: Zero `BroadcastChannel` or `window.addEventListener('storage', ...)` listeners exist in `frontend/src/`. Changing Auto-Advance or bookmarking an article in Tab A never updates Tab B (`M20`, `M21`, `L5`: `NONE >3000–3500 ms`). Similarly, no wake handler listens for `visibilitychange` (`hidden -> visible`) or `online` events, leaving stale articles, telemetry, alerts, and gap chips after sleep/wake (`RES-3`: `NONE >3500 ms`).

### `SSE-RC6`: Unbounded In-Memory Article Growth & Unbatched UI Writes
- **Evidence**: [`addOrPrependArticle()`](file:///e:/DNews_G/frontend/src/store/useAppStore.ts#L422-L425) keeps prepending new articles onto `state.articles` indefinitely with no cap/virtualization and no user-configured batching window (planned `live_refresh_interval_sec`, default 5 s, range 2–30 s). Also note [`feedCounter.ts`](file:///e:/DNews_G/backend/src/services/feedCounter.ts#L116-L131): `rolling24h` counts directly from `articles.ingested_at` while `30d`/`lifetime` read `ingest_daily`/`lifetime_counter`.

### `SSE-RC7`: Complete Library Isolation Without Live Events or Background Sync Scheduler
- **Evidence**: [`LibraryRoot.tsx`](file:///e:/DNews_G/frontend/src/library/LibraryRoot.tsx#L15-L23) and [`useLibraryStore.ts`](file:///e:/DNews_G/frontend/src/library/store/useLibraryStore.ts) live inside `<App>` where `useSSE()` is mounted, yet zero components in `frontend/src/library/` subscribe to SSE, TanStack Query, polling, or `BroadcastChannel`, and `backend/src/library/` has no background refresh scheduler (`L7`) or provenance update stream (`L6`).

### `SSE-RC8`: Static Alert Bell Badge & Unlinked System Health Polling
- **Evidence**: [`RightIconRail.tsx`](file:///e:/DNews_G/frontend/src/components/layout/RightIconRail.tsx#L220-L230) renders a fixed CSS `animate-ping` dot on `#btn-rail-alerts` with zero unread count, while [`SystemHealthIndicator.tsx`](file:///e:/DNews_G/frontend/src/components/layout/SystemHealthIndicator.tsx#L38) polls `/api/control-room/telemetry` once every `30000 ms` rather than reacting to `system_error` or `control_room_update` SSE events (`M12`).

---

## 3. Main Desk Audit Results (M1–M21 — Empirical TEST-DB Playwright Measurements)

| # | Surface | Data Source & Endpoint | Current Update Mechanism | Measured Latency | Audit Result | Root Cause & Empirical Observation |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **M1** | **Reader (current story & fields)** | `articles` table · `GET /api/articles/:id` | SSE `article_enriched_pass2` updates `selectedArticle`; `new_article` updates `store.articles` only | **73 ms** (`pass2`) / **NONE** (>3500 ms field/title edit) | `PARTIAL` | [`useSSE.ts:126-135`](file:///e:/DNews_G/frontend/src/hooks/useSSE.ts#L126-L135) updates `selectedArticle` on `article_enriched_pass2` only; `addOrPrependArticle()` ignores `selectedArticle` so title/pass1/raw field updates never show until story re-selection (`useAppStore.ts:414-427`). |
| **M2** | **Story cards (CardStrip)** | `articles` table · `GET /api/articles` | SSE `new_article` -> `GET /api/articles/:id` -> `addOrPrependArticle()` | **101 ms** | `PASS` | Card `#article-card-310169` rendered in **101 ms**. Wait: arrives unbatched (violates Cat 4 batching / Cat 5 zero-shift goals until fixed in Cat 4–5). |
| **M3** | **Bottom story strip** | `store.articles` + `store.autoAdvanceQueueIds` | Immediate `addOrPrependArticle()` prepend into `#card-strip-track`; queue snapshot holds IDs only | **135 ms** | `PARTIAL` | With Auto-Advance ON, injected card prepended in **135 ms** mutating strip DOM immediately without a `"N new stories"` pill while navigation queue stayed frozen (`SSE-RC2`). |
| **M4** | **Wire ticker** | `store.articles` (top 12 breaking/latest) | Reactive subscription to `store.articles` inside `NewsTicker.tsx` | **17 ms** | `PASS` | Breaking dispatch entered `#news-ticker-scroll-track` in **17 ms** cleanly without reload. |
| **M5** | **Category list & counts** | `store.articles` / `store.totalArticles` · `CategoryRailView.tsx` | `useArticles` fetches on view/category change; `new_article` appends blindly | **214 ms** (match) / **306 ms** (wrong-cat leak) | `PARTIAL` | Matching `Tech` dispatch arrived in **214 ms**, but a non-matching `World` dispatch leaked into active `Tech` tab in **306 ms** (`SSE-RC2`). Category tabs display zero per-category unread/total counts. |
| **M6** | **Region filter results** | `GET /api/articles?country=...` + `store.articles` | `useArticles` on country change; `new_article` ignores `selectedCountry` | **94 ms** (match) / **82 ms** (`Japan` leaked into `India`) | `FAIL` | While `country=India` was selected, a `Japan` article via `new_article` injected straight into the filtered list in **82 ms** (`SSE-RC2`). Non-SSE DB writes never appear without filter toggle. |
| **M7** | **Search results** | `GET /api/articles?q=...` (FTS5 `articles_fts`) | Debounced `useArticles` query; `new_article` ignores `searchQuery` | **64 ms** (match) / **71 ms** (non-match leaked) | `FAIL` | While searching `'AuditSearchTok...'`, an unrelated article via `new_article` polluted active search results in **71 ms** (`SSE-RC2`). |
| **M8** | **Breaking alerts banner** | `alerts` table · `store.alerts` (`AlertBanner.tsx`) | SSE `alert` -> `addAlert()` | **25 ms** | `PASS` | Breaking alert banner rendered in `#alert-banner-stack` in **25 ms** (note: `addAlert()` assigns a client timestamp ID instead of backend `payload.id`). |
| **M9** | **Alerts center / bell & unread count** | `GET /api/alerts` (`AlertsCenter.tsx`), `RightIconRail.tsx` | Raw `fetch()` on modal open; bell shows static CSS dot (`RightIconRail.tsx:228`); `useSSE` invalidates unused RQ key `['alerts']` | **NONE** (>3500 ms) | `FAIL` | Unread count stayed stale (`33 UNREAD`); `#btn-rail-alerts` renders no unread number (`innerText=''`); new alert `#241` never appeared in open `#alerts-list` (`SSE-RC1`, `SSE-RC8`). |
| **M10** | **Feed counter badge & popover** | `articles`, `ingest_hourly`, `ingest_daily`, `lifetime_counter` · `/api/feed/counter` | SSE `feed_counter_update` -> `fetchFeedCounter()` | **76 ms** | `PASS` | `24h` (`845->850`), `30d` (`7,491->7,496`), and `lifetime` (`7,491->7,496`) updated in **76 ms** inside `#feed-counter-popover`. Note: requires real `articles` rows for `24h` alongside `recordFeedIngestion()`. |
| **M11** | **Gap chip & Status Strip** | `app_sessions` · `/api/startup-status`, `/api/session/current` | Initial mount fetch in `App.tsx` / `WelcomeBackCard.tsx` only | **NONE** (>3000 ms) | `FAIL` | Updating session gap in DB left `#status-strip-gap-chip` frozen at `'Gap: 133m'`. No `"Reconnecting..."` chip exists during SSE loss (`SSE-RC3`, `SSE-RC4`). |
| **M12** | **System-health indicator** | `GET /api/control-room/telemetry` (`SystemHealthIndicator.tsx`) | `setInterval(..., 30000)` polling only | **NONE** (>3500 ms) | `FAIL` | After `logSystemError('fetcher', ...)` emitted `system_error` + `control_room_update`, indicator stayed `'System: OK'` past `3500 ms` (`SSE-RC8`). |
| **M13** | **Control Room (freshness/quotas/scheduler/errors)** | `/api/control-room/telemetry`, `/api/control-room/errors` | `ControlRoomDesk.tsx` polls `setInterval(..., 15000)` while open; `useSSE` RQ invalidations ignored | **14,324 ms** (SSE: **NONE** <3.5s) | `PARTIAL` | Failed real-time SSE push (`>3500 ms`); error row only appeared at **14,324 ms** when the `15s` timer poll fired (`SSE-RC1`, `SSE-RC3`). |
| **M14** | **TV (channel health, lists/counts, player)** | `tv_channels`, `tv_channel_health` · `/api/tv/channels` | Raw `fetch()` on `TVView` open only | **NONE** (>3500 ms) | `FAIL` | Channel status transitions (`is_alive`, `status`) and new channel inserts produced **0** live UI updates while TV Desk was open (`SSE-RC3`). |
| **M15** | **Globe / map pins & counts** | Derived `useMemo` from `store.articles` (`WorldMap.tsx`) | Recomputes reactively when `store.articles` changes via `new_article` | **128 ms** | `PASS` | `"Geotagged Reports"` incremented `60 -> 61` in **128 ms** while `#world-map-modal` was open. |
| **M16** | **Compare Coverage** | `clusters`, `articles` · `GET /api/clusters/:id` (`CompareCoverage.tsx`) | Raw `fetch()` on `compareClusterId` change only; backend never emits `cluster_update` | **NONE** (>3500 ms) | `FAIL` | Adding an outlet to cluster `1783` (even emitting `new_article` + `cluster_update`) caused zero update in `#compare-coverage-modal` (`SSE-RC1`, `SSE-RC3`). |
| **M17** | **Story Timeline** | `clusters`, `articles` · `GET /api/clusters/:id` (`StoryTimeline.tsx`) | Raw `fetch()` on `timelineClusterId` change only | **NONE** (>3500 ms) | `FAIL` | Inserting a new event into cluster `1783` never appeared in `#story-timeline-modal` (`SSE-RC1`, `SSE-RC3`). |
| **M18** | **Watchlist hits** | `watchlist` table + client match against `store.articles` (`WatchlistDesk.tsx`) | Hits recompute via `store.articles`; rule list fetched once on modal open | **17 ms** (hit) / **NONE** (>2500 ms new rule) | `PARTIAL` | Existing topic matched incoming `new_article` in **17 ms**, but rules added/edited in backend never appeared without closing and reopening (`SSE-RC3`). |
| **M19** | **Archive** | `GET /api/search?q=...` (`ArchiveChat.tsx`) | Imperative form submit fetch only | **NONE** (>3000 ms) | `FAIL` | New matching article arriving via SSE while `#archive-chat-modal` was open did not appear in search results (`SSE-RC1`). |
| **M20** | **Settings changed from another tab** | `settings` table · `PATCH /api/settings` | Local Zustand + `localStorage` write only | **NONE** (>3500 ms) | `FAIL` | Toggling Auto-Advance ON in Tab A left Tab B's TopBar & Status Strip stale (`SSE-RC3`, `SSE-RC5`). |
| **M21** | **Favorites / bookmarks (Main Desk)** | `articles.bookmarked` · `PATCH /api/articles/:id/bookmark` | Local Zustand update in originating tab only | **NONE** (>3500 ms) | `FAIL` | Bookmarking active article in Tab A left Tab B button stuck at `'Save Story'` (`SSE-RC3`, `SSE-RC5`). |

---

## 4. The Library Audit Results (L1–L7 — Empirical TEST-DB Playwright Measurements)

| # | Surface | Data Source & Endpoint | Current Update Mechanism | Measured Latency | Audit Result | Root Cause & Empirical Observation |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **L1** | **Today-in-History feed** | `library_history_cache` · `GET /api/library/history/today` | Imperative `fetch()` in `HistorySubpage.tsx` on date/filter change only | **NONE** (>3000 ms) | `FAIL` | Inserting a new `11-11` history dispatch produced zero update until manual filter change/reload (`SSE-RC7`). |
| **L2** | **History search results** | `library_history_cache` · `GET /api/library/history/search` | Debounced search query change trigger only | **NONE** (>3000 ms) | `FAIL` | Inserting a matching record while search `'AuditHistSearch...'` was active never appeared without retyping (`SSE-RC7`). |
| **L3** | **Wisdom (quotes, scriptures, meanings, VOTD)** | `library_verses`, `library_quotes` · `/api/library/wisdom/*` | Raw `fetch()` in `ScriptureReader.tsx` & `QuotesExplorer.tsx` on mount/tab click | **NONE** (>3000 ms) | `FAIL` | Editing `plain_meaning` on the active verse or adding new wisdom items never reflected live (`SSE-RC7`). |
| **L4** | **Mind Helps cards** | `library_mind_cards` · `GET /api/library/mind/cards` | Raw `fetch()` in `MindHelpsSubpage.tsx` on category/time filter change | **NONE** (>3000 ms) | `FAIL` | Inserting a new `stress` card while Mind Helps was open never appeared (`SSE-RC7`). |
| **L5** | **Library bookmarks (Cross-tab)** | `library_bookmarks` · `/api/library/bookmarks` | Single `fetchBookmarks()` call in `LibraryRoot.tsx` mount | **NONE** (>3000 ms) | `FAIL` | Bookmarking an item in Library Tab A left Tab B header badge frozen at `Bookmarks (0)` (`SSE-RC5`, `SSE-RC7`). |
| **L6** | **Source / license provenance data** | Static columns (`source_license`, `attribution`, `source_url`) in `library_*` | Returned inline only on item fetch; no provenance endpoint or SSE event | **NONE** (>2500 ms) | `FAIL` | Updating `attribution` on an open Mind card never refreshed in UI (`SSE-RC7`). |
| **L7** | **Background refresh jobs** | `historyService.getTodayInHistory()` lazy upstream fetch | On-demand inside HTTP `GET /history/today`; zero background scheduler exists | **N/A (No Job Engine)** | `FAIL` | No Library background refresh scheduler or SSE job-status events exist in `backend/src/library/` (`SSE-RC7`). |

---

## 5. Resilience, Reconnect & Concurrency Scenarios

| Scenario | Test Execution (TEST DB Only, No Reload) | Measured Observation | Result | Exact Root Cause |
| :--- | :--- | :--- | :---: | :--- |
| **RES-1: Backend Restart & Status Indicator** | Stopped backend HTTP server `:3099` for 1.5 s, captured diagnostic screenshot `ui-prd-d-cat3-backend-down.png`, restarted `:3099` and emitted `AUDIT_POST_RESTART_LIVE_*`. | During outage Status Strip read `'AUTO-ADVANCE Off ... Gap: 133m · Plain: OFF · System: OK'` (**no `"Reconnecting..."` chip**); exponential reconnect + destroyed `es` loop missed recovery within 12 s probe window and recovered **0** pre-outage missed events. | `FAIL` | [`useSSE.ts:270-291`](file:///e:/DNews_G/frontend/src/hooks/useSSE.ts#L270-L291) calls `es.close()` and backs off (`2s -> 4s -> 8s`); `StatusStrip.tsx` does not subscribe to SSE connection status; no full resync runs on reconnect (`SSE-RC4`). |
| **RES-2: SSE Disconnect & `Last-Event-ID` Replay** | Intercepted `/api/sse` headers, injected 2 articles during outage without SSE, restored connection. | Outgoing `/api/sse` requests had `last-event-id = false`; **0/2** outage articles appeared after reconnect. | `FAIL` | [`sse.ts:44-49`](file:///e:/DNews_G/backend/src/routes/sse.ts#L44-L49) emits no `id:` lines and stores no ring buffer; `es.close()` prevents native browser `Last-Event-ID` transmission (`SSE-RC4`). |
| **RES-3: Laptop Sleep / Wake Simulation** | Dispatched `visibilitychange` (`hidden`), injected article while hidden, dispatched `visibilitychange` (`visible`) + `focus`. | Injected article during sleep **never appeared (`>3500 ms`)**; Gap chip & Telemetry remained stale. | `FAIL` | Zero `visibilitychange` / `online` / long-gap full state resynchronization hook anywhere in frontend (`SSE-RC5`). |
| **Cross-Tab Two-Browser Sync** | Opened Tab A & Tab B simultaneously (`ui-prd-d-cat3-crosstab-stale.png`); toggled Auto-Advance & Bookmarks in Tab A. | Tab A updated immediately while Tab B remained stale indefinitely (`>3500 ms`). | `FAIL` | Zero `BroadcastChannel`, `storage` listener, or backend SSE `settings_update` / `bookmark_update` events (`M20`, `M21`, `L5`). |

---

## 6. Diagnostic Evidence Artifacts
- **Automated Audit Script & Measurements**: Scratch verification run saved in session `audit_results.json` (`31/31` checks completed, exit code `0`, zero production DB writes).
- **Captured Diagnostic Screenshots**:
  - `ui-prd-d-cat3-backend-down.png`: Shows Main Desk Status Strip falsely reading `System: OK` with no `"Reconnecting..."` indicator while backend `:3099` is completely down.
  - `ui-prd-d-cat3-crosstab-stale.png`: Shows Tab A with `Auto (7s)` active and gold bookmark star toggled while concurrent Tab B receives zero cross-tab updates.

---

## 7. Remediation Blueprint (Categories 4–6)

1. **Category 4 — Main Desk Real-Time Layer**:
   - **Backend `sse.ts`**: Monotonic sequence IDs (`id: <seq>`), 1,000-event circular replay buffer supporting `Last-Event-ID` + `?since=` cursor + `{ resync_required: true }` overflow signal; emit missing typed events (`cluster_update`, `quota_update`, `tv_health_update`, `watchlist_update`, `settings_update`, `bookmark_update`, `session_gap_update`, `library_update`, `library_bookmark_update`) and document all schemas in `FRONTEND_BACKEND_CONTRACT.md`.
   - **Frontend Singleton Event Bus (`useEventBus`)**: One SSE connection at app root feeding a typed subscriber bus + `BroadcastChannel('world-desk-sync')` for instant cross-tab Settings, Bookmarks, Theme, and Read-state sync; automatic backoff + non-blocking `"Reconnecting..."` chip in `StatusStrip.tsx`; full state resync on `resync_required`, reconnect after >15 s outage, or `visibilitychange` wake-up after sleep; client-side dedupe by `eventId`; eliminate orphan `setInterval` polls where SSE pushes exist; batch non-telemetry DOM updates via user setting `live_refresh_interval_sec` (default `5s`, range `2–30s`, placed in Settings -> News and Sources) while Feed Counter & Gap chip update immediately; cap/virtualize in-memory lists and verify zero leaks in a 30-minute soak test.
2. **Category 5 — UI Stability & Filter Isolation**:
   - **Strict Filter Predicates**: Buffer/check incoming SSE articles against active `selectedCategory`, `selectedCountry`, `searchQuery`, and `isBreakingOnly` before allowing them into visible queues.
   - **Snapshot Queue & `"N new stories"` Pill**: Isolate `autoAdvanceQueueIds` AND visible strip order behind a clickable `"● N new stories"` badge (flushing on click or queue wrap-around), preserving `0 px` bounding-box shift on active reader/strip/ticker/globe/video players.
3. **Category 6 — Library Real-Time Integration**:
   - Subscribe Library stores/subpages (`HistorySubpage`, `ScriptureReader`, `QuotesExplorer`, `MindHelpsSubpage`, `useLibraryStore`) cleanly through the shared typed bus and `BroadcastChannel`, add Library background-refresh scheduler status & provenance refresh without breaking PRD B isolation (`library_*` prefix / `frontend/src/library/**`).

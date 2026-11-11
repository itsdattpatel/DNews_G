# Live-Update Architecture & Surface Audit Blueprint
*Version 1.0 · 2026-11-11 · AI World News Desk (PRD D)*

---

## 1. Objective

The goal of Categories 3–6 is to guarantee that **every data surface across both the Main Desk and The Library updates in real time without browser reloads, without scroll jumps, without layout shifts, and without component remounts**.

This document defines the complete inventory of surfaces to be audited in **Category 3**, the automated Playwright/TEST-DB verification methodology, and the target real-time event architecture for **Categories 4–6**.

---

## 2. Main Desk Surface Inventory (21 Surfaces)

*Note: `Baseline Status` and `Measured Latency` fields will be populated during Category 3 automated execution.*

| # | Surface | Component(s) | Primary Data Source | Current Update Mechanism | Target Latency | Category 3 Audit Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **M1** | **Reader (Current Story & Fields)** | `ArticlePanel.tsx`, `SummaryPanel.tsx` | `/api/articles/:id` | Static / Manual selection | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M2** | **Story Cards (News Wire)** | `CardStrip.tsx` | `/api/articles` | Store fetch + partial SSE | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M3** | **Bottom Story Strip** | `CardStrip.tsx` | `/api/articles` | Snapshot queue / store | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M4** | **Wire Ticker** | `NewsTicker.tsx` | `/api/articles?breaking=1` | Store state | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M5** | **Category List & Counts** | `CategoryRailView.tsx` | `/api/articles/categories` | On open / manual refresh | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M6** | **Region Filter Results** | `TopBar.tsx`, `Shell.tsx` | `/api/articles?country=` | Filter query | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M7** | **Search Results (Wire & FTS5)** | `TopBar.tsx`, `CommandPalette.tsx` | `/api/articles?q=` | Query debounced | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M8** | **Breaking Alerts Banner** | `AlertBanner.tsx` | `alerts` table / SSE | Partial SSE event | Immediate / $\le 2\text{s}$ | *PENDING AUDIT* |
| **M9** | **Alerts Center / Bell & Unread Count** | `AlertsCenter.tsx`, `RightIconRail.tsx` | `/api/alerts` | Store fetch | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M10** | **Feed Counter Badge & Telemetry Panel** | `LiveFeedCounter.tsx`, `RightIconRail.tsx` | `/api/telemetry/live-feed` | Polling / SSE | Immediate | *PENDING AUDIT* |
| **M11** | **Gap Chip & Status Strip** | `StatusStrip.tsx` | `/api/session/current`, `/api/time` | Session heartbeat + fetch | Immediate | *PENDING AUDIT* |
| **M12** | **System Health Indicator** | `SystemHealthIndicator.tsx` | `/api/control-room/telemetry` | Periodic fetch / store | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M13** | **Control Room (Freshness/Quotas/Scheduler/Errors)** | `ControlRoomDesk.tsx` | `/api/control-room/*` | Polling + partial SSE | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M14** | **TV Desk (Health, Live/Faulty/Stopped, Player)** | `TVView.tsx`, `TVMiniPlayer.tsx` | `/api/tv/channels` | Fetch on mount / manual probe | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M15** | **Globe / Flat Map Pins & Counts** | `WorldMap.tsx`, `Globe3D.tsx` | `/api/articles/geo` | Computed from store / fetch | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M16** | **Compare Coverage** | `CompareCoverage.tsx` | `/api/clusters/:id/compare` | On dialog open | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M17** | **Story Timeline** | `StoryTimeline.tsx` | `/api/clusters/:id/timeline` | On dialog open | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M18** | **Watchlist Hits** | `WatchlistView.tsx` | `/api/watchlist` | On view open / SSE | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M19** | **Archive Chat & Query** | `ArchiveChat.tsx` | `/api/archive` | Manual search / prompt | $\le 5\text{s}$ | *PENDING AUDIT* |
| **M20** | **Settings Values (Cross-Tab Sync)** | `UnifiedSettingsDialog.tsx` | `/api/settings` | Initial load / local write | $\le 2\text{s}$ (BroadcastChannel/SSE) | *PENDING AUDIT* |
| **M21** | **Favorites & Bookmarks** | `ArticlePanel.tsx`, `TVView.tsx` | `bookmarked` column | Local write / optimistic | $\le 2\text{s}$ | *PENDING AUDIT* |

---

## 3. The Library Surface Inventory (7 Surfaces)

*Note: All Library updates adhere strictly to PRD B architectural isolation (`/library_` database prefix, `frontend/src/library/**`, `backend/src/library/**`).*

| # | Surface | Component(s) | Primary Data Source | Current Update Mechanism | Target Latency | Category 3 Audit Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **L1** | **Today-in-History Feed** | `HistorySubpage.tsx` | `library_history_events` | Fetch on tab mount | $\le 5\text{s}$ | *PENDING AUDIT* |
| **L2** | **History Search Results** | `HistorySearch.tsx` | `/api/library/history/search` | Manual query | $\le 5\text{s}$ | *PENDING AUDIT* |
| **L3** | **Wisdom Quotes & Scriptures (Approved/New/Verse of Day)** | `WisdomSubpage.tsx`, `QuotesExplorer.tsx` | `library_quotes`, `library_scriptures` | Static / Fetch on mount | $\le 5\text{s}$ | *PENDING AUDIT* |
| **L4** | **Mind Helps Cards** | `MindSubpage.tsx` | `library_mind_cards` | Fetch on mount | $\le 5\text{s}$ | *PENDING AUDIT* |
| **L5** | **Library Bookmarks (Cross-Tab)** | `LibraryRoot.tsx` | `library_bookmarks` | Fetch on mount | $\le 2\text{s}$ | *PENDING AUDIT* |
| **L6** | **Source & License Provenance Data** | `LibraryFooter.tsx` | `/api/library/sources` | Static JSON / fetch | $\le 5\text{s}$ | *PENDING AUDIT* |
| **L7** | **Background Refresh Jobs (Wikimedia/Scripture Sync)** | `librarySync.ts` | Scheduler jobs | Cron only (no UI notice) | $\le 5\text{s}$ | *PENDING AUDIT* |

---

## 4. Category 3 Audit Test Protocol (TEST Database Only)

Under Rule **G8**, automated audit tests run exclusively against an isolated test database (`tests/test_audit.sqlite`). Production SQLite files are strictly protected by the `[Test-Data Guard]`.

### Scenario 1: Real-Time Event Propagation (Zero Reload)
1. Boot the test server targeting `test_audit.sqlite`.
2. Open two Playwright browser tabs (`Page A` on Main Desk, `Page B` on The Library / Settings) without reloading.
3. Inject via backend API / test harness:
   - New breaking dispatch article.
   - Article cluster update / comparative outlet addition.
   - Live feed count & telemetry increment.
   - System error record in `system_errors`.
   - TV channel health transition (`LIVE` -> `OFFLINE`).
   - New Today-in-History event & Wisdom quote into `library_` tables.
4. Measure exact wall-clock milliseconds until each UI surface reflects the injected state.

### Scenario 2: Connection Resilience & Replay
1. Sever the `/api/sse` network stream at the browser context level.
2. Verify whether the UI indicates `"Reconnecting..."` cleanly without blocking modals.
3. Inject 5 articles into the test DB while offline.
4. Restore network connectivity and verify `Last-Event-ID` (or `since` cursor) replays all 5 missed articles.

### Scenario 3: Laptop Sleep / Wake Recovery
1. Freeze JS execution or simulate a 45-minute clock jump on browser context.
2. Restore execution and verify full state resynchronization (`articles`, `telemetry`, `session gap`, `alerts`).

### Scenario 4: Cross-Tab Settings & Bookmark Sync
1. Change `auto_advance_enabled` or toggle an article bookmark in **Tab A**.
2. Observe whether **Tab B** reflects the updated setting / bookmark badge within 2 seconds without reload.

---

## 5. Planned Unified SSE Architecture (Categories 4–6 Blueprint)

1. **Single Client Stream**: A singleton `useEventBus` manages one persistent `EventSource('/api/sse')`.
2. **Last-Event-ID Replay**: Every emitted backend SSE frame carries a monotonic numeric `id: <seq>`. The backend maintains an in-memory circular buffer (last 1,000 events) allowing seamless replay on `Last-Event-ID` reconnect.
3. **Throttled UI Batching**: Incoming data mutations are queued and flushed in fixed batches (user-configurable `live_refresh_interval_sec`, default 5s, range 2–30s) so the viewport remains rock-solid during heavy news surges.
4. **Queue Snapshot Isolation**: New articles do NOT disrupt active reader queues. Instead, they accumulate inside the `"● N new stories"` badge until manually merged or queue wrap-around.

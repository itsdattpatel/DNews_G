# PRD A: Main-App Upgrade — AI World News Desk
*Version 1.1 · 2026-11-01 · Comprehensive Architecture & Implementation Specification*
*Status: Approved for Documentation · Pending Final Step 0 Sign-Off*

---

## 0. System Overview & Architectural Mandates

### 0.1 Purpose
PRD A upgrades the AI World News Desk into an authentic, resilient, high-density live broadsheet news wire and broadcast station. It establishes continuous real-time temporal tracking, editorial auto-advancing, a cost-saving zero-AI Plain Mode, automated backup/safety nets, a hardened multi-method TV streaming infrastructure, live ingest velocity telemetry, cross-outlet corroboration, and an operational Control Room.

### 0.2 Global Rules & Guardrails
- **G1. Docs First**: `/docs/PRD_A.md`, `/docs/PROGRESS.md`, and `/docs/OPEN_QUESTIONS.md` established and approved before writing feature code.
- **G2. Never Guess**: All ambiguities documented in `OPEN_QUESTIONS.md` and clarified with the user prior to implementation.
- **G3. Staged Sequential Execution**: Strictly execute in defined order:
  `0 docs -> 1 dates -> 1B real-time foundation -> 2 auto-advance -> 3 plain mode -> 4 safety net -> 5 channel catalog + top 5 -> 6 playback + YouTube adder -> 7 TV UI + subpages -> 8 counter -> 9 confirmation labels -> 10 two-pass AI -> 11 control room -> 12 QA`.
  Stop for user approval with screenshots and test output after every step.
- **G4. Safety & Migrations**: Git commit and copy SQLite database file before starting and before any schema migration. Strictly additive, non-destructive migrations (`006_...sql` onwards).
- **G5. Package Vetting**: Zero desktop packaging (no Electron, Tauri, or native wrappers). Any new runtime package requires explicit approval, exact pinned version, >14 days npm publication age, clean `npm audit`, license logged in `CREDITS.md` (MIT/Apache/ISC/OFL only).
- **G6. Skill Discipline**: Read matching skills from `.agent/skills/` per `GEMINI.md` prior to beginning each category.
- **G7. Localhost Security**: Strictly bind services to `127.0.0.1:3001` and frontend to `localhost:5173`. Never expose open proxies or public tunnels.
- **G8. Broadsheet Anti-Slop**: Adhere strictly to `docs/DESIGN_SYSTEM.md` tokens, Paper and Night Edition themes, serif typography, high-contrast ink-on-paper rules, keyboard accessibility, `prefers-reduced-motion` compliance, and native two-finger trackpad / wheel scrolling.

---

## 1. Category 1: Dates on Every News Item

### 1.1 Objective
Eliminate temporal ambiguity across all dispatches by distinguishing when an event was originally reported by the publisher (`published_at`) versus when the dispatch was captured by the local desk (`ingested_at`).

### 1.2 Database Schema & Migration
- Create migration `006_dual_timestamps.sql`:
  ```sql
  -- Ensure ingested_at and is_catchup exist
  ALTER TABLE articles ADD COLUMN ingested_at TEXT;  -- UTC ISO-8601 with trailing 'Z'
  ALTER TABLE articles ADD COLUMN is_catchup INTEGER NOT NULL DEFAULT 0;
  ```
- **Strict Format Mandate**:
  - Store `ingested_at` in **ONE format everywhere**: UTC ISO-8601 string with trailing `"Z"` (e.g. `2026-11-01T17:00:00.000Z`).
  - Never compare directly against SQLite's unadorned `datetime('now')` space-separated string; always generate UTC comparison strings with `"Z"` in code or format them identically.
- **Backfill Rule**:
  - `ingested_at = COALESCE(strftime('%Y-%m-%dT%H:%M:%SZ', fetched_at), strftime('%Y-%m-%dT%H:%M:%SZ', created_at), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
  - `published_at = NULL` if missing, unparseable, or invalid.
- **Indexing**: `CREATE INDEX IF NOT EXISTS idx_articles_ingested_at ON articles(ingested_at);`

### 1.3 Validation & Display Logic
- **Verification Rule**:
  - A date is marked **"Date unverified"** if:
    1. `published_at` is null/empty, OR
    2. `published_at > ingested_at + 15 minutes` (future-dated feed bug), OR
    3. `published_at < ingested_at - 30 days` (stale feed archive).
- **Display Formatting**:
  - Primary text: `"Published {relative_published}"` and `"Arrived {relative_ingested}"` (e.g. *"Published 2h ago · Arrived 1h 58m ago"*).
  - Unverified fallback: *"Date unverified · Arrived {relative_ingested}"*.
  - Catch-up articles: include small broadsheet badge *"arrived late"*.
  - Hover & focus tooltip (`title` / ARIA description): Exact absolute local timestamp formatted in user's laptop timezone: `YYYY-MM-DD HH:mm:ss [TZ]`.
- **Live Updating**:
  - Client-side timer (30-second interval) updates relative date strings reactively without network requests.
- **Surfaces**: Main Reader kicker/byline, Bottom Card Strip, Category Rail, Wire Ticker, Archive Search results, Compare Coverage columns, Story Timeline nodes, and Breaking Alert banners.

---

## 1B. Category 1B: Real-Time Foundation

### 1B.1 Objective & Guarantees
Ensure every time shown in the app is always genuine and accurate, even if the browser tab was closed, the app was stopped, or the laptop was powered off.
- **Honest Physical Limit**: While the laptop is powered off, nothing can be fetched. "Real time" means the app always knows and displays exactly when it was off, how long it was away, and what was recovered.

### 1B.2 Architecture & Heartbeat Mechanism
1. **Single Source of Truth**:
   - Every timestamp stored as UTC ISO-8601 with trailing `"Z"` from system clock.
   - Never count time with timers, intervals, or relative accumulators.
   - Relative strings (`"2h ago"`) computed dynamically at render time as `now - stored_timestamp`.
   - Display rendered in laptop's local timezone with timezone label displayed in Settings.
2. **Backend Heartbeat**:
   - The backend scheduler updates `last_heartbeat_at` in the database every 30 seconds while running.
3. **Session Ledger (`app_sessions`)**:
   - Migration `007_realtime_foundation.sql`:
     ```sql
     CREATE TABLE IF NOT EXISTS app_sessions (
       id                INTEGER PRIMARY KEY AUTOINCREMENT,
       started_at        TEXT NOT NULL, -- UTC ISO-8601 with 'Z'
       last_heartbeat_at TEXT NOT NULL, -- UTC ISO-8601 with 'Z'
       ended_at          TEXT,          -- UTC ISO-8601 with 'Z'
       end_reason        TEXT CHECK(end_reason IN ('clean', 'unclean', 'crash', 'sleep'))
     );
     ```
   - **Clean Shutdown**: Hook on `SIGINT` / `SIGTERM` / `process.exit` sets `ended_at = now()` and `end_reason = 'clean'`.
   - **Startup Gap Resolution**: On boot, if the previous session record has `ended_at IS NULL`, the backend closes it with `ended_at = last_heartbeat_at` and `end_reason = 'unclean'`. Away time is measured accurately to within ~30 seconds.

### 1B.3 Welcome-Back Broadsheet Card
- On application launch or reconnect after a session gap:
  - Header: *"You were away 6h 12m (Mon 10:05 PM to Tue 4:17 AM)"*.
  - Session Exit Indicator: Clean shutdown vs Unclean exit (power off, sleep, or crash).
  - Recovery Tally:
    - New articles saved since startup.
    - Catch-up count (`is_catchup = 1`).
    - High-urgency breaking items detected.
  - Action Button: *"Show missed news"* opens the catch-up view focused specifically on that away window.

### 1B.4 Catch-Up Ingestion & Honesty
- Articles retrieved during catch-up keep their true original `published_at`.
- Assigned `ingested_at = real time saved`, `is_catchup = 1`, and receive an *"arrived late"* broadsheet ink badge.
- UI explicitly communicates gaps (e.g. *"RSS feeds do not retain archives beyond 48 hours; GDELT covered 120 of 180 minutes"*).

### 1B.5 Frontend Clock Synchronization
- On initial page load and SSE reconnect, frontend fetches `/api/time` to calculate and store the client-server clock offset.
- **Sleep & Frozen Tab Detection**:
  - Detects time jumps (>10 seconds between 1-second ticks).
  - Immediately triggers re-sync with `/api/time`.
  - Re-evaluates all relative timestamps, 24h counters, and auto-advance timers.
  - First paint after tab reactivation is guaranteed 100% temporally accurate.

### 1B.6 Clock Safety & Anomaly Handling
- If system clock is set backward or a heartbeat appears in the future:
  - Never display negative, NaN, or absurd durations.
  - Render fallback badge *"clock changed"* while preserving underlying raw ISO records.
  - Immune to Daylight Saving Time (DST) changes because storage is strictly UTC.

---

## 2. Category 2: Auto-Advance (Every 7 Seconds)

### 2.1 Objective
Provide hands-free broadsheet reading for ambient monitoring, automatically advancing through active dispatches in current filter order.

### 2.2 Mechanism & State
- **Interval**: Default `7` seconds. Configurable in Settings (`auto_advance_interval_sec`: integer range 3–60).
- **Toggle**: Setting `auto_advance_enabled`: boolean (default `false`).
- **Countdown Indicator**:
  - Thin 2px broadsheet progress bar situated at the top edge of the Left Article Panel.
  - Smooth linear countdown (`transition: width 100ms linear`), resetting to 0 on tick.
  - In `prefers-reduced-motion`: bar snaps discretely without continuous animation.
- **Comprehensive Pause Rules (Mandated)**:
  Auto-advance pauses under these exact, explicit conditions:
  1. **Left Panel Hover**: When switch `auto_advance_pause_on_hover` is `ON` and pointer is over `#article-panel`.
  2. **Modals & Overlays**: While any full-screen modal or view is active (Settings Drawer, TV View, Daily PDF Desk, Control Room, Library/Archive, Alerts Center).
  3. **Input Focus**: While any `<input>`, `<textarea>`, or `[contenteditable]` has focus (e.g. search bar, chat input).
  4. **Tab Visibility**: While the browser tab is hidden or window is minimized (`document.visibilityState === 'hidden'`).
  5. **Manual Pause**: When the user clicks the Play/Pause toolbar button.
- **Resume Behavior**:
  - When all pause conditions clear, the countdown restarts with a **FULL interval** (7s default).
  - Next to the progress bar, show a small label: `Paused: {reason}` (e.g. *"Paused: Reading"*, *"Paused: Search focused"*, *"Paused: Background tab"*).
- **Manual Overrides**:
  - Manual dispatch selection (clicking card, pressing `j`/`k`, clicking next/prev buttons) immediately resets the full countdown.
- **Order & Wrap**:
  - Follows active filter list order (current category/country/breaking view).
  - Wraps seamlessly to index 0 after the final item.

---

## 3. Category 3: Plain Mode (Zero AI, Full-Width Reader)

### 3.1 Objective
Allow zero-cost, zero-latency, private offline reading without invoking external AI API calls or consuming API quotas.

### 3.2 Behavior When Plain Mode = ON
1. **Layout**:
   - Right Summary Panel is cleanly hidden.
   - Left Article Panel smoothly expands to take 100% of the desk width while preserving resizable splits when re-enabled.
2. **Zero Outbound AI Calls**:
   - AI Enricher bypasses Gemini, Groq, Mistral, Cerebras, and Ollama completely.
   - Articles are ingested immediately with `status = 'done'` and `summary = NULL`.
3. **Rule-Based Tagging**:
   - Categorization falls back to deterministic rule engine:
     - RSS feed `<category>` tags.
     - Keyword lexical pattern matching (e.g. "parliament", "election" -> *Politics*; "climate", "wildlife" -> *Environment*).
     - Outlet regional defaults.
4. **Breaking Score Fallback**:
   - Breaking urgency calculated via deterministic cluster rule: cluster containing >= 3 distinct outlets across >= 2 countries published within 30 minutes.
5. **Clear Visual Disablement**:
   - Features requiring AI are visibly badged, not silently broken:
     - Language toggle shows: *"Translation offline (Plain Mode)"*.
     - Evidence highlight shows: *"Highlights offline (Plain Mode)"*.
     - Archive chat shows: *"FTS keyword search only (AI synthesis offline)"*.
6. **Catch-Up Summarization**:
   - When Plain Mode is toggled OFF, unsummarized articles remain untouched automatically.
   - A manual button *"Summarize un-enriched dispatches"* appears in the Control Room and Settings, processing pending items in chronological order with quota throttling.

---

## 4. Category 4: Safety Net: Backups, Settings Export/Import, Test-Data Guard

### 4.1 Automated Database Backups
- **Storage**: Dedicated `backups/` directory at workspace root.
- **Triggers**:
  1. Daily scheduled cron at 03:00 local time.
  2. Automated hook prior to executing any SQLite migration script.
  3. Manual trigger via Control Room / Settings.
- **Retention**: Keep last 7 daily backups + last 4 weekly backups; older archives automatically pruned.
- **Restore Architecture**:
  - Standalone restore utility script: `npm run db:restore -- <backup_file>`.
  - Settings UI "Restore Backup" modal with explicit double-confirmation typing prompt (`"RESTORE"`).

### 4.2 Settings Export & Import
- Export JSON containing user preferences (refresh intervals, thresholds, theme, auto-advance, panel sizes, channel favorites).
- **Strict Redaction**: API keys and secrets (`gemini_api_key`, `groq_api_key`, `youtube_api_key`, etc.) are stripped with zero exceptions.
- Import validator checks schema version and rejects malicious payload structures.

### 4.3 Test-Data Guard
- **Strict Isolation**: Test runner sets `NODE_ENV=test` and forces SQLite database target to in-memory `:memory:` or `backend/data/test-news.sqlite`.
- **Startup Assertion Guard**: The backend will throw a fatal error on boot if test suites attempt to connect to `backend/data/news.sqlite`.
- Existing test/dummy rows in production database are audited and removed safely via approved migration.

---

## 5. Category 5: TV Channel Catalog + Top 5 Per Nation

### 5.1 IPTV-Org Catalog Integration
- Ingest upstream playlist feeds:
  - `https://iptv-org.github.io/iptv/categories/news.m3u`
  - `https://iptv-org.github.io/iptv/countries/{in,us,cn,jp,au}.m3u`
  - Documentaries, outdoor, and wildlife playlists.
  - IPTV-org JSON metadata API (channels, streams, feeds).
- **Caching**: Local directory cache at `backend/data/iptv-cache/` with date-stamped JSON and recorded Unlicense / public domain attributions.
- **Schema**:
  - `tv_channels`: `id`, `name`, `logo`, `country`, `language`, `category`, `stream_url`, `youtube_channel_id`, `youtube_video_id`, `website`, `is_favorite`, `status`.
  - `tv_channel_health`: per-method health tracking (`hls`, `youtube`, `vlc`) with `last_checked`, `last_worked`, `consecutive_failures`, `failure_reason`.

### 5.2 Curated Top 5 News Outlets Per Nation
Dedicated config file `config/channels-top5.json` for India, USA, China, Japan, Australia:
- Only official, verified links are included; every entry starts with status `"needs my review"`.
- If fewer than 5 verified channels exist for a nation, only verified channels are shown (never padded with unofficial streams).
- **India**: NDTV 24x7, India Today, Aaj Tak, WION, ABP News.
- **USA**: ABC News Live, NBC News NOW, CBS News 24/7, PBS NewsHour, Bloomberg Television.
- **China**: CGTN, CCTV-4 / CCTV News, Xinhua Live, Phoenix InfoNews, Dragon TV.
- **Japan**: NHK World-Japan, ANN News (TV Asahi), Nippon TV News24, TBS News DIG, FNN Live.
- **Australia**: ABC News Australia, SBS World News, Sky News Australia, 9 News, 7NEWS.
Each channel entry records: Official YouTube Live embed URL, IPTV-org HLS stream URL, Official Website, and verification audit date.

---

## 6. Category 6: Playback (3 Methods) + YouTube Link Adder

### 6.1 Multi-Method Playback Fallback Chain
1. **Method 1: HLS Stream Proxy**:
   - Backend endpoint `/api/tv/proxy?url=<encoded>` streams HLS content through Express server to resolve CORS and HTTP/HTTPS mixed-content issues.
   - **SSRF Protection**:
     - Strict allowlist: URL must match a registered channel in the database.
     - Block private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`).
     - Block loopback and local hostnames.
     - Size and timeout limits (5s connect timeout, 10s chunk timeout).
2. **Method 2: Official YouTube IFrame Player**:
   - Employs official YouTube IFrame Player API using `www.youtube-nocookie.com`.
   - Listens to player error codes (code `101` / `150` embedding disabled) and automatically cascades to VLC fallback.
   - Proper referrer headers ensured via `http://localhost:5173`.
3. **Method 3: "Open in VLC"**:
   - Generates `vlc://<url>` protocol launch link with a 1-click "Copy Stream URL" fallback button.

### 6.2 YouTube Link Adder & Handle Resolution
- UI Modal on TV view:
  - Input field accepts YouTube URLs (`watch?v=`, `youtu.be/`, `/live/`, `/channel/UC...`, or `@handle`).
  - Backend verifies URL against official YouTube oEmbed API (`https://www.youtube.com/oembed?url=...&format=json`).
  - Extracts title, thumbnail, and author; presents live preview card.
  - **`@handle` Links Protocol**:
    - **Default (No API Key)**: Modal displays prompt asking for the canonical Channel ID (`UC...`) with a concise guide on how to locate it in YouTube page source. Zero scraping.
    - **Optional (With `YOUTUBE_API_KEY`)**: Backend calls YouTube Data API v3 (`channels.list?forHandle=...`, cost 1 quota unit) to resolve canonical Channel ID and active live broadcast. Key stays server-side only.
  - Scrapers and stream rippers strictly forbidden.

---

## 7. Category 7: TV Screen UI + Subpages

### 7.1 Full Dedicated Route Architecture
- Dedicated route view `tv` integrated into Shell with resizable split (Left: Player / Right: Channel Directory).
- **Subpages**:
  1. **LIVE (Default)**: Strictly displays channels with at least one verified working playback method. Dead streams never appear here.
  2. **FAULTY FEEDS**: Lists currently impaired channels. Shows failed method, error reason, last worked timestamp, consecutive failure counter, and manual "Test & Retry" action. Automatically restored to LIVE after 2 consecutive passing health probes.
  3. **STOPPED LINKS**: Channels unresponsive for >= 7 days or removed upstream. Actions: "Retry Probe", "Edit URL", "Remove Permanently".

### 7.2 Editorial TV Player & Channel Directory
- **16:9 Aspect Frame**: Broad, ink-bordered broadsheet television casing.
- **Controls**: Mute-first autoplay, volume slider, fullscreen (`f`), picture-in-picture, keyboard navigation (Up/Down channel switch).
- **Channel Directory**: Broadsheet cards with outlet logo, national flag, textual health badge (*"LIVE"* in forest green / *"SLOW"* in ochre / *"OFFLINE"* in crimson - no bare colored dots).
- Filters: Top 5 Per Nation shelf, Animal & Discovery shelf, Favorites, Country filter, Category tabs.

---

## 8. Category 8: Live Feed Counter

### 8.1 Ingest Velocity Metrics & Retention Immunity
- **Metric Definition**:
  - Header icon with live number badge = count of **NEW unique articles** saved in the last rolling 24 hours based on `ingested_at` UTC timestamp.
  - Catch-up articles arriving today count towards this arrival velocity metric.
  - Never computed by `published_at`.
- **Retention Immunity & Dedicated Tables**:
  - Independent telemetry tables: `ingest_hourly`, `ingest_daily`, `lifetime_counter`.
  - The 30-day retention cleanup of article text must **NEVER** decrement these counters.
  - Daily historical buckets retained for 13+ months to track historical desk throughput.
- **Secondary Telemetry in Hover Panel**:
  - Displays: (a) Rolling 24-hour total, (b) Duplicates skipped count, (c) "N from catch-up", (d) 24-hour hourly sparkline bar chart, (e) 30-day volume total, (f) Lifetime desk total with `"Tracking since {date}"`, (g) Total time running and Total time away (from `app_sessions`).
  - In the sparkline, hours when the app was OFF (from `app_sessions`) are styled as hatched "app off" gaps, not as zero news.

---

## 9. Category 9: Confirmation Labels

### 9.1 Multi-Source Story Corroboration
- Evaluates article clusters (`cluster_id`) to compute corroboration depth:
  - **1 outlet**: `"Single source"` (neutral ink badge).
  - **2 outlets**: `"2 outlets"` (slate badge).
  - **3+ outlets across 2+ nations**: `"Confirmed: N outlets in M countries"` (forest green broadsheet stamp).
- **Breaking Alert Upgrades**:
  - Single-outlet breaking news labeled `"Unconfirmed Breaking"` in muted ochre.
  - Upgrades automatically to bold crimson `"Confirmed Breaking"` as corroborating reports arrive.
- **Surfaces**: Article cards, Reader header, Alert banners, and Compare Coverage. Fully operational in Plain Mode without AI.

---

## 10. Category 10: Two-Pass AI Processing

### 10.1 Pipeline Stages
- **Pass 1 (Lightweight / Batched)**:
  - Scores urgency, breaking score, and tags primary categories in batches of 20 using minimal token prompt.
  - Highly economical; preserves quota on high-volume RSS streams.
- **Pass 2 (In-Depth Enrichment)**:
  - Invoked strictly for top tier stories: breaking score >= threshold (default top 30%) or explicitly requested by user.
  - Generates executive summary, anchor phrases, keywords, and entity tags.
  - Un-summarized articles retain a manual *"Summarize Story"* button in the Main Reader.
- **Quota Telemetry**:
  - Calculates tokens saved vs single-pass model; surfaces metrics in the Control Room.

---

## 11. Category 11: Control Room Page

### 11.1 Dedicated Desk Telemetry Hub
- Accessible via Bat Navigation Menu (`"Control Room"`).
- **Live Monitoring Modules**:
  1. **Source Freshness**: Status of all 24 feeds (last successful fetch time, latency, error count).
  2. **Scheduler Telemetry**: Active cycle status, last run duration, next scheduled cycle.
  3. **AI Provider Health & Quotas**: Real-time quota usage bars, active fallback chain status, rate-limit warnings.
  4. **Queue Metrics**: Pending Pass 1 / Pass 2 queues, failed enrichments.
  5. **Database & Storage**: SQLite file size, article count, last backup timestamp.
  6. **Error Ledger**: Filterable system event log.
  7. **Operating Mode Indicator**: Live toggle state for Plain Mode and Two-Pass AI.

---

## 12. Category 12: Rigorous QA & Verification Suite

### 12.1 Acceptance Criteria & Verification Gates
1. **Automated Playwright Tests**: Dedicated end-to-end test suite for every category.
2. **Design System & Visual Verification**: High-contrast Paper and Night Edition screenshots captured with `ui-visual-validator`.
3. **Security Audit**: Verified using `security-auditor`:
   - No API keys in client bundles or network payloads.
   - Stream proxy SSRF allowlist strictly enforced against private IPs.
   - Test databases strictly segregated from production SQLite storage.
4. **Zero Console Errors**: 0 warnings or errors in clean production build.
5. **Documentation Integrity**: Up-to-date `CREDITS.md` documenting every library and license.

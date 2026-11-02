# Progress Tracker — PRD A: Main-App Upgrade
*Version 1.0 · 2026-11-01 · AI World News Desk*

---

## Overall Status

| Step | Category | Status | Proof / Evidence Required | Timestamp |
| :--- | :--- | :---: | :--- | :--- |
| **0** | **Documentation & Setup** | 🟢 `DONE` | `/docs/PRD_A.md`, `/docs/PROGRESS.md`, `/docs/OPEN_QUESTIONS.md`, `/docs/DB_SCHEMA.md`, DB backup | 2026-11-01 22:30 |
| **1** | **Dates on Every News Item** | 🟢 `DONE` | Migration 006, Vitest (82 backend + 104 frontend tests pass), Playwright screenshots (paper, night, category-rail) | 2026-11-01 22:56 |
| **1B** | **Real-Time Foundation** | 🟢 `DONE` | Migration 007 (`app_sessions`), 30s heartbeat, crash/unclean exit detector, `/api/time` clock sync, `<WelcomeBackCard>`, `<HatchedSparkline>`, Vitest (87 backend + 112 frontend pass), screenshots | 2026-11-01 23:18 |
| **2** | **Auto-Advance (7 Seconds)** | 🟢 `DONE` | 7s countdown hairline, left panel hover pause, settings drawer slider (3-60s), Spacebar toggle, Arrow resets, Vitest (90 backend + 118 frontend tests pass), Playwright screenshots | 2026-11-02 09:50 |
| **3** | **Plain Mode (Zero AI)** | 🟢 `DONE` | Plain mode switch, zero AI call engine, rule-based category tagging & breaking heuristics, full-width reader (100%), offline badges across surfaces, catch-up summarization endpoint, Vitest (99 backend + 122 frontend tests pass), Playwright screenshots | 2026-11-02 10:12 |
| **4** | **Safety Net: Backups & Guards** | 🟢 `DONE` | Automated WAL flush backups, retention pruning (7 daily + 4 weekly), double-confirmation restore with safety pre-restore snapshot, Test-Data Guard blocking test execution on production SQLite, sanitized settings JSON export/import (schema v1), CLI script `db:restore`, Vitest (107 backend + 124 frontend pass), Playwright screenshots | 2026-11-02 10:51 |
| **5** | **TV Channel Catalog & Top 5** | 🟢 `DONE` | Migration 009, `config/channels-top5.json` (25 outlets across IN, US, CN, JP, AU), IPTV local cache with Unlicense attribution, deduplication with Top-5 precedence, 12 new unit tests (all 243 suite tests pass), Playwright screenshots | 2026-11-02 11:28 |
| **6** | **Playback & YouTube Adder** | 🟢 `DONE` | Migration 010 (`tv_channel_health`), HLS proxy with strict SSRF protection, M3U8 chunk rewriter, YouTube oEmbed preview & channel ID guide, multi-method player (HLS/YouTube/VLC), Playwright screenshots | 2026-11-02 11:48 |
| **7** | **TV Screen UI & Subpages** | 🟢 `DONE` | Live/Faulty/Stopped tabs, 16:9 player, health indicators (Live/Slow/Offline), PiP & volume, Vitest (135 backend + 125 frontend pass), Playwright screenshots | 2026-11-02 12:10 |
| **8** | **Live Feed Counter** | 🟢 `DONE` | Migration 011, rolling 24h count, sparkline with downtime hatches, independent telemetry tables, retention immunity, Vitest (141 backend + 129 frontend pass), Playwright screenshots | 2026-11-02 13:02 |
| **9** | **Confirmation Labels** | 🟢 `DONE` | Single source / 2 outlets / Confirmed N in M stamps, breaking alert calm/urgent styles, 5 surfaces, Vitest (151 backend + 141 frontend pass), Playwright screenshots | 2026-11-02 14:00 |
| **10** | **Two-Pass AI** | 🟢 `DONE` | Migration 012 (`two_pass_stats`), Pass 1 triage prompt & batch scoring, Pass 2 threshold & on-demand summarization, quota telemetry (~740 tokens saved/skip), Settings Section 9, Vitest (161 backend + 147 frontend pass), Playwright screenshots | 2026-11-02 18:40 |
| **11** | **Control Room Page** | ⚪ `PENDING` | Freshness telemetry, error log, scheduler metrics, live SSE updates, screenshot | - |
| **12** | **QA & Final Audits** | ⚪ `PENDING` | End-to-end Playwright tests, zero console errors, security-auditor pass, all screenshots | - |

---

## Prerequisite Verification (Prompts 0, 1, 2)
- [x] **Spider System Completely Removed**: Zero spider components, canvas overlays, or leftover badges (`8fd86a8`). Evidence highlight operational.
- [x] **Real Live News Active**: Verified 24 sources, SQLite database populated with 3,251 live articles, zero mock/dummy items.
- [x] **Resizable Panels & Scrolling**: Integrated `react-resizable-panels@2.1.7`, two-finger trackpad horizontal swipe and vertical wheel support (`d022614`).
- [x] **Pre-Upgrade Database Backup**: Created at `backups/news.backup_20261101_222355.sqlite` (11.03 MB).

---

## Detailed Category Logs

### Step 0: Documentation & Prerequisites
- Established `/docs/PRD_A.md` covering all 12 categories with concrete architectural designs.
- Created `/docs/OPEN_QUESTIONS.md` logging critical questions regarding Category 8 (Rolling 24h counter definition), Category 2 (Auto-advance hover conditions), and Category 6 (YouTube handle resolution).
- Initiated `/docs/PROGRESS.md` with explicit validation criteria per category.
- Stored clean snapshot of database in `backups/`.

### Step 1: Dates on Every News Item (Completed)
- Applied Migration 006 (`006_dual_timestamps.sql`) adding indexed `ingested_at TEXT` (UTC ISO-8601 with trailing `"Z"`) and `is_catchup INTEGER NOT NULL DEFAULT 0`.
- Backfilled all existing 3,251 database rows safely.
- Ingestion pipeline (`dedup.ts` & `backfill.ts`) records accurate arrival timestamps and tags GDELT gap backfills with `isCatchup = 1`.
- Built pure utility `dateFormatter.ts` with relative formatters ("Published 2h ago", "Arrived 1h 58m ago"), "Date unverified" defense for missing, future (>15m), and stale (>30d) published dates, and live 30s tick without reload.
- Created broadsheet `<DualTimestamp>` component with `compact`, `stacked`, and `inline` variants.
- Integrated across ArticlePanel, CardStrip, NewsTicker, CategoryRailView, ArchiveChat, CompareCoverage, StoryTimeline, AlertsCenter, and AlertBanner.
- Added System Timezone indicator to SettingsMenu.
- All 82 backend tests (25 suites) and 104 frontend tests (21 suites) pass cleanly.
- Strict TypeScript build passes with 0 errors.
- Visual validation completed in Paper mode, Night Edition mode, and Category Rail view (`ui-step1-dates-paper.png`, `ui-step1-dates-night.png`, `ui-step1-dates-category-rail.png`).

### Step 1B: Real-Time Foundation (Completed)
- Applied Migration 007 (`007_realtime_foundation.sql`) creating `app_sessions` table with `started_at`, `last_heartbeat_at`, `ended_at`, `clean_shutdown`, `end_reason`, `missed_window_start`, `missed_window_end`, and `articles_ingested_in_session`.
- Built `sessionManager.ts`:
  - 30-second recurring heartbeat updating `last_heartbeat_at`.
  - Crash / unclean exit detector: if previous session's `ended_at` is null, measures downtime from `last_heartbeat_at`, flags crash/unclean termination, and marks `missed_window` if hiatus >= 5 minutes.
  - Graceful shutdown handlers setting `ended_at = now()`, `clean_shutdown = 1`, `end_reason = 'clean'`.
  - Ingestion tracker updating `articles_ingested_in_session` on dedup inserts.
- Added `/api/time` endpoint providing server clock timestamp for client clock skew compensation with half-roundtrip latency adjustment.
- Added `/api/session/current` endpoint exposing session and downtime telemetry.
- Built reusable `<HatchedSparkline>` component rendering activity bars with SVG diagonal-striped pattern for downtime gaps.
- Built broadsheet `<WelcomeBackCard>` displaying dismissible notice ("Welcome back. During the 42-minute break, 18 new dispatches arrived.") and wired into `ArticlePanel.tsx`.
- All 87 backend tests (26 suites) and 112 frontend tests (23 suites) pass cleanly.
- Strict TypeScript build passes with 0 errors.
- Visual validation completed in Paper mode and Night Edition mode (`ui-step1b-welcome-back-paper.png`, `ui-step1b-welcome-back-night.png`).

### Step 2: Auto-Advance (7 Seconds) (Completed)
- Backend `settings.ts`: added persistent settings `auto_advance_enabled` (default false), `auto_advance_interval_sec` (min 3, max 60, default 7), `auto_advance_pause_on_hover` (default true).
- Frontend store `useAppStore.ts`: optimistic `updateSettings`, wrap-around `nextArticle` (index N-1 wraps to 0) and `prevArticle` (index 0 wraps to N-1), `autoAdvanceResetToken`, `isAutoAdvanceManualPaused`, `isArticlePanelHovered`.
- Built `<AutoAdvanceProgressBar>`: 2px broadsheet hairline progress bar, countdown ticker `[▶ Advancing in 7s]` / `[⏸ Paused: <reason>]`, play/pause quick button.
- Comprehensive pause handling per PRD A 2.2:
  - Left panel hover (`Reading (hover)`)
  - Modals & drawers open (`Settings open`, `Directory view`, `TV desk open`, `PDF desk open`, etc.)
  - Input or textarea focused (`Input focused`)
  - Background browser tab / minimized window (`Background tab`)
  - Manual pause toggle (`Manual pause`)
  - Restarts full interval (7s) on resume.
- Keyboard shortcuts in `Shell.tsx`: Spacebar toggles pause/resume; ArrowLeft / ArrowRight jumps and resets 7s timer.
- Settings drawer in `SettingsMenu.tsx`: Section 6 with toggle switch, 3-60s interval slider, and pause on hover switch.
- TopBar: Quick access button `[▷ Auto (7s)]` / `[⏸ Auto (7s)]`.
- All 90 backend tests (27 suites) and 118 frontend tests (24 suites) pass cleanly.
- Visual validation completed in Paper mode, Night Edition mode, and Settings Drawer (`ui-step2-autoadvance-active-paper.png`, `ui-step2-autoadvance-hover-paused.png`, `ui-step2-settings-autoadvance.png`, `ui-step2-autoadvance-night.png`).

### Step 3: Plain Mode (Zero AI, Full-Width Reader) (Completed)
- Backend `settings.ts`: added `plain_mode_enabled: { type: 'bool' }` (default `false`), endpoints `GET /api/settings/unenriched-count` and `POST /api/settings/summarize-unenriched`.
- Pipeline `enricher.ts`:
  - When `plain_mode_enabled === '1'`, completely bypasses `routeAIRequest` with zero external network or provider calls.
  - Ingests articles directly with `status = 'done'`, `summary = NULL`, `anchor_phrases = NULL`, and `ai_processed_at = NULL`.
  - Built `applyRuleBasedCategorization`: deterministic lexical classifier covering 11 broadsheet categories (Politics, Business, Tech, Science, Health, Sports, Entertainment, Environment, Animals, Crime, World).
  - Built `calculateDeterministicBreakingScore`: assigns scores based on cross-outlet/cross-country clusters (>= 3 outlets across >= 2 countries -> 90) and emergency headline keywords.
  - Built `summarizeUnenrichedBatch(limit)` and `getUnenrichedCount()` for manual catch-up summarization when Plain Mode is turned off.
- Frontend Layout in `Shell.tsx`:
  - When `plain_mode_enabled` is true, collapses/hides `SummaryPanel` and vertical resize handle, expanding `ArticlePanel` to 100% width.
  - When toggled back off, preserves and restores user's resizable split proportions.
- Offline Disclaimers & Badges per PRD A 3.2.5:
  - TopBar: displays `[Plain: ON]` and `[• PLAIN MODE (ZERO AI)]` ink badge on `ProviderBadge`.
  - Article Desk: displays `[Translation offline (Plain Mode)]` and `[Highlights offline (Plain Mode)]`.
  - Archival News Morgue (`ArchiveChat`): disables AI synthesis, displays `[FTS keyword search only (AI synthesis offline)]`, and runs pure SQLite FTS5 search.
  - Settings Drawer: Section 7 with Plain Mode toggle and "Summarize un-enriched dispatches" batch trigger showing remaining count.
- All 99 backend tests (28 suites) and 122 frontend tests (25 suites) pass cleanly (total 221 tests passing).
- Visual validation completed in Paper mode, Night Edition mode, Settings drawer, and Archival Morgue (`ui-step3-plainmode-fullwidth-paper.png`, `ui-step3-plainmode-fullwidth-night.png`, `ui-step3-settings-plainmode.png`, `ui-step3-archive-plainmode.png`).




### Step 4: Safety Net: Backups, Settings Export/Import & Test-Data Guard (Completed)
- Built `backupManager.ts`:
  - `createBackup(trigger, label)`: checkpoints active WAL journal (`wal_checkpoint(TRUNCATE)`) and takes atomic snapshot into `backups/news.backup_{trigger}_{label}_{ts}.sqlite`.
  - `listBackups()`: lists all snapshots sorted newest first with human-readable byte sizes and trigger badges.
  - `pruneBackups()`: enforces retention policy (preserves baseline pre-upgrade snapshots, keeps last 7 daily + last 4 weekly backups; never prunes below 3 snapshots).
  - `restoreBackup(filename)`: validates 16-byte SQLite format 3 header, takes safety `pre-restore` snapshot before overwriting, closes connections, swaps file, clears stale WAL/SHM, verifies SQLite integrity check, and counts restored articles.
  - `initBackupScheduler()`: checks daily at 03:00 local time to trigger automated daily snapshot.
- Automated Pre-Migration Backup Hook in `db.ts`:
  - Before executing any pending migrations, automatically creates a `migration` snapshot.
- Applied Migration 008 (`008_purge_bootstrap_dummy_rows.sql`):
  - Audited production database and purged legacy bootstrap dummy test rows (id 901 and 902).
- Test-Data Guard in `db.ts`:
  - Blocks test executions from connecting to production `news.sqlite`, throwing fatal exception if `process.env.NODE_ENV === 'test'` and target path resolves to production database.
- Settings Export & Import in `settings.ts`:
  - `GET /api/settings/export`: exports sanitized settings with `schema_version: 1` and strict redaction of API keys/secrets.
  - `POST /api/settings/import`: validates schema version, strips sensitive keys, validates values against `SETTINGS_SCHEMA`, applies updates.
- Standalone CLI Script `scripts/db-restore.cjs`:
  - Added `npm run db:restore` command with CLI argument or interactive prompt requiring `"RESTORE"` confirmation.
- Frontend Settings Drawer in `SettingsMenu.tsx`:
  - Added Section 8: "Safety Net & Backups" with Data Portability controls (`Export Settings (JSON)` and `Import Settings` file upload) and Database Snapshots archive list.
  - "Create Backup Now" button triggers immediate snapshot creation.
  - "Restore" button opens high-contrast double-confirmation modal requiring exact word `"RESTORE"` to unlock overwrite.
- All 107 backend tests (29 suites) and 124 frontend tests (26 suites) pass cleanly (total 231 tests passing).
- Visual validation completed with Playwright:
  - `ui-step4-settings-backups-paper.png`
  - `ui-step4-restore-modal-locked.png`
  - `ui-step4-restore-modal-unlocked.png`
  - `ui-step4-settings-backups-night.png`

### Step 5: TV Channel Catalog & Curated Top 5 Outlets Per Nation (Completed)
- Applied Migration 009 (`009_tv_channels_expansion.sql`):
  - Added `slug`, `country_code`, `youtube_live_url`, `youtube_channel_id`, `website`, `is_top5`, `rank`, `status`, `evidence`, and optimized indexes (`idx_tv_channels_slug`, `idx_tv_channels_top5`).
- Curated Configuration (`config/channels-top5.json`):
  - Defined 25 top news outlets for 5 key nations:
    - **India**: NDTV 24x7 (#1), India Today (#2), Aaj Tak (#3), WION (#4), ABP News (#5).
    - **USA**: ABC News Live (#1), NBC News NOW (#2), CBS News 24/7 (#3), PBS NewsHour (#4), Bloomberg Television (#5).
    - **China**: CGTN (#1), CCTV-4 / CCTV News (#2), Xinhua Live (#3), Phoenix InfoNews (#4), Dragon TV (#5).
    - **Japan**: NHK World-Japan (#1), ANN News (TV Asahi) (#2), Nippon TV News24 (#3), TBS News DIG (#4), FNN Live (#5).
    - **Australia**: ABC News Australia (#1), SBS World News (#2), Sky News Australia (#3), 9 News (#4), 7NEWS (#5).
  - Every outlet configured with official YouTube Live embed URL, canonical channel ID, official website, audit date, and journalistic ranking evidence.
  - Every outlet starts with status `"needs my review"` per user directive.
- IPTV-org Catalog Sync & Offline Caching (`backend/src/tv/catalog.ts`):
  - Local cache directory at `backend/data/iptv-cache/` with Public Domain Unlicense attribution (`ATTRIBUTION.md`).
  - Offline fallback to cached playlists when remote upstream is unreachable.
  - Slug normalization (`slugify()`) and deduplication ensuring Top-5 metadata always takes precedence over upstream IPTV duplicates.
- TV Channels API (`backend/src/routes/tv.ts`):
  - `GET /api/tv/channels`: returns channels with favorites -> top5 -> rank -> alive -> alphabetical ordering, supporting filters (`top5_only`, `country`, `status`).
  - `GET /api/tv/top5`: returns curated channels grouped by nation.
  - `POST /api/tv/sync`: administrative trigger for IPTV playlist catalog sync.
- Frontend Broadcaster UI (`frontend/src/components/tv/TVView.tsx` & `TopBar.tsx`):
  - Added dedicated Live TV button `[📺 TV]` in master TopBar header.
  - Added shelf filter tabs: `All`, `★ Top 5`, `India`, `USA`, `China`, `Japan`, `Australia`, `Wildlife`, `Favorites`.
  - Channel list items styled with `TOP 5 · #1` rank badge, `NEEDS REVIEW` audit indicator, and `[●●●●○]` broadsheet health dots.
  - Curated outlet detail banner displaying rank, country, official website link, and full journalistic ranking evidence.
  - Two-finger trackpad and wheel scrolling enabled with `data-lenis-prevent="true"` and `overscroll-contain`.
- Test Suite:
  - Added 12 new comprehensive unit tests in `src/__tests__/unit/tv-catalog.test.ts`.
  - Full test suite passing cleanly: **119 backend tests across 30 suites** + **124 frontend tests across 26 suites** (total **243 tests passing**).
- Visual Validation completed with Playwright:
  - `ui-step5-tv-top5-paper.png` (Top 5 shelf active, ABC News Australia selected, Paper theme)
  - `ui-step5-tv-top5-night.png` (Top 5 shelf active, Night Edition theme)
  - `ui-step5-tv-shelf-india.png` (India shelf active, NDTV 24x7 selected with Curated Outlet banner, Paper theme)

### Step 6: Playback (3 Methods) & YouTube Link Adder (Completed)
- Applied Migration 010 (`010_tv_channel_health.sql`):
  - Created `tv_channel_health` table with `channel_id`, `method` ('hls', 'youtube', 'vlc'), `last_checked_at`, `last_worked_at`, `consecutive_failures`, `failure_reason`, and `latency_ms`.
  - Added indexes `idx_tv_channel_health_channel` and `idx_tv_channel_health_method`.
- HLS Stream Proxy with Strict SSRF Protection (`backend/src/tv/proxy.ts`):
  - `GET /api/tv/proxy?url=<encoded>`:
    - SSRF Guard: blocks private/internal IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `0.0.0.0/8`), IPv6 loopback/link-local/unique-local (`::1`, `fe80::/10`, `fc00::/7`), and internal hostnames (`localhost`, `*.local`, `*.internal`).
    - M3U8 chunk rewriting: parses playlists and rewrites relative and absolute segment URLs and tag URIs (`#EXT-X-MAP`, `#EXT-X-KEY`) to route through `/api/tv/proxy`.
    - Handles binary TS video chunks and sets CORS headers (`Access-Control-Allow-Origin: *`).
- YouTube Link Parsing & Handle Resolution Protocol (`backend/src/tv/youtube.ts`):
  - Ingests video URLs (`watch?v=`, `youtu.be/`, `/live/`), channel URLs (`/channel/UC...`), and `@handle` links.
  - Queries official YouTube oEmbed API (`https://www.youtube.com/oembed?url=...&format=json`) for verified titles, authors, and thumbnails.
  - If `YOUTUBE_API_KEY` is present in backend environment: queries YouTube Data API v3 (`channels.list?forHandle=...`) for canonical Channel ID (cost: 1 quota unit).
  - Without API key: returns verified oEmbed card and helpful guide prompting the user to locate the `UC...` ID in YouTube page source. Zero scraping.
  - Custom channel creation: `createCustomChannel()` inserts verified custom channels into SQLite database.
- Broadcaster Player & Custom Channel UI (`TVView.tsx` & `AddYouTubeChannelModal.tsx`):
  - Multi-method playback: switches seamlessly between native HLS proxy and official YouTube iframe embed (`www.youtube-nocookie.com`).
  - Added playback method switcher pills (`[HLS Proxy]`, `[YouTube Live]`) on the monitor controls bar.
  - Added 1-click "Copy Stream URL" button (`#btn-copy-stream-url`) with toast feedback.
  - Added `[+ Add YouTube]` button in directory header.
  - Modal (`#modal-add-youtube-stream`) provides live oEmbed preview, channel ID guide for handles, country/category tagging, and instant save to broadcast wire.
- Test Suite:
  - Added 13 new unit tests in `backend/src/__tests__/unit/tv-playback.test.ts`.
  - Added 1 new unit test in `frontend/src/__tests__/unit/tv-broadsheet.test.ts`.
  - Full test suite passing cleanly: **132 backend tests across 31 suites** + **125 frontend tests across 26 suites** (total **257 tests passing**).
- Visual Validation completed with Playwright:
  - `ui-step6-tv-youtube-player-paper.png` (YouTube Live embed active, playback method switcher, stream URL copied toast, Paper theme)
  - `ui-step6-tv-youtube-player-night.png` (YouTube Live embed active, Night Edition theme)
  - `ui-step6-add-youtube-modal.png` (Add YouTube Broadcast modal with verified preview card and Channel ID instruction guide)

### Step 7: TV Screen UI & Subpages (Completed)
- Pre-work SQLite snapshot created at `backups/news.backup_before_cat7_2026-11-02T06-24-18-301Z.sqlite` (12.7 MB).
- Backend Subpages Engine (`backend/src/routes/tv.ts`):
  - `GET /api/tv/subpages/counts`: returns dynamic channel counts for `{ live, faulty, stopped }`.
  - `GET /api/tv/channels?subpage=live|faulty|stopped`:
    - `live`: strictly lists channels with verified working playback (`is_alive = 1` or `youtube_live_url IS NOT NULL`). Dead streams never appear here.
    - `faulty`: lists impaired feeds (`is_alive = 0` and unresponsiveness `< 7` days).
    - `stopped`: lists decommissioned or broken feeds unresponsive for `>= 7` days.
  - `PUT /api/tv/channels/:id`: allows updating channel stream/embed URL and metadata.
  - `DELETE /api/tv/channels/:id`: permanently removes decommissioned stopped streams.
- Frontend Broadcaster Desk (`frontend/src/components/tv/TVView.tsx`):
  - Subpage tabs in monitor header:
    - `LIVE` (default) with live channel count badge.
    - `FAULTY FEEDS` with count badge. Shows failed stream cards with manual "Test & Retry" probe button (`#btn-retry-channel-${id}`).
    - `STOPPED LINKS` with count badge. Shows decommissioned stream cards with "Edit URL" (`#btn-edit-channel-${id}`) and "Remove Permanently" (`#btn-delete-channel-${id}`) actions.
  - Textual Health Badges per PRD A §7.2:
    - Replaced generic round dots with high-contrast textual badges: `LIVE` (emerald), `SLOW` (amber), and `OFFLINE` (red).
  - Editorial Player Controls:
    - Volume slider (`#input-tv-volume`) with live percentage readout (0% to 100%).
    - Picture-in-Picture button (`#btn-tv-pip`) invoking `requestPictureInPicture()`.
    - Fullscreen toggle via button or `f` keyboard shortcut.
    - Keyboard channel switching: `ArrowUp` / `ArrowDown` to navigate channels.
  - Inline "Edit Channel Link" Modal (`#modal-edit-channel-url`):
    - Allows updating broadcast name and stream/embed URL without leaving the desk.
- Test Suite:
  - Added 3 new unit tests in `backend/src/__tests__/unit/tv-playback.test.ts` covering subpage filtering, subpage counts, channel updates, and channel deletion.
  - Full test suite passing cleanly: **135 backend tests across 31 suites** + **125 frontend tests across 26 suites** (total **260 tests passing**).
  - Strict TypeScript build passes with 0 errors.
- Visual Validation completed with Playwright:
  - `ui-step7-tv-subpages-live-paper.png` (Live subpage active, textual health badges, volume slider at 85%, PiP button, Paper theme)
  - `ui-step7-tv-subpages-live-night.png` (Live subpage active, Night Edition theme)
  - `ui-step7-tv-subpage-faulty.png` (Faulty feeds subpage with Retry signal probe actions)
  - `ui-step7-tv-edit-channel-modal.png` (Edit Channel Link modal for stopped links)

### Step 8: Live Feed Counter & Telemetry (Completed)
- Pre-work SQLite snapshot created at `backups/news.backup_before_cat8_2026-11-02T07-08-44-565Z.sqlite` (12.7 MB).
- Applied Migration 011 (`011_ingest_telemetry.sql`):
  - Created `ingest_hourly` table: `bucket_utc` (PK, ISO string), `count`, `catchup_count`, `duplicates_skipped`.
  - Created `ingest_daily` table: `date_utc` (PK), `count`, `catchup_count`, `duplicates_skipped` (retained for 13+ months to track historical desk throughput).
  - Created `lifetime_counter` table: `id` (PK CHECK id=1), `tracking_since`, `total_ingested`, `total_catchup`, `total_duplicates_skipped`, `last_updated_at`.
  - Normalized existing `articles.ingested_at` to uniform 24-character UTC ISO-8601 with trailing 'Z' and milliseconds.
  - Backfilled existing data from `articles` table into `ingest_hourly`, `ingest_daily`, and `lifetime_counter`.
- Telemetry Engine (`backend/src/services/feedCounter.ts`):
  - `recordFeedIngestion()`: atomic transaction on every article batch updating hourly, daily, and lifetime buckets while recording duplicate skip counts. Emits real-time SSE event `feed_counter_update`.
  - `getFeedCounterMetrics()`:
    - Calculates rolling 24-hour total strictly from UTC ISO-8601 timestamps (never `published_at`), including catch-up articles tagged `is_catchup = 1`.
    - Generates 24 hourly sparkline points (`T-23` to `T-0`) cross-referencing `app_sessions` to accurately flag offline/laptop-off hours (`is_app_off = true`).
    - Guarantees retention immunity: 30-day article retention cleanup leaves `ingest_hourly`, `ingest_daily`, and `lifetime_counter` intact.
    - Aggregates 7-day, 30-day, and lifetime totals (`Tracking since {date}`).
    - Calculates lifetime desk uptime and downtime durations from `app_sessions`.
  - Wired into `backend/src/pipeline/dedup.ts` and exposed via `GET /api/feed/counter`.
- Frontend Telemetry Deck (`frontend/src/components/telemetry/FeedCounterPopover.tsx` & `TopBar.tsx`):
  - Added Live Feed Counter button (`#btn-topbar-feed-counter`) in master TopBar displaying rolling 24h count (`((o)) 1,343 24H`) with live green indicator.
  - Built broadsheet `<FeedCounterPopover>` with:
    - Large rolling 24-hour dispatch counter (`#feed-counter-rolling-24h`).
    - Catch-up intake badge (`+# catch-up`) and duplicates filtered count.
    - 24-hour hourly arrival velocity sparkline integrating `<HatchedSparkline>` with diagonal hatched stripes for desk downtime hours.
    - Historical volume grid: 7-Day Total, 30-Day Volume (with `🛡 Immune` badge), and Lifetime Volume (`Since {date}`).
    - Desk Telemetry: Total Time Running and Total Time Away.
  - Connected live SSE listener in `useSSE.ts` to re-fetch counter on ingestion without page reload.
- Test Suite:
  - Added 6 new unit tests in `backend/src/__tests__/unit/feed-counter.test.ts`.
  - Added 4 new unit tests in `frontend/src/__tests__/unit/feed-counter-broadsheet.test.tsx`.
  - Full test suite passing cleanly: **141 backend tests across 32 suites** + **129 frontend tests across 27 suites** (total **270 tests passing**).
  - Strict TypeScript build passes with 0 errors.
- Visual Validation completed with Playwright:
  - `ui-step8-feed-counter-button.png` (TopBar live feed counter button active with 1,343 dispatches in Paper mode)
  - `ui-step8-feed-counter-popover-paper.png` (Feed Counter Popover with rolling 24h count, sparkline with downtime hatches, 7d/30d/lifetime stats, and uptime/downtime totals, Paper mode)
  - `ui-step8-feed-counter-popover-night.png` (Feed Counter Popover in Night Edition mode)

### Step 9: Confirmation Labels & Multi-Source Story Corroboration (Completed)
- Pre-work SQLite snapshot created at `backups/news.backup_before_cat9_2026-11-02T08-07-53-226Z.sqlite` (12.7 MB).
- Multi-Source Corroboration Engine (`backend/src/utils/confirmation.ts` & `frontend/src/utils/confirmation.ts`):
  - Deterministic rules operating strictly without AI dependency (100% operational in Plain Mode):
    - **1 outlet**: `"Single source"` (neutral ink badge: `border-paper-border bg-paper-alt text-ink-secondary`).
    - **2 outlets**: `"2 outlets"` (slate badge: `border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300`).
    - **3+ outlets in 1 nation**: `"N outlets"` (slate badge).
    - **3+ outlets across 2+ nations**: `"Confirmed: N outlets in M countries"` (forest green broadsheet stamp: `border-emerald-700/50 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300`).
  - Breaking Alert Upgrades:
    - Single-outlet / uncorroborated breaking news labeled `"Unconfirmed Breaking"` in muted ochre (`border-amber-600/50 bg-amber-500/10 text-amber-800 dark:text-amber-300`).
    - Automatically upgrades to bold crimson `"Confirmed Breaking"` (`border-accent bg-accent/10 text-accent font-extrabold`) once corroborated by 3+ outlets across 2+ nations.
- Backend API Integration:
  - `backend/src/routes/articles.ts`: joined `clusters c ON a.cluster_id = c.id` in standard `SELECT`, FTS `SELECT`, and `GET /:id` to select `c.outlet_count`, `c.country_count`, `c.is_breaking`, attaching `confirmation: computeConfirmationStatus(...)` to all article payloads.
  - `backend/src/routes/clusters.ts`: added `confirmation` status object to both `GET /api/clusters` list and `GET /api/clusters/:id`.
  - `backend/src/routes/alerts.ts` & `backend/src/alerts/detector.ts`: attached `confirmation` status to `GET /api/alerts` items and real-time SSE `alert` payloads.
- Frontend Broadsheet Component (`frontend/src/components/common/ConfirmationBadge.tsx`):
  - Reusable `<ConfirmationBadge>` adhering strictly to broadsheet physical stamp aesthetics (`rounded-xs`, `font-mono` / `font-ui`, uppercase tracking, zero generic colored dots).
  - Wired into all 5 required surfaces:
    1. **Article Cards** (`CardStrip.tsx`): bottom strip cards show corroboration badge alongside category stamps.
    2. **Reader Header** (`ArticlePanel.tsx`): kicker byline metadata row shows corroboration stamp and Breaking tag.
    3. **Category Rail** (`CategoryRailView.tsx`): grid cards show corroboration badge in top line next to category badge.
    4. **Alert Banners & Telegraph Alerts Center** (`AlertBanner.tsx`, `AlertsCenter.tsx`): breaking alerts show `"Unconfirmed Breaking"` (amber) vs `"Confirmed Breaking"` (crimson) alongside corroboration stamps.
    5. **Compare Coverage Desk** (`CompareCoverage.tsx`): modal header displays cluster corroboration badge.
- Test Suite:
  - Added 10 new unit tests in `backend/src/__tests__/unit/confirmation-labels.test.ts`.
  - Added 12 new unit tests in `frontend/src/__tests__/unit/confirmation-badge.test.tsx`.
  - Full test suite passing cleanly: **151 backend tests across 33 suites** + **141 frontend tests across 28 suites** (total **292 tests passing**, 0 failed).
  - Strict TypeScript build passes with 0 errors.
- Visual Validation completed with Playwright:
  - `ui-step9-confirmation-cards-paper.png` (Paper edition with confirmed breaking story, emerald stamp, and card strip badges)
  - `ui-step9-confirmation-reader-night.png` (Night edition with bold crimson Confirmed Breaking tag and emerald stamp)
  - `ui-step9-confirmation-category-rail.png` (Category Rail grid displaying Single Source, 2 Outlets, and Unconfirmed Breaking badges)
  - `ui-step9-confirmation-alerts.png` (Telegraph Alerts Center showing Unconfirmed Breaking ochre badges vs Confirmed Breaking crimson badges)
  - `ui-step9-confirmation-compare-desk.png` (Compare Coverage desk with Confirmed Breaking & Confirmed: 4 outlets in 2 countries)

### Step 10: Two-Pass AI Processing & Quota Telemetry (Completed)
- Pre-work SQLite snapshot created at `backups/news.backup_before_cat10_2026-11-02T12-25-47-375Z.sqlite` (14.54 MB).
- Applied Migration 012 (`012_two_pass_ai.sql`):
  - Added indexed `pass1_completed_at TEXT` and `pass2_completed_at TEXT` to `articles` table.
  - Created persistent `two_pass_stats` table tracking `pass1_count`, `pass2_count`, `pass2_skipped_count`, and `estimated_tokens_saved`.
  - Added configurable settings `two_pass_ai_enabled` (default `'1'`) and `pass2_threshold` (default `'75'`).
  - Safely backfilled all existing 4,385 articles and seeded initial stats.
- Pass 1 Lightweight Batched Scoring Engine:
  - Built minimal-token prompt (`SYSTEM_PASS1` and `buildPass1Prompt` in `backend/src/ai/prompts.ts`) consuming ~50-60 tokens per article with truncated text input (~500 chars).
  - Triage prompt scores urgency/breaking score (0-100) and primary category across batches of up to 20 articles.
  - Validated by strict Zod schema `Pass1BatchSchema` in `backend/src/ai/schema.ts`.
- Pass 2 In-Depth Enrichment Engine:
  - Qualifying criteria: articles with `breaking_score >= pass2_threshold` (default 75, top 30% of stories) automatically qualify for full enrichment.
  - On-demand dispatch: stories deferred by Pass 1 can be summarized on demand via `POST /api/articles/:id/enrich-pass2`.
  - Generates comprehensive 3-5 sentence executive briefing, translated body, verbatim anchor phrases, and entity tags.
  - Emits real-time SSE event `article_enriched_pass2` for instant UI update without full reload.
- Quota Telemetry & Economics:
  - Real-time token economics tracking: saves ~740 tokens per Pass-1-only story compared to the monolithic single-pass enrichment model (~800 vs ~60 tokens).
  - Maintained in `two_pass_stats` table and exposed via `GET /api/settings/two-pass-telemetry`.
  - On-demand Pass 2 upgrades decrement `pass2_skipped_count` and adjust `estimated_tokens_saved`.
- Broadsheet UI Integration:
  - Main Article Reader (`ArticlePanel.tsx`): displays physical red-ink boxed banner `✦ TRIAGED VIA PASS 1` with urgency score and `[✦ SUMMARIZE STORY]` button when Pass 2 synthesis was deferred.
  - Executive Briefing Desk (`SummaryPanel.tsx`): displays dotted broadsheet card with `✦ QUICK-SCORED DISPATCH (PASS 1)` red ink stamp, threshold indicator, and `[✦ SUMMARIZE STORY (PASS 2)]` button.
  - Settings Drawer (`SettingsMenu.tsx`): Section 9 "Two-Pass AI Ingestion & Quota Telemetry" featuring master toggle, auto-enrichment threshold slider (50% to 100%), and live 4-card telemetry grid (Pass 1 Triaged, Pass 2 Enriched, Stories Deferred, Tokens Saved) with live refresh button.
- Test Suite:
  - Added 10 new unit tests in `backend/src/__tests__/unit/two-pass-ai.test.ts`.
  - Added 6 new unit tests in `frontend/src/__tests__/unit/two-pass-ui.test.tsx`.
  - Full test suite passing cleanly: **161 backend tests across 34 suites** + **147 frontend tests across 29 suites** (total **308 tests passing**, 0 failed).
  - Strict TypeScript build passes with 0 errors across backend and frontend workspaces.
- Visual Validation completed with Playwright:
  - `ui-step10-pass1-banner-paper.png` (Pass 1 triaged banner in reader and deferred broadsheet card in summary column, Paper mode)
  - `ui-step10-pass2-summarized-night.png` (Instant Pass 2 enrichment with executive takeaways and verbatim quote highlighting, Night Edition mode)
  - `ui-step10-two-pass-settings-telemetry.png` (Settings Drawer Section 9 showing master toggle, 75% threshold slider, and live Quota Telemetry grid with 370,000 tokens saved)





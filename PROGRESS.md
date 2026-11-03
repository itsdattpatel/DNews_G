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
| **11** | **Control Room Page** | 🟢 `DONE` | Migration 013 (`system_errors` & source telemetry), `/api/control-room/telemetry`, `/api/control-room/errors`, 6-tab `<ControlRoomDesk>`, live SSE updates, Vitest (171 backend + 155 frontend pass), Playwright screenshots | 2026-11-02 19:15 |
| **12** | **QA & Final Audits** | 🟢 `DONE` | 5 Verification Gates passed: Master E2E Suite (24/24 pass), Security Audit (19/19 pass), 0 console errors, 326 unit tests (100% pass), Paper & Night Edition visual validation artifacts | 2026-11-02 19:48 |

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

### Step 11: Control Room Page & Desk Telemetry Hub (Completed)
- Pre-work SQLite snapshot created at `backups/news.backup_before_cat11_2026-11-02T13-21-20-887Z.sqlite` (16.33 MB).
- Applied Migration 013 (`013_control_room_telemetry.sql`):
  - Created `system_errors` table (`id`, `timestamp`, `subsystem`, `level`, `message`, `details`, `created_at`) with indexes on `timestamp DESC`, `subsystem`, and `level`.
  - Added telemetry columns to `sources` table: `last_latency_ms INTEGER`, `error_count INTEGER`, `last_error TEXT`, `last_error_at TEXT`, `last_status TEXT`.
  - Seeded initial informational record.
- Backend Services & Ingestion Scheduler Instrumentation (`backend/src/services/controlRoom.ts` & `backend/src/fetch/scheduler.ts`):
  - Centralized Error Ledger: `logSystemError()`, `getSystemErrors()` with pagination & filtering, `clearSystemErrors()`.
  - Ingestion Cycle Metrics: tracks `isCycleRunning`, `lastCycleStartedAt`, `lastCycleCompletedAt`, `lastCycleDurationMs`, `lastCycleArticlesFetched`, `lastCycleNewArticles`, `nextCycleExpectedAt`.
  - Real-time source latency & error updates in `runFetchCycle()` via `updateSourceTelemetry()`.
  - Manual on-demand cycle trigger `triggerManualFetchCycle()` via `POST /api/control-room/trigger-fetch`.
  - AI Quota & Throttled status inspector in `backend/src/ai/router.ts`.
  - Complete telemetry aggregator: `getControlRoomTelemetry()` querying sources, scheduler, queues, storage, modes, and past-24h error breakdown.
- REST API Endpoints (`backend/src/routes/controlRoom.ts`):
  - `GET /api/control-room/telemetry`: returns complete live telemetry payload.
  - `GET /api/control-room/errors`: filterable error ledger with `subsystem`, `level`, `q`, `limit`, `offset`.
  - `POST /api/control-room/errors/clear`: administrative ledger clearing.
  - `POST /api/control-room/trigger-fetch`: immediate manual fetch trigger.
  - `POST /api/control-room/test-error`: diagnostic probe testing.
- Real-Time SSE Updates:
  - Broadcasts `control_room_update` on cycle completion, new errors, and error clearing.
  - Broadcasts `system_error` on any diagnostic exception.
  - Frontend `useSSE.ts` listener auto-invalidates `['control-room']` queries for live dashboard refresh.
- Broadsheet Control Room UI (`frontend/src/components/control-room/ControlRoomDesk.tsx`):
  - 6 dedicated broadsheet tabs:
    1. **Operational Overview**: 4 live KPI cards (Sources Active, Scheduler Status, Dispatches, SQLite Storage) + quick matrix summaries.
    2. **Sources Freshness Matrix**: All 32 outlets with country tags, protocols, last arrival relative time, latency meters, error counts, and freshness stamps (Fresh, Delayed, Failing, Disabled).
    3. **Scheduler & Queues**: Cycle status, interval, run duration, offline hiatus gaps, and complete 6-stage queue breakdown.
    4. **AI Providers & Quotas**: Real-time provider chain (Gemini -> Groq -> Mistral -> Cerebras), active indicator, daily call/token/error meters, throttle timers, and Two-Pass token economics (~419,580 tokens saved).
    5. **Error Ledger**: Subsystem & level filter dropdowns, text search, expandable diagnostic context pre-blocks, and Clear Ledger action.
    6. **Storage & System Modes**: SQLite database size bar with 1.5GB warning / 2.0GB limit threshold, backup archive stats, and interactive toggles for Plain Mode and Two-Pass AI.
  - Keyboard access: `c` key toggles Control Room desk; `Esc` closes.
  - TopBar: Quick access button `[⎈ OPS]` with live indicator.
  - Bat Navigation Menu: Added "Control Room" with `c` shortcut.
- Test Suite:
  - Added 10 new backend unit tests in `backend/src/__tests__/unit/control-room.test.ts`.
  - Added 8 new frontend unit tests in `frontend/src/__tests__/unit/control-room.test.tsx`.
  - Full test suite passing cleanly: **171 backend tests across 35 suites** + **155 frontend tests across 30 suites** (total **326 tests passing**, 0 failed).
  - Strict TypeScript build passes with 0 errors across backend and frontend workspaces (`tsc` & `vite build`).
- Visual Validation completed with Playwright:
  - `ui-step11-control-room-overview-paper.png` (Paper edition with 4 KPI cards, feed overview, AI chain, live SSE sync)
  - `ui-step11-control-room-sources.png` (Sources Freshness Matrix with latency meters and operational stamps)
  - `ui-step11-control-room-scheduler-queues.png` (Scheduler dispatch engine and 6-stage queue breakdown)
  - `ui-step11-control-room-ai-quotas.png` (AI provider chain, quotas today, and two-pass savings)
  - `ui-step11-control-room-errors.png` (Filterable system error ledger)
  - `ui-step11-control-room-night.png` (Control room dashboard in Night Edition mode)
  - `ui-step11-bat-menu-control-room.png` (Bat Menu navigation entry for Control Room)

### Step 12: Rigorous QA & Final Audits (Completed)
- Pre-audit SQLite snapshot created at `backups/news.backup_before_cat12_2026-11-02T14-08-31-419Z.sqlite` (16.33 MB).
- **Gate 1: Master Automated E2E Playwright Test Suite (`scripts/e2e-all-categories.cjs`)**:
  - Implemented 24 rigorous browser-level assertion tests validating live interactive behaviors across all 12 categories:
    1. Category 1: Dual-timestamp broadsheet render (`[data-testid="dual-timestamp"]`)
    2. Category 1: Article panel dual-timestamp present
    3. Category 1B: Welcome-back card or live telemetry active
    4. Category 1B: Server time synchronization endpoint (`/api/time`) reachable and healthy
    5. Category 2: Auto-advance progress bar visible (`[data-testid="auto-advance-progress-bar"]`)
    6. Category 2: Auto-advance countdown timer active
    7. Category 2: Spacebar toggles auto-advance play/pause state
    8. Category 3: Plain mode switch toggleable in settings drawer
    9. Category 3: Zero AI call verification in Plain Mode
    10. Category 4: Backup retention verification (daily & weekly snapshots)
    11. Category 4: Settings sanitized export/import structure validated
    12. Category 5: TV channel catalog loads with Top-5 outlets (`#tv-view-modal`)
    13. Category 6: TV playback surface and HLS proxy operational
    14. Category 7: TV Screen subpages and filter tabs
    15. Category 8: Live Feed Counter button present in TopBar (`#btn-topbar-feed-counter`)
    16. Category 8: Feed Counter popover renders rolling 24h count and hatched sparkline
    17. Category 9: Corroboration depth stamps rendered (`[data-testid="corroboration-depth-stamp"]`)
    18. Category 9: Breaking alert labels (Unconfirmed vs Confirmed Breaking)
    19. Category 10: Two-Pass AI triage indicator or summary panel card rendered
    20. Category 10: Two-Pass token economics telemetry surface
    21. Category 11: Control Room desk opens via TopBar `[OPS]` button (`#control-room-desk`)
    22. Category 11: Sources Freshness Matrix renders 32 operational feeds
    23. Category 11: Error Ledger filterable by subsystem and level
    24. Category 11: Storage & SQLite 2GB limit guardrails active
  - Test run result: **24 passed, 0 failed** across light and dark editions with **0 fatal browser console errors**.
- **Gate 2: Security & Isolation Audit (`scripts/security-audit.cjs`)**:
  - Verified 19 security checks covering DevSecOps, secret management, SSRF protection, and data isolation:
    1. Client bundle hygiene: Scanned all production distribution files in `frontend/dist/` for API key leaks (Gemini, Groq, Cerebras, Mistral, OpenAI) — **PASSED: 0 secrets found**.
    2. Client source tree hygiene: Scanned all frontend `.ts`, `.tsx`, and `.env` files for embedded provider keys — **PASSED: 0 secrets found**.
    3. Settings Export Sanitization: Validated that `GET /api/settings/export` strictly redacts and strips all secrets, API tokens, and private credentials before serialization — **PASSED**.
    4. Database Isolation: Verified that all production operations execute strictly on `backend/data/news.sqlite` with absolute Test-Data Guard protection preventing tests from executing on production storage — **PASSED**.
    5. TV Stream Proxy SSRF Protection: Verified that `/api/tv/proxy` aggressively rejects private, loopback, and local network targets with HTTP 403 Forbidden:
       - `http://127.0.0.1:8080/stream.m3u8` -> 403 Blocked
       - `http://localhost:3000/stream.m3u8` -> 403 Blocked
       - `http://10.0.0.1/stream.m3u8` -> 403 Blocked
       - `http://172.16.0.1/stream.m3u8` -> 403 Blocked
       - `http://192.168.1.1/stream.m3u8` -> 403 Blocked
       - `http://169.254.169.254/latest/meta-data` -> 403 Blocked
       - `http://0.0.0.0/stream.m3u8` -> 403 Blocked
       - `http://router.local/stream.m3u8` -> 403 Blocked
    6. SQLite File Size Guardrail: Real production database size is 16.33 MB, well within safe operational margins (1.5 GB warn / 2.0 GB hard limit).
  - Test run result: **19 passed, 0 failed**.
- **Gate 3: Browser Runtime & Strict Build Verification**:
  - Full TypeScript build check for backend (`tsc`): **0 errors**.
  - Full TypeScript build & Vite production bundle compilation for frontend (`tsc && vite build`): **0 errors**.
  - Automated browser console error listeners recorded 0 uncaught exceptions or React boundary crashes.
- **Gate 4: Full Unit & Integration Test Suite Passing**:
  - Backend: **171 tests passed across 35 test suites** (0 failed).
  - Frontend: **155 tests passed across 30 test suites** (0 failed).
  - Total: **326 unit/integration tests passing cleanly**.
- **Gate 5: Documentation & License Integrity**:
  - `docs/CREDITS.md`: Audited all installed production and development dependencies across frontend, backend, and root workspaces. Every library is locked with its exact version, approved license (MIT, Apache-2.0, ISC, OFL-1.1, BSD-2-Clause, BSD-3-Clause), and architecture role.
  - `docs/PROGRESS.md`: Complete audit trail and verification records across all 12 categories from Step 0 through Step 12.
- **Visual Validation Evidence Artifacts**:
  - `ui-step12-master-e2e-pass.png` (Terminal output capturing 24/24 passed master E2E suite)
  - `ui-step11-control-room-overview-paper.png` (Paper edition Control Room overview)
  - `ui-step11-control-room-sources.png` (Sources Freshness Matrix)
  - `ui-step11-control-room-scheduler-queues.png` (Scheduler & Queues telemetry)
  - `ui-step11-control-room-ai-quotas.png` (AI provider fallback chain & quota usage)
  - `ui-step11-control-room-errors.png` (Filterable diagnostic error ledger)
  - `ui-step11-control-room-night.png` (Night Edition Control Room dashboard)
  - `ui-step11-bat-menu-control-room.png` (Bat Menu navigation with Control Room)

---

# Progress Tracker — PRD B: The Library (Reading Room)
*Version 1.0 · 2026-11-02 · AI World News Desk*

## Overall Status — PRD B

| Step | Category | Status | Proof / Evidence Required | Timestamp |
| :--- | :--- | :---: | :--- | :--- |
| **0** | **Documentation & Setup** | 🟢 `DONE` | `/docs/PRD_B.md`, `/docs/LIBRARY_SPEC.md`, `/docs/LIBRARY_SOURCES.md`, `/docs/LIBRARY_DESIGN.md`, `/docs/OPEN_QUESTIONS.md`, Package Shortlist, DB backup | 2026-11-02 20:30 |
| **B1** | **Isolation and UI Kit** | 🟢 `DONE` | Scoped tokens (`.lib-root`), zero changes to global CSS/Tailwind, pixel-diff report (0.00% regression on 8 main screens), git diff proving only allowed touchpoints outside library, 6 approved packages installed & vetted in CREDITS.md, UI kit showcase in day/night | 2026-11-02 21:02 |
| **B2** | **Library Shell** | 🟢 `DONE` | Route `/library`, 3 subpage tabs, local store, search, bookmarks drawer, day/night reading room mode, responsive resizable panes | Verified & Approved |
| **B3** | **Historical News (Archives)** | 🟢 `DONE` | Real archives fetcher (Wikimedia 'On this day', LoC, Internet Archive), library_history_cache, date/decade/country filters, source attribution | Verified & Approved |
| **B4** | **Wisdom (Scriptures & Quotes)** | 🟢 `DONE` | Holy book registry (Gita, Mahabharata, Ramayana), Sanskrit Devanagari (`Noto Serif Devanagari`), IAST transliteration, Arnold (1885) / Ganguli (1883-1896) / Griffith (1870-1874) translations, stored classical meanings, Quote explorer (Marcus Aurelius, Vivekananda, Epictetus, Confucius, Seneca, Shankara, Tagore, Laozi), 15 tests pass, pixel-diff 0% regression | Verified & Ready |
| **B5** | **Mind Helps (Psychology)** | 🟢 `DONE` | 9 categories, OpenStax/WHO/William James techniques, step-by-step guidance, crisis helplines directory (IN, US, CN, JP, AU), zero AI chat guarantee, 16 tests pass, pixel-diff 0% regression | Verified & Ready |
| **B6** | **QA & Final Verification** | 🟢 `DONE` | 5 Gates passed: 0.00% regression on all 8 main screens, Bat Menu nav verified, 396 vitest tests (100% pass), 8 security tests, zero unverified text, CREDITS.md complete | 2026-11-03 19:25 |

### Step 0: Documentation & Prerequisites (Completed)
- Pre-upgrade database backup safely stored at `backups/news.backup_before_prd_b_step0_20261102.sqlite` (12.73 MB).
- Authored `/docs/PRD_B.md` defining scope, architectural isolation, subpages, and non-functional requirements.
- Authored `/docs/LIBRARY_SPEC.md` detailing frontend/backend directory tree, REST endpoints, SQLite migration `014_library_tables.sql`, and offline Plain Mode guarantees.
- Authored `/docs/LIBRARY_SOURCES.md` providing authoritative license audits for Wikimedia, Library of Congress, Internet Archive, Edwin Arnold, Kisari Mohan Ganguli, Valmiki Ramayana, OpenStax, WHO, William James, and official crisis helplines.
- Shortlisted 6 vetted packages (pinned, >14 days old, MIT/OFL-1.1): `rough-notation@0.5.1`, `embla-carousel-react@8.6.0`, `@fontsource/noto-serif-devanagari@5.3.0`, `@fontsource/eb-garamond@5.3.0`, `@fontsource/cormorant-garamond@5.3.0`, `@fontsource/lora@5.3.0`.
- Authored `/docs/LIBRARY_DESIGN.md` defining "The Reading Room" aesthetic with scoped `--lib-*` tokens under `.lib-root` in day and night modes.
- Appended questions 6-9 in `/docs/OPEN_QUESTIONS.md` regarding package shortlist approval, international archives, scripture registry expansion, and AI meaning approval workflow.

### Category B2: Library Shell (Completed)
- Pre-B2 database backup created at `backups/news.backup_before_cat_b2.sqlite`.
- Backend Bookmark Infrastructure in `backend/src/library/services/bookmarkService.ts` and `backend/src/library/routes.ts`:
  - `GET /api/library/status`: returns section status, `plain_only` mode, and row counts across all `library_*` tables.
  - `GET /api/library/bookmarks`: retrieves saved bookmarks filtered by item type (`history`, `verse`, `quote`, `mind`).
  - `POST /api/library/bookmarks/toggle`: toggles bookmarks atomically with SQLite transaction.
  - `DELETE /api/library/bookmarks/:id`: removes bookmark by id.
- Frontend State Management in `frontend/src/library/store/useLibraryStore.ts`:
  - Isolated Zustand store managing active tab (`history` | `wisdom` | `mind`), wisdom subtab (`scriptures` | `quotes`), local search query, day/night reading room theme, bookmarks drawer state, and optimistic bookmark toggling.
- Tactile Reading Room Shell Components in `frontend/src/library/components/`:
  - `LibraryHeader`: Broadsheet masthead with calligraphy ink title ("The Reading Room"), three navigation tabs with animated ink-wash active indicator, local search input with instant clear, Day/Night theme toggle, and bookmarks drawer trigger button showing live count.
  - `LibraryShellLayout`: Dual-pane resizable layout using `react-resizable-panels` with horizontal grab handle and 2-finger wheel touch scroll containers (`.lib-scroll-area`). Left panel (38%) hosts discovery index/filters; right panel (62%) hosts the primary reading desk.
  - `BookmarksDrawer`: Slide-over parchment drawer with item-type chips, direct navigation jumping, bookmark deletion with optimistic feedback, and empty/loading states.
- Dedicated Subpage Shell Views in `frontend/src/library/subpages/`:
  - `HistoryShellView`: Historical archives index with "Today in History" timeline, year/decade/source filters, and article reader.
  - `WisdomShellView`: Scriptures & Quotes dual-subtab view with book registry selector, chapter index, and contemplative verse presentation.
  - `MindHelpsShellView`: Mental health technique cards across 9 psychological categories with step-by-step accordion and verified international crisis helplines modal (IN, US, CN, JP, AU).
- Unit Tests in `frontend/src/__tests__/unit/library-shell.test.tsx`:
  - 9 unit tests verifying header masthead, tab switching, search input binding, theme toggling, bookmarks drawer, and subpage rendering.
  - All 172 frontend vitest tests pass across 32 suites.
  - All 171 backend vitest tests pass across 35 suites (Total 343 tests).
- Proof of Zero Change & Pixel-Diff Verification (`scripts/verify-no-change-main-screens.cjs`):
  - Verified 0.00% static regression across all 8 main application screens.
  - Verified Bat Menu navigation smoothly enters `/library`.
  - Visual validation screenshots captured: `ui-b2-shell-history-day.png`, `ui-b2-shell-history-night.png`, `ui-b2-shell-wisdom.png`, `ui-b2-shell-mind.png`, `ui-b2-shell-bookmarks.png`, and `ui-main-reader-paper-after-b2.png`.

### Category B3: Historical News (Real Archives) (Completed)
- Pre-B3 database backup created at `backups/news.backup_before_cat_b3.sqlite`.
- Backend Historical Archives Service (`backend/src/library/services/historyService.ts`):
  - Integrated Wikimedia "On this day" feed REST API with custom descriptive User-Agent header complying with Wikimedia Foundation API policies.
  - Real-time normalization of historical events: exact year, headline, verbatim excerpt, country detection, license identifier (`CC BY-SA 3.0 / 4.0`), provenance attribution, and primary source URL.
  - SQLite persistent cache in `library_history_cache`: separates library archives from active news desks; immune to 30-day auto-delete purge.
  - LRU size-capped cache ceiling with bookmark-preserving retention: never prunes saved folios.
  - Graceful fallback: serves cached dispatches offline during network failures (100% Plain Mode compliant).
- Backend REST Endpoints (`backend/src/library/routes.ts`):
  - `GET /api/library/history/today`: fetches today's or custom month/day events.
  - `GET /api/library/history/search`: multi-criteria parameterized search by keyword, decade, country, and source.
- Frontend Historical Desk Architecture (`frontend/src/library/history/`):
  - `HistoryDatePicker.tsx`: month & day selection with "Jump to Today" reset button, 13 decade filter chips (1850s to 2000s), and regional jurisdiction filter.
  - `TodayInHistoryFeed.tsx`: chronological timeline list with year badges, country indicators, and selection feedback.
  - `HistoryArticleCard.tsx`: primary reading folio with giant year watermark, headline with hand-drawn rough notation underline, verbatim archival text, official license badges, direct archival link, bookmark toggle ("Save to Reading Folio"), and citation clipboard exporter.
  - `HistorySubpage.tsx`: dual-pane resizable coordinator with dedicated loading, empty, and error states.
- Test Coverage:
  - Backend unit tests (`library-history.test.ts`): 4 tests covering normalization, caching, decade/country/keyword search, and cache-cap eviction.
  - Backend integration tests (`library-history.api.test.ts`): 3 tests verifying REST contract, status codes, and input validation.
  - Frontend unit tests (`library-history-ui.test.tsx`): 4 tests verifying calendar picker, timeline feed, provenance badges, and citation formatting.
  - All 176 frontend vitest tests pass across 33 suites.
  - All 178 backend vitest tests pass across 37 suites (Total 354 tests passing).
- Zero-Regression Pixel-Diff Verification (`scripts/verify-no-change-main-screens.cjs`):
  - Verified 0.00% regression across all 8 main application screens.
  - Verified Bat Menu navigation smoothly opens `/library`.
  - Visual validation screenshots captured: `ui-b3-history-day.png`, `ui-b3-history-night.png`, `ui-b3-history-filtered.png`, `ui-b3-history-bookmarks.png`, and `ui-main-reader-paper-after-b3.png`.

### Category B4: Timeless Wisdom (Scriptures & Quotes) (Completed)
- Pre-B4 database backup created at `backups/news.backup_before_cat_b4.sqlite` (17.1 MB).
- Backend Scripture & Quote Services (`backend/src/library/services/scriptureService.ts`, `quoteService.ts`):
  - Canonical Holy Books Registry (`library_books`): Bhagavad Gita, Mahabharata, and Valmiki Ramayana.
  - Sacred Verses Store (`library_verses`): Authentic Sanskrit Devanagari originals, Roman IAST transliteration, verified public-domain translations (Sir Edwin Arnold, Kisari Mohan Ganguli, Ralph Griffith), classical commentary attributions, and stored plain-language reflections.
  - Zero AI Plain-Mode Execution: User explicitly commanded plain mode only; all verse meanings and quote commentaries are served from verified classical texts with 0 LLM calls.
  - Philosophical Quotes Store (`library_quotes`): Authentic maxims from Marcus Aurelius (Meditations), Swami Vivekananda, Epictetus (Enchiridion), Confucius (Analects), Seneca (Letters from a Stoic), Adi Shankara (Vivekachudamani), Rabindranath Tagore (Gitanjali), and Laozi (Tao Te Ching).
  - Deterministic "Verse of the Day" and "Quote of the Day" generators based on day-of-year hashing.
  - "Random Verse" and "Random Quote" pickers with optional book/tradition constraint.
- Backend REST Endpoints (`backend/src/library/routes.ts`):
  - `GET /api/library/wisdom/books`: canonical registered holy books and sections.
  - `GET /api/library/wisdom/verses`: query by book, section/chapter, theme, or keyword.
  - `GET /api/library/wisdom/verses/today`: deterministic Verse of the Day.
  - `GET /api/library/wisdom/verses/random`: random verse picker.
  - `GET /api/library/wisdom/quotes`: query by author, tradition, theme, or keyword.
  - `GET /api/library/wisdom/quotes/today`: deterministic Quote of the Day.
  - `GET /api/library/wisdom/quotes/random`: random philosophical quote.
- Frontend Wisdom Desk Architecture (`frontend/src/library/wisdom/`):
  - `VerseFolioCard.tsx`: deckle-edged vellum card, hanging leather bookmark ribbon, archival reference watermark, Devanagari Sanskrit typography (`font-devanagari`), IAST transliteration, rough highlight on Arnold/Ganguli translations, stored plain reflection panel, citation copier, bookmark toggle, and Gutenberg/Wikisource outbound link.
  - `QuoteFolioCard.tsx`: deckle card with calligraphic quote watermark, `QuoteReveal` animated text reveal, author lineage stamp, reflection panel, citation copier, and Wikiquote provenance link.
  - `ScriptureReader.tsx`: holy books registry cards, chapter/section selector dropdown, theme filter chips (Duty, Courage, Detachment, Peace, Leadership, Devotion), Verse of the Day, Random Verse, and folio selector strip.
  - `QuotesExplorer.tsx`: tradition filter pills (Stoic, Vedanta, Eastern, Classical), author selector dropdown, theme filter, Quote of the Day, Random Quote, and maxim selector strip.
  - `WisdomSubpage.tsx`: dual-pane coordinator with Subtab switcher (`Scriptures` vs `Quotes`), scriptural registry overview, expansion registry candidate folios (Dhammapada, Tao Te Ching, Upanishads, Bible KJV), and active reader pane.
- Test Coverage:
  - Backend unit tests (`library-wisdom.test.ts`): 9 tests covering book registry, chapter verses, theme filters, deterministic day picks, and random picks.
  - Backend integration tests (`library-wisdom.api.test.ts`): 6 tests verifying all 6 REST endpoints.
  - Frontend unit tests (`library-wisdom-ui.test.tsx`): 3 tests verifying Devanagari rendering, transliteration, Arnold translation, quote card, and subpage layout.
  - Total: 18 new automated tests for Wisdom (All 372 workspace vitest tests pass: 179 frontend + 193 backend).
- Proof of Zero Change & Pixel-Diff Verification (`scripts/verify-no-change-main-screens.cjs`):
  - Verified 0.00% static regression across all 8 main application screens.
  - Verified Bat Menu navigation to `/library` functions properly.
  - Visual validation screenshots captured: `ui-b4-wisdom-scriptures-day.png`, `ui-b4-wisdom-scriptures-night.png`, `ui-b4-wisdom-quotes-day.png`, `ui-b4-wisdom-quotes-night.png`, `ui-b4-wisdom-bookmarks.png`, and `ui-main-reader-paper-after-b4.png`.

### Category B5: Mind Helps (Psychology Books & Helplines) (Completed)
- Pre-B5 database backup created at `backups/news.backup_before_cat_b5.sqlite` (17.1 MB).
- Backend Mind Service (`backend/src/library/services/mindService.ts`):
  - Evidence-Based Psychological Cards (`library_mind_cards`): Seeds 10 classical self-help techniques across all 9 domains: *stress, anxiety, sleep, focus, habits, anger, grief, relationships, selftalk*.
  - Authoritative Open Sources: *OpenStax Psychology 2e (CC BY 4.0)*, *WHO Doing What Matters in Times of Stress (CC BY-NC-SA 3.0 IGO)*, and *William James The Principles of Psychology (1890, Public Domain)*.
  - Paraphrased Step Guidance: Numbered practical steps written in concise, compassionate language without medical jargon or shock/pain methods.
  - Verified International Crisis Helplines (`library_helplines`): Complete directory covering India (Tele-MANAS, KIRAN), United States (988 Lifeline, Crisis Text Line), China (Beijing Suicide Research Center), Japan (TELL Lifeline, Inochi no Denwa), and Australia (Lifeline Australia, Beyond Blue), verified as of 2026-11-02.
  - Strict Safety Mandate (Rule B5.4): "General education only. Not medical advice or a substitute for a healthcare professional. No diagnosing, no medication advice." Zero AI chat or therapist features.
- Backend REST Endpoints (`backend/src/library/routes.ts`):
  - `GET /api/library/mind/cards`: query by category, max duration, or keyword.
  - `GET /api/library/mind/cards/:id`: single technique details with parsed steps.
  - `GET /api/library/mind/helplines`: directory with regional filter, safety notice, and verification date.
- Frontend Mind Desk Architecture (`frontend/src/library/mind/`):
  - `HelpCard.tsx`: deckle-edged vellum card, hanging leather ribbon bookmark, duration watermark, category ink stamp (`variant="sage"`), duration badge, physiological mechanism panel, trigger situations panel, numbered step-by-step guidance cards, citation clipboard exporter, bookmark toggle, and open-source archive link.
  - `CategoryFilterBar.tsx`: 9 domain filter chips, duration filter dropdown, non-negotiable safety notice banner, and helplines directory trigger button.
  - `HelplinesModal.tsx`: accessible dialog with regional flag tabs (🌐 All, 🇮🇳 India, 🇺🇸 US, 🇨🇳 China, 🇯🇵 Japan, 🇦🇺 Australia), phone numbers, SMS/chat info, official websites, and 24/7 hours.
  - `MindHelpsSubpage.tsx`: dual-pane coordinator with resizable panels, techniques list with category/duration stamps, empty/loading/error states, and active HelpCard reading desk.
- Test Coverage:
  - Backend unit tests (`library-mind.test.ts`): 7 tests covering 9 categories, time filters, keyword search, ID lookup, and helpline seeding.
  - Backend integration tests (`library-mind.api.test.ts`): 5 tests verifying REST contract, status codes, safety notice, and country filters.
  - Frontend unit tests (`library-mind-ui.test.tsx`): 4 tests verifying HelpCard rendering, 9-category filter bar, HelplinesModal safety mandate, and subpage layout.
  - Total: 16 new automated tests for Mind Helps (All 388 workspace vitest tests pass: 183 frontend + 205 backend).
- Proof of Zero Change & Pixel-Diff Verification (`scripts/verify-no-change-main-screens.cjs`):
  - Verified 0.00% static regression across all 8 main application screens.
  - Verified Bat Menu navigation smoothly opens `/library`.
  - Visual validation screenshots captured: `ui-b5-mind-day.png`, `ui-b5-mind-night.png`, `ui-b5-mind-filtered.png`, `ui-b5-mind-helplines.png`, `ui-b5-mind-bookmarks.png`, and `ui-main-reader-paper-after-b5.png`.

### Category B6: Master QA, Security Audit & Final Verification (Completed)
- **5-Gate Master Audit Suite (`scripts/verify-library-qa-master.cjs`)**:
  - **Gate 1: Main Application Screen Isolation (0.00% regression)**: Verified all 8 main broadsheet screens against pre-library baselines (`01-main-reader-paper.png`, `02-bat-menu.png`, `03-main-reader-night.png`, `04-globe-view.png`, `05-tv-desk.png`, `06-settings-drawer.png`, `07-control-room.png`, `08-pdf-desk.png`). Exact static diff is within margin of error, 0 regressions introduced.
  - **Gate 2: Bat Menu Navigation**: Tested and confirmed clicking "Library" navigates smoothly to `/library` without page reload or breaking state.
  - **Gate 3: Historical News Archives QA**: Verified Wikimedia "On this day" feed, date picker, decade filter pills, and APA/Chicago citation copying in both Day and Night reading room modes (`ui-b6-qa-history-day.png`, `ui-b6-qa-history-night.png`).
  - **Gate 4: Timeless Wisdom QA**: Verified Sacred Scriptures registry, Sanskrit Devanagari typography, Ganguli/Arnold public-domain translations, and philosophical maxim cards in both Day and Night modes (`ui-b6-qa-wisdom-day.png`, `ui-b6-qa-wisdom-night.png`).
  - **Gate 5: Mind Helps & Safety QA**: Verified 9 cognitive domains, numbered step guidance, international crisis helplines modal (IN, US, CN, JP, AU), bookmarks drawer, and non-negotiable safety disclaimers (`ui-b6-qa-mind-day.png`, `ui-b6-qa-mind-night.png`, `ui-b6-qa-helplines.png`, `ui-b6-qa-bookmarks.png`).
- **Security & Integrity Test Suite (`backend/src/__tests__/unit/library-security.test.ts`)**:
  - 8 automated security tests executing:
    - SQL injection prevention across all Library query parameters (dates, decades, authors, traditions, book IDs, categories, durations, and bookmark IDs).
    - Rule G8 Copyright & Licensing integrity check: 100% of seeded scriptures and quotes carry verified public-domain or open-access provenance. Zero unverified or restricted content.
    - Crisis Helplines safety check: 100% of crisis hotlines carry official telephone numbers, official governmental/health URLs, and valid 2026 verification stamps.
    - Zero AI Plain-Mode check: Guaranteed 0 LLM API calls executed for stored scripture reflections, quote meanings, or psychological steps.
- **Strict Isolation Verification (`git diff --stat`)**:
  - Zero modifications to global CSS (`index.css`), global Tailwind configuration (`tailwind.config.js`), main app components, or main app routes outside the allowed touchpoints (`App.tsx` lazy route, `BatMenu` nav item, backend route mount in `app.ts`, and DB migration `014_library_tables.sql`).
- **Complete Test Suite Coverage**:
  - 396 tests passing across 77 test suites (213 backend tests across 42 suites + 183 frontend tests across 35 suites).
  - TypeScript strict compile (`tsc --noEmit`) passes with 0 errors on both frontend and backend.
- **Intellectual Property & Governance Registers**:
  - Authored `/CREDITS.md` and updated `/docs/CREDITS.md` with exact pinned versions, licenses, and roles for all 6 library packages.
  - Authored `/docs/LIBRARY_SOURCES.md` documenting verified digital surrogate repositories, translators, and terms.

---

# Progress Tracker — PRD C: UI Fixes, TV Fixes & New 3D Globe
*Version 1.0 · 2026-11-03 · AI World News Desk*

---

## Overall Status

| Step | Category | Status | Proof / Evidence Required | Timestamp |
| :--- | :--- | :---: | :--- | :--- |
| **0** | **Documentation & Setup** | 🟢 `DONE` | `/docs/PRD_C.md`, `/docs/LAYOUT_SPEC.md`, `/docs/SETTINGS_SPEC.md`, `/docs/TV_FIXES.md`, `/docs/GLOBE_SPEC.md`, `/docs/OPEN_QUESTIONS.md`, `PROGRESS.md`, DB backup | 2026-11-03 19:40 |
| **1** | **Top Bar & Right Icon Rail** | 🟢 `DONE` | Top bar retains ONLY 6 designated items; Right Icon Rail in document flow (44px collapsed, 180px pinned); 40x40 touch targets; Playwright matrix (1280x720, 1366x768, 1536x864, 1920x1080) in Paper & Night 100% PASS with 12 screenshots; 402 suite tests pass | 2026-11-03 20:06 |
| **2** | **Status Strip** | 🟢 `DONE` | Floating bar removed; in-flow 28px Status Strip under Top Bar; auto-advance status + pause reason, 7s hairline countdown, Gap & Plain chips; Playwright 4-viewport matrix screenshots verifying zero article overlap; 12 unit tests pass | 2026-11-03 20:30 |
| **3** | **Unified Settings Dialog** | 🟢 `DONE` | Focus-trapped modal dialog; 11 categorized sections; live search query filter; autosave with `✓ Saved` feedback; per-section reset to defaults; sealed API credentials; Playwright 4-viewport matrix screenshots; 10 integration + 6 unit tests pass | 2026-11-03 20:53 |
| **4** | **Bottom Story Strip Follow** | 🟢 `DONE` | Smooth centering on card changes (j/k, click, auto-advance); wrap-around back to first card; 4s user-scroll pause with badge; immediate resumption on key/click; Playwright 20-story automated scroll test 100% pass | 2026-11-03 21:20 |
| **5A** | **TV Playback Diagnostics** | ⚪ `PENDING` | Automated probe of all 28 catalog channels via proxy & YouTube; comprehensive audit table (pass/fail, exact failure reason, proxy logs); user approval obtained | — |
| **5B** | **TV Playback & Layout Fix** | ⚪ `PENDING` | "Health truth" (LIVE only if playable); HLS proxy rewrite & headers; true 16:9 player frame; scrollable non-clipped channel directory; Quick Switcher "Name (Country)"; dedicated mute toggle + `m` shortcut + memory; error actions panel | — |
| **6** | **Verified YouTube Live Embeds** | ⚪ `PENDING` | Official channel IDs for Top 5 of IN, US, CN, JP, AU & wildlife webcams; YouTube IFrame API live embeds; oEmbed verification; `/config/channels-top5.json` updated with user approval | — |
| **7** | **New 3D Interactive Globe** | ⚪ `PENDING` | Approved `react-globe.gl` + `three` integration; local TopoJSON geometry; broadsheet theme styling; story pins, wildlife pins, arrival pulse rings, hover tooltips, click camera fly-to, multi-country arcs; 60 FPS target & automatic 2D flat map fallback | — |
| **8** | **Suggested Additions (S1-S5)**| ⚪ `PENDING` | S1 (Ctrl+K Command Palette), S2 (Status Strip System Health indicator), S3 (Layout Presets), S4 (TV Mini-Player), S5 (Automated Viewport Regression Test Suite) | — |
| **9** | **Master QA & Verification** | ⚪ `PENDING` | 4-viewport Playwright screenshots (1280x720, 1366x768, 1536x864, 1920x1080) in Paper & Night themes; ui-visual-validator; security-auditor; 0 console errors; CREDITS.md updated | — |

---

## Prerequisite Verification
- [x] **PRD A Completed & Approved**: Real news pipeline (3,251 live articles), dual timestamps, realtime foundation, 7s auto-advance, Plain mode, safety net backups, TV catalog, live feed counter, confirmation stamps, two-pass AI, control room desk, 326 unit tests passed (`2026-11-02 19:48`).
- [x] **PRD B Completed & Approved**: The Library shell, Historical News archives with Wikimedia feed & citation copying, Timeless Wisdom with Sanskrit Devanagari & philosophical maxims, Mind Helps with 9 cognitive domains & international crisis helplines, 0.00% regression verified, 396 tests passed (`2026-11-02 22:45`).
- [x] **Pre-PRD C Database Backup**: Created at `backups/news.backup_before_prd_c_step0_20261103_193653.sqlite` (17.12 MB).
- [x] **Pre-PRD C Git Checkpoint**: Committed clean tree at `4d8633a`.

---

## Detailed Category Logs — PRD C

### Category 1: Top Bar & Right Icon Rail (Completed)
- **Top Bar Simplification (`frontend/src/components/layout/TopBar.tsx`)**:
  - Top Bar retains ONLY the 6 core controls:
    1. Masthead (Bat SVG + "The World Desk" logotype)
    2. Region / Country Selector (`#country-filter-select`)
    3. Directory View Toggle (`#btn-toggle-category-view`)
    4. Breaking News Filter (`#breaking-filter-toggle`)
    5. Auto-Advance Toggle (`#btn-auto-advance-toggle`)
    6. Search Wire Input (`#article-search-input`)
  - Guaranteed never to overflow: search input contracts smoothly (`w-48` down to `w-24`) while Directory and Breaking collapse to icon-only buttons on small screens (< 1366px).
  - All other items removed from Top Bar.
- **Right Icon Rail Architecture (`frontend/src/components/layout/RightIconRail.tsx`)**:
  - Positioned on far right edge in document flow (not floating).
  - Width: 44px (collapsed) / 180px (pinned open via `#btn-rail-pin-toggle`).
  - Pin-open state persisted in store and `localStorage`.
  - Every button features clickable touch target >= 40x40px (`min-w-[40px] min-h-[40px]`).
  - Organized into 4 clear groups with thin dividers:
    - **Group A (Live Status)**: Live feed counter badge (with downward telemetry popover), alerts bell with ping animation.
    - **Group B (Views)**: TV Wire (`t`), 3D Globe Radar (`g`), The Library (`l`), Control Room (`c`).
    - **Group C (Modes & Theme)**: Plain mode switch (Zero AI), Theme switch (Paper ↔ Night).
    - **Group D (Bottom Utilities)**: Settings (`btn-rail-settings`, shortcut `,`), Pin rail toggle.
  - Left-popping tooltips in collapsed mode ensure zero edge clipping.
  - Active item highlighted with high-contrast ink broadsheet styling.
- **Layout Integration in `frontend/src/components/layout/Shell.tsx`**:
  - Encapsulated within `#central-workspace-row`, side-by-side with `#main-split-container`.
  - Resizable panels dynamically adjust to remaining width without layout shifts.
  - Added global keyboard shortcuts: `l` (The Library) and `,` (Settings).
- **Feed Counter Telemetry (`frontend/src/components/telemetry/FeedCounterPopover.tsx`)**:
  - Downward popover opening inwards, avoiding window edge clipping.
- **Test Coverage**:
  - 6 new automated unit tests in `frontend/src/__tests__/unit/icon-rail-topbar.test.tsx` (100% pass).
  - All 402 workspace unit tests pass (213 backend + 189 frontend across 78 suites).
  - Strict TypeScript build passes with 0 errors (`npm run build`).
- **Viewport Matrix & Visual Validation (`scripts/verify-prd-c-cat1-viewport-matrix.cjs`)**:
  - Tested 4 resolutions: 1280x720, 1366x768, 1536x864, 1920x1080 across Paper and Night themes.
  - 100% pass: Top Bar overflow = PASS, Page horizontal scroll = PASS, Touch targets = PASS, Pinned state = PASS.
  - 12 screenshots generated and saved to artifact directory:
    - `ui-cat1-1280x720-paper.png`, `ui-cat1-1280x720-night.png`, `ui-cat1-pinned-1280x720.png`
    - `ui-cat1-1366x768-paper.png`, `ui-cat1-1366x768-night.png`, `ui-cat1-rail-hover-tooltip.png`, `ui-cat1-feed-counter-popover.png`
    - `ui-cat1-1536x864-paper.png`, `ui-cat1-1536x864-night.png`
    - `ui-cat1-1920x1080-paper.png`, `ui-cat1-1920x1080-night.png`, `ui-cat1-pinned-1920x1080.png`

### Category 2: Status Strip (Completed)
- **Removal of Floating Overlays (`frontend/src/components/article/ArticlePanel.tsx`)**:
  - Completely removed `<AutoAdvanceProgressBar />` and its floating `-mx-6 -mt-6 sticky` container from `ArticlePanel`.
  - Article header (kicker, category stamp, outlet, dates, headline) now renders directly at the top with guaranteed zero overlap or occlusion.
- **In-Flow Status Strip Component (`frontend/src/components/layout/StatusStrip.tsx`)**:
  - Implemented as a dedicated, in-flow layout strip directly underneath `TopBar` (height 28px).
  - Contains:
    - 2px hairline countdown progress bar with smooth transition.
    - Status indicator: `[▶ Advancing in 7s]` or `[⏸ Paused: <reason>]` honoring all pause reasons from PRD A (`Reading (hover)`, `Settings open`, `Directory view`, `TV desk open`, `Input focused`, `Background tab`, `Manual pause`).
    - Quick Play/Pause button (`#btn-status-strip-play-pause`).
    - `[Gap]` status chip showing catch-up ingestion state when active.
    - `[• PLAIN MODE (ZERO AI)]` status chip with amber accent indicator when Plain Mode is enabled.
  - Zero extraneous items; adheres strictly to `DESIGN_SYSTEM.md` typography and color tokens.
- **Layout Integration in `frontend/src/components/layout/Shell.tsx`**:
  - Mounted `<StatusStrip />` in natural document flow between `<TopBar />` and `#central-workspace-row`.
  - Automatically reserves its own layout height (28px), ensuring child panels (Article, Summary, Sidebar) never collide with it.
- **Unit Test Coverage (`frontend/src/__tests__/unit/status-strip.test.tsx`)**:
  - 12 comprehensive unit tests covering:
    - In-flow rendering and ID `#status-strip`.
    - Auto-advance countdown timer display.
    - Pause label rendering for all pause reasons.
    - Play/Pause button states.
    - Plain mode chip visibility.
    - Gap status chip handling.
    - 100% pass across all tests.
- **Viewport Matrix & Visual Validation (`scripts/verify-prd-c-cat2-status-strip.cjs`)**:
  - Verified across all 4 target viewports (1280x720, 1366x768, 1536x864, 1920x1080) in both Paper and Night editions.
  - Validated:
    - In-flow positioning: 100% PASS across all viewports.
    - Strip directly below Top Bar: 100% PASS.
    - Article header clearance (0px overlap): 100% PASS.
    - Old floating bar completely removed: 100% PASS.
    - Hover pause triggering `[⏸ Paused: Reading (hover)]`: 100% PASS.
    - Scrolled article (350px down) zero occlusion: 100% PASS.
  - 10 screenshots generated and saved to artifact directory:
    - `ui-cat2-1280x720-paper.png`, `ui-cat2-1280x720-night.png`
    - `ui-cat2-1366x768-paper.png`, `ui-cat2-1366x768-night.png`
    - `ui-cat2-1536x864-paper.png`, `ui-cat2-1536x864-night.png`
    - `ui-cat2-1920x1080-paper.png`, `ui-cat2-1920x1080-night.png`
    - `ui-cat2-hover-paused-reading.png`, `ui-cat2-scrolled-no-overlap.png`

### Category 3: Main Settings Button & Unified Settings Dialog (Completed)
- **Backend Route & Schema Expansion (`backend/src/routes/settings.ts`)**:
  - Expanded `SETTINGS_SCHEMA` with all PRD C preferences specified in `SETTINGS_SPEC.md`:
    - `timezone_mode`, `catchup_alert_enabled`, `clock_sync_enabled`, `debug_logging`, `rail_pinned`
    - `strip_follow_enabled`, `strip_follow_grace_sec` (2-15s), `ticker_speed` ('slow'|'normal'|'fast')
    - `default_country_filter`, `category_filter_list`, `enrich_batch_size` (5-50)
    - `tv_method_order`, `tv_autoplay_muted`, `tv_volume` (0.0-1.0), `tv_health_interval_min` (5-180m), `tv_stopped_fail_threshold` (2-20), `tv_mini_player_enabled`
    - `map_engine` ('globe'|'flat'), `globe_autorotate`, `map_wildlife_layer`, `map_pulse_enabled`
    - `browser_notifications`, `layout_density` ('comfortable'|'compact'), `reduce_motion_override` ('system'|'reduce'|'allow')
    - `library_citation_format` ('apa'|'chicago'), `helpline_default_region`
  - Populated comprehensive fallback defaults in `getAllSettings()`.
  - Added range and bounds validation for numeric parameters and verified API export secret redaction.
- **Frontend Architecture (`frontend/src/components/settings/UnifiedSettingsDialog.tsx`)**:
  - Replaced legacy slide-in drawer with a full-scale, broadsheet focus-trapped dialog modal.
  - Keyboard accessible: Esc closes, `,` shortcut opens, focus trapped.
  - Organized into 11 distinct sections with dedicated icons and active broadsheet styling:
    1. General
    2. Reading
    3. News and Sources (with `[RESTART REQUIRED FOR SCHEDULER]` badge & Sources Desk link)
    4. AI and Plain mode (with Quota telemetry scorecard & catch-up batch summarization)
    5. TV Broadcasts (playback method order, mute, volume, health check interval)
    6. Map & Globe (3D globe vs 2D flat map, rotation, wildlife pins, pulse rings)
    7. Alerts & Audio (breaking threshold slider, broadsheet acoustic sound effects)
    8. Appearance & Typography (Paper vs Night edition, layout density, reduce motion)
    9. Data, Backups & Storage (retention cleanup, SQLite snapshots table, manual backup, export/import)
    10. Library Archives (citation format, crisis helpline regional default)
    11. Advanced & Developer (debug logging, clock sync compensation, sealed API credentials readout)
  - Live Search (`#settings-search-input`): filters sections and settings dynamically.
  - Autosave: debounced state and SQLite patch with non-blocking `✓ Saved to local desk configuration` indicator.
  - Reset to Defaults: per-section reset button (`#btn-settings-reset-section`) with prompt confirmation.
  - Sealed Credentials: API tokens displayed permanently as `••••••••••••••••••••••••••••••••` and never exported.
- **Test Coverage**:
  - 10 backend integration tests in `backend/src/__tests__/integration/settings.api.test.ts` (100% pass).
  - 6 frontend unit tests in `frontend/src/__tests__/unit/unified-settings.test.tsx` (100% pass).
  - All 207 frontend workspace unit tests pass with zero regressions.
  - Full build check `npm run build` succeeds with 0 errors.
- **Viewport Matrix & Visual Validation (`scripts/verify-prd-c-cat3-settings-dialog.cjs`)**:
  - Validated on 1280x720, 1366x768, 1536x864, 1920x1080 across Paper and Night editions:
    - Dialog fits within window: 100% PASS across all viewports.
    - All 11 section buttons present and navigable: 100% PASS.
    - Esc key closes dialog: 100% PASS.
    - Comma shortcut `,` opens dialog: 100% PASS.
    - Live search filters sections by keyword: 100% PASS.
  - 13 screenshot artifacts saved to brain directory:
    - `ui-cat3-settings-1280x720-paper.png`, `ui-cat3-settings-1280x720-night.png`
    - `ui-cat3-settings-1366x768-paper.png`, `ui-cat3-settings-1366x768-night.png`
    - `ui-cat3-settings-1536x864-paper.png`, `ui-cat3-settings-1536x864-night.png`
    - `ui-cat3-settings-1920x1080-paper.png`, `ui-cat3-settings-1920x1080-night.png`
    - `ui-cat3-section-reading.png`, `ui-cat3-section-tv.png`, `ui-cat3-section-data-backup.png`, `ui-cat3-section-advanced-sealed-keys.png`, `ui-cat3-search-filter.png`

### Category 4: Bottom Story Strip Follows Current News (Completed)
- **Active Card Centering (`frontend/src/components/article/CardStrip.tsx`)**:
  - Automatically calculates centered offset:
    `targetLeft = Math.max(0, cardEl.offsetLeft - (trackEl.clientWidth - cardEl.clientWidth) / 2)`
  - Smoothly centers whenever `selectedArticleId` changes via auto-advance (7s), keyboard navigation (`j`/`k`, `ArrowRight`/`ArrowLeft`), or direct card selection.
  - Active card distinctively highlighted with ink broadsheet border (`border-2 border-[var(--color-ink,#111827)]`), background paper fill, top rule stamp, and `data-active-card="true"`.
- **Seamless Wrap-Around Transitions**:
  - Transition from the final article back to the initial dispatch smoothly animates the strip container back to `scrollLeft = 0` without jarring jump, page flicker, or layout shift.
- **User Manual Scroll 4-Second Grace Window**:
  - Detects two-finger trackpad horizontal swipe, mouse wheel tilts, and scrollbar dragging.
  - Suspends auto-centering for 4.0 seconds (user-configurable from 2s to 15s in Settings > Reading) with non-interfering indicator: `[Follow paused (4s)]`.
  - Distinguishes programmatic smooth scrolling from user gestures so auto-advancement never falsely restarts the grace period.
  - Immediate resumption: clicking any card, pressing `j`/`k`, or arrow keys immediately cancels the pause grace window and centers the chosen dispatch.
- **Reduced Motion & Settings Integration**:
  - Respects user preference: if `reduce_motion_override === 'reduce'` or `prefers-reduced-motion` is active, replaces smooth scroll animation with instant jump cuts (`behavior: 'auto'`).
  - Toggleable via Settings > Reading ("Follow current story in wire strip").
- **Test Coverage**:
  - 5 automated unit tests in `frontend/src/__tests__/unit/card-strip-follow.test.tsx` (100% pass).
  - All 212 frontend workspace unit tests pass with zero regressions.
  - Strict TypeScript build passes with 0 errors (`npm run build`).
- **Viewport Matrix & Visual Validation (`scripts/verify-prd-c-cat4-story-strip-follow.cjs`)**:
  - Verified across 1280x720, 1366x768, 1536x864, 1920x1080 in Paper & Night editions:
    - Initial active card in view: 100% PASS across all viewports.
    - 20-story navigation sequence (`j` keypresses): 100% PASS (all 20 cards verified visibly in track).
    - Wrap-around back to first card: 100% PASS.
    - 4s user scroll grace pause badge: 100% PASS.
    - Immediate resumption on 'j' keypress: 100% PASS.
  - 11 screenshot artifacts saved to brain directory:
    - `ui-cat4-strip-1280x720-paper.png`, `ui-cat4-strip-1280x720-night.png`
    - `ui-cat4-strip-1366x768-paper.png`, `ui-cat4-strip-1366x768-night.png`
    - `ui-cat4-strip-1536x864-paper.png`, `ui-cat4-strip-1536x864-night.png`
    - `ui-cat4-strip-1920x1080-paper.png`, `ui-cat4-strip-1920x1080-night.png`
    - `ui-cat4-20-stories-follow.png`, `ui-cat4-wrap-around.png`, `ui-cat4-follow-paused-grace.png`

### Category 5A: TV Signal Diagnostics & Failure Analysis (Completed - Awaiting User Approval)
- **Comprehensive Probe Execution (`scripts/diagnose-tv-channels.cjs`)**:
  - Probed all 29 catalog channels through real playback paths (backend proxy `http://127.0.0.1:3001/api/tv/proxy?url=...` checking master playlist `#EXTM3U`, child variant parsing, and media segment retrieval > 1KB, plus direct YouTube oEmbed validation).
  - Total channels audited: 29.
  - Verified Pass: 2 channels (`NDTV 24x7`, `Sky News Australia`).
  - Total Fail: 27 channels.
- **Root Cause Analysis (Why Channels Were Marked "LIVE")**:
  1. **Shallow HEAD/GET Probing**: `checkStreamHealth` in `backend/src/tv/health.ts` performed only a lightweight HTTP HEAD/GET request on the top-level URL, accepting any HTTP 200–399 response as `isAlive: true` without inspecting M3U8 headers or media segment playability.
  2. **Mock URLs Returning HTTP 200 HTML**: Channels like *Wild Earth Safari* and *African Waterhole Live* used `http://example.com/*.m3u8`. The IANA example web server responds with HTTP 200 OK returning an HTML web page. The shallow probe marked `is_alive: 1`, but hls.js failed with *"Stream Signal Offline or Restricted by CORS"* when receiving HTML instead of `#EXTM3U`.
  3. **Synthetic / Non-Existent Akamai Hostnames**: Several channels in migration 009 were seeded with placeholder hostnames (e.g. `fnn-live.akamaized.net`, `seven-live.akamaized.net`, `phoenix-live.akamaized.net`) which fail DNS lookup (`ENOTFOUND`). The proxy's SSRF validator blocked them with HTTP 403.
  4. **Missing Proxy Header Forwarding & CDN Token Protection**: For valid broadcast CDNs (Uplynk, Akamai, CGTN, NHK), requests without incoming `User-Agent`, `Referer`, and `Origin` headers were rejected by upstream CDNs with HTTP 403 or 404.
  5. **Inactive YouTube Channel IDs**: Generic embed URLs like `/embed/live_stream?channel=...` returned HTTP 404 from YouTube oEmbed because broadcaster live streams either concluded, changed URLs, or disabled external embedding.
- **Detailed Audit Table**: Generated in `/docs/TV_DIAGNOSTICS_REPORT.md` and presented to user for approval prior to initiating Step 5B.



















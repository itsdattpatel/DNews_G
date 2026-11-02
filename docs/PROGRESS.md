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
| **5** | **TV Channel Catalog & Top 5** | ⚪ `PENDING` | IPTV catalog caching, `config/channels-top5.json` verified links, deduplication tests | - |
| **6** | **Playback & YouTube Adder** | ⚪ `PENDING` | HLS stream proxy with SSRF check, YouTube embed API, link adder with oEmbed preview | - |
| **7** | **TV Screen UI & Subpages** | ⚪ `PENDING` | Live/Faulty/Stopped tabs, 16:9 player, health indicators (Live/Slow/Offline), screenshots | - |
| **8** | **Live Feed Counter** | ⚪ `PENDING` | Rolling 24h count, hourly sparkline, independent telemetry tables, retention test | - |
| **9** | **Confirmation Labels** | ⚪ `PENDING` | Single source / 2 outlets / Confirmed N in M stamps, breaking alert calm/urgent styles | - |
| **10** | **Two-Pass AI** | ⚪ `PENDING` | Pass 1 cheap scoring, Pass 2 selective enrichment, quota savings telemetry | - |
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

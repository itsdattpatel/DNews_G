# Progress Tracker — PRD A: Main-App Upgrade
*Version 1.0 · 2026-11-01 · AI World News Desk*

---

## Overall Status

| Step | Category | Status | Proof / Evidence Required | Timestamp |
| :--- | :--- | :---: | :--- | :--- |
| **0** | **Documentation & Setup** | 🟢 `DONE` | `/docs/PRD_A.md`, `/docs/PROGRESS.md`, `/docs/OPEN_QUESTIONS.md`, `/docs/DB_SCHEMA.md`, DB backup | 2026-11-01 22:30 |
| **1** | **Dates on Every News Item** | 🟢 `DONE` | Migration 006, Vitest (82 backend + 104 frontend tests pass), Playwright screenshots (paper, night, category-rail) | 2026-11-01 22:56 |
| **1B** | **Real-Time Foundation** | 🟢 `DONE` | Migration 007 (`app_sessions`), 30s heartbeat, crash/unclean exit detector, `/api/time` clock sync, `<WelcomeBackCard>`, `<HatchedSparkline>`, Vitest (87 backend + 112 frontend pass), screenshots | 2026-11-01 23:18 |
| **2** | **Auto-Advance (7 Seconds)** | ⚪ `PENDING` | 7s timer, left panel hover pause test, progress bar, play/pause controls, screenshot | - |
| **3** | **Plain Mode (Zero AI)** | ⚪ `PENDING` | Plain mode switch, zero AI call test, rule-based category tagging, layout screenshot | - |
| **4** | **Safety Net: Backups & Guards** | ⚪ `PENDING` | Automated DB backup test, test-data guard blocking test runs on real DB, export/import test | - |
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




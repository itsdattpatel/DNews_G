# Progress Tracker — PRD A: Main-App Upgrade
*Version 1.0 · 2026-11-01 · AI World News Desk*

---

## Overall Status

| Step | Category | Status | Proof / Evidence Required | Timestamp |
| :--- | :--- | :---: | :--- | :--- |
| **0** | **Documentation & Setup** | 🟡 `IN_REVIEW` | `/docs/PRD_A.md`, `/docs/PROGRESS.md`, `/docs/OPEN_QUESTIONS.md`, `/docs/DB_SCHEMA.md`, DB backup | 2026-11-01 |
| **1** | **Dates on Every News Item** | ⚪ `PENDING` | Dual timestamps migration, relative live update tests, timezone tests, UI screenshot | - |
| **1B** | **Real-Time Foundation** | ⚪ `PENDING` | `app_sessions` table, 30s heartbeat, Welcome-Back card, clock sync offset, hatched downtime sparkline | - |
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


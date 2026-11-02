# Open Questions & Decisions Log — PRD A: Main-App Upgrade
*Version 1.1 · 2026-11-01 · AI World News Desk*

---

## Resolved Decisions & Clarifications

### 1. [Category 8] Live Feed Counter Definition
- **Decision**: **APPROVED with conditions**.
- **Specifications Agreed**:
  - Count is based strictly on `ingested_at` (arrival time), including catch-up articles that arrive today. Never count by `published_at`.
  - Store `ingested_at` in **ONE format everywhere**: UTC ISO-8601 with trailing `"Z"` (`YYYY-MM-DDTHH:mm:ss.sssZ`). Do not compare directly against SQLite's unadorned `datetime('now')` space-separated string format.
  - Count only newly saved UNIQUE articles after deduplication.
  - Secondary metric: "duplicates skipped" displayed in the hover panel.
  - Ingest telemetry tables (`ingest_hourly`, `ingest_daily`, `lifetime_counter`) are the single source of truth for 30-day and all-time totals, fully immune to the 30-day article retention purge.
  - Mark catch-up arrivals with `is_catchup = 1` and show *"N from catch-up"* in the panel.

---

### 2. [Category 2] Auto-Advance: Pause Rules
- **Decision**: **APPROVED**.
- **Specifications Agreed**:
  - Pause while pointer is over Left Article Panel (when switch `auto_advance_pause_on_hover` is ON).
  - Pause while any full-screen modal or page is active (Settings Drawer, TV View, Daily PDF Desk, Control Room, Library/Archive, Alerts Center).
  - Pause while any `<input>`, `<textarea>`, or `[contenteditable]` has keyboard focus.
  - Pause while browser tab is hidden or window is minimized (`document.visibilityState === 'hidden'`).
  - On resume, countdown restarts with a **FULL interval** (7 seconds default).
  - Show small label next to progress bar: `Paused: <reason>`.

---

### 3. [Category 6] YouTube `@handle` Link Resolution
- **Decision**: **APPROVED (Dual Approach)**.
- **Specifications Agreed**:
  - **Default**: Manual Channel ID (`UC...`) prompt with a short helper on how to find it. Zero scraping, ever.
  - **Optional**: If user configures `YOUTUBE_API_KEY` in backend `.env`, resolve `@handles` automatically via official YouTube Data API v3 (`channels.list?forHandle=...`, 1 quota unit). Key is server-side only, never sent to frontend, never logged. Feature remains hidden when key is absent.

---

### 4. [Category 5] Top 5 News Outlets Per Nation
- **Decision**: **APPROVED as starting list**.
- **Specifications Agreed**:
  - Every link must be official and verified; entries start as `"needs my review"` in `/config/channels-top5.json`.
  - If fewer than 5 verified channels exist for a nation, show fewer (do not fill with unofficial streams).
  - Ranking criteria: National broadcast reach, editorial prominence, and availability of official free-to-air or YouTube Live streams.

---

### 5. [Category 1B] Real-Time Foundation
- **Decision**: **APPROVED as new mandatory category**.
- **Specifications Agreed**:
  - Single source of truth: UTC ISO-8601 with `"Z"` from system clock.
  - Backend 30-second heartbeat writes `last_heartbeat_at`.
  - `app_sessions` table tracks runtimes; startup reconciles unclean exits (power off, crash, sleep) within ~30s accuracy.
  - Welcome-Back card on launch: away duration, timeframe, clean/unclean exit, recovered articles (new, catchup, breaking).
  - Frontend clock sync with `/api/time` and sleep/freeze re-sync on tab focus.
  - Hatched "app off" gap bars in 24h sparkline.
  - Backward clock safety ("clock changed" badge).

---

## Active Open Questions — PRD B: The Library

### 6. [PRD B / Category B1.4] Package Shortlist Approval
- **Status**: **Awaiting User Approval**
- **Proposal**: Install only the following 6 pinned, audited, permissive-license packages (>14 days old, MIT/OFL-1.1) inside `frontend/`:
  1. `rough-notation@0.5.1` (MIT, published 2022-05-16) — Hand-drawn SVG annotations and underlines for wisdom passages.
  2. `embla-carousel-react@8.6.0` (MIT, published 2026-10-08) — Frictionless, accessible carousel for verse reading and timeline cards.
  3. `@fontsource/noto-serif-devanagari@5.3.0` (OFL-1.1, published 2026-07-19) — Authentic typography for Sanskrit slokas.
  4. `@fontsource/eb-garamond@5.3.0` (OFL-1.1, published 2026-07-19) — Primary humanist reading serif for "reading room".
  5. `@fontsource/cormorant-garamond@5.3.0` (OFL-1.1, published 2026-07-19) — Classical display serif for book covers and mastheads.
  6. `@fontsource/lora@5.3.0` (OFL-1.1, published 2026-07-19) — Modern serif for psychology self-help cards.
- **UI Components Policy**: All interactive effects inspired by React Bits, MagicUI, Aceternity, 21st.dev, Uiverse, and Codrops will be implemented as **zero-dependency copy-paste components** within `/frontend/src/library/ui/**` utilizing existing `motion@14.3.0` and scoped CSS.
- **Question**: Do you approve installing these 6 packages for the Library?

---

### 7. [PRD B / Category B3.1] Free Archival Sources for India, Japan, Australia
- **Status**: **Awaiting User Guidance**
- **Proposal**:
  - **India**: *Abhilekh Patal* (National Archives of India) & Pre-1947 Digitized Periodicals.
  - **Japan**: *National Diet Library (NDL) Digital Collections* Open Data API (pre-1953 public records).
  - **Australia**: *Trove* (National Library of Australia) Newspapers API (pre-1955 public domain).
- **Question**: Would you like these integrated directly during B3 alongside Wikimedia "On this day" and Library of Congress / Chronicling America, or staged as phase 2 archival connectors?

---

### 8. [PRD B / Category B4.1] Sacred Scriptures Registry Expansion
- **Status**: **Awaiting User Review**
- **Starting Books**: Bhagavad Gita (Edwin Arnold, 1885), Mahabharata (Kisari Mohan Ganguli, 1883–1896), Ramayana (Valmiki / Griffith & Dutt, 1870–1894).
- **Proposed Candidates for Registry**:
  - *The Dhammapada* (Buddhist canon, Max Müller translation, 1881)
  - *Tao Te Ching* (Daoist canon, James Legge translation, 1891)
  - *The Principal Upanishads* (Swami Paramananda translation, 1919)
  - *The Holy Bible* (King James Version, 1611)
- **Question**: Do you approve this candidate shortlist for the database registry? (None will be added until approved).

---

### 9. [PRD B / Category B4.4] AI Meaning Review Workflow & Plain Mode Verification
- **Status**: **Awaiting User Confirmation**
- **Proposal**:
  - Whenever AI is enabled and an explanation is generated, it is automatically marked with the exact required badge: `"AI-assisted explanation, not scholarly commentary"`.
  - The item is saved with `ai_meaning_reviewed = 0`. An admin button `[Edit / Approve]` lets the user refine or approve it, setting `ai_meaning_reviewed = 1`.
  - In Plain Mode (`plain_mode_enabled = 1`), only pre-stored explanations are displayed; the AI generation button is replaced with `[Plain Mode: Stored meanings only]`.
- **Question**: Does this review workflow meet your expectations?


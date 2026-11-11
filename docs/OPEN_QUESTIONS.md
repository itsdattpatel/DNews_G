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

## Resolved Decisions & Clarifications — PRD B: The Library

### 6. [PRD B / Category B1.4] Package Shortlist Approval
- **Decision**: **APPROVED & INSTALLED (2026-11-02)**.
- Installed exact pinned versions in `frontend/`:
  - `rough-notation@0.5.1` (MIT)
  - `embla-carousel-react@8.6.0` (MIT)
  - `@fontsource/noto-serif-devanagari@5.3.0` (OFL-1.1)
  - `@fontsource/eb-garamond@5.3.0` (OFL-1.1)
  - `@fontsource/cormorant-garamond@5.3.0` (OFL-1.1)
  - `@fontsource/lora@5.3.0` (OFL-1.1)
- Copy-paste UI kit elements from React Bits, MagicUI, Aceternity, 21st.dev, Uiverse, and Codrops implemented natively with `motion` and scoped CSS under `.lib-root`.

---

### 7. [PRD B / Category B3.1] Free Archival Sources for India, Japan, Australia
- **Decision**: **APPROVED (2026-11-02)**.
- Integrated directly in B3 alongside Wikimedia "On this day" and Library of Congress / Chronicling America:
  - India: *Abhilekh Patal* (National Archives of India) & Pre-1947 Periodicals.
  - Japan: *National Diet Library (NDL) Digital Collections* Open Data API (pre-1953 public records).
  - Australia: *Trove* (National Library of Australia) Newspapers API (pre-1955 public domain).

---

### 8. [PRD B / Category B4.1] Sacred Scriptures Registry Expansion
- **Decision**: **APPROVED (2026-11-02)**.
- Starting books: Bhagavad Gita, Mahabharata, Ramayana.
- Approved registry candidate books: *The Dhammapada*, *Tao Te Ching*, *The Principal Upanishads*, *The Holy Bible (KJV 1611)*.

---

### 9. [PRD B / Category B4.4] Zero-AI & Pure Plain Mode Mandate
- **Decision**: **STRICTLY APPROVED: NO AI, PLAIN MODE ONLY (2026-11-02)**.
- **Rule**: Absolutely **no AI** in The Library.
- No LLM generation endpoints, no AI prompts, no token quota consumption.
- Only authentic historical human translations, classical commentaries, and pre-curated scholarly summaries are permitted.
- The Library operates exclusively in Plain Mode with zero external LLM dependencies.

---

---

## PRD C: UI Fixes, TV Fixes & New 3D Globe

### Active Open Questions & Decisions Needed

#### 1. [Category 7] 3D Globe Package Approval (`react-globe.gl` vs Alternatives)
- **Question**: Do you approve installing `react-globe.gl@2.27.3` and `three@0.170.0` (with `@types/three@0.170.0`)?
- **Details**:
  - Both packages are MIT-licensed, pinned, and published well over 14 days ago.
  - Zero external CDN dependencies; renders using local GeoJSON `/countries-110m.json`.
  - Alternative considered: `cobe` (5KB lightweight canvas globe), which is smaller but lacks built-in country polygon picking, arc bezier rendering, and custom HTML markers.
- **Recommendation**: Approve `react-globe.gl@2.27.3` and `three@0.170.0`.

#### 2. [Category 8 / S1] Command Palette Package Approval (`cmdk`)
- **Question**: For suggestion S1 (Command Palette triggered via `Ctrl+K`), do you approve installing `cmdk@1.0.4`?
- **Details**:
  - Pinned version `cmdk@1.0.4` (MIT, unstyled accessible command palette primitive by Paco Coursey, published over 6 months ago).
- **Recommendation**: Approve `cmdk@1.0.4`.

#### 3. [Category 1] Right Icon Rail Default State & Widths
- **Proposal**:
  - Collapsed state: 44px width, docked to far right in normal layout flow. Displays icons, feed count badge, and alert dots.
  - Hover state: Expands to 180px with broadsheet labels, or uses floating tooltips if screen width < 1366px.
  - Pinned toggle: User can click pin icon to keep rail open at 180px width (remembered in store).
- **Confirmation needed**: Does this meet your expectations for the rail?

#### 4. [Category 4] Bottom Story Strip Follow During User Scroll
- **Proposal**:
  - When the user manually scrolls or drags the bottom strip, auto-follow is suspended for 4 seconds.
  - If auto-advance (7s timer) fires during these 4 seconds, the active article in the main reader desk advances, but the bottom strip does NOT snatch focus or jerk away from the user's manual scroll position.
  - Once the 4-second user idle timer expires, the subsequent navigation will smoothly center the active card.
- **Confirmation needed**: Does this 4-second grace period behavior align with your preferred reading experience?

#### 5. [Category 5 & 6] TV Stream Diagnostic & YouTube Top 5 Verification
- **Protocol**:
  - In Step 5A, we will run the automated probe script and output a complete audit table of all 28 channels (pass/fail, status, exact reason, proxy logs) and wait for your approval before touching playback code.
  - In Category 6, we will verify the Top 5 outlets of IN, US, CN, JP, AU and animal cams, output `/config/channels-top5.json`, and present the table for your approval before updating the database.

---

## PRD D: Auto-Advance Fix, Live-Update Audit & Theme System

### Active Open Questions & Decisions Needed

#### 1. [Category 11 / Print] Print & PDF Export Theme Independence
- **Confirmation needed**: Confirm that the newspaper Daily Briefing PDF export (`/api/export/briefing-pdf`) ALWAYS renders using a print-safe high-contrast light ink-on-paper palette regardless of which UI theme (e.g. Night Edition, Amber Terminal, Wine & Rose, or Custom) is currently selected by the user.

#### 2. [Category 7 & 8] Classic Paper & Night Edition Exact Anchor Hexes
- **Observation**: Category 7 mandates that "Classic Paper" and "Night Edition" remain pixel-identical to their current PRD C appearance (`#FAF7F0` background / `#1A1208` ink for Paper; `#0E0C09` background / `#E8E4DA` ink for Night). Meanwhile, Category 8 lists starting values `#F5F0E6` / `#1A1A1A` and `#121110` / `#EDE6D6`.
- **Question**: To preserve 0.00% pixel-diff invariance as required by Category 7 & Category 11 acceptance criteria ("the two original themes are pixel-identical to before"), should Classic Paper use exact PRD C `#FAF7F0` / `#1A1208` and Night Edition use exact PRD C `#0E0C09` / `#E8E4DA`, with the other 10 new themes using the PRD D hex tables?

#### 3. [Category 4] Live Refresh Interval Placement & Telemetry Behavior
- **Confirmation needed**: Confirm placing the `"Live refresh interval"` control (default `5s`, slider `2s–30s`) under **Settings > News & Sources**, while letting zero-layout-shift counters (Feed Counter badge and Gap chip) update instantaneously upon SSE arrival.

#### 4. [Category 10] Category Tags Non-Color Accessibility Cues
- **Proposal**: Render each of the 11 category stamps with both a WCAG-compliant semantic color pair (`--cat-<name>-bg`/`-fg`) and a crisp non-color cue (e.g. distinct micro-icon or 2-character typographic bureau stamp alongside the label) so color-vision deficiency never obscures category distinction.
- **Confirmation needed**: Do you approve pairing tiny broadsheet glyphs/stamps alongside category names?



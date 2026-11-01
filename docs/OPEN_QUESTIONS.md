# Open Questions — PRD A: Main-App Upgrade
*Version 1.0 · 2026-11-01 · AI World News Desk*

---

## Active Questions Awaiting User Confirmation

### 1. [Category 8] Live Feed Counter Definition Confirmation
- **Brief Specification**: "Header icon with a live number badge = count of NEW unique articles saved in the last rolling 24 hours (by `ingested_at`, not `published_at`), updated in real time via SSE. Confirm this definition with me in OPEN_QUESTIONS.md first."
- **Proposed Implementation**:
  - The rolling 24-hour window is computed dynamically as:
    `COUNT(*) WHERE ingested_at >= datetime('now', '-24 hours')`.
  - Articles fetched with backfilled/older `published_at` dates (e.g., from an RSS catch-up or GDELT window) will count towards this rolling total if they arrived locally within the last 24 hours, because `ingested_at` reflects local desk ingestion.
  - Updates increment reactively via the SSE `ingest_update` event when an article is inserted.
- **Decision Request**: Does this exact calculation and metric behavior match your expectation?

---

### 2. [Category 2] Auto-Advance: Modal & Focus Pause Conditions
- **Brief Specification**: "Pause when hovering the left panel (switch): ON: while pointer is over left article panel, advancing stops. After pointer leaves, timer restarts with FULL interval. No other automatic pause conditions unless I approve them."
- **Question**: When the user opens a modal or full overlay (such as Settings Menu, TV View, Daily PDF Desk, or when typing into the Archive search input), should auto-advance:
  - **Option A (Recommended)**: Automatically suspend while any full-screen overlay/modal is open or an `<input>` has keyboard focus, and resume when closed/blurred.
  - **Option B (Strict Brief)**: Never pause for overlays or inputs unless the user explicitly toggles the manual Play/Pause button or hovers the left panel.
- **Decision Request**: Which pause behavior do you prefer for modals and inputs?

---

### 3. [Category 6] YouTube `@handle` Link Resolution
- **Brief Specification**: "@handle links: do NOT scrape. Ask me for the channel ID or propose the official API option and wait."
- **Proposed Implementation**:
  - Scrapers and HTML parsing will **NOT** be used.
  - When the user pastes an `@handle` URL (e.g. `https://www.youtube.com/@ABCNews`):
    - **Step 1**: The UI will request the official Channel ID (`UC...`) if known, OR
    - **Step 2**: If the user provides a `YOUTUBE_API_KEY` in settings, the backend calls YouTube Data API v3 (`channels.list?forHandle=...`) to resolve the canonical Channel ID and active live broadcast stream link automatically.
- **Decision Request**: Is this dual approach (manual Channel ID input fallback + optional YouTube Data API key resolution) approved?

---

### 4. [Category 5] Top 5 News Outlets Per Nation: Ranking Criteria
- **Brief Specification**: "For India, USA, China, Japan, Australia, find the top 5 news channels each (state your ranking criterion, e.g. audience reach, and the evidence)."
- **Proposed Ranking Criteria**:
  - Combined metric of **national broadcast reach**, **editorial prominence**, and **availability of official free-to-air or YouTube Live streams**:
    - **India**: NDTV 24x7, India Today, Aaj Tak, WION, ABP News *(BARC viewership & global English broadcast)*.
    - **USA**: ABC News Live, NBC News NOW, CBS News 24/7, PBS NewsHour, Bloomberg TV *(Nielsen reach & official free 24/7 news streams)*.
    - **China**: CGTN, CCTV-4 / CCTV News, Xinhua News, Phoenix InfoNews, Dragon TV *(Official national & international public broadcasters)*.
    - **Japan**: NHK World-Japan, ANN News (TV Asahi), Nippon TV News24, TBS News DIG, FNN Live (Fuji TV) *(Major commercial & public networks with official 24/7 digital live feeds)*.
    - **Australia**: ABC News Australia, SBS World News, Sky News Australia, 9 News, 7NEWS *(OzTAM free-to-air broadcast reach & official 24/7 YouTube live streams)*.
- **Decision Request**: Are these selected 5 outlets per nation and ranking criteria approved for `/config/channels-top5.json`?

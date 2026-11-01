# Tasks — AI World News Desk
*Version 1.0 · 2026-10-30*
Each phase is a stop-and-review checkpoint.

---

## Phase 1 — Backend Core (fetch, DB, AI pass, fallback)

**Goal:** A running Express server that fetches RSS, stores articles in SQLite, runs the AI pass through the fallback chain, and exposes basic REST + SSE.

### Tasks

- [x] P1-01 Scaffold monorepo: npm workspaces, TypeScript configs (strict), ESLint + Prettier
- [x] P1-02 Create `.env.example` with all provider key placeholders
- [x] P1-03 `config/sources.ts` — define source record type; leave placeholder entries
- [x] P1-04 `config/features.ts` — FEATURES object with all booleans defaulting to true
- [x] P1-05 `config/ai-providers.ts` — provider order, model names, base URLs, batch sizes
- [x] P1-06 `backend/src/db/schema.sql` + migration runner in `db.ts`
- [x] P1-07 `fetch/rss.ts` — parse RSS with `rss-parser`; normalise to ArticleRaw type
- [x] P1-08 `fetch/scheduler.ts` — setInterval wrapper, reads refresh_interval from settings
- [x] P1-09 `ai/gemini.ts` — Gemini Flash adapter (Google Generative AI SDK or OpenAI-compat)
- [x] P1-10 `ai/groq.ts` — OpenAI SDK with Groq base URL
- [x] P1-11 `ai/mistral.ts` — OpenAI SDK with Mistral base URL
- [x] P1-12 `ai/cerebras.ts` — OpenAI SDK with Cerebras base URL
- [x] P1-13 `ai/ollama.ts` — OpenAI SDK with local Ollama base URL (gated by FEATURES.ollama)
- [x] P1-14 `ai/router.ts` — try providers in order; emit `provider_switch` on fallback
- [x] P1-15 `ai/quota.ts` — insert to quota_log; in-memory cache for SSE push
- [x] P1-16 `pipeline/enricher.ts` — batch pending articles → AI → update DB
- [x] P1-17 `pipeline/dedup.ts` — skip articles with known URL
- [x] P1-18 `routes/articles.ts` — GET /api/articles (filter, paginate, FTS)
- [x] P1-19 `routes/sse.ts` — GET /api/sse; heartbeat every 30 s
- [x] P1-20 `routes/quota.ts` — GET /api/quota
- [x] P1-21 `routes/settings.ts` — GET + PATCH /api/settings
- [x] P1-22 `index.ts` — bind to 127.0.0.1:3001 only; log startup time

### Acceptance Criteria

- Server starts in < 3 s
- RSS fetch runs on schedule; articles appear in SQLite
- AI pass completes; `status` updates to `done`
- Provider fallback triggers on intentional 429 mock
- GET /api/articles returns valid JSON
- SSE stream sends heartbeat; sends `new_article` on insert
- No API key appears in any source file

---

## Phase 2 — Five Countries + Animal Feeds + Categories

**Goal:** All 24 starter outlets configured and live-tested; categories assigned.

### Tasks

- [x] P2-01 Live-test every RSS URL from PRD §7; replace dead feeds
- [x] P2-02 Populate `config/sources.ts` with validated outlet records
- [x] P2-03 `fetch/gdelt.ts` — GDELT API client for outlets without RSS
- [x] P2-04 `fetch/scraper.ts` — Mozilla Readability HTML extraction fallback
- [x] P2-05 `pipeline/cluster.ts` — TF-IDF cosine similarity; assign cluster_id
- [x] P2-06 DB: insert to `article_categories` from AI response
- [x] P2-07 DB: insert to `keywords` table from AI response
- [x] P2-08 Routes: GET /api/articles?category=Animals
- [x] P2-09 Routes: GET /api/clusters
- [x] P2-10 Manual smoke test: fetch cycle for each country, verify AI output

### Acceptance Criteria

- All 24 feeds return articles (or honest fallback logged)
- Each article has >= 1 category in DB
- Clustering groups same-event articles (manual check 3 examples)
- GET /api/articles?country=Japan returns only Japanese sources
- GET /api/articles?category=Animals returns wildlife articles

---

## Phase 3 — Main Screen + Bat Menu

**Goal:** React frontend shows the main two-panel layout, article card strip, category filters, bat settings drawer.

### Tasks

- [x] P3-01 Scaffold Vite + React + TypeScript frontend; proxy `/api` to :3001
- [x] P3-02 `global.css` with design system tokens from UI_SPEC §1
- [x] P3-03 `store/` — Zustand slices: articles, ui, settings, quota
- [x] P3-04 `hooks/useSSE.ts` — EventSource wrapper with auto-reconnect
- [x] P3-05 `hooks/useArticles.ts` — fetch + SSE merge
- [x] P3-06 `layout/Shell.tsx` — top bar, left panel, right panel, feed strip
- [x] P3-07 `bat/BatIcon.tsx` — SVG bat with flap animation; click opens drawer
- [x] P3-08 `bat/SettingsMenu.tsx` — all sections from UI_SPEC §7
- [x] P3-09 `article/ArticlePanel.tsx` — original/english toggle, outlet badge, flag
- [x] P3-10 `article/SummaryPanel.tsx` — typewriter text, keyword chips, metadata
- [x] P3-11 `article/CardStrip.tsx` — virtualised horizontal card list
- [x] P3-12 Category pill filter; country dropdown filter
- [x] P3-13 `quota/QuotaMeter.tsx` — bar per provider
- [x] P3-14 `alert/AlertBanner.tsx` — slides from top; stack up to 3
- [x] P3-15 SSE integration: new article cards appear without page refresh

### Acceptance Criteria

- Main screen renders with correct dark theme
- Clicking a card loads article + summary into panels
- Category filter changes card list without page reload
- Bat opens settings drawer with all sections visible
- Provider badge shows correct active provider
- Alert banner slides in on simulated breaking event

---

## Phase 4 — Reader & Scout Spiders

**Goal:** Reader spider walks the summary panel keywords with IK legs; Scout pre-marks next article.

### Tasks

- [x] P4-01 `canvas/engine.ts` — rAF loop, FPS monitor, drop logic
- [x] P4-02 `canvas/ik.ts` — 2-segment FABRIK solver; Lerp foot target
- [x] P4-03 `spider/SpiderCanvas.tsx` — `<canvas>` absolute overlay over summary panel
- [x] P4-04 `spider/spiderTypes/Reader.ts` — walk keyword chips; trigger typewriter
- [x] P4-05 `spider/spiderTypes/Scout.ts` — pre-mark next article keywords (dashed outline)
- [x] P4-06 Keyword chip positions reported to spider via DOM `getBoundingClientRect`
- [x] P4-07 Typewriter effect (40 char/s) driven by Reader spider position
- [x] P4-08 FPS drop: reduce active spiders below max_spiders when FPS < 30
- [x] P4-09 `prefers-reduced-motion` media query: disable animation, show static text

### Acceptance Criteria

- Reader spider walks smoothly between 3+ keyword chips
- All 8 legs move with visible IK (no stretching beyond reach)
- Typewriter text advances only as Reader reaches each keyword
- FPS counter (hidden, toggle with Ctrl+F) shows >= 30 on test machine
- Scout appears on next card; disappears when Reader moves there

---

## Phase 5 — Scheduler, Resume, Auto-Start, Catch-Up

**Goal:** App auto-starts on login; resumes cleanly; offers missed-news catch-up.

### Tasks

- [x] P5-01 `fetch/scheduler.ts` — persist last_fetched_at per source in DB
- [x] P5-02 On startup: detect gap since last_fetched_at; compute missed window
- [x] P5-03 GDELT date-range backfill for missed window (honest fallback if RSS-only)
- [x] P5-04 REST: GET /api/startup-status → `{ missed_minutes: 120, can_backfill: true }`
- [x] P5-05 Frontend: "Show missed news?" modal with options (Yes / Skip / Settings)
- [x] P5-06 Windows: generate Task Scheduler XML; npm script `setup:autostart:windows`
- [x] P5-07 macOS: generate launchd plist; npm script `setup:autostart:mac`
- [x] P5-08 Linux: generate systemd user service file; npm script `setup:autostart:linux`
- [x] P5-09 UI: honest gap warning ("RSS has no backfill; GDELT covered 60 of 120 minutes")

### Acceptance Criteria

- Stopping server and restarting shows correct missed_minutes
- GDELT backfill fetches articles from the gap period
- Auto-start scripts create valid OS entries (manual verify on target OS)
- Gap warning appears if backfill is incomplete

---

## Phase 6 — Alerts + Quota Meter

**Goal:** Breaking-news alert fires correctly; quota meter is live; provider-switch alert shown.

### Tasks

- [x] P6-01 `alerts/detector.ts` — check breaking_score >= threshold after every AI pass
- [x] P6-02 `alerts/detector.ts` — cluster rule: >= 3 outlets, >= 2 countries, within 30 min
- [x] P6-03 Insert to `alerts` table; push SSE `alert` event
- [x] P6-04 Desktop Notification API (with permission request on first run)
- [x] P6-05 Optional sound: play `/assets/alert.mp3` (user-provided or bundled tone)
- [x] P6-06 Frontend: AlertBanner stack; auto-dismiss after 30 s; "View Story" deeplink
- [x] P6-07 Quota meter live-updates from SSE `quota_update` events
- [x] P6-08 Provider switch: banner with amber colour, "switched from X to Y (reason)"
- [x] P6-09 Alert history: GET /api/alerts; PATCH /api/alerts/:id/acknowledge

### Acceptance Criteria

- Breaking article (score 85) triggers banner + desktop notification within 2 min
- Cluster rule fires when 3 test articles inserted with 2 countries within 30 min
- Sound plays if enabled (and browser allows audio)
- Quota meter bars update live as AI calls are made
- Alert history shows all unacknowledged alerts on settings page

---

## Phase 7 — Clustering, Compare Coverage, Weaver, Timelines

**Goal:** Story dedup works at scale; Compare Coverage screen live; Weaver spider threads keywords.

### Tasks

- [x] P7-01 `pipeline/cluster.ts` — cosine similarity on TF-IDF vectors (> 0.85 = same cluster)
- [x] P7-02 Update cluster `headline`, `outlet_count`, `country_count` on each new member
- [x] P7-03 GET /api/clusters/:id — full cluster with all articles
- [x] P7-04 `compare/CompareCoverage.tsx` — side-by-side columns per country
- [x] P7-05 Shared keyword highlighting across columns (same colour)
- [x] P7-06 `spider/spiderTypes/Weaver.ts` — draws SVG threads between shared keywords
- [x] P7-07 `timeline/StoryTimeline.tsx` — chronological event list for a cluster
- [x] P7-08 "Compare Coverage" button on summary panel (when cluster_count > 1)

### Acceptance Criteria

- Same Reuters + AP article clustered into one story (manual test)
- Compare Coverage shows 2+ country columns side by side
- Weaver spider draws visible thread lines between shared keywords
- Timeline shows events in chronological order with outlet badges

---

## Phase 8 — Watchlist, Archive Chat, 30-Day Cleanup

**Goal:** User can track topics; chat with the DB; old data auto-purged.

### Tasks

- [x] P8-01 GET / POST / PATCH / DELETE /api/watchlist
- [x] P8-02 Watchlist checker runs after each AI pass; push SSE alert if match
- [x] P8-03 `chat/ArchiveChat.tsx` — input + answer display + cited articles
- [x] P8-04 POST /api/search with `use_ai: true` — FTS + AI synthesis
- [x] P8-05 Archive spider activates during chat session
- [x] P8-06 Settings: auto-cleanup toggle; retention_days input
- [x] P8-07 Cleanup job: runs on startup and daily at 03:00; skips bookmarked
- [x] P8-08 DB size monitor: warn banner at 1.5 GB

### Acceptance Criteria

- Watchlist topic "bear bile" triggers alert when matching article arrives
- Archive chat returns relevant articles and AI answer in < 5 s
- Cleanup deletes articles older than retention period (verified with test data)
- Bookmarked articles survive cleanup

---

## Phase 9 — Globe + Wildlife Map

**Goal:** Interactive world map with story pins and wildlife-crime layer.

### Tasks

- [x] P9-01 Choose and integrate map library (react-simple-maps — lightweight)
- [x] P9-02 Aggregate `location_tags` from articles → lat/lon via country code table
- [x] P9-03 Story pin layer: dot per country, colour = top category, size = article count
- [x] P9-04 Wildlife-crime overlay: red shaded regions from `species_tags` + `Animals` category
- [x] P9-05 Hover tooltip: country name + article count + breaking badge
- [x] P9-06 Click country → filters main feed
- [x] P9-07 Globe/Map toggle button in top bar (gated by FEATURES.globe_view)

### Acceptance Criteria

- Map renders all 5 starter countries with pins
- Wildlife articles show red overlay on relevant countries
- Clicking India filters feed to Indian articles
- Tooltip shows correct count

---

## Phase 10 — PDF Export + Read-Aloud

**Goal:** Daily newspaper PDF and 2-minute morning briefing.

### Tasks

- [x] P10-01 `export/pdf.ts` — use PDFKit or Puppeteer to render newspaper layout
- [x] P10-02 POST /api/export/pdf → returns `application/pdf`
- [x] P10-03 Frontend: "Export Today's Paper" button in settings
- [x] P10-04 `export/briefing.ts` — send top 10 articles to AI; get 300-word briefing text
- [x] P10-05 GET /api/export/briefing → `{ text: "..." }`
- [x] P10-06 Frontend: "Morning Briefing" button; plays via Web Speech API
- [x] P10-07 (Optional) ElevenLabs voice if OQ-3 resolved in favour of it
- [x] P10-08 Read-aloud gated by FEATURES.read_aloud

### Acceptance Criteria

- PDF opens in browser with newspaper-style layout (masthead, columns, dates)
- Morning briefing text is coherent and < 400 words
- Read-aloud speaks text (Web Speech API at minimum)

---

## Phase 11 — TV View

**Goal:** Live IPTV channels playable in the app; animal shelf; health checking.

### Tasks

- [x] P11-01 `tv/iptv.ts` — fetch and parse iptv-org m3u playlists
- [x] P11-02 Parse channel metadata: name, country, category, stream_url, logo
- [x] P11-03 Upsert to `tv_channels` table
- [x] P11-04 `tv/health.ts` — HEAD/HLS probe per channel; mark is_alive
- [x] P11-05 GET /api/tv/channels with filter + health-check endpoint
- [x] P11-06 `tv/TVView.tsx` — sidebar channel list + hls.js video player
- [x] P11-07 "Animal & Discovery" shelf: filter by keyword + documentary category
- [x] P11-08 Favorites: PATCH /api/tv/channels/:id/favorite; pinned at list top
- [x] P11-09 "Open in VLC" button: `vlc://` protocol link fallback
- [x] P11-10 Dead streams hidden by default; "Show dead" toggle

### Acceptance Criteria

- At least 1 channel plays video in the browser
- Animal shelf shows relevant channels
- Dead streams are hidden; toggling shows them with strikethrough
- Favorites pin to top of list
- VLC link opens in VLC when clicked (platform dependent; document if not)

---

## Phase 12 — Remaining Spiders, Polish, README

**Goal:** All 6 spider types implemented; app is polished and documented.

### Tasks

- [x] P12-01 `spider/spiderTypes/RedAlert.ts` — red strobe glow; fast movement
- [x] P12-02 `spider/spiderTypes/Archive.ts` — magnifying glass on body during chat
- [x] P12-03 `spider/spiderTypes/Swarm.ts` — 5 small green spiders during catch-up
- [x] P12-04 Performance pass: virtualise all long lists; memoize heavy components
- [x] P12-05 Accessibility pass: ARIA labels; focus ring; reduced-motion
- [x] P12-06 Error boundary around every major panel
- [x] P12-07 `README.md` — setup, `.env` instructions, auto-start guide, adding a country
- [x] P12-08 Final integration test run (see TEST_PLAN.md Phase 12 section)

### Acceptance Criteria

- All 6 spider types render correctly
- No console errors on a fresh browser load
- README allows a new developer to run the app from scratch
- Lighthouse perf score >= 80 on localhost

# DNews — The Daily Bugle: Master Technical Manual & Architectural Specification

**Document Version:** 1.0.0 (Comprehensive Project Manual)  
**Project Name:** DNews — The Daily Bugle (ai-world-news-desk)  
**Current System Release:** v1.0.4  
**Author:** AI Systems Architecture & Core Engineering Team  
**Audience:** AI Agents, System Architects, Full-Stack Engineers, and Auditors  
**Repository:** `https://github.com/itsdattpatel/DNews_G`  

---

## TABLE OF CONTENTS
1. Executive Summary & Philosophy
2. Complete Technology Stack
3. High-Level System Architecture
4. Core Features & Module Walkthrough
   - 4.1 The Main Broadsheet Desk
   - 4.2 The Library (Wisdom, Philosophy, History & Mind)
   - 4.3 International Television & Nature Wire
   - 4.4 Interactive 3D News Globe
   - 4.5 Theme Studio & Universal Color Engine
   - 4.6 Pinch-to-Zoom & Viewport Scaling Engine
   - 4.7 Control Room & Telemetry Engine
   - 4.8 In-App Secrets Manager
   - 4.9 Auto-Updater & Deployment Pipeline
5. Database Architecture & SQLite Migrations
6. Backend Services & Pipeline Engineering
   - 6.1 RSS Ingest & Normalization Engine
   - 6.2 Deduplication & Story Clustering
   - 6.3 Two-Pass Hybrid AI Analysis Engine
   - 6.4 HLS Stream Proxy & SSRF Security Guard
7. Frontend Architecture, State & UI Tokens
8. Desktop Electron Process Engineering
9. Complete Directory & File Structure
10. Build, Test, Verification & Release Playbook
11. YouTube Live News Audit & Future Roadmap

---

## 1. EXECUTIVE SUMMARY & PHILOSOPHY

### 1.1 What is DNews?
**DNews (The Daily Bugle)** is an open-source, offline-first, high-performance desktop news and world intelligence station built on Electron 34, React 19, Express 4, and Better-SQLite3. It monitors over 150 global news wires, RSS feeds, live television broadcasts, and philosophical dispatches simultaneously.

### 1.2 The "Broadsheet 1920" Anti-Slop Design Philosophy
Unlike contemporary news aggregators that rely on generic flat cards, neon gradients, and cookie-cutter mobile layouts, DNews is strictly designed around a **1920s printed broadsheet newspaper aesthetic**:
- **Typography as Architecture:** Elegant serif body text (**EB Garamond**, **Playfair Display**, **Source Serif 4**, **Lora**) balanced against monospaced telegraphic readouts (**IBM Plex Mono**) and sans-serif functional headers (**Inter**).
- **Ink & Paper Tactility:** Surfaces mimic physical newsprint (`#FAF7F0` warm paper background, `#1A1208` deep printing ink) topped with an organic SVG paper-grain texture.
- **Physical Ink Stamps:** Categories and status badges look stamped with ink, featuring dashed borders, uppercase tracked letters, and ink bleed simulations.
- **Zero-Slop Rule (Strictly Enforced):**
  - No default purple/blue gradients.
  - No generic border-radius pill cards.
  - No Unicode emojis used as UI icons (all iconography is custom Lucide SVGs or custom Canvas drawings).
  - No placeholder lorem-ipsum text.
  - Every component features explicit Loading, Empty, and Error states.

---

## 2. COMPLETE TECHNOLOGY STACK

### 2.1 Desktop Shell
- **Electron:** v34.0.0 (Chromium 132 + Node.js 20.18 + V8).
- **electron-builder:** v24.13.3 (NSIS Windows installer packaging, portable builds, auto-updater metadata).
- **Architecture:** Multi-process architecture (Main process, Preload bridge with context isolation, Renderer process, and background Node.js Express daemon).

### 2.2 Frontend Client
- **React:** v19.0.0 (Modern hooks, concurrent rendering, strict typing).
- **TypeScript:** v5.5.0 (Strict mode, zero implicit `any`).
- **Build Tool:** Vite v5.4 (ESM native bundling, lightning HMR).
- **Styling:** Tailwind CSS v3.4 + Custom CSS Token Custom Properties + Dynamic DOM attribute scoping.
- **State Management:** Zustand v4.5 (Decoupled modular stores: app store, connectivity store, reader state).
- **Animations:** Framer Motion v11.11 (Physics-based layout transitions and broadsheet fold simulations).
- **3D Graphics:** Three.js v0.169 + Globe.gl v2.35 (Real-time interactive 3D globe with custom shaders and offline 2D canvas fallback).
- **Video & Media:** Hls.js v1.5.17 (HTML5 video streaming for master/child HLS `.m3u8` feeds) + YouTube Embed API.
- **Notifications:** Sonner v1.5 (Ink-stamped toast notification system).

### 2.3 Backend Daemon
- **Runtime:** Node.js v20+ / tsx runner.
- **Server Framework:** Express v4.18 (Lightweight REST API + Server-Sent Events).
- **Database:** Better-SQLite3 v13.0.3 (Synchronous C++ bindings, WAL mode enabled, zero memory leaks, local file isolation).
- **Ingestion & Parsing:** `rss-parser` v3.13, `@mozilla/readability` v0.5, `jsdom` v24.0.
- **Text & NLP:** `natural` v6.12 (TF-IDF vectorization, tokenization, Levenshtein distance matching).
- **AI Integrations:** Google Generative AI SDK (`@google/generative-ai` v0.21) + OpenAI SDK (`openai` v4.47).
- **Exporting:** `pdfkit` v0.20 (Automated broadsheet newspaper PDF generator).

---

## 3. HIGH-LEVEL SYSTEM ARCHITECTURE

```
                                +------------------------------------------+
                                |               DNews Desktop              |
                                |         (Electron Main Process)          |
                                +------------------------------------------+
                                     |                           |
               Spawns as child process               Registers WebRequest Headers
               Sets DNEWS_APP_DATA_DIR               & System Tray Manager
                                     |                           |
                                     v                           v
+------------------------------------------+       +------------------------------------------+
|            Express Backend               |       |             React Frontend               |
|         (127.0.0.1:3001 Daemon)          |       |         (Chromium Renderer)              |
+------------------------------------------+       +------------------------------------------+
| • SQLite DB with WAL Mode (17 migrations)|  REST | • Broadsheet Newspaper Layout Engine     |
| • 150+ RSS Feed Ingest Scheduler         |<======| • Dynamic Theme Studio (50 Presets + RGB)|
| • Story Deduplication & Clustering Engine|  SSE  | • HLS.js 16:9 Television Player Frame    |
| • Two-Pass Hybrid AI Pipeline            |======>| • Interactive 3D World Globe (Three.js)  |
| • HLS Stream Proxy & SSRF Guard          |       | • The Library (Wisdom, Philosophy, Mind) |
| • TV Channel Catalog & Health Probes     |       | • Pinch-to-Zoom Desktop Scaling Sync     |
+------------------------------------------+       +------------------------------------------+
```

### 3.1 Process Isolation & Security
- **No Direct Renderer Database Access:** The Chromium renderer has zero direct access to filesystem or SQLite. All operations flow through typed REST APIs (`http://127.0.0.1:3001/api/...`) or the typed `window.electronBridge` IPC context.
- **SSRF Guard:** The local media proxy inspects all requested streaming URLs, rejecting private IP spaces (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, link-local, IPv6 loopbacks) and non-standard protocols.
- **Header Injection:** Electron's `session.defaultSession.webRequest` injects `Referer: https://www.youtube.com/` and strips `X-Frame-Options` on media embeds to preserve playback capability.

---

## 4. CORE FEATURES & MODULE WALKTHROUGH

### 4.1 The Main Broadsheet Desk (`DeskView.tsx`)
The centerpiece of the application. Designed to replicate opening a morning edition of *The Times* or *The Daily Bugle* in 1920:
- **Telegraphic Breaking Ticker:** A persistent marquee displaying real-time breaking alerts with publisher attribution and publication deltas.
- **Regional Edition Switcher:** Seamlessly switch editorial perspective: World Desk, India Edition, United States, Europe, Asia-Pacific, Middle East, and Africa.
- **Lead Story & Dynamic Multi-Column Grid:** The lead article occupies an expansive editorial space with drop caps and bylines, flanked by 2-column and 3-column sub-leads with variable typographic hierarchy.
- **Auto-Advance Reading Engine:** An automated hands-free teleprompter state machine with customizable dwell times (3s–30s), keyboard spacebar pause/resume, and an optional visual Debug HUD.
- **Evidence Markers & Verification Badges:** Articles display factual corroboration badges: `Single Source`, `Corroborated (3 Outlets)`, or `Developing Wire`. Clicking any badge reveals the underlying sources and bias comparison.

### 4.2 The Library (`LibraryRoot.tsx`)
A dedicated scholarly sanctuary for long-form reading, philosophy, and historical context:
- **Wisdom Folio (`WisdomSubpage.tsx`):** Curated philosophical reflections, timeless literature quotes, and contemplative epigrams styled like vintage leather-bound parchment.
- **Historical Parallels (`HistorySubpage.tsx`):** AI-powered analysis linking breaking 2026 world events to historical precedents from the 18th, 19th, and 20th centuries.
- **Cognitive Bias & Mind Tracker (`MindSubpage.tsx`):** Identifies rhetorical fallacies, framing biases, and media sensationalism across competing outlets.
- **Archive Chat & Retrospective Search (`ArchiveSubpage.tsx`):** Natural-language conversational search over thousands of previously ingested articles stored in local SQLite.

### 4.3 International Television & Nature Wire (`TVView.tsx`)
A complete 24/7 live television broadcast center integrated into the broadsheet:
- **HLS Direct Streaming:** Employs `Hls.js` to play official master `.m3u8` streams from Akamai, Cloudflare, and AWS CloudFront with zero ads and low latency.
- **Curated Top 5 News Outlets Per Nation:** Verified broadcast signals for India (Aaj Tak, NDTV, India Today), USA (ABC News, CBS), UK (BBC News), France (France 24), Japan (NHK World), China (CGTN), and more.
- **YouTube Embed Snippet Parser:** Allows users to paste video URLs, @handles, or raw `<iframe>` embed codes. Extracts the video ID and normalizes embed parameters automatically.
- **Multi-Method Playback Switcher:** Easily toggle between HLS Proxy, YouTube Embed, or launch in external VLC / OS Browser.
- **Floating Mini-Player (`TVMiniPlayer.tsx`):** Picture-in-picture docked monitor at the bottom-right corner that persists while navigating articles or The Library.

### 4.4 Interactive 3D News Globe (`Globe3D.tsx`)
- **Geospatial News Visualization:** Renders a physical 3D globe using Three.js and Globe.gl, pinning breaking news stories to their geographical coordinates.
- **Interactive Country Arcs:** Visualizes international diplomatic tension, trade flows, and bilateral relationships with glowing atmospheric arcs.
- **Offline Canvas Fallback:** If WebGL is unavailable or disabled, the application gracefully degrades to a 2D Mercator canvas map without crashing.

### 4.5 Theme Studio & Universal Color Engine (`ThemeStudioDrawer.tsx` & `themes.ts`)
- **50 Handcrafted Historical & Aesthetic Themes:**
  - *Broadsheet Classics:* London Broadsheet 1920, Victorian Newsprint, Fleet Street Evening, Parchment Sepia, Oxford Rag Paper.
  - *Royal & Dynastic:* Versailles Gold, Imperial Jade, Tudor Crimson, Byzantine Tyrian, Roman Marble, Bourbon Fleur.
  - *Aesthetic & Literary:* Hemingway Key West, Orwellian Ministry, Walden Pond, Dark Academia, Kyoto Washi.
  - *High-Contrast Editions:* Obsidian Nocturne, Broadside Monochrome, Cyber Ink, Terminal Phosphor.
- **Bidirectional Custom RGB Studio:** Allows users to select any background color via color wheel, RGB sliders, or hex input.
- **Automated High-Contrast Ink Calculation:** Calculates perceptual luminance ($Y = 0.299R + 0.587G + 0.114B$) to automatically compute perfectly legible ink, border, muted text, and card surface shades.
- **Dynamic DOM Protection:** Disarms static CSS fallback rules via `[data-dynamic-theme="true"]` so custom colors cascade universally across TopBar, Desks, Modals, and The Library.

### 4.6 Pinch-to-Zoom & Viewport Scaling Engine (`usePinchZoom.ts`)
- **Native Trackpad & Wheel Pinch Detection:** Detects `Ctrl + Wheel` or trackpad pinch gestures, dynamically calculating zoom factors between 70% and 180%.
- **Electron IPC Synchronization:** Syncs zoom level directly with Chromium's native webContents zoom via `window.electronBridge.setZoomFactor`.
- **CSS Proportional Fallback:** Scales root `--zoom-scale` custom property and base font sizes so typography, card padding, and column widths scale smoothly on all displays.

### 4.7 Control Room & Telemetry Engine (`ControlRoomView.tsx`)
- **Ingestion Telemetry:** Monitors real-time throughput of the 150+ RSS fetch queues.
- **Health Indicators:** Displays ping latency, fetch failures, and parser health for every active wire.
- **Deduplication Statistics:** Tracks identical story merges, clustering efficiency, and memory footprint.

### 4.8 In-App Secrets Manager (`SecretsManagerModal.tsx`)
- **Zero Cloud Leakage:** Allows users to enter API keys (Google Gemini, OpenAI, YouTube Data API) directly in the UI.
- **Local Persistence:** Keys are saved locally to `%APPDATA%\DNews\user.env` and loaded securely into the backend process environment without being tracked in Git.

### 4.9 Auto-Updater & Deployment Pipeline (`updater.ts`)
- **Electron-Updater:** Checks `https://github.com/itsdattpatel/DNews_G/releases/latest/download/latest.yml` on application launch.
- **Hyphenated NSIS Installer Packaging:** Configured with `artifactName: "${productName}-Setup-${version}.${ext}"` to ensure installer names match `latest.yml` manifests without spaces, eliminating 404 download errors.
- **Background Silent Downloads:** Downloads updates in the background and prompts user to restart.

---

## 5. DATABASE ARCHITECTURE & SQLITE MIGRATIONS

DNews uses **Better-SQLite3** configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and synchronous normal mode for maximum durability and sub-millisecond query performance.

All schema definitions live in `backend/src/db/migrations/`:
1. `001_initial.sql`: Core tables (`articles`, `sources`, `topics`, `watchlist`).
2. `002_tv_channels.sql`: TV wire channel catalog with country codes, categories, stream URLs.
3. `003_anchor_phrases.sql`: Anchor phrases for semantic deduplication and topic clustering.
4. `004_remove_spider_settings.sql`: Deprecation of legacy scraper configurations.
5. `005_evidence_highlight_settings.sql`: Settings for quote markers and source corroboration.
6. `006_dual_timestamps.sql`: Tracking `published_at` vs. `ingested_at` for breaking latency metrics.
7. `007_realtime_foundation.sql`: Real-time SSE event queuing tables and heartbeat logs.
8. `008_purge_bootstrap_dummy_rows.sql`: Purges mock test rows on initial setup.
9. `009_tv_channels_expansion.sql`: Extended IPTV metadata (logo URLs, audio tracks, language).
10. `010_tv_channel_health.sql`: Method-specific health logs (`hls`, `youtube`, `vlc`), ping latencies.
11. `011_ingest_telemetry.sql`: RSS fetcher metrics, error logging, and source uptime records.
12. `012_two_pass_ai.sql`: Stores Pass 1 heuristic extractions and Pass 2 LLM entity resolutions.
13. `013_control_room_telemetry.sql`: Real-time system diagnostics and performance gauges.
14. `014_library_tables.sql`: Dedicated library tables (`library_quotes`, `library_concepts`, `library_timeline`).
15. `015_library_review_status.sql`: Human editorial flags and verification statuses for library items.
16. `016_sources_metadata.sql`: Publisher bias ratings, ownership records, and country origins.
17. `017_article_normalization.sql`: Standardized normalized article fields for cross-wire comparison.

---

## 6. BACKEND SERVICES & PIPELINE ENGINEERING

### 6.1 RSS Ingest & Normalization Engine (`backend/src/fetch/`)
- Runs on an autonomous background timer (every 15 minutes or on-demand).
- Parses RSS 2.0, Atom, and JSON feeds across 155 publishers.
- Extracts clean readability text, removes advertisements, resolves relative URLs, and strips tracking query parameters.

### 6.2 Deduplication & Story Clustering (`backend/src/pipeline/dedup.ts`)
- **Pass 1 — URL & GUID Normalization:** Strips UTM tags, normalizes canonical domains.
- **Pass 2 — Headline Similarity:** Calculates Levenshtein distance and token intersection over union (IoU) with a 0.72 similarity threshold.
- **Pass 3 — Temporal Clustering:** Groups stories published within a 6-hour window into single multi-source story clusters with evidence markers.

### 6.3 Two-Pass Hybrid AI Analysis Engine (`backend/src/ai/`)
- **Pass 1 (Zero-Cost Local Heuristics):** Runs immediately upon ingestion using regex and NLP libraries (`natural`). Extracts key quotes, named entities, currency figures, and geographic locations without consuming LLM API tokens.
- **Pass 2 (Selective Deep Reasoning):** For breaking stories or library deep-dives, calls Google Gemini 1.5 Flash / OpenAI GPT-4o to synthesize multi-source perspectives, identify reporting bias, and generate historical parallels.

### 6.4 HLS Stream Proxy & SSRF Security Guard (`backend/src/tv/proxy.ts`)
- Proxies upstream `.m3u8` playlists and `.ts` video chunks to bypass CORS restrictions in modern browsers.
- Automatically rewrites relative chunk URLs in playlists to point back through the local proxy.
- **SSRF Guard (`backend/src/tv/ssrf.ts`):** Validates hostnames via DNS lookup before fetching. Automatically blocks private networks (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, link-local, `localhost`, `0.0.0.0`).

---

## 7. FRONTEND ARCHITECTURE, STATE & UI TOKENS

### 7.1 State Store Architecture (`frontend/src/store/useAppStore.ts`)
The application uses a centralized Zustand store with persistence:
- **Active Navigation & Modals:** `isTvViewOpen`, `isLibraryOpen`, `isSettingsOpen`, `isThemeStudioOpen`, `isControlRoomOpen`.
- **Theme State:** Active theme preset slug, custom RGB values, day/night mode.
- **Audio & Media State:** Selected TV channel, volume level, mute state, floating mini-player visibility.
- **Auto-Advance Teleprompter:** Enabled flag, timer delay, paused state, reading index.

### 7.2 Styling Tokens & Dynamic Overrides (`frontend/src/styles/`)
- `global.css`: Base broadsheet rules, paper grain overlays, serif font bindings, and static theme declarations (`:root:not([data-dynamic-theme="true"])`).
- `themes.ts`: 50 presets and the `applyThemeToDOM` function. Injects 15 CSS custom properties directly onto document root (`--color-paper`, `--color-paper-alt`, `--color-paper-card`, `--color-paper-border`, `--color-ink`, `--color-ink-secondary`, `--color-ink-muted`, `--color-accent`, etc.).

---

## 8. DESKTOP ELECTRON PROCESS ENGINEERING (`electron/`)

### 8.1 Single-Instance Mutex Lock
`app.requestSingleInstanceLock()` ensures only one instance of DNews runs at a time. If a user launches a second executable, the running instance focuses its window and the second process exits cleanly.

### 8.2 Lifecycle & Backend Daemon Spawning
1. Electron initializes and loads user environment secrets from `%APPDATA%\DNews\user.env`.
2. Locates runtime Node binary (bundled `assets/bin/node.exe` in production, or system `node`).
3. Spawns Express backend daemon with `DNEWS_APP_DATA_DIR` pointing to `%APPDATA%\DNews`.
4. Polls `http://127.0.0.1:3001/api/health` until HTTP 200 is confirmed before displaying the main BrowserWindow.
5. On quit, flushes SQLite WAL checkpoints and terminates child processes gracefully.

### 8.3 Context Isolation & IPC Bridge (`electron/preload.ts`)
Renderer context isolation is fully preserved. The `window.electronBridge` API exposes strictly typed methods:
- `getAppVersion()`, `getAppDataDir()`
- `openExternal(url)`
- `setZoomFactor(factor)`, `getZoomFactor()`
- `checkForUpdates()`, `downloadUpdate()`, `installUpdate()`
- `showNotification(title, body, action)`

---

## 9. COMPLETE DIRECTORY & FILE STRUCTURE

```
E:\DNews_G\
├── .agent\skills\              # AI agent specialized development skills
├── assets\                     # Application icons, logos, bundled binaries (node.exe)
├── backend\                    # Express + SQLite Backend Daemon
│   ├── src\
│   │   ├── ai\                 # Two-pass AI engine & LLM provider integrations
│   │   ├── alerts\             # Breaking news notification triggers
│   │   ├── db\                 # SQLite connection & 17 SQL migrations
│   │   ├── fetch\              # RSS parsers & article text extractors
│   │   ├── library\            # Library database queries & endpoints
│   │   ├── pipeline\           # Deduplication, clustering, NLP pipelines
│   │   ├── routes\             # Express REST routes (articles, tv, settings, etc.)
│   │   ├── tv\                 # IPTV catalog, HLS proxy, SSRF guard, YouTube parser
│   │   └── index.ts            # Backend application bootstrap & server listen
│   ├── package.json            # Backend dependencies
│   └── tsconfig.json           # Backend TypeScript configuration
├── config\                     # Static configurations & Top-5 TV channel JSONs
├── docs\                       # Architectural specifications & PRDs
│   ├── DESIGN_SYSTEM.md        # Complete Broadsheet 1920 design system tokens
│   ├── PRD.md                  # Master product requirement documents
│   ├── YOUTUBE_LIVE_NEWS_EMBED_AUDIT.md # Technical audit of YouTube live stream policies
│   └── ...
├── electron\                   # Electron Host Shell
│   ├── main.ts                 # Main process, window lifecycle, webRequest headers
│   ├── preload.ts              # Secure contextBridge IPC bridge
│   ├── tray.ts                 # Windows notification area system tray manager
│   ├── updater.ts              # Auto-updater with GitHub Releases integration
│   └── tsconfig.json           # Electron TypeScript configuration
├── frontend\                   # React 19 Client Application
│   ├── src\
│   │   ├── components\         # Reusable UI components
│   │   │   ├── layout\         # Shell, TopBar, RegionSwitcher, UpdateBanner
│   │   │   ├── news\           # DeskView, ArticleCard, AutoAdvanceHUD, Marquee
│   │   │   ├── tv\             # TVView, TVMiniPlayer, AddYouTubeChannelModal
│   │   │   ├── globe\          # Globe3D (Three.js), Canvas fallback
│   │   │   └── settings\       # ThemeStudioDrawer, SecretsManagerModal
│   │   ├── library\            # The Library views (Wisdom, History, Mind, Archive)
│   │   ├── store\              # Zustand app state & connectivity stores
│   │   ├── styles\             # global.css, themes.ts (50 presets + RGB engine)
│   │   ├── types\              # TypeScript shared data models
│   │   └── App.tsx             # Root router & layout orchestrator
│   ├── package.json            # Frontend dependencies
│   └── vite.config.ts          # Vite configuration & dev proxy
├── release\                    # Production NSIS installers (DNews-Setup-1.0.4.exe)
├── scripts\                    # Automated testing, verification & build scripts
├── electron-builder.json       # Electron packaging & NSIS hyphenated naming config
├── package.json                # Root package workspace definition
└── README.md                   # Public repository documentation
```

---

## 10. BUILD, TEST, VERIFICATION & RELEASE PLAYBOOK

### 10.1 Local Development Setup
```bash
# Install root, backend, and frontend dependencies
npm install

# Run backend + frontend concurrently in browser mode
npm run dev

# Run full desktop Electron application with HMR
npm run dev:electron
```

### 10.2 Automated Test Suites
```bash
# Run all frontend tests (56 test files, 325 unit tests)
npm --prefix frontend test

# Run backend unit tests
npm --prefix backend test -- tv-playback.test.ts

# Compile TypeScript across all layers
npm run build:electron
npm --prefix backend run build
npm --prefix frontend run build
```

### 10.3 Packaging the Production Installer
```bash
# Packages NSIS installer into release/DNews-Setup-X.X.X.exe
npm run package:win
```

### 10.4 Publishing a New Release to GitHub
1. Update version in `package.json`, `frontend/package.json`, `backend/package.json`.
2. Commit and push changes to `main` branch:
   ```bash
   git add .
   git commit -m "chore(release): bump v1.0.X"
   git push origin main
   ```
3. Run `npm run package:win` to generate `release/DNews-Setup-1.0.X.exe` and `release/latest.yml`.
4. Go to `https://github.com/itsdattpatel/DNews_G/releases/new`.
5. Enter tag `v1.0.X` (create tag on publish).
6. Upload both `DNews-Setup-1.0.X.exe` and `latest.yml`.
7. Click **Publish release**.

---

## 11. YOUTUBE LIVE NEWS AUDIT & FUTURE ROADMAP

### 11.1 The YouTube Live News Constraint
- **VOD Videos Work Flawlessly:** Normal YouTube videos play in DNews's `iframe` embed because DNews injects authorized `Referer` and `Origin` headers via Electron.
- **24/7 News Channels Block Embeds:** Television broadcasters (Aaj Tak, India Today, NDTV, BBC, CNN) explicitly set `allow_embed = false` in YouTube Studio due to cable TV exclusivity agreements. YouTube's server enforces this restriction before returning video streams.

### 11.2 The Production Solution
1. **Primary Broadcast Path:** Use official **HLS (`.m3u8`) CDN streams** for 24/7 news television. They provide 0 ads, zero embed blocks, and 100% reliability through DNews's built-in `hls.js` engine.
2. **Secondary Path:** For YouTube broadcasts with disabled embedding, provide 1-click fallback buttons: **"Switch to Official Live HLS Signal"** or **"Open in YouTube (External Browser)"**.
3. **Future Milestone (Option 2):** Mount an Electron `BrowserView` pointing to `youtube.com/watch?v=...` (non-embed) if native YouTube live playback inside the desktop window is required.

---

*End of Master Technical Manual.*

# Product Requirements Document — AI World News Desk
*Version 1.0 · 2026-10-30 · Single-user local web app*

---

## 1. Purpose

**AI World News Desk** is a self-hosted, single-user web application that runs on the user's laptop. It collects news from multiple countries, summarises and translates it with AI, clusters the same story across outlets, and displays it through an animated spider-character reading interface. It is never hosted in the cloud and has no multi-user features.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Aggregate RSS / GDELT / scraped news from 20+ outlets across 5 starter countries |
| G2 | AI-translate every article to English and produce summary, keywords, categories, breaking score, and spider-type suggestion |
| G3 | Deduplicate and cluster the same event across outlets into one story card |
| G4 | Display animated spider readers with inverse-kinematics legs stepping on keywords |
| G5 | Provide category, country, and watchlist filtering with zero network round-trips (DB-only) |
| G6 | Alert on breaking news (high score OR >= 3 outlets in >= 2 countries within 30 minutes) |
| G7 | Auto-start on laptop login; resume cleanly; offer missed-news catch-up |
| G8 | TV view with live IPTV streams and health checking |
| G9 | Daily PDF newspaper export and read-aloud briefing |
| G10 | All secrets in `.env` only; all features toggle-able |

---

## 3. Non-Goals

- Multi-user accounts or authentication
- Cloud hosting or external exposure
- Selling, publishing, or sharing the compiled app
- Newspaper PDF scraping / OCR of print editions

---

## 4. Users & Environment

- **One user** — the developer / owner on a Windows / macOS / Linux laptop
- Always localhost; no HTTPS required
- Node.js >= 20, SQLite >= 3.39 (FTS5 available), React 18+, Vite 5+

---

## 5. Functional Requirements

### 5.1 News Pipeline

| ID | Requirement |
|----|-------------|
| NP-1 | Fetch RSS feeds on a configurable interval (default 5 min, range 1–60) |
| NP-2 | Fall back to GDELT event API when RSS is unavailable |
| NP-3 | Fall back to HTML text extraction (Readability) when GDELT has no article |
| NP-4 | Adding a new country/outlet = one line in `config/sources.ts` |
| NP-5 | Deduplicate articles by URL; cluster by title/content similarity (cosine >= 0.85) |
| NP-6 | Store raw HTML, original text, translated text, summary, keywords, categories in SQLite |
| NP-7 | Wildlife/animal feeds treated as a special country "Animals" |
| NP-8 | Optional auto-delete articles older than 30 days (bookmarked articles exempt) |

### 5.2 AI Layer

| ID | Requirement |
|----|-------------|
| AI-1 | Primary provider: Gemini Flash (free tier) |
| AI-2 | Automatic fallback chain: Groq -> Mistral -> Cerebras -> Ollama (local, optional) |
| AI-3 | Fallback triggers: HTTP 429, HTTP 503, model-not-found error, or timeout > 20 s |
| AI-4 | Per-provider quota meter visible in UI |
| AI-5 | Alert banner + desktop notification when provider switches |
| AI-6 | One batched request per article set; response is strict JSON (schema in AI_PROMPTS.md) |
| AI-7 | Base URL and model name for every provider configurable in `.env` |
| AI-8 | AI never generates code; it only populates the fixed JSON schema |

### 5.3 Spider Characters

| Spider | Role |
|--------|------|
| Reader | Steps keyword-to-keyword as summary types; main reading spider |
| Scout  | Pre-marks the next article keywords before Reader arrives |
| Weaver | Threads visual connections between matching keywords across countries |
| Red Alert | Animates on breaking-news cards |
| Archive | Triggered during archive search sessions |
| Swarm  | Appears during backlog catch-up; multiple small spiders |

Rules:
- Max-spiders setting; excess spiders dropped when FPS < 30
- AI picks spider TYPE from the fixed list above — no code generation
- Legs use 2-segment inverse kinematics; target = keyword bounding-box centre

### 5.4 Categories

`World · Politics · Business · Tech · Science · Health · Sports · Entertainment · Environment · Crime · Animals`

AI assigns categories; clicking a filter button queries DB only (no re-fetch).

### 5.5 UI Screens

| Screen | Description |
|--------|-------------|
| Main | Left: original article text + outlet badge. Right: summary page with active spider |
| Settings | Opens from bat-icon menu; all toggles, keys, thresholds, quota meters |
| Compare Coverage | Same clustered story, one column per country |
| Globe / Map | World map with story pins; wildlife-crime overlay layer |
| Story Timeline | Chronological event sequence for a clustered story |
| Archive Chat | Natural-language query -> DB FTS -> AI answer |
| TV View | IPTV channel list (hls.js player) + animal/documentary shelf |
| PDF Export | Daily newspaper-style PDF |
| Morning Briefing | 2-minute read-aloud summary of top stories |

### 5.6 Alerts

Trigger on any of:
- Breaking score >= configurable threshold (default 75)
- Same event in >= 3 outlets across >= 2 countries within 30 minutes

Alert forms: in-app banner + browser desktop notification + optional sound.

### 5.7 Auto-Start & Resume

- Windows: Task Scheduler entry
- macOS: launchd plist
- Linux: systemd user service
- On startup: load most-recent DB articles first, then prompt "Show missed news?"
- Honest about RSS gaps (no backfill); GDELT fills by date range where possible

### 5.8 TV View

- Source: iptv-org GitHub playlist API
- Player: hls.js; fallback "Open in VLC" button
- Animal & Discovery shelf: keyword + documentary category filter
- Favorites stored in DB
- Stream health checker on load; hides streams failing after 10 s

---

## 6. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-1 | App cold-start < 5 s; first articles visible < 10 s |
| NF-2 | Canvas animation sustains >= 30 FPS on integrated GPU |
| NF-3 | SQLite file warn at 1.5 GB; error at 2 GB |
| NF-4 | No secret ever committed to source control |
| NF-5 | Every feature exposed as boolean toggle in `config/features.ts` |
| NF-6 | All modules independently importable; no circular dependencies |
| NF-7 | TypeScript strict mode; ESLint + Prettier enforced |

---

## 7. Starter News Sources (to be live-tested in Phase 2)

| Country | Outlet | Type |
|---------|--------|------|
| India | The Hindu | RSS |
| India | NDTV | RSS |
| India | Times of India | RSS |
| India | Indian Express | RSS |
| USA | NPR | RSS |
| USA | Reuters | RSS |
| USA | AP News | RSS |
| USA | PBS NewsHour | RSS |
| China | CGTN | RSS |
| China | Xinhua English | RSS |
| China | China Daily | RSS |
| China | Global Times | RSS |
| Japan | NHK World | RSS |
| Japan | Japan Times | RSS |
| Japan | Asahi Shimbun (English) | RSS |
| Japan | Kyodo News | RSS |
| Australia | ABC News AU | RSS |
| Australia | Sydney Morning Herald | RSS |
| Australia | The Guardian AU | RSS |
| Australia | SBS News | RSS |
| Animals | WWF News | RSS |
| Animals | TRAFFIC (wildlife trade) | RSS |
| Animals | National Geographic | RSS |
| Animals | WCS Newsroom | RSS |

> Every URL is live-tested before the Phase 2 commit. Dead feeds are replaced.

---

## 8. Open Questions — RESOLVED

| # | Question | Answer |
|---|----------|--------|
| OQ-1 | Which Gemini model? | User has Gemini Pro subscription. Default = `gemini-2.5-flash` (fast, capable). Override via `GEMINI_MODEL` in `.env`. If 2.5-flash is unavailable the router tries `gemini-1.5-pro` automatically. |
| OQ-2 | Compare Coverage > 5 countries? | No — only when user explicitly requests it. Max columns = user-defined. |
| OQ-3 | Read-aloud voice? | Web Speech API only (no ElevenLabs). UI sounds: smooth click/hover sounds for all buttons + distinct alert chime. No Ollama TTS. |
| OQ-4 | Ollama? | **Disabled entirely** — user has no dedicated GPU. `FEATURES.ollama = false`; removed from fallback chain. Fallback chain: Gemini → Groq → Mistral → Cerebras. |

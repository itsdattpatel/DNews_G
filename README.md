# 🦇 AI World News Desk

> **The tactile authority of investigative print journalism meets high-velocity mechanical intelligence.**
> *Real-time global news aggregation, multi-provider AI translation & enrichment, verbatim evidence linking, offline radar maps, and live streaming video desks.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5-003B57.svg)](https://sqlite.org/)
[![Vitest](https://img.shields.io/badge/Tests-112%20Passed-22c55e.svg)](https://vitest.dev/)
[![Design System](https://img.shields.io/badge/Aesthetic-Anti--Slop%20Editorial-a78bfa.svg)](docs/DESIGN_SYSTEM.md)

---

## 📰 Architectural Overview

AI World News Desk is an offline-resilient, autonomous investigative news workstation designed to ingest, translate, cluster, and synthesize news from across the globe in real time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI WORLD NEWS DESK                               │
├───────────────────────────────┬─────────────────────────────────────────────┤
│  ORIGINAL ARTICLE WIRE        │  AI EXECUTIVE SYNTHESIS                     │
│  - Multi-language source text │  - Real-time typewriter delivery (40 char/s)│
│  - Native outlet attribution  │  - Verbatim anchor phrase evidence linking  │
│  - Country & topic classification - Dynamic breaking impact score (0-100%)  │
│  - Direct link to origin      │  - Editorial keyword chips & bookmarks      │
├───────────────────────────────┴─────────────────────────────────────────────┤
│  DISPATCH WIRE (Virtualised broadsheet card strip)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  INTELLIGENCE SUITES:                                                       │
│  🗺️ Global Radar Map   🗄️ Morgue Archive Chat   🦁 Live IPTV Feeds          │
│  🎙️ Morning Radio     📰 Broadsheet PDF Export  🕸️ Silk Coverage Compare   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Anti-Slop Newspaper Aesthetic
- **Tactile Ink & Paper**: Deep midnight slate paper (`#0a0e1a`) with charcoal card surfaces (`#111827`) and architectural hairline dividers (`#1e293b`).
- **Editorial Typography**: Classic newspaper serif headers and body (`Playfair Display` / `Merriweather`) paired with crisp sans-serif controls (`Inter`) and monospace teletypes (`JetBrains Mono`).
- **Zero Stock Slop**: No generic purple/blue gradients, no stock icon kits, and no emojis used as interface icons. The flapping mechanical bat and the global radar are custom procedural Canvas and SVG drawings.
- **Fail-Safe Resilience**: Every panel is isolated with an editorial `ErrorBoundary` teletype fallback, and all components support loading, empty, and error states.

---

## ⚡ Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **C/C++ Build Tools**: Required by `better-sqlite3` native bindings (Windows: `npm install -g windows-build-tools` or Visual Studio C++ Build Tools; macOS: Xcode Command Line Tools; Linux: `build-essential`).

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/ai-world-news-desk.git
cd ai-world-news-desk

# 2. Install dependencies across backend & frontend workspaces
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Initialize database migrations and seed sources
npm run build --workspace=backend

# 5. Start development servers (Backend: http://127.0.0.1:3001 | Frontend: http://localhost:5173)
npm run dev
```

---

## 🔑 Environment Configuration (`.env`)

Configure your API keys in `.env` at the project root. The desk operates with a **4-tier automatic failover hierarchy** (Gemini → Groq → Mistral → Cerebras) and falls back gracefully to deterministic editorial synthesis if all keys are omitted or rate-limited.

```bash
# --- Server Ports & Host ---
PORT=3001
HOST=127.0.0.1
DATABASE_PATH=./data/newsdesk.sqlite

# --- Primary AI Provider: Google Gemini (Recommended) ---
# Get key: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# --- Secondary AI Provider: Groq (Ultra-low latency fallback) ---
# Get key: https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# --- Tertiary AI Provider: Mistral AI (Multilingual fallback) ---
# Get key: https://console.mistral.ai/
MISTRAL_API_KEY=your_mistral_api_key_here

# --- Quaternary AI Provider: Cerebras (High-speed inference fallback) ---
# Get key: https://cloud.cerebras.ai/
CEREBRAS_API_KEY=your_cerebras_api_key_here

# --- AI Fallback Thresholds & Polling Cadence ---
AI_TIMEOUT_MS=12000
AI_RATE_LIMIT_COOLDOWN_SEC=60
SCHEDULER_INTERVAL_MINUTES=5
RETENTION_DAYS=30
```

---

## 🛠️ Cross-Platform Background Autostart

The news desk runs 24/7 as a background service without user intervention. Built-in generators automatically produce native platform configuration files in `/autostart`:

### Windows (Task Scheduler)
Generates `autostart/windows-task-scheduler.xml` set for system boot with automatic wake-on-gap recovery:
```powershell
# Register the background task (run as Administrator)
schtasks /create /tn "AIWorldNewsDesk" /xml "autostart\windows-task-scheduler.xml" /f
```

### macOS (launchd)
Generates `autostart/com.aiworldnewsdesk.app.plist` running continuously in the user domain:
```bash
cp autostart/com.aiworldnewsdesk.app.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.aiworldnewsdesk.app.plist
```

### Linux (systemd)
Generates `autostart/ai-world-news-desk.service` for user systemd supervisors:
```bash
mkdir -p ~/.config/systemd/user/
cp autostart/ai-world-news-desk.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now ai-world-news-desk.service
```

---

## 🌐 Adding Custom Sources, Countries & IPTV Streams

### 1. Adding an RSS / Scraper Source
Open `backend/src/config/sources.ts` and add your outlet definition:
```typescript
{
  slug: 'france_lemonde',
  name: 'Le Monde',
  country: 'France',
  url: 'https://www.lemonde.fr/rss/une.xml',
  fetch_type: 'rss',
  enabled: true,
}
```

### 2. Adding a Country to the Radar Filter
1. In `frontend/src/components/layout/TopBar.tsx`, add the country to the `COUNTRIES` list:
```typescript
{ label: 'France 🇫🇷', value: 'France' },
```
2. In `backend/src/config/sources.ts`, assign articles with `country: 'France'`. The radar map will automatically pin stories to France's geographic centroid.

### 3. Adding Live IPTV News & Wildlife Streams
Add entries to `backend/src/db/migrations/002_tv_channels.sql` or inject via REST API:
```sql
INSERT INTO tv_channels (name, country, category, stream_url, logo_url, is_alive)
VALUES ('France 24 English', 'France', 'news', 'https://example.com/france24.m3u8', 'https://example.com/logo.png', 1);
```

---

## 🧪 Verification & Testing Suite

AI World News Desk is protected by an extensive test suite with **112 automated tests** across 32 test files:

```bash
# Run complete test suite (both backend and frontend)
npm test

# Run backend integration & unit tests (70 tests)
npm run test --workspace=backend

# Run frontend kinematics, UI & state tests (42 tests)
npm run test --workspace=frontend

# Verify production builds and TypeScript type-safety
npm run build
```

---

## 📁 Repository Structure

```
ai-world-news-desk/
├── backend/
│   ├── src/
│   │   ├── ai/              # Multi-provider router, prompts, quota manager
│   │   ├── db/              # SQLite migrations, FTS5 schema, cleanup job
│   │   ├── export/          # PDFKit broadsheet builder & morning audio script
│   │   ├── fetchers/        # RSS parser, GDELT backfiller, article scraper
│   │   ├── routes/          # Express REST API endpoints (articles, tv, search)
│   │   ├── scheduler/       # Cron scheduler, gap tracking, startup backfill
│   │   ├── sse/             # Real-time Server-Sent Events broker
│   │   └── tv/              # IPTV m3u parser and stream health prober
│   └── __tests__/           # 22 backend test suites (70 tests)
├── frontend/
│   ├── src/
│   │   ├── canvas/          # 60fps game loop, 2-segment FABRIK IK solver
│   │   ├── components/
│   │   │   ├── alert/       # Stacking toast banners with audio chime
│   │   │   ├── article/     # Split original & summary panels, card strip
│   │   │   ├── bat/         # Mechanical flapping SVG bat settings drawer
│   │   │   ├── briefing/    # 2-minute morning radio player with Web Speech API
│   │   │   ├── chat/        # Morgue archive chat with FTS5 search & citation
│   │   │   ├── common/      # Editorial ErrorBoundary teletype protection
│   │   │   ├── compare/     # Multi-outlet coverage comparator with silk weft
│   │   │   ├── map/         # react-simple-maps Global Radar with wildlife overlay
│   │   │   ├── modal/       # Missed dispatches catch-up modal
│   │   │   └── tv/          # Live IPTV player with hls.js & animal discovery
│   │   └── styles/          # Anti-slop design tokens and accessible styles
│   └── __tests__/           # 10 frontend test suites (42 tests)
├── docs/                    # UI specs, design system, API contracts, schema
└── autostart/               # Native background service configurations
```

---

## 📜 License & Acknowledgements
- Built under the **Anti-Slop Editorial Design Principles**.
- TopoJSON geographic data provided by Natural Earth (110m resolution).
- Live streaming channel metadata sourced from open-source IPTV channels.


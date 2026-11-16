# PRD: DNews Desktop Windows Executable (.exe)
*Product Requirements & Architecture Specification · Version 1.0 · 2026-11-16*

---

## 1. Executive Summary & Objective

The objective is to transform **DNews (AI World News Desk & The Library)** from a localhost terminal-launched web application into a **first-class, standalone Windows desktop application (`.exe`)**.

When completed:
- The user will have a single Windows installer (`DNews-Setup.exe`) or portable executable.
- The app will show up in the **Windows Start Menu**, on the **Desktop**, on the **Windows Taskbar**, and in **Windows Settings > Installed Apps** under its official identity: **"The Daily Bugle" / "DNews"**.
- The app will launch with a single click—no PowerShell, no `npm run dev`, and no command prompt windows.
- The app will package the complete full-stack environment: the **React 19 / Vite** broadsheet UI, the **Node.js Express** backend, the **SQLite (FTS5)** database engine, background news fetchers, AI router, and real-time SSE event bus.

---

## 2. What Upgrades Must We Add? (Pre-Packaging & Architecture Upgrades)

Before freezing the application into an executable, several critical upgrades are required to make it behave like a robust, native Windows program rather than a browser script.

### 2.1 Critical Runtime & Data Architecture Upgrades

| # | Upgrade Name | Current State | Desktop Requirement | Why It Is Mandatory |
|---|--------------|---------------|---------------------|----------------------|
| **U1** | **User Data Directory Resolution** | Hardcoded to `backend/data/news.sqlite` in repo root | Store database, logs, and backups in `%APPDATA%\DNews\` | Installed apps in `C:\Program Files\` or `AppData\Local\Programs\` cannot safely write to their installation directory without admin rights. App updates would wipe user data if stored in the app bundle. |
| **U2** | **First-Launch Migration & Seeding** | Expects existing database populated by dev scripts | Automatic bootstrap on first launch | When installed fresh on a laptop, the app must detect if `%APPDATA%\DNews\data\news.sqlite` exists. If not, create schema, run migrations 001–015, and seed initial sources & Library records automatically. |
| **U3** | **Single-Instance Mutex Lock** | None (running twice spawns two conflicting processes) | Windows Single-Instance Lock (`requestSingleInstanceLock`) | If the user clicks the shortcut while DNews is already running, opening a second instance would corrupt the SQLite WAL file and throw `EADDRINUSE`. The second instance must simply focus the existing window. |
| **U4** | **Dynamic Conflict-Free Port Binding** | Hardcoded to port `3001` | Ephemeral port selection or internal loopback handshake | If port 3001 is occupied by another application on the user's laptop, DNews backend must find an open port (or port 0) and seamlessly route frontend API requests to it. |
| **U5** | **Native C++ Addon Build Pipeline** | `better-sqlite3` compiled for system Node.js | Rebuild `better-sqlite3` for Electron's specific Node ABI | Native C++ modules must match the exact V8/Node ABI of the packaged runtime. Requires `@electron/rebuild`. |
| **U6** | **Unified Process Lifecycle & Clean Shutdown** | Manual `Ctrl+C` in terminal | Graceful window close & SQLite WAL checkpoint flush | When the user clicks the window "X" button or shuts down their laptop, the backend must truncate the SQLite WAL, close active SSE streams, and terminate cleanly with zero orphan processes in Task Manager. |

---

### 2.2 Desktop Native UX & Shell Integration Upgrades

| # | Upgrade Name | Current State | Desktop Requirement | Why It Is Mandatory |
|---|--------------|---------------|---------------------|----------------------|
| **U7** | **Windows App Identity & Icon** | Generic browser favicon | Multi-resolution `.ico` (16, 24, 32, 48, 64, 128, 256px) + AppUserModelID | Windows Taskbar and Alt+Tab require a proper `.ico` and `AppUserModelID` (`com.dnews.app`) to display the Victorian Bat & Globe emblem instead of a generic default icon. |
| **U8** | **Windows NSIS Installer & Uninstaller** | None | Standard Windows Installer (`.exe`) with Start Menu & Desktop shortcuts | Registers in Windows "Installed Apps" / Control Panel, provides clean 1-click install into `%LOCALAPPDATA%\Programs\DNews` (no UAC admin prompt needed), and provides a clean uninstaller. |
| **U9** | **Window State Persistence** | Default browser viewport | Remembers window width, height, position (x, y), and maximized state | A native app should open exactly where the user last placed it on their laptop screen or external monitor. |
| **U10** | **System Tray & Background Sync** | Closes when tab is closed | Tray icon with menu (Open, Check News Now, Mute Audio, Quit) | Allows the news desk to continue monitoring breaking news and refreshing the queue in the background without cluttering the taskbar. |
| **U11** | **Native Windows 10/11 Notifications** | Browser Web Notifications (frequently blocked) | Windows Native Toast Notifications | Direct integration with Windows Action Center for high-priority Breaking News alerts and AI provider failovers. |
| **U12** | **In-App API Key & Secrets Manager** | Plain-text `.env` file | Settings UI for AI Provider Keys (Gemini, Groq, Mistral) | An executable app distributed to a user should not require editing text files in Notepad. Keys should be entered directly in Settings > AI & Quotas and saved securely in SQLite/DPAPI. |

---

## 3. Technology Selection: Why Electron + electron-builder?

To package DNews into a Windows `.exe`, three architectures were evaluated:

### 3.1 Option Matrix

```
┌────────────────────────────────┬───────────────────────────┬──────────────────────────┐
│ Option A: Electron (Selected) │ Option B: Tauri v2 (Rust) │ Option C: Node SEA       │
├────────────────────────────────┼───────────────────────────┼──────────────────────────┤
│ • Full Node.js runtime included│ • Lightweight binary      │ • Single executable Node │
│ • 100% Chrome rendering parity │ • Uses WebView2 (Edge)    │ • Still opens in browser │
│ • Native `better-sqlite3`      │ • Must bundle Node as     │ • Not an app window      │
│ • Full SSE & WebGL Canvas      │   sidecar anyway for      │ • No native system tray  │
│ • Official NSIS installer      │   Express backend         │ • Poor UX                │
└────────────────────────────────┴───────────────────────────┴──────────────────────────┘
```

**Selection**: **Option A (Electron + electron-builder)** is the optimal, production-grade choice.
- DNews utilizes complex Node.js modules (`better-sqlite3`, Cheerio, RSS XML parsers, GDELT fetchers, SSE streaming).
- DNews utilizes modern React 19, Canvas WebGL 3D Globe rendering, SVG kinematic bat animations, and CSS broadsheet styling that rely on exact Chromium rendering.
- Electron allows the entire frontend and backend to run as a unified, zero-rewrite desktop package.

---

## 4. Desktop Application Architecture

### 4.1 Process Model

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            DNEWS DESKTOP APP (.EXE)                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     ELECTRON MAIN PROCESS (Node.js)                    │  │
│  │                                                                        │  │
│  │  • Windows App Lifecycle (Single Instance Lock, Tray, Notifications)   │  │
│  │  • App Data Path: %APPDATA%\DNews\                                     │  │
│  │  • Manages & Launches Express API Backend                              │  │
│  │  • Window State Persistence & Menus                                    │  │
│  └──────────────────┬──────────────────────────────────┬──────────────────┘  │
│                     │ IPC / Loopback                   │ HTTP / SSE          │
│                     ▼                                  ▼                     │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │      ELECTRON RENDERER (Window)      │  │      EXPRESS API SERVER      │  │
│  │                                      │  │                              │  │
│  │  • React 19 Broadsheet SPA           │  │  • SQLite (FTS5) Database    │  │
│  │  • Broadsheet Design System          │  │  • RSS & GDELT Fetchers      │  │
│  │  • 3D Globe & Canvas Bat             │  │  • AI Provider Router        │  │
│  │  • Main Desk & Library Views         │  │  • Library History & Wisdom  │  │
│  │  • Real-Time Typed SSE Bus           │  │  • Real-time SSE Broadcaster │  │
│  └──────────────────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Storage Hierarchy (Windows Standard)
- **App Executable**: `%LOCALAPPDATA%\Programs\DNews\DNews.exe`
- **User Database & State**: `%APPDATA%\DNews\data\news.sqlite`
- **Database Backups**: `%APPDATA%\DNews\backups\`
- **Crash Logs & App Logs**: `%APPDATA%\DNews\logs\`
- **Cache**: `%LOCALAPPDATA%\DNews\Cache\`

---

## 5. Implementation Roadmap (Phases)

### Phase 1: Environment & Path Decoupling (Foundation)
1. Implement a unified `getAppDataPath()` helper:
   - In dev: returns `e:\DNews_G\backend\data\`
   - In production desktop: returns `path.join(process.env.APPDATA || ..., 'DNews', 'data')`
2. Update SQLite initialization in `backend/src/db/db.ts` to ensure the directory exists and auto-runs migrations on startup.
3. Update `backend/src/index.ts` to support dynamic port assignment (`PORT=0` fallback).

### Phase 2: Desktop Shell & Electron Scaffolding
1. Add `electron` and `electron-builder` as root devDependencies.
2. Create `electron/main.ts`:
   - Initialize Single Instance Lock.
   - Start Express backend as an internal child service or embedded module.
   - Wait for backend health check (`/api/health`).
   - Create browser window (`BrowserWindow`) with broadsheet default theme background, custom bat icon, and persisted bounds.
   - Load pre-built `frontend/dist/index.html`.
3. Create `electron/preload.ts`:
   - Expose safe bridge APIs (version, native notifications, quit, open external URL in default browser).

### Phase 3: Assets & System Integration
1. Generate multi-resolution icon: `assets/icon.ico` (256x256 down to 16x16).
2. Implement System Tray menu:
   - Minimize to tray.
   - Quick status ("DNews · 1,420 stories indexed").
   - "Check News Now" button.
3. Hook Windows native toast notifications for breaking news events (`new_article` with `breaking_score >= 80`).

### Phase 4: Packaging & Installer Configuration
1. Configure `electron-builder.json`:
   - Target: `nsis` (x64) and `portable` (standalone `.exe`).
   - Product Name: `DNews` / `The Daily Bugle`.
   - App ID: `com.dnews.app`.
   - Native dependencies: configure automatic `@electron/rebuild` for `better-sqlite3`.
   - File associations and Start Menu shortcuts.
2. Build command: `npm run package:win`.
3. Verify output: `dist/DNews-Setup-1.0.0.exe`.

### Phase 5: Verification & Quality Assurance
1. Test installation on a clean Windows user account:
   - Verify Start Menu shortcut appears and launches correctly.
   - Verify Taskbar shows the custom Bat & Globe icon.
   - Verify no command prompt window pops up.
   - Verify database is created in `%APPDATA%\DNews\data\`.
2. Test reboot/sleep persistence:
   - App launches cleanly, reconnects SSE, and updates news feeds.
3. Test uninstaller:
   - Clean removal from Windows "Installed Apps".

---

## 6. Next Steps & Approval Gate

Per **GEMINI.md Rules** and user instruction ("do not code yet"):
- **Prerequisite**: Review and approve this PRD and the list of upgrades.
- **Decision Point**: Confirm whether you prefer an **NSIS Installer** (`DNews-Setup.exe` that puts the app in your Start Menu like a standard Windows app) or a **Portable Executable** (`DNews.exe` that runs directly from any folder), or **both**.
- **Execution**: Once approved, we will proceed step-by-step with zero regression to existing web features.
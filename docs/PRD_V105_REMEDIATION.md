# PRD: v1.0.5 Desktop Startup Fix & Mobile APK Autonomous Engine Remediation

**Document Version:** 1.0  
**Date:** 2026-11-20  
**Status:** In Execution  
**Authors:** AI World News Desk Architecture Team  

---

## 1. Executive Summary & Objective

Following the generation of the v1.0.5 production release packages (`DNews-Setup-1.0.5.exe` and `DNews-v1.0.5.apk`), two critical operational defects were identified upon installation:

1. **Desktop `.exe` Startup Blank Cream Screen**:
   When launching the installed application on Windows, the window opens titled *"DNews — The Daily Bugle"* with the menu bar, but the viewport remains a blank cream canvas (`#FAF7F0`) indefinitely.
2. **Mobile Android APK Zero News Defect**:
   When installing and launching `DNews-v1.0.5.apk` on an Android smartphone, the application interface renders successfully, but displays 0 articles because relative `/api/articles` requests fail with `ERR_CONNECTION_REFUSED` against `https://localhost/api/articles`.

**Objective:**  
Remediate both issues with robust, resilient engineering:
- Harden `electron/main.ts` with proactive port conflict recovery, fast-fail backend supervision, corrected packaged file resolution paths, and broadsheet error notifications.
- Implement the user-selected **Option B Autonomous On-Device Client Engine** for Android and offline environments: bundled offline broadsheet seed archive, client-side RSS parser with CORS fallbacks, on-device persistence, and optional Remote Desk IP synchronization.
- Verify visually with Playwright (`ui-visual-validator`), re-package both production release artifacts, and push to GitHub `origin/main` under tag `v1.0.5`.

---

## 2. Root Cause Analysis (RCA)

### 2.1 Issue 1: Desktop `.exe` Blank Cream Screen
Investigation of `%APPDATA%\DNews\logs\desktop.log` revealed:
```text
[Backend:Err] Error: listen EADDRINUSE: address already in use 127.0.0.1:3001
[Backend:Exit] code=1, signal=null
Backend health check TIMED OUT (127.0.0.1:3001/api/health unreachable). Creating window regardless.
BrowserWindow connection to http://127.0.0.1:3001 pending: Error: ERR_CONNECTION_TIMED_OUT (-118)
```
- **Port Collision**: If port 3001 is held by an orphaned dev process or lingering background task, the Express backend crashes immediately on startup.
- **Unbounded Wait**: The health check loop in `electron/main.ts` polled for 60 iterations (60 seconds) without detecting that `backendProcess` had already exited.
- **Excessive Navigation Retry Loop**: When `createMainWindow()` was called, it initiated a loop of 60 retries with long timeouts, hanging on the cream window background for ~20 minutes.
- **Invalid Packaged File Path**: If the retries finally exhausted, line 374 attempted `mainWindow.loadFile(path.resolve(__dirname, '../../frontend/dist/index.html'))`. In packaged Electron (`electron-builder`), `__dirname` is inside `resources/app.asar/dist/electron/`, making `../../frontend/dist` non-existent. The true path is `path.join(process.resourcesPath, 'frontend', 'dist', 'index.html')`.

### 2.2 Issue 2: Mobile APK Zero News Articles
- In `frontend/src/hooks/useArticles.ts` (line 34) and `frontend/src/lib/api.ts` (line 83), network calls are executed as:
  ```ts
  const res = await fetch('/api/articles?...');
  ```
- In the native Capacitor Android WebView, relative URLs resolve against the WebView origin (`https://localhost/api/articles`).
- Because an Android device does not run an Express Node.js backend server on port 80/443, every fetch fails immediately with `ERR_CONNECTION_REFUSED`.
- The frontend had no client-side seed database or autonomous feed parser to populate articles when operating independently.

---

## 3. Architecture & Functional Requirements

### 3.1 Desktop Electron Resilience (`electron/main.ts`)
1. **Pre-flight Port Check & Conflict Cleanup**:
   - Check if `127.0.0.1:3001` is already alive with a healthy DNews `/api/health` response. If yes, adopt the running instance without spawning a colliding child process.
   - If port 3001 is held by a dead/unresponsive process, terminate the orphaned PID on Windows or choose an alternate port (e.g. `3002`).
2. **Fast-Fail Backend Supervision**:
   - Register `backendProcess.on('exit', (code) => ...)`: if the child process exits prematurely during startup, abort the health check loop immediately instead of waiting 60 seconds.
3. **Correct Packaged HTML Path**:
   - Determine `indexPath` based on `app.isPackaged`:
     ```ts
     const indexPath = app.isPackaged
       ? path.join(process.resourcesPath, 'frontend', 'dist', 'index.html')
       : path.resolve(__dirname, '../../frontend/dist/index.html');
     ```
4. **Fast Navigation Fallback**:
   - Reduce the retry timeout from 20 minutes to 5 seconds. If the backend cannot be contacted via HTTP, load `indexPath` directly via `loadFile()`.

### 3.2 Mobile Autonomous Client Engine (`frontend/src/lib/autonomousEngine.ts`)
1. **Bundled Broadsheet Seed Archive**:
   - Embed a comprehensive initial collection of 25+ broadsheet articles covering World, Technology, Science, Politics, Business, Culture, and Sports with full metadata, entity dossiers, and sample bias indicators.
2. **Client-Side Autonomous Feed Poller**:
   - Provide a direct client-side RSS fetcher capable of parsing public feeds (BBC World, Reuters, AP, Philippine Daily Inquirer, Hacker News) via public CORS gateways (`api.rss2json.com`, `allorigins.win`) or direct fetch when network permits.
3. **On-Device Storage Persistence**:
   - Save fetched articles to `localStorage` / IndexedDB (`dnews_autonomous_articles_v1`). Articles persist between app launches even without internet connectivity.
4. **Remote Desk Connection (Optional)**:
   - Allow users in `UnifiedSettingsDialog.tsx` to configure a "Remote Desk Server URL" (e.g., `http://192.168.1.50:3001`). When set, the mobile app prioritizes syncing with the user's laptop backend over local Wi-Fi.
5. **Seamless Fallback Integration**:
   - Update `frontend/src/hooks/useArticles.ts` and `frontend/src/lib/api.ts` to automatically detect native mobile (`Capacitor.isNativePlatform()`) or network failure on `/api/articles`, instantly serving from the autonomous engine without throwing an unhandled error.

---

## 4. Verification & Testing Strategy

1. **Unit & Integration Verification**:
   - Test `autonomousEngine.ts` to ensure it returns seeded articles immediately on launch.
   - Verify client-side search, category filtering, and sorting work identically to the server-side API.
2. **Playwright Visual Validation (`ui-visual-validator`)**:
   - Simulate mobile viewport (`390x844` portrait and `844x390` landscape).
   - Verify that articles render immediately from the autonomous engine without error spinners or blank screens.
   - Capture visual proof in the artifact directory.
3. **Installer Packaging & Release**:
   - Re-build Windows Electron setup: `npm run package:win` -> `release/DNews-Setup-1.0.5.exe`.
   - Re-build Android APK: `cd frontend/android && ./gradlew assembleDebug` -> `release/DNews-v1.0.5.apk`.
   - Update git commits and push tag `v1.0.5` to GitHub `origin/main`.

---

## 5. Definition of Done (DoD)
- [ ] PRD finalized and approved.
- [ ] `electron/main.ts` updated with port conflict handling, fast-fail exit handling, and correct packaged file paths.
- [ ] `frontend/src/lib/autonomousEngine.ts` implemented with 25+ seed articles, client RSS poller, and persistence.
- [ ] `useArticles.ts` and `api.ts` updated to seamlessly fall back to autonomous engine.
- [ ] Remote Desk Server URL setting added to settings dialog.
- [ ] Visual validation screenshots captured and inspected.
- [ ] `release/DNews-Setup-1.0.5.exe` and `release/DNews-v1.0.5.apk` built and validated.
- [ ] Code committed and pushed to GitHub `origin/main` with updated `v1.0.5` tag.

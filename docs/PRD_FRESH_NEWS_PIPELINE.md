# PRD — Fresh News Pipeline & Desktop/Mobile Reliability (v1.0.7)

**Document Version**: 1.0.0  
**Date**: 2026-11-21  
**Status**: APPROVED FOR EXECUTION  
**Author**: Antigravity Architecture Team  

---

## 1. Executive Summary & Problem Definition

### 1.1 The Problems
1. **Desktop Blank Cream Screen on Startup**:
   - On Windows, cold-start of the bundled Node.js runtime and connecting to an existing SQLite database with ~10,000 articles takes 30–50 seconds.
   - `waitForBackendHealth` in `electron/main.ts` had an aggressive 8-second timeout.
   - Upon timeout, Electron fell back to `mainWindow.loadFile(".../frontend/dist/index.html")`.
   - In Vite production builds, script tags contain `<script type="module" crossorigin src="./assets/index.js">`. Chromium strictly blocks ES modules loaded over the `file://` protocol due to CORS on null origin. The JS bundle never executed, leaving the window stuck on the `#FAF7F0` cream background.
   - When the backend became healthy at `127.0.0.1:3001` 40 seconds later, Electron had no supervisor or reconnection hook to redirect the window to the live Express server.

2. **Laptop "Old News" / Future-Date Ingestion Bias**:
   - The Taipei Times RSS feed published articles with a publication date of tomorrow (`2026-11-22T00:00:00.000Z`, print edition embargo).
   - In `backend/src/routes/articles.ts`, the query `ORDER BY a.published_at DESC, a.fetched_at DESC LIMIT 60` causes ~30 future-dated Taipei Times articles to monopolize the top of page 1, burying all fresh articles fetched today beneath them.
   - 12+ configured RSS feeds in `config/sources.ts` are broken (404/403), limiting new article volume.
   - `useArticles.ts` lacks background polling when SSE disconnects or drops.

3. **Mobile APK Never Fetches Fresh News**:
   - In `frontend/src/lib/autonomousEngine.ts`, `pollLiveFeeds()` returns `newlyAdded: Article[]`, but `App.tsx`'s auto-polling completely ignored the return value and never called `useAppStore.getState().applyLiveArticlesBatch(newlyAdded)`.
   - `api.rss2json.com` was the sole client-side proxy and failed with HTTP 429 rate limits.
   - Only 2 feeds were polled, and `useArticles.ts` lacked a recurring re-fetch interval.

---

## 2. Technical Architecture & Remediation Specifications

### Phase 1: Desktop Electron Launch & Hot-Handoff Supervisor
- **Startup Splash Screen**:
  - While waiting for the Express backend to bind and respond to `/api/health`, `mainWindow` displays an inline broadsheet splash screen with authentic newsprint aesthetics:
    - Masthead: "DNews — The Daily Bugle"
    - Subtitle: "Preparing Broadside Press & Editorial Desks..."
    - Spinner / status message styled in classic ink & paper contrast (`#1A1208` on `#FAF7F0`).
- **Connection Supervisor**:
  - Extend the initial health check timeout to 60 seconds with 500ms exponential poll intervals.
  - Implement a persistent background health supervisor: If the window is displaying the splash screen or fallback, the exact moment `http://127.0.0.1:${port}/api/health` turns 200 OK, `mainWindow.loadURL('http://127.0.0.1:' + port)` is immediately invoked.
  - Web preferences: Configure `webSecurity: false` or bypass `file://` restrictions as a secondary safety net so that if offline local file loading is ever required, Vite assets can evaluate cleanly.

### Phase 2: Ingestion Date Sanitization & Source Hygiene
- **Future-Date Clamp in Pipeline**:
  - In `backend/src/pipeline/dedup.ts` and `backend/src/fetch/rss.ts`, clamp any incoming article whose `published_at` is more than 15 minutes in the future:
    `if (publishedAt > Date.now() + 15 * 60 * 1000) { publishedAt = Date.now(); }`
  - In `backend/src/routes/articles.ts`, sanitize sorting:
    `ORDER BY MIN(a.published_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) DESC, a.fetched_at DESC`
  - Retroactively update existing future-dated records in the database so Taipei Times articles are clamped to their fetch timestamp.
- **Dead Feed Replacement in `config/sources.ts`**:
  - Clean up and update dead RSS URLs (SwissInfo, Gulf News, Kyiv Independent, Arab News, Middle East Eye, Dhaka Tribune, Jakarta Post, etc.) with verified, live feeds.

### Phase 3: Mobile APK Autonomous Engine & Dynamic Sync
- **Zustand Batch Dispatch**:
  - In `autonomousEngine.ts`, update `startAutoPolling()` so that whenever `pollLiveFeeds()` returns `newlyAdded` articles, it immediately invokes:
    ```ts
    useAppStore.getState().applyLiveArticlesBatch(newlyAdded);
    useAppStore.getState().fetchCategoryCounts();
    ```
- **Multi-Proxy Client-Side Feed Fetching**:
  - Implement a waterfall proxy strategy in `autonomousEngine.ts`:
    1. Direct CORS fetch (for feeds supporting permissive CORS).
    2. `https://api.allorigins.win/raw?url=`
    3. `https://api.rss2json.com/v1/api.json?rss_url=`
    4. `https://corsproxy.io/?url=`
- **Expanded Mobile Global Feeds**:
  - Expand client-side RSS sources from 2 to 8 reliable global publications: BBC World, BBC Tech, NPR News, Reuters, DW News, France 24, The Hindu, AP News.
- **Recurring Polling in `useArticles.ts`**:
  - Add a 60-second background re-sync interval in `useArticles.ts` (or trigger `api.getArticles()` in background) that updates the active article list if new articles have arrived in the store or database.

---

## 3. Verification Criteria & Deliverables
1. **Desktop Verification**:
   - Launch packaged desktop build / Electron runner. Window must show the broadsheet loading screen, then seamlessly transition to the live newspaper broadsheet.
   - Verify top of the feed contains fresh today's news (`2026-11-21`), with no future-dated articles stuck on top.
2. **Mobile APK Verification**:
   - Verify client-side polling fetches new articles from live RSS feeds and renders them into the reader and ticker.
   - Verify all unit and integration tests pass.
3. **Artifacts**:
   - Capture visual validation screenshots using Playwright.

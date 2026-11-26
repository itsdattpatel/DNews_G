# APK Live News Sync, Unified API Routing & Bug Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve why the Android Mobile APK fails to receive or surface new news, unify Remote Desk / Electron alternate-port API routing across the entire frontend, eliminate remaining mocked endpoints/failing tests, and fix mobile portrait layout overlaps.

**Architecture:** Enable Capacitor native HTTP + Android WebView-safe timeouts and `0–100` normalized breaking scores in `autonomousEngine.ts`, surface `pendingNewArticles` in `CircularGalleryWireDock.tsx` + manual pull-to-refresh, centralize all `/api/*` + SSE requests behind `apiUrl()`/`apiFetch()`/`shouldAttemptRemote()` in `api.ts`, and place `MobileBottomNav` and `AdaptiveNotchPill` without covering `NewsTicker` or `TopBar`.

**Tech Stack:** React 18, TypeScript, Zustand, Capacitor 8 (`@capacitor/core`, `CapacitorHttp`), Vitest, Express, SQLite, Playwright.

**Spec:** `e:/DNews_G/docs/PRD_APK_LIVE_SYNC_AND_BUG_REMEDIATION.md`

## Global Constraints

- Design tokens from `docs/DESIGN_SYSTEM.md` only; zero inline hardcoded style hacks, no emoji icons, no purple/blue gradients.
- Breaking score scale across backend, SQLite, `autonomousEngine.ts`, `liveDesk.ts`, and `ArticlePanel.tsx` must be integer `0–100` (with safe migration for cached `0–1` scores).
- Strict TDD per `superpowers:test-driven-development`: failing test first, verify expected failure, minimal clean implementation, verify green.
- Preserve existing working features and comments unrelated to the targeted defect fixes.

## Review Focus

- Native Android WebView without `AbortSignal.timeout` or CORS-blocked RSS proxies when `Capacitor.isNativePlatform()` is true.
- Remote Desk Sync (`dnews_remote_desk_url`) connected after initial startup when `articles` already contains 25 seed articles.
- Electron packaged app running on fallback ports `3002–3010` instead of default `3001`.
- Mobile portrait (`390x844`) viewport bottom navigation bar alignment relative to `NewsTicker` and `CircularGalleryWireDock`.
- Offline startup with zero internet (no hanging Google Font or infinite `/api/sse` reconnect loops).

---

### Task 1: Failing Regression Tests for Audit Defects (RED Phase)

**Files:**
- Create: `frontend/src/__tests__/unit/apk-live-sync-remediation.test.ts`
- Modify: `frontend/src/__tests__/unit/globe-3d.test.tsx` (verify existing failing test vs `WorldMap.tsx`)

- [ ] **Step 1:** Write unit tests covering:
  1. `apiUrl()` & `shouldAttemptRemote()` behavior with `dnews_remote_desk_url`, Electron `file:` custom port `3004`, and native Capacitor standalone.
  2. `autonomousEngine` seed & parsed RSS items using `0–100` integer `breaking_score` (passing `alertThreshold=75` in `liveDesk.ts`), legacy `0–1` score normalization on load, valid category `'World'` for `The Hindu`, and bounded timeout / `DOMParser` XML parsing.
  3. `CircularGalleryWireDock` rendering `#btn-new-stories-pill` when `pendingNewArticles` is non-empty and `useAppStore.performFullResync('remote_desk_connected')` updating `articles` immediately rather than hiding them in `pendingNewArticles`.
  4. `AdaptiveNotchPill` not rendering stale hardcoded `"Broadside Press v1.0.8"` or hardcoded `"155 Sources"`.
- [ ] **Step 2:** Run `npm --prefix frontend test -- apk-live-sync-remediation.test.ts globe-3d.test.tsx` and confirm failures match expectations.

### Task 2: Track A — Fix Mobile APK News Pipeline (`capacitor.config.json`, `autonomousEngine.ts`, `CircularGalleryWireDock.tsx`, `ArticlePanel.tsx`, `useAppStore.ts`)

**Files:**
- Modify: `frontend/capacitor.config.json`
- Modify: `frontend/src/lib/autonomousEngine.ts`
- Modify: `frontend/src/components/article/CircularGalleryWireDock.tsx`
- Modify: `frontend/src/components/article/ArticlePanel.tsx`
- Modify: `frontend/src/store/useAppStore.ts`

- [ ] **Step 1:** Enable `plugins.CapacitorHttp.enabled = true` in `frontend/capacitor.config.json`.
- [ ] **Step 2:** Upgrade `autonomousEngine.ts`: native `CapacitorHttp.get` path, `AbortController` timeout helper (`fetchWithTimeout`), bounded parallel feed polling, `0–100` breaking score scale + `localStorage` load normalization, `'World'` category for `The Hindu`, `validateFeedUrl` helper, and deduplicated live batch notification (avoiding double `applyLiveArticlesBatch` call).
- [ ] **Step 3:** Render `#btn-new-stories-pill` in `CircularGalleryWireDock.tsx` wired to `pendingNewArticles` + `mergePendingNewArticles`.
- [ ] **Step 4:** Wire `ArticlePanel.tsx` `handleManualFetchNow()` & pull-to-refresh to `apiFetch`/`shouldAttemptRemote` + `autonomousEngine.pollLiveFeeds()` + immediate merge, and fix `useAppStore.ts` `performFullResync` & `setArticles` queue refresh.
- [ ] **Step 5:** Re-run targeted unit tests and confirm GREEN.

### Task 3: Track B — Unify `apiUrl()`/`apiFetch()` Across Frontend & Guard SSE Loop

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/hooks/useSSE.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/store/useAppStore.ts`
- Modify all components & library modules calling raw `fetch('/api/...')` (`UnifiedSettingsDialog.tsx`, `SecretsManagerSection.tsx`, `TVView.tsx`, `AddYouTubeChannelModal.tsx`, `SourceHealthDesk.tsx`, `CompareCoverage.tsx`, `StoryTimeline.tsx`, `ArchiveChat.tsx`, `EntityRelationshipDesk.tsx`, `WatchlistDesk.tsx`, `DailyPdfDesk.tsx`, `MorningBriefing.tsx`, `PanicWipeDialog.tsx`, `SettingsMenu.tsx`, `frontend/src/library/**`).

- [ ] **Step 1:** Export `apiUrl`, `apiFetch`, and `shouldAttemptRemote` from `frontend/src/lib/api.ts` and refactor all internal relative `fetch('/api/...')` methods in `api.ts` to use `apiFetch`.
- [ ] **Step 2:** Update `useSSE.ts` to resolve URLs with `apiUrl()` and suppress infinite `/api/sse` reconnect loops when `!shouldAttemptRemote(getApiBaseUrl())`, while still listening for `resync` events if remote desk URL is added later.
- [ ] **Step 3:** Make `App.tsx` start `autonomousEngine.startAutoPolling()` only in native/offline fallback mode instead of unconditionally colliding with a healthy Express backend.
- [ ] **Step 4:** Refactor remaining relative `fetch('/api/...')` calls across store, components, and library to use `apiFetch` / `apiUrl`.
- [ ] **Step 5:** Verify zero unintended raw `fetch('/api/` remain via `rg`.

### Task 4: Track C & D — Fix Real Telemetry/RSS Validation, Offline Font, Failing `WorldMap` Test & Mobile Overlaps

**Files:**
- Modify: `frontend/src/components/sources/CustomRssStudio.tsx`
- Modify: `frontend/src/components/sources/SourceHealthDesk.tsx`
- Modify: `frontend/src/components/layout/AdaptiveNotchPill.tsx`
- Modify: `frontend/src/components/layout/Shell.tsx`
- Modify: `frontend/src/components/layout/MobileBottomNav.tsx`
- Modify: `frontend/src/components/layout/TopBar.tsx`
- Modify: `frontend/src/components/map/WorldMap.tsx`
- Modify: `frontend/src/components/ui/CircularGallery.tsx`

- [ ] **Step 1:** Fix `WorldMap.tsx` wildlife toggle markup to match `globe-3d.test.tsx` (`Wildlife Layer:`).
- [ ] **Step 2:** Replace fake timeouts in `CustomRssStudio.tsx` and `SourceHealthDesk.tsx` with real `/api/sources/test` + `/api/sources` + `autonomousEngine.validateFeedUrl()` + immediate live poll, and real `/api/control-room/telemetry` latency ping.
- [ ] **Step 3:** Update `AdaptiveNotchPill.tsx` to show real source count/telemetry/version (`1.0.6.1`), trigger live refresh (`pollLiveFeeds` / `performFullResync`) instead of `window.location.reload()`, and avoid overlapping `TopBar`.
- [ ] **Step 4:** Put `MobileBottomNav` into proper mobile bottom flow (not overlapping `NewsTicker`), ensure mobile access to region filter + sections/bat menu, and remove blocking external `fonts.googleapis.com` default in `CircularGallery.tsx`.

### Task 5: Full Verification & UI Visual Validation

- [ ] **Step 1:** Run `npm --prefix backend test` and `npm --prefix frontend test` (`0` failures).
- [ ] **Step 2:** Run `npm --prefix frontend run typecheck` and `npm --prefix frontend run build` (`exit 0`).
- [ ] **Step 3:** Sync Android assets (`cd frontend && npx cap sync android`) if possible without blocking.
- [ ] **Step 4:** Launch the live app (backend + frontend), inspect desktop & mobile portrait (`390x844`) views via Playwright, capture screenshots, and verify against `ui-visual-validator` + `DESIGN_SYSTEM.md`.

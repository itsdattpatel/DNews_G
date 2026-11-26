# Product Requirements Document — Mobile APK Live News Sync, API Base Routing & Defect Remediation
*Version 1.0 · 2026-11-25 · Post-Phase K System Hardening*

---

## 1. Purpose & Background

Following a 3-pass full-stack audit using Superpowers (`systematic-debugging`), 18 concrete defects were identified across:
1. The **Android Mobile APK live news update pipeline** (preventing new dispatches from fetching or surfacing on mobile),
2. **Remote Wi-Fi Desk Sync & Electron custom-port routing** (70+ relative `/api/*` calls and `EventSource('/api/sse')` bypassing `getApiBaseUrl()`),
3. **Simulated/stubbed controls** (`CustomRssStudio`, `SourceHealthDesk`, `AdaptiveNotchPill`),
4. **Failing test coverage** (`globe-3d.test.tsx`), and
5. **Mobile portrait layout overlaps** (`MobileBottomNav` covering `NewsTicker`, `AdaptiveNotchPill` colliding with `TopBar`, and hidden mobile navigation controls).

This PRD defines the exact acceptance criteria and architecture to fix all defects cleanly without altering existing design tokens or unrelated working code.

---

## 2. Functional & Technical Requirements

### 2.1 Track A — Mobile APK Live News Pipeline (`FR-APK`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-APK-01 | **Native Android HTTP Transport** | Enable `plugins.CapacitorHttp.enabled = true` in `frontend/capacitor.config.json`. In `autonomousEngine.pollLiveFeeds()`, prefer `CapacitorHttp.get` directly on `Capacitor.isNativePlatform()` before browser CORS proxy fallbacks so BBC, NPR, DW, France 24, Al Jazeera, The Hindu, The Conversation, and user custom RSS feeds fetch natively without CORS failures. |
| FR-APK-02 | **WebView-Safe Timeout Helper** | Replace `AbortSignal.timeout(...)` in `autonomousEngine.ts` with an `AbortController` + `setTimeout` wrapper compatible with all Android System WebView versions. |
| FR-APK-03 | **Bounded Concurrent Feed Polling** | Poll RSS/Atom feeds in bounded concurrent batches (batch size 4 via `Promise.allSettled`) rather than strictly sequential loops so one slow feed does not block fresh dispatches. |
| FR-APK-04 | **Breaking Score Scale Normalization (`0–100`)** | All seed and live RSS articles in `autonomousEngine.ts` emit integer `0–100` `breaking_score` values (`95`, `90`, `40`) matching `DB_SCHEMA.md` and `liveDesk.ts`. On `load()` from `localStorage`, auto-normalize legacy `0 < score <= 1` scores to `0–100` so Breaking filter and `URGENCY: XX%` work uniformly. |
| FR-APK-05 | **Valid Broadsheet Feed Categories** | Change `The Hindu` feed category in `autonomousEngine.ts` from `'Asia'` to `'World'` so category filters display its articles properly. |
| FR-APK-06 | **Surface `pendingNewArticles` in Main Reader Dock** | Update `CircularGalleryWireDock.tsx` to subscribe to `pendingNewArticles` and `mergePendingNewArticles` and render `#btn-new-stories-pill` cleanly whenever buffered stories arrive, matching `CardStrip.tsx` semantics. |
| FR-APK-07 | **Manual & Pull-to-Refresh Autonomous Support** | Update `ArticlePanel.tsx` (`handleManualFetchNow` & pull-to-refresh) to resolve `getApiBaseUrl()` when remote/desktop backend is active and fall back to `autonomousEngine.pollLiveFeeds()` + immediate store merge (`mergePendingNewArticles()` / `setArticles`) when running standalone on APK/offline, eliminating duplicate `applyLiveArticlesBatch` firing. |
| FR-APK-08 | **Clean `performFullResync` & `useArticles` Queue Sync** | In `useAppStore.ts`, `performFullResync` on `'remote_desk_connected'` or `'remote_desk_cleared'` calls `setArticles` directly; offline fallback refreshes `totalArticles`, `articles`, and `autoAdvanceQueueIds`. In `autonomousEngine.startAutoPolling()`, emit through subscriber callbacks cleanly without duplicate store updates. |

### 2.2 Track B — Unified API Base Routing & Platform-Aware SSE (`FR-API`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-API-01 | **Centralized `apiUrl()` & `apiFetch()` Helpers** | Export `shouldAttemptRemote`, `apiUrl(path)`, and `apiFetch(path, init)` from `frontend/src/lib/api.ts`. Replace **all** raw relative `fetch('/api/...')` calls across `api.ts` (including Phases E–K), `useAppStore.ts`, `useSSE.ts`, `ArticlePanel.tsx`, `TVView.tsx`, `UnifiedSettingsDialog.tsx`, `SecretsManagerSection.tsx`, `SourceHealthDesk.tsx`, `frontend/src/library/**`, and all secondary modals/drawers. |
| FR-API-02 | **Platform-Aware SSE Connection** | Update `useSSE.ts` to use `apiUrl('/api/sse...')` and `apiUrl('/api/articles/...')`. When running on native Capacitor (`Capacitor.isNativePlatform()`) or `file:` without a resolved `baseUrl`, do not open an `EventSource('/api/sse')` 404 reconnect loop; expose clean autonomous/local-wire status and auto-reconnect if `dnews_remote_desk_url` is saved. |
| FR-API-03 | **Conditional Client Auto-Polling** | In `App.tsx`, only run continuous client CORS proxy `autonomousEngine.startAutoPolling()` when backend API is absent/unreachable (native Capacitor without remote desk URL or failed health check), avoiding unnecessary proxy traffic when desktop Express backend is serving data. |

### 2.3 Track C — Real Telemetry, Validation & Offline Resilience (`FR-REAL`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-REAL-01 | **Real Custom RSS Validation & Immediate Poll** | In `CustomRssStudio.tsx`, replace the simulated `setTimeout(800)` with real feed probing: call `POST /api/sources/test` when backend is reachable, or `autonomousEngine.validateFeedUrl(url)` (`CapacitorHttp`/direct/proxy XML check) when standalone; register on backend (`POST /api/sources`) if connected and trigger `autonomousEngine.pollLiveFeeds()` + immediate merge so new feed dispatches appear right away. |
| FR-REAL-02 | **Real Ping in `SourceHealthDesk.tsx`** | Replace `handlePingAll`'s fake `setTimeout(1200)` with real `/api/control-room/telemetry` & `/api/sources` latency/status refresh (or autonomous feed probes when offline), displaying actual measured latencies and online/stale statuses. |
| FR-REAL-03 | **Real Telemetry & Refresh in `AdaptiveNotchPill.tsx`** | Replace hardcoded `"155 Sources"`, `"~28 ms"`, and `"Broadside Press v1.0.8"` with real store/engine source count, live connection/latency state, and real app version (`1.0.6.1`). Change `"Telegraph Ping"` button from `window.location.reload()` to live feed poll / `performFullResync('notch_ping')`. |
| FR-REAL-04 | **Offline WebGL Font Fallback** | In `CircularGallery.tsx`, avoid hanging or failing on external `fonts.googleapis.com` stylesheet fetches by defaulting to locally bundled/system broadsheet fonts unless a custom stylesheet succeeds quickly. |

### 2.4 Track D — Failing Test & Mobile Portrait Layout Overlaps (`FR-UI`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-UI-01 | **Fix `globe-3d.test.tsx` Regression** | Align `WorldMap.tsx` button label/accessibility markup with `globe-3d.test.tsx` (`Wildlife Layer: ON/OFF` or aria/text expectation) so all frontend unit tests pass (`0` failures). |
| FR-UI-02 | **Non-Overlapping `MobileBottomNav` & `NewsTicker`** | On viewports `< 640px`, place `MobileBottomNav` in normal flex flow (or reserve exact bottom padding below `NewsTicker`) so `MobileBottomNav` never covers `NewsTicker` or dock interaction area. |
| FR-UI-03 | **Non-Colliding `AdaptiveNotchPill` Placement** | Offset/position `AdaptiveNotchPill` so its compact trigger pill never obscures `TopBar` controls or masthead title on narrow portrait/landscape phones (`360px–640px`). |
| FR-UI-04 | **Mobile Access to Region Filter & Directory** | Expose quick Region Filter & Directory/Alerts access cleanly inside `TopBar` mobile overflow or `MobileBottomNav` / `BatMenuOverlay` without violating broadsheet minimal-chrome rules. |

---

## 3. Verification & Release Gate
1. **TDD Discipline**: Write failing unit/integration tests for Track A, Track B, Track C, and Track D before modifying production code (`RED` -> `GREEN` -> `REFACTOR`).
2. **Test Suites**: `npm --prefix backend test` (338+ passed, 0 failed) and `npm --prefix frontend test` (all files passed, 0 failed), plus `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`.
3. **Live Runtime & Visual UI Validation**: Launch backend + frontend, verify live API responses and mobile portrait (`390x844`) + desktop (`1440x900`) Playwright screenshots via `ui-visual-validator` checklist, and sync Capacitor assets (`npx cap sync android`).

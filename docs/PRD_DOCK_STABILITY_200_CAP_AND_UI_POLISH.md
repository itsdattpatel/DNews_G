# Product Requirements Document — Dock Stability, 200-Article Cycle Cap, Real Reading Timer & UI/UX Polish
*Version 1.0 · 2026-11-25 · Post-Remediation Enhancement Release*

---

## 1. Purpose

Address four targeted behavioral fixes and a focused broadsheet UI/UX polish pass:
1. Remove the floating red Breaking Alert pill on mobile / Android APK layouts where it crowds narrow phone headers.
2. Eliminate bottom `CircularGalleryWireDock` jumping and unintended active-article switching whenever live news arrives on Desktop or Mobile.
3. Enforce a configurable backend ingestion cap of **200 articles per 30-minute cycle**, plus an explicit **"Fetch Next 200 Stories"** action button inside Main Settings that fetches up to 200 more articles and stops once reached.
4. Fix `ReadingTrackerCard` time-read accounting so real active reading duration is tracked instead of adding full estimated read minutes on every instant article click.
5. Upgrade Desktop and Mobile broadsheet UI/UX cleanly within existing `DESIGN_SYSTEM.md` tokens (toolbar decluttering, bottom dock scroll clearance, and typography legibility).

---

## 2. Requirements

### 2.1 Hide Breaking Alert Pill on Mobile / APK (`FR-NOTCH`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-NOTCH-01 | **Desktop-Only Notch Pill** | `AdaptiveNotchPill` renders only on non-native desktop/tablet viewports (`!Capacitor.isNativePlatform()` and `hidden md:block`), removing the floating red `★ BREAKING ALERT` capsule from all mobile portrait/landscape and APK screens. |

### 2.2 Dock Focus & Scroll Stability (`FR-DOCK`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-DOCK-01 | **Preserve Active Article on Live Sync** | `useArticles.ts`'s 45s background poll calls `applyLiveArticlesBatch(items)` rather than overwriting `articles` via `setArticles()`, so incoming articles queue into `pendingNewArticles` without shifting array indices mid-read. |
| FR-DOCK-02 | **Silent Index Synchronization by Article ID** | `CircularGallery` exposes `syncIndex(index, instant?)` which aligns `state.active`, `state.target`, and `state.scroll` silently **without** triggering `onActiveChange` (`announce = false` suppresses `onActiveChange` as well as `setActive`). `CircularGalleryWireDock` synchronizes to `selectedArticleId`'s index cleanly when `articles` shifts or merges, preventing any animated dock jump or active-story hijacking on Desktop or Mobile. |

### 2.3 Backend 200-Article Cap Every 30 Minutes & "Fetch Next 200" (`FR-CAP`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-CAP-01 | **Migration & Settings Schema** | Add migration `025_cycle_cap_and_30m_default.sql` setting default `refresh_interval_minutes = 30` and adding `max_articles_per_cycle = 200` (validated `10–1000` in `/api/settings`). Also apply the `200`-article per-poll ceiling in `autonomousEngine.pollLiveFeeds()`. |
| FR-CAP-02 | **Rotating Source Cursor & Cycle Stop** | `backend/src/fetch/scheduler.ts` persists/rotates a source cursor across `enabledSources` and halts source fetching as soon as `totalNewCount >= maxArticlesPerCycle` (default `200`) during both periodic cycles and manual fetches, returning `{ status, fetched, newCount, cappedAt, durationMs }`. |
| FR-CAP-03 | **Main Settings Control & Button** | `UnifiedSettingsDialog` (General & News/Sources sections) exposes the **30 min** polling interval, **Max Articles Per Cycle (200)** input/slider, and a **"Fetch Next 200 News Articles"** action button wired to `POST /api/control-room/fetch-cycle` (`{ advanceCursor: true }`) or `autonomousEngine.pollLiveFeeds()` on standalone APK, displaying fetched count and cap status cleanly. |

### 2.4 Real Active Reading Timer (`FR-READTIME`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-READTIME-01 | **Elapsed Time Instead of Instant Credit** | Opening an article does NOT immediately add `readTimeMin` (`>= 1` min) to `totalMinutesRead`. `useAppStore` maintains `totalSecondsRead` (`totalMinutesRead = Math.floor(totalSecondsRead / 60)`) incremented via `recordReadingSeconds(deltaSec)` only while the reader view is open and document is visible. |
| FR-READTIME-02 | **Verified Article Count Threshold** | `totalArticlesRead` / category diet / daily streak increment only after the reader remains on an article for at least 5 seconds (preventing dock-scrolling flips from inflating read counts). `ReadingTrackerCard` displays elapsed time clearly (`Xm Ys` or `N min`). |

### 2.5 Broadsheet UI/UX Polish (`FR-UX`)
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-UX-01 | **Collapsible Desk Tools Ribbon** | Group secondary investigative/AI action chips in `ArticlePanel.tsx` behind a clean `"Desk Tools"` toggle chip alongside the Layout (`Broadsheet / Wire / Magazine`) and Bionic/Bookmark controls so mobile portrait headers never clip horizontally and save vertical reading space. |
| FR-UX-02 | **Dock Scroll Clearance** | Ensure `#article-panel` provides bottom clearance (`pb-56 sm:pb-60`) so final paragraphs and `ReadingTrackerCard` scroll completely above `CircularGalleryWireDock`. |
| FR-UX-03 | **Typography Legibility** | Reserve `font-masthead` (UnifrakturCook blackletter) for the main masthead (`The World Desk`), using bold `font-headline` (Playfair Display) for card headers like `Daily Telegraph Reading Log` and `Source Health`. |

---

## 3. Verification Criteria
- TDD regression tests written first (`RED` -> `GREEN`) covering `CircularGallery` `announce=false` callback suppression, `useAppStore` `recordReadingSeconds` + deferred `recordArticleRead`, backend `scheduler.ts` 200-cap + rotating cursor + `settings.ts` validation, and `AdaptiveNotchPill` hiding on mobile/APK.
- Zero TypeScript errors, 100% pass across frontend & backend Vitest suites, clean build + Capacitor sync, and Playwright visual verification on Desktop (`1440×900`) and Mobile (`390×844`).

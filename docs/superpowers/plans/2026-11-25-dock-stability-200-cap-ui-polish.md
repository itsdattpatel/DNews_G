# Dock Stability, 200-Article Cap, Real Reading Timer & UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan task-by-task.

**Goal:** Hide the red Breaking Alert pill on mobile/APK, eliminate dock jumping and unintended story switching on live updates, cap backend ingestion at 200 news articles per 30 minutes with a manual "Fetch Next 200" button in Settings, track genuine active reading duration, and polish the reader UI/UX.

**Architecture:** Fix `useArticles.ts` background polling to buffer via `applyLiveArticlesBatch`, separate `CircularGallery` silent prop-sync (`announce = false`, ID tracking, instant alignment when items shift) from user-driven `onActiveChange`, add SQLite setting `max_articles_per_cycle` (`200`) + rotating source cursor in `scheduler.ts`, switch `ArticlePanel` read tracking from instant mount credit to visibility-aware elapsed seconds, and simplify the reader secondary action toolbar.

**Tech Stack:** TypeScript, React 18, Zustand, Express, SQLite (`better-sqlite3`), Capacitor 8, Vitest, Playwright.

**Spec:** `e:/DNews_G/docs/PRD_DOCK_STABILITY_2026...` (`e:/DNews_G/docs/PRD_DOCK_STABILITY_200_CAP_AND_UI_POLISH.md`)

---

### Task 1: Failing TDD Regression Tests (RED Phase)

**Files:**
- Create: `frontend/src/__tests__/unit/dock-reading-and-mobile-notch.test.tsx`
- Create: `backend/src/__tests__/unit/scheduler-200-cap.test.ts`

- [ ] **Step 1:** Write frontend tests verifying:
  1. `AdaptiveNotchPill` returns empty markup when `Capacitor.isNativePlatform()` is mocked true and has `hidden md:block` class on web desktop wrapper.
  2. `useAppStore` `readingStats`: `recordArticleRead` does NOT add `readTimeMin` (`+1` min) automatically (`totalMinutesRead` stays `0`), while `recordReadingSeconds(65)` advances `totalSecondsRead` to `65` and `totalMinutesRead` to `1`.
  3. `CircularGalleryWireDock` preserves focused `selectedArticleId` and does not invoke `selectArticleById` during silent prop index sync when articles prepend.
- [ ] **Step 2:** Write backend unit tests verifying:
  1. `max_articles_per_cycle` defaults to `200` and `refresh_interval_minutes` defaults to `30` after migration `025`.
  2. `scheduler.ts` stops a fetch cycle as soon as `max_articles_per_cycle` (tested with limit `5` / `200`) is reached and advances source cursor across calls.
  3. `/api/settings` rejects invalid `max_articles_per_cycle` (`< 10`) and persists valid updates.
- [ ] **Step 3:** Run both new test files and observe expected failures.

### Task 2: Hide Breaking Pill on Mobile/APK & Fix Bottom Dock Jumping/Focus

**Files:**
- Modify: `frontend/src/components/layout/AdaptiveNotchPill.tsx`
- Modify: `frontend/src/hooks/useArticles.ts`
- Modify: `frontend/src/components/ui/CircularGallery.tsx`
- Modify: `frontend/src/components/article/CircularGalleryWireDock.tsx`

- [ ] **Step 1:** Guard `AdaptiveNotchPill` with `Capacitor.isNativePlatform()` check + `hidden md:block` container class so it never renders on mobile/APK.
- [ ] **Step 2:** In `useArticles.ts`, keep `setArticles()` for initial mount & filter changes, and route the 45-second background interval through `applyLiveArticlesBatch(data.items)`.
- [ ] **Step 3:** In `CircularGallery.tsx`:
  - Fix `setSlot(slot, announce = true)` so `if (announce)` wraps BOTH `setActive(index)` AND `s.onActiveChange?.(index)`.
  - Add `syncIndex(index)` (or instant silent `focus(index, immediate = true)`) that detects shifted item positions by `item.id` and snaps `state.scroll`, `state.target`, and `state.active` silently when `items` changes, preventing jump animations and accidental story changes.
- [ ] **Step 4:** Update `CircularGalleryWireDock.tsx` to use silent index alignment (`syncIndex` / `focusIndex`) without calling `selectArticleById` on background list changes.

### Task 3: Backend 200-Article Cap Every 30 Minutes & "Fetch Next 200" Settings UI

**Files:**
- Create: `backend/src/db/migrations/025_cycle_cap_and_30m_default.sql`
- Modify: `backend/src/routes/settings.ts`
- Modify: `backend/src/fetch/scheduler.ts`
- Modify: `backend/src/routes/controlRoom.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/store/useAppStore.ts`
- Modify: `frontend/src/lib/autonomousEngine.ts`
- Modify: `frontend/src/components/settings/UnifiedSettingsDialog.tsx`

- [ ] **Step 1:** Add SQL migration `025_cycle_cap_and_30m_default.sql` (`max_articles_per_cycle = '200'`, upgrade untouched default `refresh_interval_minutes` to `'30'`).
- [ ] **Step 2:** Update `backend/src/routes/settings.ts` schema/defaults (`max_articles_per_cycle: 10..1000`, `refresh_interval_minutes` default `30`).
- [ ] **Step 3:** Update `backend/src/fetch/scheduler.ts` (`getMaxArticlesPerCycle()`, source rotation cursor `nextSourceCursor`, hard stop once `cycleCount >= maxCap`, `triggerManualFetchCycle(force, opts)` returning `{ cappedAt }`) and `backend/src/routes/controlRoom.ts` (`/fetch-cycle` forwarding `{ maxArticles, advanceCursor }`).
- [ ] **Step 4:** Add `max_articles_per_cycle` cap to `autonomousEngine.pollLiveFeeds()` and wire `UnifiedSettingsDialog.tsx` ("Main Settings / General & News/Sources") with the **"Fetch Next 200 News Articles"** button + cap controls.

### Task 4: Fix Reading Timer & Implement Focused UI/UX Upgrades

**Files:**
- Modify: `frontend/src/store/useAppStore.ts`
- Modify: `frontend/src/components/article/ArticlePanel.tsx`
- Modify: `frontend/src/components/reader/ReadingTrackerCard.tsx`
- Modify: `frontend/src/components/sources/SourceHealthDesk.tsx`

- [ ] **Step 1:** Refactor `readingStats` in `useAppStore.ts` to store `totalSecondsRead` alongside derived `totalMinutesRead`, add `recordReadingSeconds(seconds)`, and stop adding `readTimeMin` inside `recordArticleRead`.
- [ ] **Step 2:** In `ArticlePanel.tsx`, replace immediate `recordArticleRead` inside `useEffect([article?.id])` with a visibility-aware 1-second active-reading ticker (accruing real active reading seconds via `recordReadingSeconds` and logging the read article once >= 5 seconds elapse).
- [ ] **Step 3:** Apply UI/UX upgrades:
  - Collapsible `"Desk Tools"` tray in `ArticlePanel.tsx` so mobile & desktop reader headers stay crisp without clipping.
  - Generous bottom dock scroll clearance (`pb-56 sm:pb-60`) inside `#article-panel`.
  - Switch subheadings (`ReadingTrackerCard`, `SourceHealthDesk`, `AdaptiveNotchPill`) from `font-masthead` to `font-headline` for sharp legibility.

### Task 5: Full Verification, Build, Cap Sync & Visual Audit

- [ ] **Step 1:** Run `npm --prefix frontend run typecheck`, `npm --prefix frontend test`, `npm --prefix backend test` (0 failures).
- [ ] **Step 2:** Run `npm run build` and `cd frontend && npx cap sync android`.
- [ ] **Step 3:** Run Playwright verification across Desktop (`1440×900`) and Mobile (`390×844`) verifying no red pill on mobile, stable dock focus on live batch arrival, collapsible Desk Tools, Dock scroll clearance, and Settings Fetch 200 UI, then inspect screenshots.

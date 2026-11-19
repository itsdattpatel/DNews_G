# PRD: Circling Bottom Docker, Unified Reader Desk & Telegraphic Scrambled Text

**Document Version:** 1.0.0  
**Feature Target:** DNews Broadsheet Desk, Navigation Docker & Typography Animation  
**Status:** Approved for Implementation  
**Author:** AI Systems Architect & Core Frontend Team  

---

## 1. Executive Summary & User Objectives

### 1.1 Problem & Motivation
Currently:
1. The reading desk is split into two separate boxed columns (`ArticlePanel` 60% and `SummaryPanel` 40% separated by a vertical drag handle). This fragments the reading experience and narrows both columns on medium-sized screens.
2. The bottom dispatch strip sits in a separate fixed panel below a horizontal resize handle, occupying rigid vertical real estate.
3. Headlines appear statically without the tactile telegraphic/wire-decrypting excitement characteristic of historic wire dispatch terminals.

### 1.2 User Vision & Solution
1. **Unified Full-Box Reader Desk:** Transform the main reading desk into **one continuous, expansive broadsheet reading box**. The headline, publisher byline, verbatim evidence text, and executive wire summary live harmoniously within a single full-width reading view.
2. **Circling Curved Docker (Arched Orbit Dock):** The bottom strip is transformed into a **floating circular dock** overlaid on top of the bottom of the main reading box.
   - It features an **arched circular trajectory**: news cards start lower at the left and right edges and casually sweep higher toward the center apex where the currently focused news box is completely elevated, sharp, and clearly seeable.
   - **Radial Blur & Clean Focus:** Cards on the left and right flanks have a soft blur that progressively clears into crisp, sharp focus as they approach the bottom center.
   - **Frosted Glass Backdrop:** The dock and cards sit inside a frosted broadsheet glass surface (`backdrop-blur-md` / `backdrop-blur-lg` with subtle paper grain and ink borders).
   - **Follows Active Story:** Automatically rotates and slides smoothly when stories auto-advance, when clicking any card, or using keyboard `j`/`k` / arrows.
3. **Scrambled Text Animation (`ScrambledText.tsx`):**
   - Implements the React Bits / `@react-bits/ScrambledText` (DecryptedText) character-scrambling effect on the main reader headline.
   - Characters cycle dynamically through cipher glyphs before resolving into the real headline.
   - **100% Font Preservation:** Preserves existing broadsheet serif typography (EB Garamond / Playfair Display / Source Serif 4).
4. **Settings Page Controls (`UnifiedSettingsModal.tsx`):**
   - Dedicated "Telegraph Scramble Animation" panel in Settings.
   - Toggles: Enable/Disable animation, sequential reveal vs. simultaneous.
   - Sliders: Scramble speed (ms) and Max iterations.
   - Glyph Presets: Broadsheet Telegraph (`A-Z 0-9 — · / [ ]`), Cryptographic Cipher, or Matrix Alphanumeric.
   - Live interactive preview badge right inside the Settings dialog.
5. **Live Website Server Mode:**
   - Launch DNews as a live local website (`http://localhost:5173` with Vite HMR + backend daemon) so the user can test changes live in their browser without building or downloading EXEs!

---

## 2. Technical Architecture & Component Specifications

```
+--------------------------------------------------------------------------+
|                          TopBar (Masthead)                               |
+--------------------------------------------------------------------------+
|                        Status Strip / Ticker                             |
+--------------------------------------------------------------------------+
|                                                                          |
|              [ UNIFIED FULL-BOX BROADSHEET READER DESK ]                 |
|                                                                          |
|   Category Stamp · Publisher · Dateline · Corroboration Badge            |
|   --------------------------------------------------------------------   |
|   HEADLINE (Animated with ScrambledText / DecryptedText effect)          |
|   --------------------------------------------------------------------   |
|   Lead Drop-Cap Paragraph & Full Synthesized Article Body                 |
|   Verbatim Evidence Highlights & Multi-Source Comparison                 |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |          [ CIRCLING CURVED DOCKER - FLOATING OVERLAY ]           |   |
|   |         (Frosted Backdrop Blur & Circular Elevation Arc)         |   |
|   |                                                                  |   |
|   |     [Card -2]      [Card -1]      [Card 0]      [Card +1]  ...   |   |
|   |   (Lower+Blur)   (Rising+Clean) (Apex Focus)  (Lower+Blur)       |   |
|   +------------------------------------------------------------------+   |
+--------------------------------------------------------------------------+
```

---

## 3. Detailed Component Plan

### 3.1 Component 1: `frontend/src/components/ui/ScrambledText.tsx`
- **Architecture:** Based on React Bits `DecryptedText` / `ScrambledText`.
- **Props:**
  - `text`: string (target text)
  - `speed`: number (ms per tick, default 40)
  - `maxIterations`: number (cipher cycles, default 12)
  - `sequential`: boolean (reveal left-to-right or simultaneous, default true)
  - `characters`: string (glyph pool)
  - `enabled`: boolean (if false, renders plain text instantly)
  - `className`: string
  - `scrambledClassName`: string (styling for in-flight scrambling glyphs)
- **Lifecycle:** Re-triggers cleanly whenever `text` changes (when navigating to a new article). Honors `prefers-reduced-motion`.

### 3.2 Component 2: `frontend/src/components/article/CircularDock.tsx`
- Replaces/enhances the bottom dispatch strip with a floating circular dock.
- **Mathematical Geometry for Arched Curve:**
  ```typescript
  // For each card at index i, calculate relative distance from focused index:
  const offset = index - activeIndex;
  // Elevation arc: Center (offset 0) is elevated; flanks sit lower
  const translateY = Math.min(30, Math.abs(offset) * 8);
  // Scale: Center is largest (1.06x), flanks decrease to 0.88x
  const scale = Math.max(0.85, 1.06 - Math.abs(offset) * 0.05);
  // Blur: Center is 0px, flanks blur progressively up to 4px
  const blur = Math.min(4, Math.abs(offset) * 1.5);
  // Opacity: Center is 1.0, flanks fade to 0.4
  const opacity = Math.max(0.35, 1 - Math.abs(offset) * 0.18);
  ```
- **Styling:**
  - Sits at `absolute bottom-4 left-0 right-0 z-30 pointer-events-none`.
  - Inner track has `pointer-events-auto` with `backdrop-blur-md bg-paper/75 border-t border-b border-ink/20 shadow-lg`.
  - Left and right gradient masks: `mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent)`.
  - Clicking any card triggers `selectArticleById(id)` and smoothly centers it at apex.

### 3.3 Component 3: `frontend/src/components/article/ArticlePanel.tsx` (Unified Reader)
- Takes the full width of the main desk.
- Integrates executive summary bullets, key takeaways, and source corroboration directly beneath or beside the article text in a clean 1920s newspaper double-rule format.
- Wraps the headline `<h1 id="article-headline">` in `<ScrambledText />` using settings from `useAppStore`.
- Leaves bottom padding (`pb-48`) so reading text is never obstructed by the floating dock.

### 3.4 Component 4: Settings Store & Modal (`useAppStore.ts` & `UnifiedSettingsModal.tsx`)
- Add state slice:
  ```typescript
  scramble_enabled: boolean;        // default: true
  scramble_speed: number;          // default: 35 (ms)
  scramble_max_iterations: number; // default: 12
  scramble_sequential: boolean;     // default: true
  scramble_charset: 'telegraph' | 'crypto' | 'matrix';
  ```
- Add dedicated UI section under Settings -> Display & Typography with sliders, switches, and a live preview card.

---

## 4. Verification & Testing Plan
1. **Unit Tests:**
   - Write `frontend/src/__tests__/unit/scrambled-text.test.tsx` (tests render, scramble effect, and instant fallback when disabled).
   - Write `frontend/src/__tests__/unit/circular-dock.test.tsx` (tests arched offset calculation, blur classes, and card selection).
   - Verify full test suite passes (56+ test files, 325+ tests).
2. **Visual Validation (Playwright):**
   - Capture screenshot of Unified Full Reader with ScrambledText animation.
   - Capture screenshot of Circular Arched Docker with center elevated card and blurred flanking cards.
   - Capture screenshot of Settings page with Telegraph Scramble controls.
3. **Live Website Mode:**
   - Start backend daemon on `127.0.0.1:3001` and Vite dev server on `http://localhost:5173`.
   - Verify live HMR connectivity so user can view live in browser.

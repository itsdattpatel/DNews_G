# PRD: Cross-Platform Button Placements, Ergonomics & Wire Syndication Audit
*Version 1.0 · 2026-11-22 · AI World News Desk*

---

## 1. Executive Summary & Purpose

The **AI World News Desk** is designed to provide an authentic 1920s broadsheet newspaper reading experience seamlessly rendered across diverse digital form factors:
1. **Mobile Portrait** (e.g. iPhone 14 Pro 390×844, Pixel 7, SE 375×667)
2. **Mobile Landscape** (e.g. 844×390, 667×375)
3. **Desktop & Electron EXE Mode** (1280×800 to 4K Ultrawide 3840×2160)

As features expand (from Bionic Speed-Reading and Typography Studio to Multi-Perspective Bias Radar, Claim Corroboration Matrix, Sunday Edition Magazine, Knowledge Mind-Maps, and Hardware Security Enclaves), maintaining **ergonomic button placement, zero-clipping reachability, and uninterrupted feed syndication** becomes critical.

This Product Requirements Document (PRD) defines the exact spatial placement, reachability zones, layout behaviors, and feed fetch resilience specifications across all viewports.

---

## 2. Viewport Targets & Ergonomic Zoning

### 2.1 Viewport Breakpoint Matrix

| Mode | Viewport Dimensions | Primary Navigation | Article Action Bar | Layout Behavior |
|------|--------------------|--------------------|--------------------|-----------------|
| **Mobile Portrait** | 390×844 (360–430px wide) | Bottom Thumb Nav (`MobileBottomNav`, min 48px target) + Masthead Bat Icon | Single-row horizontal glide (`overflow-x-auto no-scrollbar scroll-smooth`) | 100% full-width single column; bottom safe-area insets |
| **Mobile Landscape** | 844×390 (max-height ≤ 480px) | Compact TopBar (h-10) + Masthead menu drawer | Single-row horizontal glide, ultra-compact buttons | Full-width reader; right rail hidden or minimized to prevent vertical crowding |
| **Tablet / Foldable** | 768×1024 / 820×1180 | TopBar + Right Rail or Bottom Nav | 2-row adaptive or single-row glide | Fluid two-column split (55/45) |
| **Desktop / EXE** | 1280×800 to 3840×2160 | Master TopBar + Right Icon Rail (`RightIconRail`, 44px/180px) | Gliding or wrapped button shelf with full labels | Dual-reader broadsheet spread (60% article / 40% evidence summary) |

### 2.2 Mobile Ergonomics & Thumb Zones (Portrait)
- **Natural Thumb Zone (Bottom 1/3, y: 550px–844px)**:
  - `MobileBottomNav` with 5 essential quick-touch hubs: Dispatches, Sections, News TV, Library, Settings.
  - Floating action buttons and pagination / article progression controls (`j`/`k` touch arrows).
- **Reach Zone (Middle 1/3, y: 250px–550px)**:
  - Article text, verbatim evidence anchor highlights, and inline note badges.
- **Stretch Zone (Top 1/3, y: 0px–250px)**:
  - `TopBar` (Masthead, Region filter, Breaking toggle, Search wire).
  - Article Action Bar (`ArticlePanel`): Must **never wrap into 3–4 vertical rows**, which pushes the headline and article body down into the bottom fold. Instead, it must glide smoothly along the horizontal axis with finger-flick momentum (`touch-pan-x`).

### 2.3 Mobile Landscape Ergonomics (Short Viewport, h ≤ 480px)
- **Vertical Budget**: Total available height is only 390px (or less with browser chrome).
- **Constraints**:
  - `TopBar` must collapse to `h-10` (40px) or `h-11` (44px) with compact padding (`py-1`).
  - Search input shrinks to icon-only trigger or compact width.
  - Article action bar must be tightly padded (`py-0.5`, `h-8`), allowing the headline and first paragraph to be immediately visible above the fold.
  - `RightIconRail` (12+ items) must not overflow vertically. On screens where `height < 500px`, `RightIconRail` either scrolls internally with `overflow-y-auto no-scrollbar` or stays hidden in favor of the masthead drawer.

---

## 3. Component Button Placement & Interaction Specifications

### 3.1 Article Action Bar (`ArticlePanel.tsx`)
**Problem Identified**:
In previous versions, line 449 of `ArticlePanel.tsx` declared `<div className="flex flex-wrap items-center gap-2">`. With 12+ feature triggers (Layout Switcher, Bionic Reading, Typography Studio, Margin Notes, PDF Broadsheet, Satirical Cartoon, Bias Radar, Claim Corroboration, Knowledge Mind-Map, Markdown Export, Bookmark, Translation Toggle), this wrapped into 3–4 stacked rows on mobile screens, consuming over 160px of vertical space and pushing the article headline off the screen.

**Specification**:
1. **Container Styling**:
   ```tsx
   <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth touch-pan-x shrink-0 max-w-full">
   ```
2. **Button Targets**:
   - Minimum touch height: 36px on desktop, 44px on mobile touch (via `min-h-[38px] sm:min-h-[32px]` with padding).
   - Visual styling: `#F2EDE2` paper-alt surface, `#D9D0BE` border, `#1A1208` ink text, font-ui bold typography.
   - Haptic Feedback: Every button fires `triggerHaptic('selection')` or `triggerHaptic('bookmark')`.
3. **Button Sequence (Left to Right)**:
   1. `ReaderLayoutSwitcher`: Dual, Single Column, Focus, or Split.
   2. `Bionic Speed-Reading`: Zap icon + toggle state badge (`#btn-toggle-bionic-reading`).
   3. `Typography Studio`: Type icon + font studio drawer (`#btn-open-typography-studio`).
   4. `Margin Notes`: Edit3 icon + counter badge (`#btn-open-margin-notes`).
   5. `Front Page PDF`: Printer icon + 1920s broadsheet generator (`#btn-print-front-page-pdf`).
   6. `Satirical Cartoon`: Image icon + daily syndicated cartoon (`#btn-open-editorial-cartoon`).
   7. `Bias Radar`: Compass icon + multi-perspective radar (`#btn-open-bias-radar`).
   8. `Claim Corroboration`: ShieldCheck icon + multi-source matrix (`#btn-open-claim-corroboration`).
   9. `Knowledge Mind-Map`: Network icon + concept graph modal (`#btn-open-knowledge-mindmap`).
   10. `Markdown Export`: Download icon + Obsidian/Notion markdown (`#btn-export-markdown`).
   11. `Bookmark Story`: Star icon + toggle bookmark.
   12. `Original / Translation Toggle`: Language swap button (`#btn-toggle-translation`).

### 3.2 Master Top Bar (`TopBar.tsx`)
**Placement & Responsive Behavior**:
- **Left**: Custom SVG Bat Icon (`BatIcon`, wings flap/unfold) + Masthead Logotype ("The World Desk", UnifrakturCook font).
- **Center / Shrinkable**:
  - Region / Country Selector dropdown (`#country-filter-select`): hidden on narrow mobile (<640px), accessible in masthead menu.
  - Directory View Switcher (`#btn-toggle-category-view`): hidden on narrow mobile (<640px).
- **Right**:
  - Breaking News Toggle (`#breaking-filter-toggle`): Always visible, flame icon with crimson fill.
  - Auto-Advance Toggle (`#btn-auto-advance-toggle`): Play/Pause icon with interval counter.
  - Incognito Shield Button (`#btn-topbar-incognito`): Quick toggle for ephemeral RAM-only reading.
  - Search Wire Input (`#article-search-input`): Shrinks fluidly from 192px down to 96px on narrow viewports without clipping sibling controls.

### 3.3 Mobile Bottom Navigation (`MobileBottomNav.tsx`)
**Placement & Safe Area Ergonomics**:
- Fixed to bottom: `fixed bottom-0 left-0 right-0 z-40`.
- Safe area inset: `pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]`.
- Touch target: Minimum 48px height per button.
- Items:
  1. `Dispatches` (`#mobile-nav-reader`): Opens main Dual Reader desk.
  2. `Sections` (`#mobile-nav-category`): Opens Category Directory grid.
  3. `News TV` (`#mobile-nav-tv`): Opens HLS Live TV streams.
  4. `Library` (`#mobile-nav-library`): Opens Sunday Edition / Historical Archives.
  5. `Settings` (`#mobile-nav-settings`): Opens Unified Settings Dialog.

### 3.4 Right Vertical Navigation Rail (`RightIconRail.tsx`)
**Desktop & EXE Placement**:
- Docked to right side of viewport in normal document flex flow.
- Collapsed width: 44px (touch-friendly 40×40px minimum targets).
- Pinned width: 180px with accessible labels and keyboard shortcuts.
- Groups:
  1. *Live Status & Wire Telemetry*: Live pulse dot, Feed Counter downward popover.
  2. *View Hubs*: Main Reader, Category Directory, Live TV, Global Radar 3D Globe, Alerts Center.
  3. *Reading Modes*: Plain Reader mode toggle, High-Contrast ink theme toggle.
  4. *System & Settings*: Unified Settings Dialog trigger.
- **Mobile Landscape Adaptation**: On viewports where `height < 480px`, the rail renders with `overflow-y-auto no-scrollbar` so that bottom items (Settings, Theme toggle) remain completely reachable.

### 3.5 Unified Settings Dialog (`UnifiedSettingsDialog.tsx`)
**Layout & Reachability**:
- Desktop/EXE: 2-column modal (`max-w-4xl`, 600px height). Left rail has 7 category tabs (General, AI Providers, Sources, Display & Fonts, Wire Automation, Security & Privacy, Storage & Maintenance) with fixed 240px width. Right pane is an expansive settings configuration form.
- Mobile Portrait & Landscape: Left tabs convert to a horizontal scrollable tab strip (`flex-row overflow-x-auto no-scrollbar border-b`) or full-width drawer, giving the right settings form 100% of available screen width so controls are never squished or clipped.

---

## 4. Feed Fetching & Wire Syndication Resilience

### 4.1 Root Cause Analysis of Fetch Disruptions
1. **Connectivity Watchdog Socket Timeout**:
   - `ConnectivityWatchdog` originally probed TCP port 53 on `1.1.1.1`.
   - On restricted enterprise networks, cellular carriers, or certain VPNs, outbound TCP port 53 is blocked by network firewalls even when HTTPS port 443 and HTTP port 80 are fully functional.
   - This caused the watchdog to declare the app `OFFLINE`, suspending all scheduled feed fetching in `scheduler.ts` and blocking manual triggers.
2. **Mitigation & Multi-Tier Probe Architecture**:
   - **Tier 1 (Fast Probe)**: TCP socket connect to `1.1.1.1:53` with 2500ms timeout.
   - **Tier 2 (HTTP 204 Fallback)**: If TCP socket fails or times out, perform a lightweight HTTP GET to `http://www.google.com/generate_204` or `http://captive.apple.com` with a 2000ms timeout. If HTTP 204/200 returns, the internet is confirmed ONLINE.
   - **Tier 3 (DNS Resolve Fallback)**: `dns.resolve('cloudflare.com')`.
   - **Manual Force-Fetch Override**: User-initiated manual fetch triggers (`triggerManualFetchCycle(force = true)`) will always attempt a fetch cycle regardless of the watchdog flag, auto-recovering connectivity status upon successful HTTP fetch.

### 4.2 Offline Fallback & Seed Data Guarantee
When truly disconnected from the internet:
- The app immediately serves cached articles from local SQLite (`getDb()`).
- In-memory seed broadsheet dispatches ensure first-time startup without internet still presents a complete, readable newspaper.
- An offline indicator stamp displays: `"Offline Syndication — Reading Cached Dispatches"`.

---

## 5. Reachability & Cross-Platform Audit Matrix

| Component | Selector ID | Mobile Portrait (390×844) | Mobile Landscape (844×390) | Desktop/EXE (1366×850) | Verification Standard |
|-----------|-------------|---------------------------|----------------------------|------------------------|-----------------------|
| TopBar Bat Icon | `#bat-logo-icon` | Visible, Left | Visible, Left | Visible, Left | Unfolds navigation overlay |
| Country Filter | `#country-filter-select` | Hidden (in Drawer) | Hidden (in Drawer) | Visible, Right | 7 regions selectable |
| Breaking Toggle | `#breaking-filter-toggle` | Visible (Icon-only) | Visible (Icon-only) | Visible (Icon+Label) | Filters breaking_score ≥ 75 |
| Search Input | `#article-search-input` | Visible (Compact 96px) | Visible (128px) | Visible (192px) | Real-time wire filter |
| Incognito Mode | `#btn-topbar-incognito` | Visible, Right | Visible, Right | Visible, Right | Toggles ephemeral reading |
| Bionic Reading | `#btn-toggle-bionic-reading` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Fixation stems highlighted |
| Typography Studio | `#btn-open-typography-studio` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens font & column controls |
| Margin Notes | `#btn-open-margin-notes` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens notes drawer with counter |
| Front Page PDF | `#btn-print-front-page-pdf` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens PDF generator |
| Editorial Cartoon | `#btn-open-editorial-cartoon` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens syndicated cartoon |
| Bias Radar | `#btn-open-bias-radar` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens 5-axis bias modal |
| Claim Matrix | `#btn-open-claim-corroboration`| Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens corroboration modal |
| Knowledge Mind-Map| `#btn-open-knowledge-mindmap`| Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Opens SVG concept graph |
| Markdown Export | `#btn-export-markdown` | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Triggers file download |
| Bookmark Story | Button with Star | Gliding bar, visible | Gliding bar, visible | Visible, Action Bar | Toggles amber bookmark |
| Mobile Bottom Nav | `#mobile-bottom-nav` | Visible, Fixed Bottom | Hidden (reclaimed space) | Hidden | 5 hubs with min 48px height |
| Right Icon Rail | `#right-icon-rail` | Hidden (reclaimed space) | Hidden / Compact | Visible, Docked Right | 44px/180px with tooltips |
| Settings Dialog | `#unified-settings-dialog` | Full-width single col | Full-width single col | 2-column split modal | All 7 sections accessible |

---

## 6. Implementation & Execution Plan

1. **Step 1: Article Action Bar Gliding Strip**:
   - Refactor `ArticlePanel.tsx` line 449 container to `flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth touch-pan-x shrink-0 max-w-full`.
   - Ensure all 12 buttons remain on a single horizontally scrollable track.
2. **Step 2: Mobile Landscape Low-Height Optimization**:
   - Add media query rules or Tailwind classes (`max-h-[44px]`, `@media (max-height: 480px)`) to `TopBar.tsx` and modal overlays to prevent any vertical clipping.
3. **Step 3: Multi-Tier Connectivity Watchdog & Manual Fetch Resilience**:
   - Update `backend/src/utils/connectivityWatchdog.ts` with HTTP 204 fallback probe.
   - Update `backend/src/fetch/scheduler.ts` to allow manual force-fetch override.
4. **Step 4: Full Validation & Visual Verification**:
   - Run `npm test` across all 109 test files.
   - Run `npm run build:all` to ensure zero compilation errors.
   - Execute Playwright test script across Mobile Portrait (390×844), Mobile Landscape (844×390), and Desktop/EXE (1366×850) capturing screenshots.
   - Review screenshots with `ui-visual-validator` and present to user.

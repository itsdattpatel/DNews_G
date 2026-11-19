# Product Requirements Document (PRD) — Expansion Suite & Mobile Preparation
*AI World News Desk v3.1 · 2026-11-19*

---

## 1. Executive Summary

This specification governs the implementation of five core enhancement pillars for the AI World News Desk, followed by packaging an updated desktop `.exe` distribution and planning the horizontal mobile APK build:
1. **Pillar 1: Dock & Reader Micro-Interactions** (Auto-advance progress bar on active card, quick-peek hover tooltip, tactile broadsheet mechanical audio feedback).
2. **Pillar 2 (Items 5 & 6): AI Intelligence & Investigation** (Interactive Entity Dossier Inspector, Cross-Outlet Claim & Bias Comparison).
3. **Pillar 4: Sources & Multi-Layouts** (Custom RSS / Channel Manager with live validation & favicon discovery, Reader Layout Switcher: Broadsheet, Wire Terminal, and Photojournalism).
4. **Pillar 5 (Item 12): Mobile Touch & Gesture Physics** (Touch fling, momentum scrolling, and swipe navigation for the 3D Circular Gallery).
5. **Operational Control**: Direct toggle in Settings to silence/disable breaking news notifications and audio chimes.
6. **Mobile APK Roadmap**: Preparation for compiling an Android package maintaining the horizontal landscape layout of the laptop experience.

---

## 2. Feature Specifications

### 2.1 Pillar 1: Dock & Reader Polish
- **1.1 Auto-Advance Active Card Countdown**:
  - When `autoAdvanceEnabled` is active, the focused card renders an animated ink-crimson (`--color-accent`) progress line at its bottom or top edge, tracking elapsed time towards the configured timer (e.g., 7s).
  - Pausing or pressing spacebar freezes the progress indicator; manual advance (`j`/`k`) resets it.
- **1.2 Card Quick-Peek Hover Tooltip**:
  - When hovering over an unfocused card in the 3D dock for $>350\text{ ms}$, an ink-and-paper floating broadsheet card emerges right above it:
    - Source name + country stamp (e.g., `THE HINDU · India`).
    - Relative timestamp (`12m ago`).
    - Full English headline in serif typography.
    - 1-line key fact lead quote.
- **1.3 Broadsheet Tactile Audio Feedback**:
  - Web Audio API synthesized organic broadsheet sound effects:
    - *Mechanical Teletype Click*: On card advance or keyboard navigation (`j`/`k`).
    - *Smooth Paper Rustle*: On dock unbending or wake/drop transition.
    - *Desk Chime*: On breaking news alert.
  - Full volume slider ($0\%$ to $100\%$) and master audio mute toggle located in Settings under "Alerts & Audio".

### 2.2 Pillar 2 (Items 5 & 6): AI Intelligence & Investigation
- **2.1 Entity Dossier & Deep Connection Inspector**:
  - In the reading desk, entity badges (people, organizations, nations) are rendered with subtle ink underlines.
  - Clicking an entity opens a slide-over panel from the right:
    - Historical mention frequency across the SQLite database.
    - Global sentiment trajectory (positive, negative, neutral).
    - Top co-occurring entities and nations.
    - Chronological list of past dispatches referencing the entity with one-click jump.
- **2.2 Cross-Outlet Bias & Claim Comparison**:
  - For clustered events covered by $>1$ source, display a "Compare Coverage" badge.
  - When opened, shows a side-by-side comparison:
    - Headline variations across outlets.
    - Framing analysis (e.g., economic focus vs. political controversy vs. humanitarian angle).
    - Discrepancy highlights (conflicting casualty figures, disputed quotes, differing timelines).

### 2.3 Pillar 4: Custom Sources & Alternative Reader Layouts
- **2.3 Custom RSS & Channel Manager**:
  - Accessible via Settings -> "News and Sources" or TopBar.
  - User can input:
    - RSS/Atom Feed URL or YouTube Channel URL.
    - Custom Name and Country/Region.
    - Category default.
  - Includes a "Test Feed" button that fetches the latest 3 items in real time and discovers the outlet's favicon before saving.
  - Saved to SQLite `sources` table and immediately integrated into the live polling scheduler.
- **2.4 Multi-Layout Reader Switcher**:
  - Three distinct layout options selectable via quick-switch pill in TopBar or Settings:
    1. *Classic Broadsheet* (Default): 1920s newspaper typography, drop cap, multi-column reading, verbatim evidence box.
    2. *Wire Terminal*: High-density Reuters/Bloomberg dark tabular layout, monospaced metadata, compact telemetry, instant keyboard scrolling.
    3. *Photojournalism Magazine*: High-contrast full-bleed editorial imagery, large pull quotes, elegant modern serif styling.

### 2.4 Pillar 5 (Item 12): Mobile Touch & Gesture Physics
- **3D Circular Gallery Touch Physics**:
  - Touch-drag support on the canvas (`touchstart`, `touchmove`, `touchend`).
  - Velocity calculation with inertia decay: flicking horizontally scrolls across multiple cards with organic friction.
  - Tap detection: tapping a card centers and selects it without triggering an accidental drag.

### 2.5 Breaking News Notification Control
- In `UnifiedSettingsDialog.tsx` under the "Alerts & Audio" section:
  - Add explicit toggle: **"Breaking News Desktop Notifications"** (On/Off).
  - Add toggle: **"Breaking News Audio Chime"** (On/Off).
  - Ensures users who prefer quiet reading can suppress popups and sounds while keeping the visual ticker active.

---

## 3. Implementation Phasing

To adhere strictly to `GEMINI.md` (one task at a time, verify with tests & screenshots, wait for user approval):

1. **Step 1: Settings Control + Pillar 1 (Micro-Interactions)**
   - Breaking News Notifications toggle in Settings.
   - Auto-Advance Countdown Indicator on active 3D dock card.
   - Quick-Peek hover tooltip on unfocused dock cards.
   - Broadsheet Web Audio feedback engine.
2. **Step 2: Pillar 2 (AI Investigation)**
   - Clickable Entity Dossier Slide-Over Inspector.
   - Cross-Outlet Bias & Multi-Perspective Comparison Panel.
3. **Step 3: Pillar 4 (Sources & Layouts)**
   - Custom RSS/Channel manager with live validator in Settings.
   - Layout mode switcher (Broadsheet, Wire Terminal, Photojournalism).
4. **Step 4: Pillar 5 (Mobile Gestures)**
   - Touch drag and inertia physics for 3D Circular Gallery.
5. **Step 5: Desktop Packaging**
   - Verification suite, clean build, and `.exe` installer compilation.
6. **Step 6: Mobile APK Planning**
   - Requirements consultation & architecture execution for Android landscape build.

---

## 4. Verification Criteria
- All 57+ frontend test suites passing.
- 0 TypeScript compiler errors.
- Visual validation screenshots captured across all modified views using Playwright (`ui-visual-validator`).
- Anti-slop adherence: newspaper palette, no emojis as icons, no purple/blue gradients.

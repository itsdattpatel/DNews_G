# Layout Specification & Wireframes — PRD C
*Version 1.0 · 2026-11-03 · AI World News Desk*

---

## 1. Global Viewport Shell Architecture

The workspace layout is structured into five distinct visual zones in strict document flow:

```
┌───────────────────────────────────────────────────────────────────────────────────┬───────┐
│ 1. TOP BAR (Height: 48px, fixed at top, z-40)                                     │       │
│ [BAT] The World Desk  [All Regions ▾] [Directory] [🔥 Breaking] [▶ Auto (7s)] [🔍] │       │
├───────────────────────────────────────────────────────────────────────────────────┤       │
│ 2. STATUS STRIP (Height: 28px, normal flow under TopBar, z-30)                     │       │
│ [⏸ Paused: Reading (hover)] [2px Hairline Progress Bar] [Gap: 42m] [Plain: ON] [●]│       │
├───────────────────────────────────────────────────────────────────────────────────┤   R   │
│ 3. MAIN WORKSPACE / RESIZABLE DESK PANELS (flex-1, min-h-0, overflow-hidden)      │   I   │
│ ┌───────────────────────────────────────┬───────────────────────────────────────┐ │   G   │
│ │                                       │                                       │ │   H   │
│ │   LEFT PANEL: ARTICLE DESK            │   RIGHT PANEL: SUMMARY WIRE           │ │   T   │
│ │   - Broadsheet Headline & Kicker      │   - Neutral Broadsheet Summary        │ │       │
│ │   - Dual Timestamps (Pub + Arrived)   │   - Verified Key Evidence Anchors     │ │   I   │
│ │   - Full Article Body Text            │   - Key Topics & Entity Badges        │ │   C   │
│ │                                       │                                       │ │   O   │
│ ├───────────────────────────────────────┴───────────────────────────────────────┤ │   N   │
│ │ 4. SNAP-COLLAPSIBLE BOTTOM STORY STRIP (Default height: 160px)                │ │       │
│ │ [◀]  [Card 1]  [Card 2]  [★ ACTIVE CARD 3]  [Card 4]  [Card 5]  [Card 6]  [▶] │ │   R   │
│ ├───────────────────────────────────────────────────────────────────────────────┤ │   A   │
│ │ 5. BOTTOM TICKER (Height: 28px, fixed at bottom, z-30)                        │ │   I   │
│ │ ▶ WIRE TICKER: Breaking news item 1 ... Breaking news item 2 ...              │ │   L   │
└─┴───────────────────────────────────────────────────────────────────────────────┴───────┘
```

---

## 2. Top Bar Responsive Behavior

The Top Bar is simplified to maintain a single horizontal line that never overflows or wraps across all supported resolutions (1280px to 4K).

### 2.1 Component Elements
1. **Masthead**: Bat SVG Icon (32px) + "The World Desk" logotype + subtitle "Global Dispatch & Wire" (hidden on small viewports).
2. **Region Selector**: Native dropdown (`All Regions`, `India`, `USA`, `China`, `Japan`, `Australia`, `Wildlife Wire`).
3. **Directory Toggle**: Dual Reader ↔ Category Directory view switcher.
4. **Breaking Filter**: Toggle button with flame icon for high-impact alerts (`score >= 75`).
5. **Auto-Advance Toggle**: Quick switch (`▶ Auto (7s)` / `⏸ Auto (7s)`).
6. **Search Input**: Full-text search with magnifying glass icon and clear button.

### 2.2 Progressive Collapse Rules (Right-to-Left priority)
When viewport width decreases:
1. **Width 1920px+**: All labels, full search box (w-52), masthead subtitle visible.
2. **Width 1536px**: Masthead subtitle hides; search input contracts to w-40.
3. **Width 1366px**: Search input contracts to w-32; "Breaking" text remains; "Directory" text remains.
4. **Width 1280px**:
   - Search input contracts to w-28.
   - "Directory" label collapses to icon-only button with tooltip.
   - "Breaking" label collapses to flame icon badge with tooltip.
   - "Auto (7s)" collapses to `[▶ 7s]` / `[⏸ 7s]`.
   - Result: 100% of controls fit comfortably within 1280px without overflow.

```
Wide View (1920x1080):
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [BAT] The World Desk        [All Regions ▾]  [📂 Directory]  [🔥 Breaking]  [▶ Auto (7s)]  [🔍 Search... ✖] │
│       Global Dispatch & Wire                                                                           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Compact View (1280x720):
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [BAT] The World Desk        [All Regions ▾]  [📂]  [🔥]  [▶ 7s]  [🔍 Search...  ]                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Right Vertical Icon Rail

The Right Icon Rail is a vertical navigation column docked on the right edge. It is part of the layout flow (not floating), preventing occlusion of article content.

### 3.1 Dimensions & Styling
- **Width**: 44px (collapsed) / 180px (when expanded or pinned).
- **Background**: `--color-paper-alt` with left border `--color-paper-border`.
- **Keyboard Navigation**: Each button is accessible via `Tab` / `Shift+Tab` with visible broadsheet focus rings (`focus:ring-2 focus:ring-ink`).

### 3.2 Visual Structure & Groupings

```
┌───────┐  Expanded Hover / Pinned View:
│ [LIVE]│  ┌─────────────────────────┐
│ (3.2k)│  │ [LIVE] 3,251 Dispatches │  ← Group A: Live Status & Telemetry
│       │  │                         │
│  [🔔] │  │ [🔔]   Alerts (3)       │
├───────┤  ├─────────────────────────┤
│  [📺] │  │ [📺]   TV Wire (t)      │  ← Group B: Alternate Desks & Views
│  [🌐] │  │ [🌐]   3D Globe (g)     │
│  [📖] │  │ [📖]   The Library (l)  │
│  [⚡] │  │ [⚡]   Control Room (c) │
├───────┤  ├─────────────────────────┤
│  [🔲] │  │ [🔲]   Plain Mode: OFF  │  ← Group C: Modes & Aesthetics
│  [🌙] │  │ [🌙]   Night Edition    │
├───────┤  ├─────────────────────────┤
│       │  │                         │
│  [⚙]  │  │ [⚙]   Settings (,)     │  ← Group D: Desk Settings (Bottom)
│  [📌] │  │ [📌]   Pin Rail Open    │
└───────┘  └─────────────────────────┘
```

- **Live Counter Popover**: Positioned relative to the live counter icon; animates downward and flips inward if near viewport boundary.
- **Badges**: Active view gets dark filled border and high-contrast ink pill; unread alerts show crimson count dot.

---

## 4. Status Strip

The Status Strip resolves Issue 4 by removing the floating countdown container that blocked headlines and bylines.

### 4.1 Layout & Content Wireframe

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [▶] [⏸ Paused: Reading desk hovered] ═══════════════════[ 7s ] [Gap: 42m] [Plain: ON] [● System: OK]   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Height**: 28px fixed height, rendered directly below TopBar.
- **Left**:
  - Play/Pause toggle button (16px icon).
  - Ambient status text (`▶ Advancing in 5s` or `⏸ Paused: <reason>`).
  - 2px hairline progress bar spanning available horizontal space.
- **Right Chips**:
  - `Gap: Xm`: Visible only when post-launch telemetry indicates missed news window. Clicking opens `MissedNewsModal`.
  - `Plain: ON`: Visible only when Plain Mode (Zero AI) is enabled. Clicking toggles mode or opens plain mode settings.
  - `● System: OK`: Tri-color health badge (Green / Amber / Red) summarizing system operational status (Category 8 S2).

---

## 5. Bottom Story Strip (Auto-Follow Behavior)

### 5.1 Auto-Scroll Mechanics
- Whenever `selectedArticleId` changes (via auto-advance, keyboard `j`/`k`, or card selection), the active card smoothly centers itself within the scroll container:
  $$\text{Target Scroll Position} = \text{Card.offsetLeft} - \frac{\text{Container.clientWidth} - \text{Card.clientWidth}}{2}$$
- **Wrap-Around Animation**:
  - When reaching the final article ($N-1$) and advancing to the first ($0$), the strip smoothly scrolls back to the start (`scrollLeft = 0`) without page flicker or jump.
- **User Override Grace Period**:
  - When the user manually scrolls (two-finger trackpad swipe or mouse wheel) or drags the scrollbar, auto-centering is suspended for **4.0 seconds**.
  - A subtle indicator displays `Follow paused (4s)` if an auto-advance event occurs during this window.
  - After 4 seconds of idle scrolling, auto-follow re-engages seamlessly.
- **Reduced Motion Support**:
  - If `prefers-reduced-motion` is active or configured in settings, scroll behavior switches from `'smooth'` to `'auto'` (instant jump without animation).

---

## 6. TV Broadcast Frame & Directory Layout

### 6.1 TV Screen Wireframe (Category 5)

```
┌─────────────────────────────────────────────────────────────────────────────────┬──────────────────────┐
│ [TV] International Television & Nature Wire                                [✕] │ CHANNEL DIRECTORY    │
├─────────────────────────────────────────────────────────────────────────────────┼──────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │ [🔍 Filter channels] │
│ │ 16:9 BROADCAST MONITOR (aspect-video, strictly locked geometry)             │ ├──────────────────────┤
│ │ [● LIVE] [HLS PROXY] ABC News Live (USA)                     1080p · 60fps  │ │ [All] [Top5] [India] │
│ │                                                                             │ │ [USA] [China] [JP]   │
│ │                                                                             │ ├──────────────────────┤
│ │                                                                             │ │ [● LIVE] ABC News    │
│ │                                                                             │ │  USA · News · HLS    │
│ │                                                                             │ │                      │
│ │                                                                             │ │ [● LIVE] BBC World   │
│ │                                                                             │ │  UK · News · HLS     │
│ │                                                                             │ │                      │
│ │                                                                             │ │ [● LIVE] NDTV 24x7   │
│ │                                                                             │ │  India · News · YT   │
│ └─────────────────────────────────────────────────────────────────────────────┘ │                      │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │ [▲ SLOW] NHK World   │
│ │ [🔈 MUTE] [━━━━━●━━━ 80%] [Probe] [⛶ Fullscreen] [📺 VLC] [📋 Copy URL]     │ │  Japan · News · HLS  │
│ └─────────────────────────────────────────────────────────────────────────────┘ │                      │
│ Quick Switcher: [ABC (USA)] [BBC (UK)] [NDTV (India)] [NHK (Japan)] [ABC (AU)] │ (Scrollable list     │
├─────────────────────────────────────────────────────────────────────────────────┤  with no clipping)   │
│ Stream Engine: HLS.js v1.5+ · Verified Live Feeds Only · SSRF Guarded Proxy     │                      │
└─────────────────────────────────────────────────────────────────────────────────┴──────────────────────┘
```

- **Player Ratio**: Strictly constrained to `aspect-video` (16:9 ratio) using CSS `aspect-ratio: 16 / 9;`.
- **Audio Controls**: Standalone speaker icon button toggling mute state, beside volume slider. Remembers last unmuted volume level.
- **Quick Switcher**: Formats channel items as `Name (Country)` to eliminate ambiguity between same-named outlets across different countries.
- **Channel List**: Takes 100% of sidebar height without footer overlap; card labels wrap cleanly over two lines or truncate with tooltips.

---

## 7. Viewport Matrix Specifications

| Viewport Resolution | Top Bar Adaptations | Status Strip | Icon Rail | Resizable Panels Default |
| :--- | :--- | :--- | :--- | :--- |
| **1280 × 720** (Small) | Search w-28; icons for Directory & Breaking; Auto shows `[▶ 7s]` | 28px; chips visible; font text-[10px] | Collapsed (44px); icons only | Split: Left 60% / Right 40%; Bottom strip 140px |
| **1366 × 768** (Standard Laptop) | Search w-32; full buttons; Auto shows `Auto (7s)` | 28px; full labels | Collapsed (44px); hover expansion | Split: Left 60% / Right 40%; Bottom strip 150px |
| **1536 × 864** (HiDPI Laptop) | Search w-40; all labels visible | 28px; full labels | Collapsed (44px); pin toggle available | Split: Left 60% / Right 40%; Bottom strip 160px |
| **1920 × 1080** (Full HD) | Search w-52; full masthead subtitle | 28px; spacious layout | Can stay pinned open (180px) without content squeeze | Split: Left 62% / Right 38%; Bottom strip 165px |

*Zero horizontal page scrollbars permitted across all viewports.*


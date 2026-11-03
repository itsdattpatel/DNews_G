# 3D Interactive Globe Specification — PRD C
*Version 1.0 · 2026-11-03 · AI World News Desk*

---

## 1. Objectives & Overview

The current flat 2D map component (`frontend/src/components/map/WorldMap.tsx`) provides basic choropleth visualization but lacks depth, geographic realism, and the tactile feel expected of a modern broadsheet desk.

Category 7 introduces a high-performance **3D Interactive Cartographic Globe** matching the design language of the AI World News Desk:
- Broadsheet-inspired color palette (Night Edition default with Paper Mode daytime variant).
- Dynamic data layers: country news density pins, crimson wildlife markers, pulsating arrival rings, and arcs connecting cross-country stories.
- Smooth camera navigation and ambient rotation.
- Robust performance safeguards with automatic fallback to the existing 2D flat map on low-powered hardware.

---

## 2. Package Vetting & Proposed Pinned Dependencies (Rule G5)

Per Rule G5, all new packages must be proposed with exact pinned versions, licenses, and vetting before installation:

| Package | Proposed Version | License | Age (>14 days) | Bundle Impact | Purpose |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`three`** | `0.170.0` | MIT | Yes (> 30 days) | Core 3D engine (tree-shaken) | WebGL rendering pipeline |
| **`@types/three`** | `0.170.0` | MIT | Yes (> 30 days) | Dev dependency | Strict TypeScript definitions |
| **`react-globe.gl`**| `2.27.3` | MIT | Yes (> 60 days) | Lightweight React wrapper | Declarative 3D globe bindings |

*Note: Alternative considered: `cobe` (5KB canvas globe). While extremely lightweight, `cobe` lacks built-in country polygon picking, arc rendering, and custom pin HTML overlays. Therefore, `react-globe.gl` is recommended as the primary prototype.*

---

## 3. Cartographic Geometry & Local Asset Architecture

To honor the zero-runtime-CDN requirement:
1. **Local GeoJSON/TopoJSON**:
   - Reuses existing `/countries-110m.json` already bundled in `frontend/public/`.
   - Polygons are extracted into standard GeoJSON feature collections locally using existing `topojson-client`.
2. **Zero Runtime Image CDN**:
   - Rather than relying on external satellite texture tiles (e.g. NASA Blue Marble via remote CDN), the globe utilizes **polygon-only vector rendering**.
   - Country borders and surfaces are colored dynamically using Canvas / WebGL materials matching CSS theme tokens.
3. **Atmospheric Shader Glow**:
   - Soft, monochromatic atmosphere glow using subtle shader falloff:
     - Night Edition: `--color-accent` tint (#E74C3C) at 0.15 opacity or ink ambient glow.
     - Paper Edition: warm amber/parchment glow (`--color-paper-border`).

---

## 4. Visual Design & Theme Integration

The globe conforms strictly to `DESIGN_SYSTEM.md` tokens:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [🌐 3D GLOBE] Global Cartographic Radar & Wildlife Tracking                [✕] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                                  _.._                                           │
│                                .' .-'`                         [Legend]         │
│                               /  /                             • 1-5 Stories    │
│                              |  |    (● India: 142)            ● 6-25 Stories   │
│                              \   \      \                      ● 26+ Stories    │
│                               '.  '-._   \                     ▲ Wildlife Wire  │
│                                 `'--'     [Headline Card]                       │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Controls: [Auto-Rotate: ON]  [Wildlife Layer: ON]  [Projection: 3D Globe ▾]     │
│ Status: 60 FPS · WebGL 2.0 Active · Double-click to Reset Camera               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Theme Token Mapping
| Element | Night Edition (`data-theme="night"`) | Paper Edition (`data-theme="paper"`) |
| :--- | :--- | :--- |
| **Globe Sphere Background** | `#0E0C09` (Deep Ink) | `#FAF7F0` (Parchment Paper) |
| **Country Polygons (Inactive)** | `#1A1710` (Panel Alt) | `#F2EDE2` (Card Alt) |
| **Country Borders** | `#2E2A22` (Muted Ink Border) | `#D9D0BE` (Column Rule Border) |
| **Country Polygon (Hovered)** | `#2E2A22` (Subtle highlight) | `#E5DEC9` (Warm parchment wash) |
| **News Pins (Standard)** | `#A89880` (Ink Secondary) | `#5C4E3A` (Ink Secondary) |
| **Wildlife Pins** | `#E74C3C` (Breaking Crimson) | `#C0392B` (Broadsheet Crimson) |
| **Arcs (Cross-Country Stories)**| `rgba(231, 76, 60, 0.45)` | `rgba(192, 57, 43, 0.35)` |

---

## 5. Interactive Features & Data Layers

### 5.1 Country News Pins
- Pins placed at national geographic centroids calculated via centroid algorithm.
- Pin radius scales logarithmically with article volume:
  $$\text{Radius} = 0.4 + 0.3 \times \ln(1 + \text{ArticleCount})$$
- Pins display numeric story count badges.

### 5.2 Wildlife & Nature Wire Pins
- When Wildlife Layer is active, distinct crimson triangular or diamond markers indicate animal/environmental dispatches.

### 5.3 Arrival Pulse Rings
- Articles arriving within the last 5 minutes (`ingested_at >= now - 5m`) trigger an expanding concentric ripple ring that pulses twice and gently fades.

### 5.4 Broadsheet Hover Tooltip
Hovering over a country or pin displays a deckle-edged popover containing:
- Country name & national flag.
- Total active dispatches mapped.
- Top breaking news headline with publication date.

### 5.5 Camera Fly-To on Click
- Clicking a country smoothly animates the camera to position the target nation at globe center:
  - Duration: 1,200ms.
  - Altitude: 1.8 (comfortable reading zoom).
- Automatically updates global state `selectedCountry` to filter the reading wire.

### 5.6 Comparative Coverage Arcs
- When viewing a story involving multiple countries (e.g. diplomacy, trade, sports), 3D bezier arcs connect the origin and destination countries with animated particle dashes.

---

## 6. Motion & Accessibility Safeguards

1. **Ambient Auto-Rotation**:
   - Slow rotational velocity ($0.45^\circ/\text{sec}$) along the polar axis.
   - Automatically pauses immediately upon user interaction (pointer hover, drag, wheel zoom).
   - Resumes smoothly after **8.0 seconds** of inactivity.
2. **Reduced Motion (`prefers-reduced-motion`)**:
   - When active, auto-rotation is permanently disabled.
   - Expanding arrival rings are rendered as static subtle circles.
   - Camera fly-to transitions instantly without tween animation.

---

## 7. Performance & Fallback Engine

To guarantee 60 FPS on diverse laptop hardware:
1. **Lazy Loading**: `Globe` component loaded via `React.lazy` and `Suspense` with a skeleton loader.
2. **Device Pixel Ratio (DPR) Cap**: Capped at `Math.min(window.devicePixelRatio, 2.0)` to avoid GPU strain on 4K/Retina displays.
3. **WebGL Lifecycle Management**: Full disposal of Three.js geometry, materials, and WebGL contexts on unmount to prevent memory leaks.
4. **Automatic Fallback Sentinel**:
   - If WebGL 2.0 / WebGL 1.0 context initialization fails, display informative notice and immediately mount the 2D `WorldMap.tsx`.
   - A performance monitor tracks rendering frame rate: if average FPS drops below 30 over 3 consecutive seconds, prompt the user with:
     `[ Switch to Lightweight 2D Map for Smoother Performance ]`.
5. **Manual Switch**: Top-right toggle allows instantaneous switching between `3D Globe` and `Flat 2D Map`. The original `WorldMap.tsx` is preserved intact.


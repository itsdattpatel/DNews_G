# PRD: React Bits <CircularGallery /> WebGL Integration for Wire Dispatch Docker

**Document Version:** 1.0.0  
**Feature Target:** DNews Orbit Dispatch Docker using React Bits CircularGallery WebGL Component  
**Status:** Approved for Implementation  
**Author:** AI Systems Architect & Core Frontend Engineering Team  

---

## 1. Executive Summary & User Objectives

### 1.1 Motivation & Context
The user requested replacing the previous CSS-based bottom dock with the official **React Bits `<CircularGallery />`** component (JavaScript + CSS variant with WebGL2 shader pipeline).

Key specifications requested:
1. **Official Component Integration:** Copy and adapt the React Bits `CircularGallery` component (`CircularGallery.tsx` and `CircularGallery.css`) into the application.
2. **Rectangular News Cards (Not Stock Photos):** Instead of displaying external image photos (e.g. Unsplash/Picsum), generate crisp broadsheet rectangular cards displaying article headline, source outlet, country, breaking score, category ink-stamp, and dual timestamp with high DPI clarity.
3. **Editable Size, Curvature & Motion:** Allow the user to easily customize:
   - `bend` (arc curvature, positive arches downward, negative lifts)
   - `itemSize` (height relative to container; user noted the previous one was too big)
   - `itemAspect` (width-to-height ratio tailored for rectangular news cards, ~1.85 to 2.1)
   - `scrollEase` and `scrollSpeed` (motion damping and travel distance)
   - `wave` (ripple movement during scroll)
   - `fadeEdges` (edge blur/fadeout on left and right flanks)
   - `gap` (spacing between cards)
4. **Focused Card on Top & Synchronized Navigation:**
   - Active story is highlighted on top with elevated focal depth and crisp broadsheet ring.
   - Synchronized bidirectionally with keyboard navigation (`j`/`k`, left/right arrows), auto-advance timer, and card clicks.
5. **Live Website Server Verification:**
   - Keep running on `http://127.0.0.1:5173` with Vite HMR so the user can test changes live in their browser.

---

## 2. Architecture & Design

### 2.1 Component Hierarchy
```
+---------------------------------------------------------------------------------+
|                              TopBar & StatusStrip                               |
+---------------------------------------------------------------------------------+
|                                                                                 |
|                        UNIFIED ARTICLE READING DESK                             |
|                                                                                 |
|   Headline (ScrambledText) · Metadata · Lead Paragraph · Body · Summary        |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |         CIRCULAR DOCK OVERLAY (<CircularGalleryWireDock />)             |   |
|   |                                                                         |   |
|   |   Controls Bar: [Orbit Gallery] [Story X of Y] [Bend] [Size] [Speed]     |   |
|   |   +-----------------------------------------------------------------+   |   |
|   |   |                 <CircularGallery /> (WebGL2)                    |   |   |
|   |   |                                                                 |   |   |
|   |   |        [Card -2]         [Card 0 (FOCUS)]         [Card +2]     |   |   |
|   |   |         (Faded)           (Apex / Sharp)           (Faded)      |   |   |
|   |   +-----------------------------------------------------------------+   |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------+
```

### 2.2 Rectangular Card Canvas Generator (`generateArticleCardTexture`)
To replace raw photo URLs with authentic rectangular news cards:
- An offscreen Canvas (e.g., 600px × 300px, aspect 2.0) renders the article card:
  - Background: Theme paper color with subtle border rule.
  - Header: Outlet uppercase font + country + breaking flame badge.
  - Headline: Playfair Display / Source Serif bold serif headline wrapped across 2–3 lines.
  - Footer: Category ink-stamp badge + verification stamp + relative timestamp.
  - Active state: Ink highlight ring and bold contrast.
- The canvas exports `toDataURL('image/png')` for WebGL texture consumption with linear mipmapping.

### 2.3 Parameter Controls & Live Editing
Expose a dedicated settings control section and config defaults:
- `bend`: default `2.5` (compact elegant downward curve at edges)
- `itemSize`: default `0.72` (compact, leaves plenty of vertical space for reading)
- `itemAspect`: default `2.0` (wide broadsheet rectangular card)
- `gap`: default `0.18` (tight, organized dispatch strip)
- `scrollEase`: default `0.08` (snappy responsive feel)
- `scrollSpeed`: default `1.8`
- `wave`: default `0.2` (subtle ink wave during scroll)
- `fadeEdges`: default `0.18` (soft fading at left/right viewport edges)
- `borderRadius`: default `0.04`
- `showTitles`: `false` (titles are rendered inside the rectangular card texture)

---

## 3. Implementation Steps

1. **Create `frontend/src/components/ui/CircularGallery.css`:**
   - Styling for canvas, container, labels, and accessible hidden list.
2. **Create `frontend/src/components/ui/CircularGallery.tsx`:**
   - TypeScript adaptation of React Bits `CircularGallery` supporting dynamic textures, controlled focus index, and custom card rendering.
3. **Create `frontend/src/utils/cardTextureGenerator.ts`:**
   - Fast, cached 2D canvas generator converting `Article` into rectangular broadsheet card texture URLs.
4. **Create `frontend/src/components/article/CircularGalleryWireDock.tsx`:**
   - Replaces `CircularDock.tsx` in `Shell.tsx`.
   - Bridges `useAppStore` articles, active story synchronization, keyboard events, and editable parameters.
5. **Update Settings in `UnifiedSettingsDialog.tsx`:**
   - Add Orbit Gallery tuning sliders (Bend, Size, Motion Speed, Wave).
6. **Visual Validation:**
   - Run tests, capture screenshots using Playwright, and verify live on `http://127.0.0.1:5173`.

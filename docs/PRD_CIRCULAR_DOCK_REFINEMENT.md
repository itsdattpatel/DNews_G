# Product Requirement Document (PRD) — 3D Orbit Wire Gallery Refinement

**Feature**: Pure Floating 3D Broadsheet Dock, Anti-Flash Shader Pipeline & Expanded Settings  
**Status**: In Progress  
**Author**: Antigravity Assistant  
**Date**: 2026-11-19  

---

## 1. Executive Summary & Problem Analysis

In the previous phase, the React Bits `<CircularGallery />` WebGL2 component was successfully integrated to render news dispatches as curved broadsheet cards. User testing and visual review identified three critical issues to refine:

1. **Intrusive Dock Background Container**:
   - The dock was wrapped in a frosted, rounded container (`bg-paper/90 backdrop-blur-xl border border-paper-border/90 rounded-2xl`) with an embedded header bar and tuning toggle.
   - This container obscured the bottom of the article text on the main desk and added unnecessary visual weight.
   - *Requirement*: Remove all background color, borders, and backdrop-blur from the dock. Only the 3D broadsheet cards and subtle interactive elements should be rendered, floating freely over the news desk.

2. **White Flashing on Active & Last Focused Cards**:
   - When switching stories (`j`/`k`, arrows, auto-advance, or clicking a card), the active card and the previously active card flashed a bright white rectangle.
   - *Root Cause*:
     - `generateArticleCardTexture` took `isSelected: boolean`, regenerating different texture data URLs for the previous and next card upon every index change.
     - In `CircularGallery.tsx`, a new URL forces `textureFor(url)` to allocate a new texture with `ready = 0`.
     - During the async image loading tick, the fragment shader executed `mix(uPlaceholder, image, uReady)`, where `uPlaceholder` was initialized to `parse(s.textColor)` (`#ffffff` / `#E8E4DA`).
     - Simultaneously, `uRing` drew an animated white outline around the card.
   - *Requirement*: Eliminate both causes of flashing:
     - Make article card textures static per article (independent of `isSelected`).
     - Remove white outline ring flashing from the WebGL shader.
     - Set `uPlaceholder` to the background theme paper tone so textures blend seamlessly without flashing.

3. **Dock Settings Migration & Comprehensive Expansion**:
   - The in-place tuning drawer on the dock header takes up space and clutters the reading experience.
   - *Requirement*: Shift all dock configuration into the main Settings modal (`UnifiedSettingsDialog.tsx`), and add a comprehensive set of adjustable controls:
     - Arc Bend (Curvature: -4.0 to +5.0)
     - Card Scale / Height (0.3 to 1.5)
     - Card Aspect Ratio (1.0 to 3.0)
     - Card Spacing / Gap (0.05 to 0.60)
     - Card Corner Radius (0.0 to 0.25)
     - Scroll Ease / Motion Damping (0.01 to 0.30)
     - Scroll / Drag Speed (0.5 to 4.0)
     - Wave Ripple Intensity (0.0 to 1.0)
     - Flank Edge Fade / Vignette (0.0 to 0.40)
     - Drop Shadow Intensity (0.0 to 0.80)
     - Inactive Card Grayscale (Toggle)
     - Gentle Background Drift (Auto-scroll: 0 to 1.0)

---

## 2. Technical Architecture & Implementation Plan

### 2.1 File Changes
1. **`frontend/src/types/index.ts`**:
   - Add new settings keys:
     - `gallery_border_radius`: number
     - `gallery_shadow`: number
     - `gallery_grayscale`: boolean
     - `gallery_auto_scroll`: number
2. **`frontend/src/store/useAppStore.ts`**:
   - Provide safe broadsheet defaults for all new settings in `initialSettings`.
3. **`frontend/src/utils/cardTextureGenerator.ts`**:
   - Decouple texture rendering from `isSelected`.
   - Card textures are generated once per article and theme (`${article.id}-${isDark ? 'dark' : 'light'}`), permanently cached in memory.
4. **`frontend/src/components/ui/CircularGallery.tsx`**:
   - Ensure `uPlaceholder` uses transparent/theme-toned color, never bright white.
   - For data URLs, treat them as immediate or prevent unready flashing.
   - Remove or soften harsh `uRing` outline flashing.
5. **`frontend/src/components/article/CircularGalleryWireDock.tsx`**:
   - Remove outer box wrapper, borders, shadows, backdrop blur, header bar, and in-place tuning drawer.
   - Make the container completely transparent with pure floating cards.
6. **`frontend/src/components/settings/UnifiedSettingsDialog.tsx`**:
   - Expand the **"Orbit Wire Gallery Tuning (React Bits 3D)"** section in the **Reading** tab with the complete set of sliders and toggles.
7. **Tests & Visual Verification**:
   - Update unit tests in `circular-dock-and-scramble.test.tsx`.
   - Run full Vitest suite (332+ tests).
   - Capture Playwright visual validation screenshots.

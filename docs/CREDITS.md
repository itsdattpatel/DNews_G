# CREDITS & Resource Shortlist — AI World News Desk Frontend Overhaul
*Version 1.0 · 2026-11-01 · Last updated by: docs pass (Step 0)*

All packages listed here have been vetted for license compliance.
**Rule**: Only MIT / Apache-2.0 / ISC / OFL-1.1 / GSAP-No-Charge items may be installed.
Every install must be logged here with exact npm name + version locked in package.json.

---

## STATUS KEY
- ✅ **APPROVED** — license confirmed, recommended for use
- ⚠️ **CONDITIONAL** — usable with restrictions noted
- ❌ **REJECTED** — license unclear or incompatible
- 🔲 **PENDING** — awaiting user approval to install

---

## 1. Spider / Crawler Animation

| Item | URL | License | Decision | Notes |
|------|-----|---------|----------|-------|
| cyohei9907/web-crawlers | https://github.com/cyohei9907/web-crawlers | **No LICENSE file found** | ❌ REJECTED for direct copy | Algorithm *concept* (feet plant on DOM words, IK legs) may be studied; code will be rewritten from scratch in TypeScript. No code lines copied. |

**Approved approach**: New `SpiderCrawler.tsx` — original TypeScript rewrite inspired by the DOM-walking concept (legs snap to real words in `body_english` text). No copied code.

---

## 2. UI Component Libraries

| Package | npm name | URL | License | Decision | Why |
|---------|----------|-----|---------|----------|-----|
| shadcn/ui | (copy-paste, no npm install) | https://ui.shadcn.com | MIT | ✅ APPROVED | Copy-paste approach, full control, no runtime dependency. Use for Dialog, Dropdown, Tabs, Switch, Slider. |
| Radix UI Primitives | `@radix-ui/react-*` | https://radix-ui.com | MIT | ✅ APPROVED | Headless a11y primitives. Basis of shadcn/ui. |
| React Bits | (copy-paste) | https://reactbits.dev | MIT | ✅ APPROVED | Animated text and motion snippets. Inspect license per snippet before use. |
| Magic UI | (copy-paste) | https://magicui.design | MIT | ✅ APPROVED | Shimmer, blur-fade, typing effects. Copy-paste only. |
| Aceternity UI | (copy-paste) | https://ui.aceternity.com | MIT | ✅ APPROVED | Globe, card spotlight — copy-paste only; heavy Three.js deps must be evaluated per component. |
| 21st.dev | (copy-paste) | https://21st.dev | MIT (per component) | ⚠️ CONDITIONAL | Check license per component before copying. |
| Uiverse.io | (copy-paste) | https://uiverse.io | MIT | ⚠️ CONDITIONAL | CSS-only snippets; verify per element. |

---

## 3. Motion & Animation

| Package | npm name | Version | License | Decision | Notes |
|---------|----------|---------|---------|----------|-------|
| Motion (Framer Motion) | `motion` | ^11.x | MIT | ✅ APPROVED | Primary animation engine. `animate`, `scroll`, `inView`. Replaces all CSS transitions. |
| GSAP (with SplitText) | `gsap` | ^3.13+ | GSAP No-Charge License | ✅ APPROVED | Post-Webflow acquisition: free for all commercial use. SplitText now free. Only restriction: cannot build a competing visual web builder. Used for headline text reveals and split-char animations. |
| Lenis | `lenis` | ^1.x | MIT | ✅ APPROVED | Smooth scroll. Replaces native scroll. Integrates with GSAP ScrollTrigger. |
| GSAP ScrollTrigger | bundled with `gsap` | — | GSAP No-Charge | ✅ APPROVED | Scroll-driven animations for article reveal, globe entrance. |

---

## 4. Globe / Map

| Package | npm name | License | Decision | Notes |
|---------|----------|---------|----------|-------|
| react-globe.gl | `react-globe.gl` | MIT | ✅ APPROVED | WebGL globe with pulsing pins. Lazy-loaded. Used for Globe/Map screen. |
| three | `three` | MIT | ✅ APPROVED | WebGL dependency of react-globe.gl. |
| @react-three/fiber | `@react-three/fiber` | MIT | ⚠️ CONDITIONAL | Only if globe needs custom shaders beyond react-globe.gl; evaluate at Step 9. |
| d3-geo | `d3-geo` | ISC | ✅ APPROVED | Fallback flat projection if WebGL unavailable. |
| world-atlas | `world-atlas` | BSD-3 | ✅ APPROVED | Already installed (Phase 9). |

---

## 5. Animation Assets

| Item | URL | License | Decision | Notes |
|------|-----|---------|----------|-------|
| @lottiefiles/dotlottie-react | `@lottiefiles/dotlottie-react` | MIT | ✅ APPROVED | For loading states and bat wing-flap micro-animations only. Specific Lottie files must be OFL/CC0 — verify each before use. |
| Rive | `@rive-app/react-canvas` | MIT (runtime) | ⚠️ CONDITIONAL | Runtime is MIT; community files vary. Evaluate per asset for spider/bat alternatives. |

---

## 6. Icons

| Package | npm name | License | Decision | Notes |
|---------|----------|---------|----------|-------|
| Lucide React | `lucide-react` | MIT | ✅ APPROVED | Already installed. Primary icon set. |
| Phosphor Icons | `@phosphor-icons/react` | MIT | ✅ APPROVED | Additional icons (newspaper, radar, creature motifs). Supplement lucide where needed. |

> **Note**: Bat, spider, and globe are CUSTOM SVG/Canvas drawings — not from any icon library.

---

## 7. Fonts (via Fontsource — all OFL-1.1)

| Font | npm name | Use | License | Decision |
|------|----------|-----|---------|----------|
| Playfair Display | `@fontsource/playfair-display` | Article headlines, section heads | OFL-1.1 | ✅ APPROVED |
| Old Standard TT | `@fontsource/old-standard-tt` | Alternate headline / masthead subtitle | OFL-1.1 | ✅ APPROVED |
| UnifrakturCook | `@fontsource/unifrakturcook` | Masthead "THE WORLD DESK" logotype | OFL-1.1 | ✅ APPROVED |
| Source Serif 4 | `@fontsource/source-serif-4` | Article body text | OFL-1.1 | ✅ APPROVED |
| Inter | `@fontsource/inter` | UI chrome, nav, labels | OFL-1.1 | ✅ APPROVED |
| IBM Plex Sans | `@fontsource/ibm-plex-sans` | Settings, form elements | OFL-1.1 | ✅ APPROVED |
| IBM Plex Mono | `@fontsource/ibm-plex-mono` | Data values, API keys, timestamps | OFL-1.1 | ✅ APPROVED |

---

## 8. State Management & Data Fetching

| Package | npm name | License | Decision | Notes |
|---------|----------|---------|----------|-------|
| Zustand | `zustand` | MIT | ✅ APPROVED | Already installed. Keep for global UI state. |
| TanStack Query | `@tanstack/react-query` | MIT | ✅ APPROVED | Server-state, caching, background refetch. New addition. |
| sonner | `sonner` | MIT | ✅ APPROVED | Toast notifications (provider switch, error alerts). |

---

## 9. Styling

| Package | npm name | License | Decision | Notes |
|---------|----------|---------|----------|-------|
| Tailwind CSS | `tailwindcss` | MIT | ✅ APPROVED | New addition. Design token enforcement via config. No inline styles. |
| @tailwindcss/typography | `@tailwindcss/typography` | MIT | ✅ APPROVED | Article body prose styles. |
| tailwind-merge | `tailwind-merge` | MIT | ✅ APPROVED | Class merging utility (used by shadcn/ui). |
| clsx | `clsx` | MIT | ✅ APPROVED | Conditional className helper. |
| autoprefixer | `autoprefixer` | MIT | ✅ APPROVED | PostCSS autoprefixer for Tailwind. |
| postcss | `postcss` | MIT | ✅ APPROVED | Required for Tailwind. |

---

## 10. Testing

| Package | npm name | License | Decision | Notes |
|---------|----------|---------|----------|-------|
| Playwright | `@playwright/test` | Apache-2.0 | ✅ APPROVED | E2E screenshots for every screen (light + dark). QA step (Step 12). |
| Vitest | `vitest` | MIT | ✅ APPROVED | Already in devDependencies via backend. Unit tests. |
| @testing-library/react | `@testing-library/react` | MIT | ✅ APPROVED | Component testing. |

---

## 11. Inspiration / Reference (No Code Copied)

| Source | URL | Notes |
|--------|-----|-------|
| Codrops | https://tympanus.net/codrops | Design inspiration, tutorials. No code copied without explicit license. |
| Awwwards | https://awwwards.com | Visual direction reference only. |
| cyohei9907/web-crawlers | https://github.com/cyohei9907/web-crawlers | Algorithm *concept* studied; rewritten from scratch. |
| GSAP SplitText docs | https://gsap.com/docs/v3/Plugins/SplitText | Reference for API usage. |

---

## 12. Install Log

*Updated as packages are installed (Step 1+). Format: `date · npm name@version · approved by user`*

| Date | Package | Version | Approved By |
|------|---------|---------|-------------|
| — | (none yet — Step 0 docs only) | — | — |

---

## 13. Packages NOT Approved (do not install)

| Package | Reason |
|---------|--------|
| `anime.js` | Covered by `motion` + GSAP |
| `react-spring` | Covered by `motion` |
| `velocity-react` | Abandoned |
| Any random CodePen/blog code | No explicit license |
| Any package with GPL-only license | Incompatible with commercial use |


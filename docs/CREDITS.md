# CREDITS & Resource Shortlist — AI World News Desk Frontend Overhaul
*Version 2.0 · 2026-11-02 · Last updated by: Category 12 QA & Final Audits Pass*

All packages listed here have been vetted for license compliance.
**Rule**: Only MIT / Apache-2.0 / ISC / OFL-1.1 / BSD items may be installed.
Every install is logged here with exact npm name + version locked in package.json.

---

## STATUS KEY
- ✅ **APPROVED** — license confirmed, recommended for use
- ⚠️ **CONDITIONAL** — usable with restrictions noted
- ❌ **REJECTED** — license unclear or incompatible
- 🔲 **PENDING** — awaiting user approval to install

---

## 1. Package Approval & Install Governance

### 1.1 Approved CORE List (Approved for installation)
All packages must be pinned with exact versions (`"package": "1.2.3"`, no `^` or `~`), must have been published **more than 14 days ago** (no zero-day packages), and must pass `npm audit`:

1. `tailwindcss` (and `@tailwindcss/typography`, `postcss`, `autoprefixer`)
2. `shadcn/ui` core utilities & primitives:
   - `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-slider`, `@radix-ui/react-switch`
   - `class-variance-authority`
   - `clsx`
   - `tailwind-merge`
   - `lucide-react` (already present, keep)
3. `motion` (Framer Motion v11+) — for all general UI transitions & route reveals
4. `lenis` (^1.x) — smooth scrolling engine
5. `@tanstack/react-query` — server state & cache management
6. `zustand` (already present, keep) — global UI state
7. `sonner` — clean toast notifications
9. `@fontsource` packages:
   - `@fontsource/playfair-display`
   - `@fontsource/unifrakturcook`
   - `@fontsource/source-serif-4`
   - `@fontsource/inter`
   - `@fontsource/ibm-plex-mono`
10. `@playwright/test` (devDependencies only) — E2E screenshot validation
11. `react-resizable-panels` (pinned v2.1.7) — Accessible panel splitting with keyboard handles & persistent layout (MIT)

### 2.2 DEFERRED List (DO NOT install until their respective Step is approved)
- `d3-geo` / `maplibre-gl` (Step 9: only if flat map fallback needed)
- `hls.js` (Step 10: TV View — already present in package.json)
- `@lottiefiles/dotlottie-react` (NOT approved — Bat is 100% custom SVG, no Lottie required)
- `@phosphor-icons/react` / `@react-three/fiber` (Deferred; only if specific explicit user approval is granted)

---

## 2. UI Component Libraries

| Package | npm name | URL | License | Decision | Why |
|---------|----------|-----|---------|----------|-----|
| shadcn/ui | (copy-paste, no npm install) | https://ui.shadcn.com | MIT | ✅ APPROVED | Copy-paste approach, full control, no runtime dependency. Use for Dialog, Dropdown, Tabs, Switch, Slider. |
| react-resizable-panels | `react-resizable-panels` (2.1.7) | https://github.com/bvaughn/react-resizable-panels | MIT | ✅ APPROVED | Accessible resizable panel groups with keyboard support and persistent sizes. |
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
| Lenis | `lenis` | ^1.x | MIT | ✅ APPROVED | Smooth broadsheet scrolling. |

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

> **Note**: Bat and globe are CUSTOM SVG/Canvas drawings — not from any icon library.

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

---

## 12. Install Log

*Updated across all 12 categories of PRD A. Format: `date · npm name@version · license · role`*

| Date | Package | Exact Version | License | Approval | Role |
|------|---------|---------------|---------|----------|------|
| 2026-11-01 | `tailwindcss` | `3.4.14` | MIT | Approved (Core) | Utility CSS engine & design tokens |
| 2026-11-01 | `@tailwindcss/typography` | `0.5.15` | MIT | Approved (Core) | Broadsheet article prose styling |
| 2026-11-01 | `postcss` | `8.4.47` | MIT | Approved (Core) | CSS transformation pipeline |
| 2026-11-01 | `autoprefixer` | `10.4.20` | MIT | Approved (Core) | Vendor prefixing for CSS rules |
| 2026-11-01 | `clsx` | `2.1.1` | MIT | Approved (Core) | Dynamic class names |
| 2026-11-01 | `tailwind-merge` | `2.5.4` | MIT | Approved (Core) | Conflict-free Tailwind class merge |
| 2026-11-01 | `class-variance-authority` | `0.7.0` | Apache-2.0 | Approved (Core) | Component variant management |
| 2026-11-01 | `@radix-ui/react-slot` | `1.1.0` | MIT | Approved (Core) | Polymorphic slot primitive |
| 2026-11-01 | `@radix-ui/react-dialog` | `1.1.2` | MIT | Approved (Core) | Accessible modal dialogs |
| 2026-11-01 | `@radix-ui/react-dropdown-menu` | `2.1.2` | MIT | Approved (Core) | Accessible dropdowns & bat menu |
| 2026-11-01 | `@radix-ui/react-tabs` | `1.1.1` | MIT | Approved (Core) | Category tab rail navigation |
| 2026-11-01 | `@radix-ui/react-slider` | `1.2.1` | MIT | Approved (Core) | Settings speed & threshold sliders |
| 2026-11-01 | `@radix-ui/react-switch` | `1.1.1` | MIT | Approved (Core) | Settings toggle switches |
| 2026-11-01 | `motion` | `14.3.0` | MIT | Approved (Core) | UI & route transition animations |
| 2026-11-01 | `lenis` | `1.1.14` | MIT | Approved (Core) | Smooth broadsheet scrolling |
| 2026-11-01 | `@tanstack/react-query` | `5.59.16` | MIT | Approved (Core) | Server state, cache, & polling |
| 2026-11-01 | `sonner` | `1.5.0` | MIT | Approved (Core) | Alerts & connection status toasts |
| 2026-11-01 | `react-resizable-panels` | `2.1.7` | MIT | Approved (Core) | Accessible resizable broadsheet panels |
| 2026-11-01 | `hls.js` | `^1.7.4` | Apache-2.0 | Approved (Core) | HLS live video streaming engine for TV Desk |
| 2026-11-01 | `react-simple-maps` | `^5.0.5` | MIT | Approved (Core) | SVG-based broadsheet world map projection |
| 2026-11-01 | `world-atlas` | `^2.0.2` | BSD-3-Clause | Approved (Core) | TopoJSON geospatial boundary definitions |
| 2026-11-01 | `zustand` | `^4.5.2` | MIT | Approved (Core) | Global client UI store |
| 2026-11-01 | `lucide-react` | `^0.368.0` | ISC | Approved (Core) | Primary UI iconography set |
| 2026-11-01 | `@fontsource/playfair-display` | `5.1.0` | OFL-1.1 | Approved (Core) | Headline typography |
| 2026-11-01 | `@fontsource/unifrakturcook` | `5.1.0` | OFL-1.1 | Approved (Core) | Masthead logotype typography |
| 2026-11-01 | `@fontsource/source-serif-4` | `5.1.0` | OFL-1.1 | Approved (Core) | Body article prose typography |
| 2026-11-01 | `@fontsource/inter` | `5.1.0` | OFL-1.1 | Approved (Core) | UI chrome and navigation typography |
| 2026-11-01 | `@fontsource/ibm-plex-mono` | `5.1.0` | OFL-1.1 | Approved (Core) | Data, metadata, & code typography |
| 2026-11-01 | `@playwright/test` | `1.48.2` | Apache-2.0 | Approved (Core Dev) | Automated visual QA & screenshot tests |
| 2026-11-01 | `@types/node` | `20.16.11` | MIT | Approved (Core Dev) | TypeScript node definitions for Vite |
| 2026-11-01 | `better-sqlite3` | `^13.0.3` | MIT | Approved (Backend) | Fast synchronous SQLite database engine |
| 2026-11-01 | `express` | `^4.18.3` | MIT | Approved (Backend) | REST API and SSE server framework |
| 2026-11-01 | `cors` | `^2.8.5` | MIT | Approved (Backend) | Cross-origin resource sharing middleware |
| 2026-11-01 | `dotenv` | `^16.4.5` | BSD-2-Clause | Approved (Backend) | Environment variable loader |
| 2026-11-01 | `zod` | `^3.22.4` | MIT | Approved (Backend) | Strict runtime schema validation |
| 2026-11-01 | `@mozilla/readability` | `^0.5.0` | Apache-2.0 | Approved (Backend) | Article reader & text extraction parser |
| 2026-11-01 | `jsdom` | `^24.0.0` | MIT | Approved (Backend) | DOM simulation for Readability parsing |
| 2026-11-01 | `rss-parser` | `^3.13.0` | MIT | Approved (Backend) | Feed parser for global news RSS feeds |
| 2026-11-01 | `pdfkit` | `^0.20.2` | MIT | Approved (Backend) | Broadsheet PDF generator engine |
| 2026-11-01 | `natural` | `^6.12.0` | MIT | Approved (Backend) | NLP tokenization & TF-IDF similarity |
| 2026-11-01 | `@google/generative-ai` | `^0.21.0` | Apache-2.0 | Approved (Backend) | Gemini provider client |
| 2026-11-01 | `openai` | `^4.47.1` | Apache-2.0 | Approved (Backend) | OpenAI / Groq / Cerebras API client |
| 2026-11-01 | `node-fetch` | `^3.3.2` | MIT | Approved (Backend) | HTTP fetcher for streams & feeds |
| 2026-11-01 | `vitest` | `^1.5.0` | MIT | Approved (Dev) | Fast unit & integration test runner |
| 2026-11-01 | `supertest` | `^7.0.0` | MIT | Approved (Dev) | HTTP endpoint integration testing |
| 2026-11-01 | `tsx` | `^4.7.3` | MIT | Approved (Dev) | TypeScript execution in development |
| 2026-11-01 | `concurrently` | `^8.2.2` | MIT | Approved (Dev) | Parallel dev server orchestration |
| 2026-11-02 | `rough-notation` | `0.5.1` | MIT | Approved (Library) | Hand-drawn SVG annotations for reading room |
| 2026-11-02 | `embla-carousel-react` | `8.6.0` | MIT | Approved (Library) | Accessible reading carousel for scripture verses |
| 2026-11-02 | `@fontsource/noto-serif-devanagari` | `5.3.0` | OFL-1.1 | Approved (Library) | Sanskrit Devanagari typography |
| 2026-11-02 | `@fontsource/eb-garamond` | `5.3.0` | OFL-1.1 | Approved (Library) | Classical reading room serif |
| 2026-11-02 | `@fontsource/cormorant-garamond` | `5.3.0` | OFL-1.1 | Approved (Library) | Display serif for library titles |
| 2026-11-02 | `@fontsource/lora` | `5.3.0` | OFL-1.1 | Approved (Library) | Screen serif for mind help cards |
| 2026-11-04 | `three` | `0.170.0` | MIT | Approved (Globe) | WebGL 3D rendering engine for interactive cartographic globe |
| 2026-11-04 | `@types/three` | `0.170.0` | MIT | Approved (Globe Dev) | Strict TypeScript definitions for Three.js |
| 2026-11-04 | `react-globe.gl` | `2.27.3` | MIT | Approved (Globe) | Declarative 3D globe bindings for React |

---

## 13. Packages NOT Approved (do not install)

| Package | Reason |
|---------|--------|
| `anime.js` | Covered by `motion` |
| `react-spring` | Covered by `motion` |
| `velocity-react` | Abandoned |
| Any random CodePen/blog code | No explicit license |
| Any package with GPL-only license | Incompatible with commercial use |


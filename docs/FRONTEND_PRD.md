# Frontend PRD — AI World News Desk
*Version 1.0 · 2026-11-01 · Overhaul Edition*

---

## 0. Context

All 12 backend feature phases are complete and verified (112 tests passing, `npm run build` clean).
This PRD governs **only** the frontend replacement. No backend features are added except:
- One small DB migration to store `anchor_phrases` per article (§5 below).

**Do NOT start any code until the user approves this document and all companion docs.**

---

## 1. Goal

Replace the entire frontend with a polished, distinctive **newspaper-meets-nature-documentary** interface, fully wired to the existing backend.

### 1.1 What "Newspaper-meets-Nature-Documentary" means
- Default theme: warm paper off-white (`#FAF7F0`) + ink black (`#1A1208`). No purple, no blue gradient.
- Dark "night edition" theme toggle.
- Typography hierarchy: Fraktur masthead → Playfair Display headlines → Source Serif 4 body.
- Category tags styled as ink stamps (colored, not generic pills).
- Spider animation: one real spider walks the article text — not a loading icon, not a progress bar.
- Globe: pulsing pins on real locations from article `location_tags`.
- TV shelf: horizontal scroll with genuine channel art.

### 1.2 Non-goals
- Multi-user / cloud hosting
- Changing any backend API endpoint shape (except anchor_phrases field addition)
- Pixel-perfect mobile support (responsive down to 1280px only; 4K is the upper ceiling)

---

## 2. Tech Stack (new additions to existing Vite/React 18)

See CREDITS.md for full license audit. Packages requiring user approval before install:

```
tailwindcss postcss autoprefixer
@tanstack/react-query
motion
gsap (includes SplitText, ScrollTrigger)
lenis
react-globe.gl three
@radix-ui/react-* (as needed by shadcn/ui components)
sonner
@fontsource/playfair-display @fontsource/unifrakturcook
@fontsource/source-serif-4 @fontsource/inter @fontsource/ibm-plex-mono
@phosphor-icons/react
@lottiefiles/dotlottie-react
@playwright/test
tailwind-merge clsx
```

**Existing** (keep): `react`, `react-dom`, `zustand`, `lucide-react`, `hls.js`, `world-atlas`

---

## 3. Design System Summary

Full spec: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

- **Paper theme**: `--color-paper: #FAF7F0`, `--color-ink: #1A1208`, `--color-accent: #C0392B` (breaking red)
- **Night theme**: `--color-paper: #0E0C09`, `--color-ink: #E8E4DA`
- **Paper grain**: SVG filter applied to `<body>` background — no image files
- **Motion**: all via design tokens; `prefers-reduced-motion` respected globally

---

## 4. Screens

Full wireframes: [UI_SPEC.md](./UI_SPEC.md)

| ID | Screen | Route |
|----|--------|-------|
| a | Main Reader | `/` |
| b | Category Rail | `/category/:name` |
| c | Compare Coverage | `/compare/:cluster_id` |
| d | Story Timeline | `/timeline/:cluster_id` |
| e | Globe / Map | `/globe` |
| f | Archive Chat | `/archive` |
| g | Watchlist | `/watchlist` |
| h | TV View | `/tv` |
| i | Daily PDF Preview | `/pdf` |
| j | Morning Briefing | `/briefing` |
| k | Alerts Center | `/alerts` |
| l | Settings | (bat menu overlay) |
| m | API & Sources Settings | `/settings/sources` |

---

## 5. Spider Anchor-Phrase Backend Change (small migration)

Full spec: [SPIDER_SPEC.md](./SPIDER_SPEC.md)

**What changes:**
1. `articles` table gets a new column `anchor_phrases TEXT` (JSON array of `{ phrase, sentence_index }`).
2. Migration: `002_anchor_phrases.sql` — `ALTER TABLE articles ADD COLUMN anchor_phrases TEXT DEFAULT NULL`.
3. AI enrichment prompt updated: AI must return `anchor_phrases` — exact verbatim strings from `body_english`, each mapped to a 0-based `sentence_index` in the summary.
4. Backend validator: any phrase not found verbatim (`body_english.includes(phrase)`) is dropped before DB write.
5. `GET /api/articles/:id` response includes `anchor_phrases` field.

**No other backend changes.**

---

## 6. Spider Crawler

Full spec: [SPIDER_SPEC.md](./SPIDER_SPEC.md)

- One `SpiderCrawler` React component (TypeScript, no copied code from external repos).
- Walks the `body_english` text in the left panel of the Main Reader.
- Legs plant procedurally on anchor phrase words; synchronized with summary sentences typing on the right.
- Modes: `reading` (default) | `breaking` (red web, 2× speed) | `compare` | `archive` (slower).
- FPS auto-degrade: disable visual effects if < 45 FPS; pause if < 30 FPS.
- All old spider code deleted (list in SPIDER_SPEC.md).

---

## 7. Live Data & API Sources

Full spec: [API_SETTINGS_SPEC.md](./API_SETTINGS_SPEC.md)

- **No-key sources**: RSS feeds (verified URLs), GDELT DOC 2.0 (max 1 req/5s)
- **Optional keyed**: Guardian, NewsData.io, GNews, Currents, NYT
- **AI providers**: Gemini Flash, Groq, Mistral, Cerebras, Ollama (existing fallback chain)
- API keys: backend `.env` only — never in frontend bundle
- "Delayed" label on articles from sources with 12-24h lag

---

## 8. Performance & Accessibility Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 85 on mid laptop |
| Spider + scroll FPS | 60 FPS (degrade at 45) |
| Color contrast | WCAG AA |
| Keyboard navigation | Full (j/k/arrows/esc/slash/g/t) |
| Screen reader | ARIA labels on all interactive elements |
| `prefers-reduced-motion` | All animations disabled when set |

---

## 9. Execution Order (stop after each for approval)

| Step | Deliverable |
|------|-------------|
| 0 | This doc + companion docs (DESIGN_SYSTEM, UI_SPEC, SPIDER_SPEC, API_SETTINGS_SPEC, CONTRACT, CREDITS, WIRING_CHECKLIST) |
| 1 | Design system tokens + component kit (shadcn/ui components, Tailwind config) |
| 2 | App shell: bat bar, routing, theme toggle, Lenis scroll, skeleton |
| 3 | Backend wiring layer: TanStack Query setup, SSE hook, shared TS types |
| 4 | Main Reader screen (article + summary panels, language toggle, ticker) |
| 5 | anchor_phrases migration + SpiderCrawler module |
| 6 | Category rail + article cards |
| 7 | API & Sources settings + live provider adapters |
| 8 | Compare Coverage, Story Timeline, Archive Chat, Watchlist |
| 9 | Globe / Map screen |
| 10 | TV View screen |
| 11 | PDF preview, Morning Briefing, Alerts Center |
| 12 | Performance, accessibility, Playwright QA, cleanup |

---

## 10. Acceptance Criteria (full list)

- [ ] No old spider code remains anywhere in `frontend/src/`
- [ ] SpiderCrawler only lands on phrases verified verbatim in `body_english`
- [ ] Every setting in UI reads/writes real backend setting via API
- [ ] Live SSE feed updates Main Reader without manual refresh
- [ ] One real article flows end-to-end: fetch → AI (with anchor_phrases) → DB → SSE → reader + spider
- [ ] No browser console errors in production build
- [ ] Lighthouse Performance ≥ 85
- [ ] Playwright screenshots captured for every screen in light + dark mode
- [ ] CREDITS.md complete with every installed package + license
- [ ] WIRING_CHECKLIST.md ticked with proof (screenshot or test) for every endpoint

---

## 11. Open Questions (must resolve before Step 1)

1. **Vite scaffold**: Keep current `frontend/` directory and add Tailwind, or create a fresh Vite scaffold and migrate? *(Recommendation: add Tailwind to existing — less disruption.)*
2. **Old spider tests**: Delete `ik.test.ts` and `spiders.test.ts` with the spider code, or archive them? *(Recommendation: delete entirely since the module they test is removed.)*
3. **cyohei9907 algorithm**: Confirmed no LICENSE file. Proceeding with clean-room rewrite from scratch — OK?
4. **shadcn/ui install**: This requires `npx shadcn@latest init` which modifies `components.json` and `tailwind.config`. OK to run?
5. **GSAP No-Charge license**: Confirmed free for this app (not a competing visual builder). OK to install `gsap`?
6. **Package approval**: Review the full install list in §2 above. Which packages are approved?
7. **Bat animation**: Should the bat be a Lottie file (need to find OFL/CC0 one) or hand-crafted SVG animation in React? *(Recommendation: hand-crafted SVG — full control, no asset license risk.)*
8. **Breaking accent color**: `#C0392B` (crimson) proposed. Any preference for a different hue?
9. **RSS feeds**: The PRD says "verify each URL works; add more per country/category/animals." Should this be done as part of Step 7 (API & Sources), or should I audit current sources now and report in Step 0?


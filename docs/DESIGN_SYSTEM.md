# Design System — AI World News Desk
*Version 2.0 · 2026-11-01 · Full Replacement (was Phase 1–12 system)*

---

## 0. Principles

1. **Newspaper heritage** — every visual decision asks: *would this look at home in a broadsheet printed in 1920?*
2. **Token-only** — no magic numbers in component code. All values from CSS custom properties + Tailwind config.
3. **Two themes** — *Paper* (day) and *Night Edition* (dark). Toggle in Settings.
4. **One accent** — breaking-news crimson only. No rainbow.
5. **Ink stamps** — category tags look physically stamped, not pill-shaped.
6. **No purple/blue gradient, no emoji icons, no placeholder text, no inline styles** (enforced at PR level).

---

## 1. Colour Palette

### 1.1 Paper Theme (default, `[data-theme="paper"]`)

```css
/* Base */
--color-paper:          #FAF7F0;   /* warm off-white — page background */
--color-paper-alt:      #F2EDE2;   /* slightly darker — card / panel surface */
--color-paper-border:   #D9D0BE;   /* column rules, dividers */
--color-ink:            #1A1208;   /* primary text — near-black with warm tint */
--color-ink-secondary:  #5C4E3A;   /* secondary text — bylines, captions */
--color-ink-muted:      #9A8878;   /* disabled, placeholder, metadata */

/* Accent */
--color-accent:         #C0392B;   /* breaking news red — use sparingly */
--color-accent-light:   #E8A79F;   /* tinted accent for backgrounds */
--color-accent-dark:    #922B21;   /* pressed / hover state */

/* Status */
--color-positive:       #1D6B38;   /* live / online status */
--color-negative:       #C0392B;

/* Paper grain overlay (applied as ::before pseudo on html) */
--grain-opacity:        0.045;
```

### 1.2 Night Edition Theme (`[data-theme="night"]`)

```css
/* Base */
--color-paper:          #0E0C09;
--color-paper-alt:      #1A1710;
--color-paper-border:   #2E2A22;
--color-ink:            #E8E4DA;
--color-ink-secondary:  #A89880;
--color-ink-muted:      #5C5448;

/* Accent — slightly brighter for dark bg legibility */
--color-accent:         #E74C3C;
--color-accent-light:   #4A1510;
--color-accent-dark:    #C0392B;

/* Status */
--color-positive:       #27AE60;
--color-negative:       #E74C3C;

--grain-opacity:        0.06;
```

### 1.3 Category Ink-Stamp Colors

```css
--cat-world:            #2C4A7C;
--cat-politics:         #5C1A1A;
--cat-business:         #1A3D1A;
--cat-tech:             #1A2A4A;
--cat-science:          #3A1A5C;
--cat-health:           #1A3A3A;
--cat-sports:           #3A2A0A;
--cat-entertainment:    #4A1A3A;
--cat-environment:      #1A3A1A;
--cat-crime:            #3A1A1A;
--cat-animals:          #2A3A1A;
```

---

## 2. Typography

### 2.1 Font Stacks

```css
--font-masthead:  'UnifrakturCook', 'Old Standard TT', Georgia, serif;
--font-headline:  'Playfair Display', 'Old Standard TT', Georgia, serif;
--font-body:      'Source Serif 4', Georgia, 'Times New Roman', serif;
--font-ui:        'Inter', 'IBM Plex Sans', system-ui, sans-serif;
--font-mono:      'IBM Plex Mono', 'Courier New', monospace;
```

### 2.2 Type Scale

| Token | Size | Line-height | Weight | Font | Use |
|-------|------|-------------|--------|------|-----|
| `--text-masthead` | 3.5rem | 1 | 400 | masthead | "THE WORLD DESK" logotype |
| `--text-headline-xl` | 2.25rem | 1.15 | 700 | headline | Top story headline |
| `--text-headline-lg` | 1.75rem | 1.2 | 700 | headline | Section headline |
| `--text-headline-md` | 1.375rem | 1.25 | 600 | headline | Card headline |
| `--text-headline-sm` | 1.125rem | 1.3 | 600 | headline | Ticker item |
| `--text-body-lg` | 1.125rem | 1.7 | 400 | body | Article body |
| `--text-body-md` | 1rem | 1.65 | 400 | body | Summary panel |
| `--text-body-sm` | 0.875rem | 1.6 | 400 | body | Captions, meta |
| `--text-ui-md` | 0.9375rem | 1.4 | 400 | ui | Nav, labels |
| `--text-ui-sm` | 0.8125rem | 1.35 | 400 | ui | Badges, timestamps |
| `--text-mono-sm` | 0.8125rem | 1.4 | 400 | mono | API keys, tokens |

### 2.3 Tailwind Extension

```js
fontFamily: {
  masthead: ['UnifrakturCook', 'Old Standard TT', 'Georgia', 'serif'],
  headline: ['Playfair Display', 'Old Standard TT', 'Georgia', 'serif'],
  body:     ['Source Serif 4', 'Georgia', 'Times New Roman', 'serif'],
  ui:       ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
  mono:     ['IBM Plex Mono', 'Courier New', 'monospace'],
}
```

---

## 3. Spacing & Layout

```css
--space-unit: 0.25rem;   /* 4px base — Tailwind default scale */

/* Main Reader */
--reader-left-width:  60%;
--reader-right-width: 40%;

/* Site max-width */
--content-max-width:  1600px;
--content-padding:    2rem;

/* Column rules */
--rule-width:  1px;
--rule-color:  var(--color-paper-border);
```

---

## 4. Borders & Surfaces

```css
--radius-none:   0;
--radius-sm:     2px;    /* ink-stamp tags */
--radius-md:     4px;    /* cards */
--radius-lg:     8px;    /* modal, panels */
--radius-full:   9999px; /* status pills only */

--shadow-card:    0 1px 3px rgba(26,18,8,0.12), 0 1px 2px rgba(26,18,8,0.08);
--shadow-panel:   0 4px 16px rgba(26,18,8,0.15);
--shadow-overlay: 0 8px 32px rgba(26,18,8,0.25);
```

Cards: `border-t-2 border-ink` for the newspaper column top-rule.

---

## 5. Motion Tokens

```css
/* Durations */
--duration-instant:  80ms;
--duration-fast:     150ms;
--duration-normal:   280ms;
--duration-slow:     450ms;
--duration-xslow:    700ms;

/* Easings */
--ease-paper:  cubic-bezier(0.23, 1, 0.32, 1);
--ease-snap:   cubic-bezier(0.68, -0.6, 0.32, 1.6);
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-enter:  cubic-bezier(0, 0, 0.2, 1);
--ease-exit:   cubic-bezier(0.4, 0, 1, 1);

/* Spider */
--spider-step-reading:  1800ms;
--spider-step-breaking: 800ms;
--spider-step-compare:  1400ms;
--spider-step-archive:  2800ms;
--spider-fps-target:    60;
--spider-fps-degrade:   45;
--spider-fps-pause:     30;
```

### 5.1 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .spider-canvas { display: none; }
}
```

---

## 6. Z-Index Layers

```css
--z-base:      0;
--z-article:   10;
--z-spider:    20;
--z-ticker:    30;
--z-topbar:    40;
--z-overlay:   50;
--z-modal:     60;
--z-toast:     70;
--z-breaking:  80;
```

---

## 7. Paper Grain Texture (SVG filter, no image files)

```css
html::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
  opacity: var(--grain-opacity);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
}
```

---

## 8. Component Patterns

### 8.1 Ink-Stamp Category Tag

```css
.cat-stamp {
  display: inline-block;
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: white;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(0,0,0,0.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 2px rgba(0,0,0,0.2);
  transform: rotate(-0.5deg);
  filter: contrast(1.05);
}
```

### 8.2 Breaking News Banner (drop-in from top)

- Accent red background, `role="alert"`, `aria-live="assertive"`
- Animates in with `--ease-snap` at `--duration-normal`
- Auto-dismiss 8s; manual close button

### 8.3 Skeleton Loader

CSS shimmer only (`@keyframes` gradient sweep). No JS.

### 8.4 Article Card

- Surface: `--color-paper-alt`
- Top border: `2px solid --color-ink`
- Tags: ink-stamp style
- Byline: `--font-ui` `--color-ink-muted`
- Hover: `translateY(-2px)` + elevated shadow, `--duration-fast`

---

## 9. Tailwind Config

```js
// tailwind.config.ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        paper:           'var(--color-paper)',
        'paper-alt':     'var(--color-paper-alt)',
        'paper-border':  'var(--color-paper-border)',
        ink:             'var(--color-ink)',
        'ink-secondary': 'var(--color-ink-secondary)',
        'ink-muted':     'var(--color-ink-muted)',
        accent:          'var(--color-accent)',
        'accent-light':  'var(--color-accent-light)',
        positive:        'var(--color-positive)',
      },
      fontFamily: {
        masthead: ['UnifrakturCook', 'Old Standard TT', 'Georgia', 'serif'],
        headline: ['Playfair Display', 'Old Standard TT', 'Georgia', 'serif'],
        body:     ['Source Serif 4', 'Georgia', 'Times New Roman', 'serif'],
        ui:       ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono:     ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      transitionTimingFunction: {
        paper: 'cubic-bezier(0.23, 1, 0.32, 1)',
        snap:  'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
```

# The Reading Room Design System — AI World News Desk
*Version 1.0 · 2026-11-02 · Isolated Aesthetic Specification (`.lib-root`)*

---

## 0. Principles & Atmospheric Contrast

| Attribute | Main Newspaper Front Page (`ai-world-news-desk`) | The Library ("The Reading Room") |
| :--- | :--- | :--- |
| **Metaphor** | Rapid broadsheet printed in 1920 on high-speed press | Quiet university archival reading room, leather-bound folios |
| **Atmosphere** | Energetic, newsy, dense, high-contrast, breaking news urgency | Tranquil, warm, contemplative, scholarly, unhurried |
| **Pacing** | Ticking clocks, live counters, countdown hairlines (7s auto-advance) | Deliberate reading, deep focus, timeless perspectives |
| **Primary Accent** | Breaking-news crimson (`#C0392B`) | Terracotta leather bookmark (`#8B3A22`) & gold illumination (`#9E7B36`) |
| **Styling Scope** | Global theme (`data-theme="paper" \| "night"`) | Strictly scoped under `.lib-root[data-lib-theme="day" \| "night"]` |
| **Isolation Rule** | Never edited by Library code | Never bleeds outside `.lib-root` |

---

## 1. Scoped CSS Custom Properties (`.lib-root`)

All tokens are defined in `/frontend/src/library/styles/library.css` and applied only to elements within or inheriting from `.lib-root`.

### 1.1 Reading Room Day Palette (`.lib-root[data-lib-theme="day"]`)

```css
.lib-root[data-lib-theme="day"] {
  /* Surfaces */
  --lib-bg:               #F6F2EA;   /* Warm aged parchment background */
  --lib-surface:          #ECE5D6;   /* Heavier vellum card surface */
  --lib-surface-hover:    #E5DCcb;   /* Soft pressed paper tone */
  --lib-surface-elevated: #FFFDF9;   /* Pure unsoiled manuscript leaf */
  --lib-border:           #D6C9B4;   /* Hand-stitched binding rule */
  --lib-border-soft:      #E4D9C8;   /* Subtle margin watermark rule */

  /* Inks */
  --lib-ink:              #231E18;   /* Walnut gall ink — near-black warm charcoal */
  --lib-ink-secondary:    #5A4D3E;   /* Sepia commentary & translation ink */
  --lib-ink-muted:        #8C7D6B;   /* Marginalia, chapter numbers & verse citations */
  --lib-ink-faint:        #B5A795;   /* Folio dividers & inactive indicators */

  /* Accents */
  --lib-accent:           #8B3A22;   /* Moroccan leather bookmark terracotta */
  --lib-accent-soft:      #F0DFD7;   /* Washed terracotta highlight tint */
  --lib-gold:             #9E7B36;   /* Manuscript illumination leaf gold */
  --lib-gold-soft:        #F5EEDC;   /* Pale gold leaf aura */
  --lib-sage:             #4A6B56;   /* Calming botanical sage for Mind Helps */
  --lib-sage-soft:        #E5ECE7;   /* Herbal wash background */

  /* Highlights & Shadows */
  --lib-shadow-page:      0 4px 20px -2px rgba(35, 30, 24, 0.08);
  --lib-shadow-card:      0 2px 8px -1px rgba(35, 30, 24, 0.05);
  --lib-shadow-inner:     inset 0 1px 3px rgba(35, 30, 24, 0.04);
}
```

### 1.2 Reading Room Night Palette (`.lib-root[data-lib-theme="night"]`)

```css
.lib-root[data-lib-theme="night"] {
  /* Surfaces */
  --lib-bg:               #13110E;   /* Dark mahogany reading stack at midnight */
  --lib-surface:          #1C1915;   /* Dark walnut table surface */
  --lib-surface-hover:    #26221D;   /* Illuminated stack card */
  --lib-surface-elevated: #2A2520;   /* Desk lamp circle surface */
  --lib-border:           #2E2720;   /* Leather binding groove */
  --lib-border-soft:      #241F1A;   /* Subdued shelf rule */

  /* Inks */
  --lib-ink:              #ECE4D8;   /* Vellum lettering under warm incandescent bulb */
  --lib-ink-secondary:    #B2A492;   /* Warm sepia footnote ink */
  --lib-ink-muted:        #756857;   /* Faint library index stamps */
  --lib-ink-faint:        #453D33;   /* Quiet folio rule */

  /* Accents */
  --lib-accent:           #D26848;   /* Warm terracotta candle glow */
  --lib-accent-soft:      #382119;   /* Subdued terracotta ground */
  --lib-gold:             #D4A84D;   /* Gilt title lettering in candlelight */
  --lib-gold-soft:        #382E18;   /* Dim antique gold wash */
  --lib-sage:             #6FA07D;   /* Nocturnal sage */
  --lib-sage-soft:        #1A2B20;   /* Deep sage ground */

  /* Highlights & Shadows */
  --lib-shadow-page:      0 8px 30px rgba(0, 0, 0, 0.6);
  --lib-shadow-card:      0 3px 12px rgba(0, 0, 0, 0.4);
  --lib-shadow-inner:     inset 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

---

## 2. Typography & Font Stack

All font imports are isolated to the `/frontend/src/library/` tree or imported conditionally:

```css
.lib-root {
  /* Font Family Definitions */
  --lib-font-display:    "Cormorant Garamond", Georgia, "Times New Roman", serif;
  --lib-font-reading:    "EB Garamond", Garamond, Georgia, serif;
  --lib-font-mind:       "Lora", Georgia, serif;
  --lib-font-devanagari: "Noto Serif Devanagari", "EB Garamond", serif;
  --lib-font-meta:       "IBM Plex Mono", Menlo, Courier, monospace;

  /* Typography Scale */
  --lib-text-display:    2.5rem;   /* 40px — Book & Subpage titles */
  --lib-text-headline:   1.875rem; /* 30px — Chapter & major headings */
  --lib-text-subhead:    1.375rem; /* 22px — Verse headings & quote leads */
  --lib-text-body:       1.125rem; /* 18px — Comfortable long-form reading */
  --lib-text-caption:    0.9375rem;/* 15px — Translation bylines & license badges */
  --lib-text-meta:       0.8125rem;/* 13px — Citations, dates, timestamps */

  /* Leading & Line Spacing (Generous for deep reading) */
  --lib-leading-loose:   1.85;     /* For long-form scripture & philosophy */
  --lib-leading-snug:    1.35;     /* For display headers & headlines */
}
```

---

## 3. UI Component Specifications

### 3.1 Library Shell Header (`<LibraryHeader>`)
- **Structure**:
  - Top Bar: Left: `[← News Desk]` button returning to the main reader. Center: Masthead reading `"THE LIBRARY"` with Cormorant Garamond small-caps and illuminated gold rule. Right: Theme toggle `[Day / Night]`, Bookmark Drawer trigger `[🔖 Bookmarks (N)]`, and Global Library Search icon.
  - Subpage Navigation Tabs:
    1. `[ 📜 Historical News ]` (Archive dispatches)
    2. `[ 🪷 Timeless Wisdom ]` (Scriptures & Quotes)
    3. `[ 🌿 Mind Helps ]` (Psychological techniques)
  - Underline tab motion: Uses a smooth 200ms ink-wash indicator transition.

### 3.2 Scripture Verse Card (`<VerseCard>`)
- **Layout**:
  - Upper Bar: Canonical citation pill (e.g., `Bhagavad Gita · Chapter 2, Verse 47`) on the left; one-click `[Copy Citation]` and `[Bookmark]` on the right.
  - Sanskrit Block: Original verse rendered in `"Noto Serif Devanagari"` at 22px with generous leading (2.0), centered or left-aligned with a subtle gold left border.
  - Transliteration: Roman IAST transliteration rendered in italicized EB Garamond.
  - Translation: English rendering with the translator's byline (e.g., *"Sir Edwin Arnold (1885)"*).
  - Meaning Section:
    - Dedicated block with a subtle parchment tint.
    - Prominently displays the required label: `[AI-assisted explanation, not scholarly commentary]`.
    - If user is in review mode, includes an `[Edit / Approve]` button to persist custom annotations.
    - In Plain Mode: Displays the stored meaning with an offline badge.

### 3.3 Historical Clipping Card (`<HistoryArticleCard>`)
- **Layout**:
  - Original date badge: Stamped year and calendar date (e.g., `2 November 1914`).
  - Source banner: Repository badge (e.g. `Wikimedia CC BY-SA 4.0` or `Library of Congress Chronicling America`).
  - Verbatim text snippet: Unedited archival prose.
  - Direct outbound link: `[View Original Digital Archive ↗]` opening the official scan/record.

### 3.4 Mind Help Card (`<HelpCard>`)
- **Layout**:
  - Category Ink Stamp: E.g., `STRESS`, `SLEEP`, `ANXIETY`, `FOCUS` in botanical sage tones.
  - Estimated Time: E.g., `⏱ 3 minutes` badge.
  - What it is & When it helps: Concise summary with bulleted physiological/cognitive rationale.
  - Step-by-Step Accordion: Clear, numbered step guidance paraphrased in compassionate, precise prose.
  - Source Provenance Footer: E.g., *"Source: OpenStax Psychology 2e, Chapter 14 (CC BY 4.0)"*.

### 3.5 Helplines Drawer / Footer (`<HelplinesFooter>`)
- **Non-Negotiable Safety Notice**:
  `"General education only. Not medical advice or a substitute for a healthcare professional."`
- **Tabs**: `India`, `United States`, `China`, `Japan`, `Australia`.
- **Details**: Official emergency and crisis numbers with verified 2026 authority stamp.

---

## 4. State Transitions & Anti-Slop Safeguards

1. **Every Component Has 3 States**:
   - **Loading State**: Elegant parchment skeletal shimmer (subdued ivory/amber pulse, zero blue/purple gradients).
   - **Empty State**: Serene illustration or classical calligraphic icon with a gentle note (e.g. *"No archived dispatches found for this date. Select another year in the timeline."*).
   - **Error State**: Graceful ink-drawn alert card with a retry button and fallback to stored local resources.
2. **Motion Rules**:
   - Micro-transitions: `180ms ease-out` for hover states and tabs.
   - Panel transitions: Smooth fade and slide (`250ms cubic-bezier(0.16, 1, 0.3, 1)`).
   - Reduced-Motion Check: If `prefers-reduced-motion: reduce` is active, all transitions snap instantly (0ms).
3. **No Slop Rule**:
   - Zero generic card grids.
   - Zero default Tailwind purples or blues.
   - Zero stock emoji used as interface icons (all icons are custom SVG or Lucide).
   - Zero lorem ipsum or placeholder text.

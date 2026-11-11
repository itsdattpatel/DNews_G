# Semantic Theme System, Color Purge & Contrast Specification
*Version 1.0 · 2026-11-11 · AI World News Desk (PRD D)*

---

## 1. Architecture Overview (Categories 7–10)

PRD D replaces all ad-hoc or hardcoded color values across React components, Tailwind classes, CSS sheets, SVG illustrations, Three.js WebGL materials, and HTML5 Canvas plots with a centralized **Semantic Token Architecture**.

Key Guarantees:
1. **Zero Hardcoded Colors**: Automated static scanner fails any commit containing literal hex (`#...`), `rgb(...)`, `hsl(...)`, or named color values outside `/frontend/src/themes/`.
2. **Mathematically Enforced Contrast**: Every token pair across all 12 predefined themes and any custom user theme is validated using WCAG 2.1 relative luminance math in-house (zero new npm dependencies per Rule G5).
3. **Manual Control Only**: Theme changes are 100% explicit user choices—no automatic time-of-day or `prefers-color-scheme` overrides.
4. **Zero FOUC First-Paint**: An inline boot script in `index.html` restores the cached theme variables before DOM paint while treating backend settings as the canonical source of truth.
5. **Fixed Alert Urgency**: `--breaking` retains a unmistakable high-contrast crimson hue across every theme, never diluted by custom user accents.

---

## 2. Standardized Semantic Token Dictionary

Every theme implements this unified schema in `:root` / `[data-theme="<id>"]`:

### 2.1 Core Surface, Text & Control Tokens
| Token | Role | Contrast Invariant |
| :--- | :--- | :--- |
| `--bg` | Primary viewport / reader backdrop | Base surface |
| `--surface` | Card, dialog, and panel background | Distinct from `--bg` |
| `--surface-2` | Elevated hover / secondary card / table header | Subtle step from `--surface` |
| `--border` | Broadsheet column rules, dividers, input borders | $\ge 3.0:1$ against `--bg`/`--surface` (where interactive/boundary) |
| `--text` | Primary body & headline ink | $\ge 4.5:1$ on `--bg` and `--surface` ($7.0:1$ on High Contrast) |
| `--text-muted` | Bylines, timestamps, captions, secondary metadata | $\ge 4.5:1$ on `--bg` and `--surface` |
| `--accent` | Primary brand interactive tint, active borders, badges | Vivid theme signature |
| `--accent-hover` | Hover / pressed state of accent fills | Visually distinct shift from `--accent` |
| `--accent-text` | Readable link & label text color derived from `--accent` | Lightness-adjusted to guarantee $\ge 4.5:1$ on `--bg` and `--surface` |
| `--text-on-accent` | Foreground text/icons rendered atop `--accent` | Auto-computed (`#000000` or `#FFFFFF`) for highest contrast ($\ge 4.5:1$) |
| `--link` | Editorial hyperlinks | Inherits `--accent-text` with underline |
| `--focus` | Keyboard `:focus-visible` outline ring | $\ge 3.0:1$ contrast against adjacent surfaces |
| `--selection` | Text selection highlight background (`::selection`) | Preserves readable text contrast ($\ge 4.5:1$) |
| `--scrollbar-track` | Track background for two-finger broadsheet scrollers | Matches surface family |
| `--scrollbar-thumb` | Thumb handle for scrollers | Clear visibility ($\ge 3.0:1$) |

### 2.2 Status & Alert Tokens
| Token | Role | Rule |
| :--- | :--- | :--- |
| `--success` | Live stream active, healthy telemetry indicator | Tuned per theme ($\ge 4.5:1$ text / $\ge 3.0:1$ dot) |
| `--warning` | Slow stream, degraded service, catch-up pending | Tuned per theme |
| `--danger` | Offline stream, connection lost, destructive button | Tuned per theme |
| `--breaking` | Breaking News Stamp, Ticker Alert, Urgent Banner | **FIXED Red-Family** across ALL themes (never overridden by Custom Accent) |
| `--breaking-fg` | Foreground ink inside solid `--breaking` badges | Auto-computed for max contrast ($\ge 4.5:1$) |

### 2.3 Category Tag Token Pairs (All 11 Editorial Categories)
Every theme provides dedicated pairs guaranteeing $\ge 4.5:1$ readability while maintaining consistent hue identity across light/dark modes:
- `--cat-world-bg` / `--cat-world-fg` (Slate Blue family)
- `--cat-politics-bg` / `--cat-politics-fg` (Royal Purple-Indigo family)
- `--cat-business-bg` / `--cat-business-fg` (Amber / Ochre Gold family)
- `--cat-tech-bg` / `--cat-tech-fg` (Cyan / Teal family)
- `--cat-science-bg` / `--cat-science-fg` (Cobalt / Azure family)
- `--cat-health-bg` / `--cat-health-fg` (Rose / Coral family)
- `--cat-sports-bg` / `--cat-sports-fg` (Tangerine / Burnt Orange family)
- `--cat-entertainment-bg` / `--cat-entertainment-fg` (Plum / Magenta family)
- `--cat-environment-bg` / `--cat-environment-fg` (Forest Green family)
- `--cat-crime-bg` / `--cat-crime-fg` (Brick Red / Crimson family)
- `--cat-animals-bg` / `--cat-animals-fg` (Sage / Emerald Moss family)

*Accessibility Invariant*: All category tags combine color with a non-color text cue or vector emblem so color is never the sole carrier of meaning.

### 2.4 Cartographic Globe & Flat Map Tokens
Consumed dynamically by `Globe3D.tsx` (Three.js materials) and `WorldMap.tsx` (SVG fills):
- `--map-ocean`: Ocean sphere / backdrop fill
- `--map-land`: Country landmass fill
- `--map-border`: International polygon border strokes
- `--map-hover`: Highlighted country under cursor
- `--map-selected`: Actively filtered country polygon
- `--map-pin`: Standard news density pin fill
- `--map-pin-wildlife`: Distinct high-contrast Wildlife Wire marker fill
- `--map-pin-pulse`: Expanding shockwave ring for breaking news
- `--map-arc`: Great-circle comparative broadcast arc color
- `--map-atmosphere`: Ambient atmospheric horizon rim glow (subdued on light themes)

### 2.5 The Library Derived Tokens
Preserving PRD B calm reading-room warmth while harmonizing cleanly with the active user theme:
- `--lib-bg`: Library shell parchment/slate backdrop (derived from `--bg`)
- `--lib-surface`: Folio card surface (derived from `--surface`)
- `--lib-ink`: Classical serif body ink (derived from `--text`)
- `--lib-muted`: Citation and attribution ink (derived from `--text-muted`)
- `--lib-border`: Deckle rule and divider borders (derived from `--border`)
- `--lib-accent`: Marginalia highlight and active folio marker (derived from `--accent-text`)

---

## 3. Predefined 12-Theme Catalog (Category 8)

Each theme starts from three canonical anchor colors (Background / Primary Text / Accent), from which the entire token matrix is systematically derived and verified against WCAG 2.1 guidelines.

### Light Group (5 Themes)
| # | ID | Name | Starting `--bg` | Starting `--text` | Starting `--accent` | Character |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | `paper` | **Classic Paper** | `#F5F0E6` *(or PRD C `#FAF7F0` — see Open Q)* | `#1A1A1A` | `#C0392B` | Traditional warm newsprint broadsheet |
| **2** | `nordic-frost` | **Nordic Frost** | `#EEF2F5` | `#1B2733` | `#2F6FED` | Crisp slate-blue Scandinavian editorial |
| **3** | `mint-paper` | **Mint Paper** | `#EDF4EE` | `#16251B` | `#2F8F5B` | Botanical sage broadsheet |
| **4** | `desert-sand` | **Desert Sand** | `#F3E5D0` | `#2E2118` | `#B5541C` | Terracotta ochre & aged parchment |
| **5** | `sepia-library` | **Sepia Library** | `#EADBC0` | `#3B2A1A` | `#8B4513` | Deep archival folio & chestnut ink |

### Dark Group (6 Themes)
| # | ID | Name | Starting `--bg` | Starting `--text` | Starting `--accent` | Character |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- |
| **6** | `night` | **Night Edition** | `#121110` *(or PRD C `#0E0C09` — see Open Q)* | `#EDE6D6` | `#E5533D` | Nocturnal obsidian desk & warm cream |
| **7** | `midnight-blue` | **Midnight Blue** | `#0E1726` | `#E6ECF5` | `#4DA3FF` | Deep maritime navy wire room |
| **8** | `forest-wildlife` | **Forest Wildlife** | `#0F1E17` | `#E4EFE6` | `#6FCF97` | Pine canopy night watch |
| **9** | `ocean-teal` | **Ocean Teal** | `#0B1F2A` | `#DDEFF2` | `#2EC4B6` | Abyssal teal teleprinter |
| **10** | `wine-rose` | **Wine and Rose** | `#1E0F14` | `#F3E4E7` | `#E0607E` | Burgundy print room edition |
| **11** | `amber-terminal` | **Amber Terminal** | `#0A0A05` | `#FFD27A` | `#FFB000` | Phosphor monochrome wire terminal |

### Accessibility Group (1 Theme — WCAG AAA 7:1)
| # | ID | Name | Starting `--bg` | Starting `--text` | Starting `--accent` | Target Standard |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- |
| **12** | `high-contrast` | **High Contrast** | `#000000` | `#FFFFFF` | `#FFE600` | Pure pitch black / pure white / AAA $\ge 7.0:1$ all text |

---

## 4. In-House Color Math & WCAG Contrast Enforcement

Per Rule G5, all color manipulation and contrast checking is built cleanly in-house (`frontend/src/themes/colorMath.ts`) with zero third-party packages.

### Relative Luminance Formula (WCAG 2.1):
Given sRGB channel $c \in [0, 1]$:
$$c_{lin} = \begin{cases} c / 12.92 & \text{if } c \le 0.03928 \\ \left(\frac{c + 0.055}{1.055}\right)^{2.4} & \text{otherwise} \end{cases}$$

$$L = 0.2126 \cdot R_{lin} + 0.7152 \cdot G_{lin} + 0.0722 \cdot B_{lin}$$

### Contrast Ratio:
$$CR = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$

### Automated Threshold Gates (Enforced at Build & Runtime):
1. Normal text (`--text`, `--text-muted`, `--lib-ink`) vs (`--bg`, `--surface`, `--surface-2`): **$\ge 4.5:1$** (and **$\ge 7.0:1$** for `high-contrast`).
2. Readable Accent Link Text (`--accent-text`) vs `--bg` and `--surface`: **$\ge 4.5:1$** — derived automatically by binary-searching lightness $L$ in HSL space until compliant.
3. Foreground on Accent (`--text-on-accent`): Automatically evaluates $CR(\text{white}, \text{accent})$ vs $CR(\text{black}, \text{accent})$ and picks the winner.
4. Category Tag Text (`--cat-*-fg`) vs Category Tag Surface (`--cat-*-bg`): **$\ge 4.5:1$**.
5. Focus Ring (`--focus`) and UI Borders (`--border`): **$\ge 3.0:1$** against neighboring backgrounds.

---

## 5. Custom Accent Engine (Category 9)

Users may select **"Custom"** in **Settings > Appearance**:
- **Controls**: Native HTML5 `<input type="color">`, validated Hex text input, and HSL sliders (Hue $0^\circ\text{–}360^\circ$, Saturation $0\%\text{–}100\%$, Lightness $0\%\text{–}100\%$).
- **Base Surface**: Select any Light/Dark base (defaults to Classic Paper or Night Edition surfaces).
- **Live Contrast Scorecard**: Displays real-time pass/fail contrast badges for `--accent-text` on `--bg`, `--accent-text` on `--surface`, and `--text-on-accent` on `--accent`.
- **Auto-Correction Safety Net**: If a user selects an unreadable accent (e.g., white accent on pale paper), `--accent-text` and interactive surfaces are automatically clamped toward the nearest compliant lightness, accompanied by an explanatory notice ("Adjusted lightness to maintain 4.5:1 text contrast").
- **Isolation of Non-Accent Signals**: Category tags preserve their 11 distinct semantic hues (scaling lightness/saturation to the base theme), and `--breaking` remains fixed high-contrast red.

---

## 6. Codebase Color Purge Plan (Category 7)

All source files matching the patterns below will be systematically refactored during Category 7:
1. CSS/SCSS/Tailwind utility overrides (`text-stone-*`, `bg-amber-*`, `#FAF7F0`, `rgba(...)`) replaced with semantic Tailwind mappings (`bg-[var(--surface)]`, `text-[var(--text)]`, or Tailwind theme tokens).
2. Inline style color properties eliminated across all JSX/TSX components.
3. SVG icons and custom Bat / Wildlife graphics updated to reference `currentColor` or `var(--accent)` / `var(--text)`.
4. Three.js `Globe3D.tsx` and D3 `WorldMap.tsx` updated to parse computed CSS variables from `getComputedStyle(document.documentElement)` on mount and reactive `theme` store changes, updating WebGL materials cleanly without unmounting `<Canvas>` or resetting camera OrbitControls.
5. Every file refactored during the purge will be logged in Section 7 of this document (to be appended upon Category 7 execution).

---

## 7. Print & PDF Export Behavior

Newspaper briefing PDF generation (`/api/export/briefing-pdf`) operates independently of the UI dark/colorful theme, rendering cleanly in high-contrast ink-on-white paper safe for physical printers *(see `/docs/OPEN_QUESTIONS.md`)*.

---

## 8. First-Paint Anti-FOUC Boot Script

`frontend/index.html` embeds a synchronous inline script prior to CSS load:
```html
<script>
  try {
    var cached = localStorage.getItem('world_desk_theme_cache');
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed.theme) document.documentElement.setAttribute('data-theme', parsed.theme);
      if (parsed.colorScheme) document.documentElement.style.colorScheme = parsed.colorScheme;
      if (parsed.cssVars) {
        Object.keys(parsed.cssVars).forEach(function(k) {
          document.documentElement.style.setProperty(k, parsed.cssVars[k]);
        });
      }
    }
  } catch (e) {}
</script>
```
Once the React app mounts and fetches `/api/settings`, the backend database state reconciles and updates `localStorage` if differences exist.

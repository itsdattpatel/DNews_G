# UI Specification — AI World News Desk
*Version 2.0 · 2026-11-01 · Full Replacement*

All screens are responsive from 1280px to 4K.
Every screen has: Loading state · Empty state · Error state.
Primary nav via bat bar (top); keyboard shortcuts noted per screen.

---

## Global Shell

```
┌─────────────────────────────────────────────────────────────────┐
│ [BAT ICON]  The World Desk             [provider badge] [🔴 live]│  ← TopBar (z-40)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     SCREEN CONTENT                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ▶ TICKER: Breaking news headline scrolls left...               │  ← Ticker (z-30)
└─────────────────────────────────────────────────────────────────┘
```

### TopBar
- Left: Custom SVG bat icon (wings fold/unfold on click — SVG animation, not Lottie)
- Centre: "The World Desk" in `--font-masthead`
- Right: Current AI provider badge (Gemini/Groq/etc.) + live indicator dot
- Bat click: unfolds settings overlay like a folded paper (paper-fold CSS transform)

### Bat Menu Overlay
```
┌─────────────────────────────────────────────┐
│            ╔══ The World Desk ══╗            │
│            ║                   ║            │
│  [Reader]     [Globe]     [TV] │
│  [Archive]    [Compare]  [Timeline] │
│  [Watchlist]  [Alerts]   [PDF] │
│  [Briefing]                   │
│            ╚═══════════════════╝            │
│  ─────────────────────────────────────────  │
│  Theme: [Paper] [Night]                     │
│  Settings  ·  API & Sources                 │
└─────────────────────────────────────────────┘
```
- Unfolds from the bat icon downward using `clip-path` or `scaleY` animation
- `--ease-paper` `--duration-slow`
- `role="dialog"` `aria-label="Main Navigation"`

### Keyboard Shortcuts (global)
| Key | Action |
|-----|--------|
| `b` | Toggle bat menu |
| `j` | Next article |
| `k` | Previous article |
| `/` | Focus search |
| `g` | Go to Globe |
| `t` | Go to TV |
| `Esc` | Close overlay / modal |

---

## Screen (a): Main Reader `/`

**Purpose**: Read an article with verbatim evidence highlighting.

```
┌──────────────────────────────────────────────────────────────────┐
│ [BAT]          The World Desk          [Gemini ●] [● LIVE]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [World][Animals]  The Hindu · India · 2h ago                   │
│  ══════════════════════════════════════════════════════════════  │
│  Floods displace 50,000 families                                 │  ← --text-headline-xl
│  in Tamil Nadu after record rains                                │    --font-headline
│  ══════════════════════════════════════════════════════════════  │
│                                                                  │
│  ┌─── ARTICLE (60%) ──────────────────┬── SUMMARY (40%) ──────┐ │
│  │                                    │                        │ │
│  │  [EN ↔ Original]                   │  ┌──────────────────┐ │ │
│  │                                    │  │ § 1              │ │ │
│  │  Full article body text in         │  │ Heavy rains...   │ │ │  ← evidence highlight
│  │  Source Serif 4 at 1.125rem        │  │                  │ │ │
│  │  line-height 1.7                   │  │ § 2              │ │ │
│  │                                    │  │ At least 30...   │ │ │
│  │  [verbatim anchor phrases          │  │                  │ │ │
│  │   highlighted in marker style      │  │ § 3              │ │ │
│  │   matching hovered sentence]       │  │ Thousands of...  │ │ │
│  │                                    │  └──────────────────┘ │ │
│  │                                    │                        │ │
│  │                                    │  [Bookmark ♦] [Share] │ │
│  └────────────────────────────────────┴────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Article Panel (left, 60%)**
- Language toggle `[EN ↔ Original]` — switches `body_english` ↔ `body_original`
- Body text: `--font-body` `--text-body-lg`
- Anchor phrases wrapped in `<mark class="evidence-anchor">` spans
- Active anchor: highlight + underline linked to active summary sentence

**Summary Panel (right, 40%)**
- Summary sentences linked to left-panel verbatim anchors by `data-sentence-index`
- Hovering/clicking a summary sentence illuminates matching anchor phrases with marker-style ink highlight
- Optional reading mode sweeps highlights in sync with typing
- Bookmark + Share actions

**Loading state**: Article skeleton (shimmer strips for headline, byline, body lines)
**Empty state**: "Select an article from the category rail below."
**Error state**: "Could not load article. [Retry]" with ErrorBoundary

**Keyboard**: `j`/`k` next/prev article; `Esc` close modal

---

## Screen (b): Category Rail `/category/:name`

**Purpose**: Browse and filter articles by category.

```
┌──────────────────────────────────────────────────────────────────┐
│ [BAT]          The World Desk          [Gemini ●]                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ─ All ─ │ [World] │ [Politics] │ [Animals] │ [Environment] │ … │  ← Category tab rail
│                                                                  │
│  ┌──────────────────────────────────┐  Sort: [Latest ▾]         │
│  │ 🔍 Search articles...            │                            │
│  └──────────────────────────────────┘                            │
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ [World]         │ │ [Animals]       │ │ [Environment]   │   │
│  │                 │ │                 │ │                 │   │
│  │ Headline text   │ │ Headline text   │ │ Headline text   │   │
│  │ wraps to 2 lines│ │ wraps to 2 lines│ │ wraps here      │   │
│  │                 │ │                 │ │                 │   │
│  │ The Hindu·India │ │ BBC·UK          │ │ Reuters·US      │   │
│  │ 2h ago  ●●●○○  │ │ 4h ago  ●●○○○  │ │ 1h ago  ●●●●○  │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│  ... (virtualized list, 3-column at 1280px, 4-col at 1600px+)   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                    │
└──────────────────────────────────────────────────────────────────┘
```

- Category tabs: ink-stamp style active state
- Filter is instant (TanStack Query with `keepPreviousData`)
- Article cards: `border-t-2` newspaper top rule, ink-stamp category tags, outlet + country byline
- Breaking score shown as filled dots `●●●○○` (5-dot scale)
- Virtualized with `@tanstack/react-virtual` if list > 50 items

**Loading**: 9 skeleton cards
**Empty**: "No wire dispatches found. The editorial wire monitors are actively polling global syndicates." (custom broadsheet dispatch illustration)
**Error**: "Feed unavailable. [Retry]"

---

## Screen (c): Compare Coverage `/compare/:cluster_id`

**Purpose**: Side-by-side same-story coverage from different countries.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Compare Coverage — "Floods hit southern India"  [Gemini ●] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Cluster: 4 outlets · 2 countries · [● Breaking]                  │
│                                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ The Hindu · India    │  │ BBC · United Kingdom  │               │
│  │ ─────────────────── │  │ ─────────────────────│               │
│  │ Headline A           │  │ Headline B            │               │
│  │                      │  │                       │               │
│  │ Summary text...      │  │ Summary text...       │               │
│  │                      │  │                       │               │
│  │ [Read full →]        │  │ [Read full →]         │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ Al Jazeera · Qatar   │  │ + 1 more outlet      │               │
│  │ ─────────────────── │  │ [View →]              │               │
│  │ Headline C           │  │                       │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                    │
│  Shared themes: [floods] [displacement] [army]  ← keyword overlap │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- 2-column grid of article summaries; overflow "N more" card
- Shared keyword tags highlighted across all panels
- Thematic curves: catenary silk curves drawn between matching themes across columns
- `[Read full →]` opens Main Reader in drawer or new route

**Loading**: 4 skeleton panels
**Empty**: "No matching coverage found for this story."
**Error**: ErrorBoundary with cluster ID in error message

---

## Screen (d): Story Timeline `/timeline/:cluster_id`

**Purpose**: How a story evolved over time.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Story Timeline — "Floods hit southern India"  [Gemini ●]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ◀ ─────────────────────────────────────────────────────── ▶      │
│                                                                    │
│  08:00          10:30          12:00          14:00               │
│    │               │               │              │               │
│    ●  First        ●  Army         ●  Death toll  ●  Relief       │
│       report          deployed        rises          operations   │
│       The Hindu       Al Jazeera      BBC            Reuters      │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ [Selected event detail]                                      │ │
│  │ Headline · Outlet · Time                                     │ │
│  │ Summary excerpt...                          [Read full →]   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Horizontal scrollable timeline with `Lenis` smooth scroll
- Events as dots on a ruled line (newspaper column rule style)
- Click dot → detail panel below
- Dot color: `--color-accent` for breaking events, `--color-ink` otherwise

**Loading**: skeleton timeline with 4 dot placeholders
**Empty**: "Only one article in this cluster — no timeline yet."

---

## Screen (e): Globe / Map `/globe`

**Purpose**: See where stories are happening + wildlife crime overlay.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Global News Radar          [Wildlife crimes ●] [Gemini ●]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Map ↔ Globe]    [Wildlife layer ON/OFF]    [/ search country]   │
│                                                                    │
│  ╔══════════════════════════════════════════════════════════════╗  │
│  ║                                                              ║  │
│  ║     [    react-globe.gl — WebGL 3D globe    ]               ║  │
│  ║                                                              ║  │
│  ║   ● pulsing pins on article location_tags                   ║  │
│  ║   ▲ wildlife crime markers (Animals category)               ║  │
│  ║                                                              ║  │
│  ╚══════════════════════════════════════════════════════════════╝  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Pin hover tooltip: Country · N articles · Top headline        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Globe lazy-loaded (dynamic import)
- Pins pulse with `--duration-xslow` animation
- Wildlife layer: distinct triangle markers, orange color
- Hover tooltip: country, article count, top headline excerpt
- Map/Globe toggle: d3-geo flat map as fallback
- `g` keyboard shortcut to focus globe

**Loading**: Spinner + "Loading global news radar..."
**Empty pins**: "No location data available for current articles."
**WebGL unsupported**: falls back to d3-geo flat map silently

---

## Screen (f): Archive Chat `/archive`

**Purpose**: Search historical articles; AI synthesis of results.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  The News Morgue · Investigative Archive         [Gemini ●] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  ARCHIVE — ask anything about stored news                    │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │                                                              │ │
│  │  [You] bear bile trade in southeast asia                     │ │
│  │                                                              │ │
│  │  [AI] Based on 7 stored articles...                          │ │
│  │       According to [The Hindu, 2026-10-28]...                │ │
│  │                                                              │ │
│  │  Source cards:                                               │ │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │ │
│  │  │ Straits Times  │ │ The Hindu      │ │ Reuters        │  │ │
│  │  │ score: 4.2     │ │ score: 3.9     │ │ score: 3.1     │  │ │
│  │  └────────────────┘ └────────────────┘ └────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────┐  [AI synthesis ✓]  │
│  │ Ask the archive...                   [→] │                    │
│  └──────────────────────────────────────────┘                    │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- FTS5 full-text search; optional AI synthesis toggle
- Result source cards are article mini-cards (outlet, score, title)
- AI answer synthesized with interactive footnote citation badges

**Loading**: animated broadsheet shimmer loading state
**Empty**: "No results for this query. Try broader terms."
**Error**: "Search failed. [Retry]"

---

## Screen (g): Watchlist `/watchlist`

**Purpose**: Monitor keywords/topics for new articles.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Watchlist                                     [Gemini ●]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [+ Add topic]                                                     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ● bear bile trade         [HIGH]  [enabled ✓]  [Edit] [✕]   │ │
│  │   Keywords: bear, bile, trade, Asia                          │ │
│  │   3 new matches since last visit                             │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ● climate diplomacy       [NORMAL] [enabled ✓] [Edit] [✕]   │ │
│  │   Keywords: climate, COP, emissions, diplomacy               │ │
│  │   0 new matches                                              │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ○ poaching ivory          [LOW]   [disabled]   [Edit] [✕]   │ │
│  │   Keywords: poaching, ivory, elephant                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Priority badges as ink stamps
- Toggle enables/disables monitoring
- "N new matches" uses SSE `new_article` events filtered by keywords
- Edit modal: topic name, keyword chips, priority select

**Loading**: skeleton rows
**Empty**: "No watchlist topics yet. [+ Add your first topic]"

---

## Screen (h): TV View `/tv`

**Purpose**: Watch live wildlife / news streams.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Live TV                                       [Gemini ●]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────┐  ┌──────────────────────┐ │
│  │                                    │  │ Animal & Discovery   │ │
│  │    [VIDEO PLAYER — hls.js]         │  │ ─────────────────── │ │
│  │                                    │  │ ▶ Animal Planet      │ │
│  │   Channel: Animal Planet           │  │   BBC Earth          │ │
│  │   [●●●●○] Stream health            │  │   Nat Geo Wild       │ │
│  │   [Open in VLC]  [Fullscreen]      │  │   Discovery          │ │
│  │                                    │  │ ─────────────────── │ │
│  └────────────────────────────────────┘  │ Favorites           │ │
│                                          │   ♦ BBC World        │ │
│  ─── All Channels ──────────────────     │   ♦ Al Jazeera       │ │
│  [Search channels...]                    │                      │ │
│                                          │ [+ Manage favorites] │ │
│  ← ─────────────────────────────── →    └──────────────────────┘ │
│    [BBC Earth] [Nat Geo] [CGTN] [DW] …  (horizontal scroll)      │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Stream health: dot rating `[●●●●○]` from `/api/tv/channels/:id/health-check`
- Dead streams: greyed out, `[Stream unavailable]` badge
- "Open in VLC": `vlc://` protocol link (graceful fallback if VLC not installed)
- Animal & Discovery shelf: filtered category
- Favorites: persisted via `PATCH /api/tv/channels/:id/favorite`
- Player: `hls.js` HLS stream; lazy-loaded

**Loading**: spinner in player area; skeleton channel cards
**Empty shelf**: "No animal channels available."
**Error**: "Stream failed to load. [Try VLC] [Skip]"

---

## Screen (i): Daily PDF Preview `/pdf`

**Purpose**: Generate and preview today's newspaper as PDF.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Daily Edition                                 [Gemini ●]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Date: [2026-11-01 ▾]   [Generate PDF]                            │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │   [PDF preview iframe — generated newspaper layout]          │ │
│  │                                                              │ │
│  │   The World Desk — Saturday, November 1 2026                 │ │
│  │   ─────────────────────────────────────────────────────────  │ │
│  │   Top story headline                                         │ │
│  │   …                                                          │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [⬇ Download PDF]                                                  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Date picker (default: today)
- "Generate PDF" hits `POST /api/export/pdf`
- Preview in `<iframe>` with `application/pdf` blob URL
- Download button triggers browser save

**Loading**: "Generating today's edition…" with ink-drip animation
**Empty**: "No articles for this date. Choose another date."
**Error**: "PDF generation failed. [Retry]"

---

## Screen (j): Morning Briefing `/briefing`

**Purpose**: AI-generated 2-minute audio briefing.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Morning Briefing                              [Gemini ●]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Saturday, November 1 2026                                        │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Good morning. Here are today's top stories from around       │ │
│  │ the world...                                                  │ │
│  │                                                              │ │
│  │ [Highlighted sentence as being read]                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [▶ Play]  [■ Stop]  Speed: [1× ▾]  Voice: [Default ▾]           │
│                                                                    │
│  ─────────────────────────────────────────────                    │
│  ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■□□□□□□□□□□□□  1:12 / 2:00         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Briefing text from `GET /api/export/briefing`
- Web Speech API for TTS (browser-native)
- Sentence highlight synced with speech
- Speed: 0.75×, 1×, 1.25×, 1.5×

**Loading**: "Preparing your briefing…"
**Empty**: "No stories yet for today."
**Error**: "Speech synthesis unavailable in this browser."

---

## Screen (k): Alerts Center `/alerts`

**Purpose**: See all breaking/quota/error alerts.

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  Alerts Center             3 unread          [Gemini ●]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [All] [Breaking] [Quota] [Provider] [Errors]                     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ● BREAKING · 14:32  Floods displace 50,000...  [Read] [✓]   │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ● QUOTA    · 13:15  Gemini daily quota at 80%  [OK]  [✓]   │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ✓ PROVIDER · 12:00  Switched from Gemini→Groq  [acknowledged]│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [Mark all read]                                                   │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Filter tabs as ink-stamp style
- Unread dot indicator on TopBar bat icon
- Breaking alerts link to cluster
- `PATCH /api/alerts/:id/acknowledge` on `[✓]`

**Loading**: skeleton rows
**Empty**: "No alerts. Everything is quiet."

---

## Screen (l): Settings (bat menu overlay)

Accessible via bat menu → Settings link.

```
┌──────────────────────────────────────────────┐
│  Settings                              [✕]   │
├──────────────────────────────────────────────┤
│                                              │
│  Theme          [Paper ●] [Night]            │
│                                              │
│  Refresh        Every [5 ▾] minutes          │
│                                              │
│  Alert threshold  [75 ───────●──── 100]      │
│                                              │
│  Auto cleanup     [OFF ●]                    │
│  Retention        [30] days                  │
│                                              │
│  [Save]                                      │
│                                              │
└──────────────────────────────────────────────┘
```

- All controls read/write `GET|PATCH /api/settings`
- Theme toggle applies `data-theme` to `<html>` element + persists in settings
- `role="dialog"` `aria-modal="true"`

---

## Screen (m): API & Sources Settings `/settings/sources`

Full spec: [API_SETTINGS_SPEC.md](./API_SETTINGS_SPEC.md)

```
┌────────────────────────────────────────────────────────────────────┐
│ [BAT]  API & Sources                                 [Gemini ●]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ─── AI Providers ────────────────────────────────────────        │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ ● Gemini Flash   [enabled ✓]  [●●●●○ 80%]  [Test] [...] │    │
│  │   Key: gemi-****-****-****                                │    │
│  │   Last error: none            Last call: 2m ago           │    │
│  ├───────────────────────────────────────────────────────────┤    │
│  │ ○ Groq           [enabled ✓]  [●●○○○ 40%]  [Test] [...] │    │
│  │   Key: gsk_****-****                                      │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ─── News Sources ─────────────────────────────────────────        │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ The Hindu (RSS)   India    [enabled ✓]  [● Live]           │    │
│  │ GDELT DOC 2.0     Global  [enabled ✓]  [● Live] [1req/5s] │    │
│  │ Guardian API      UK      [disabled]   [+ Add key]         │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                    │
│  [+ Add provider]                                                  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ▶ TICKER ···                                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Key fields: masked (`****`), reveal button (eye icon)
- Test button: fires test request, shows green tick or red error inline
- Quota meter: progress bar, `--color-accent` when >80%
- "Delayed" badge on sources with 12-24h lag (free tier)
- "Add provider" wizard: opens modal with Name, Base URL, Auth type, Docs URL, Response mapping fields

---

## Responsive Breakpoints

| Breakpoint | Width | Layout change |
|------------|-------|---------------|
| `laptop` | 1280px | Min supported. Reader 55/45 split. Cards 3-col. |
| `desktop` | 1440px | Default. Reader 60/40. Cards 3-col. |
| `wide` | 1600px | Cards 4-col. Globe full height. |
| `4k` | 2560px+ | Cards 5-col. Larger type scale. Max-width container centered. |

# Spider Spec — AI World News Desk
*Version 1.0 · 2026-11-01 · Single SpiderCrawler (replaces all old spiders)*

---

## 1. Files to DELETE

The following old spider files **must be deleted** before or at the start of Step 5:

### Source files (delete entirely)
```
frontend/src/spider/BaseSpider.ts
frontend/src/spider/spiderTypes/Reader.ts
frontend/src/spider/spiderTypes/RedAlert.ts
frontend/src/spider/spiderTypes/Swarm.ts
frontend/src/spider/spiderTypes/Archive.ts
frontend/src/spider/spiderTypes/Scout.ts
frontend/src/spider/spiderTypes/Weaver.ts
frontend/src/canvas/engine.ts
frontend/src/canvas/ik.ts
frontend/src/components/spider/SpiderCanvas.tsx
frontend/src/components/spider/ScoutBadge.tsx
frontend/src/components/spider/SpiderGlyph.tsx
```

### Test files (delete; they test deleted modules)
```
frontend/src/__tests__/unit/ik.test.ts
frontend/src/__tests__/unit/spiders.test.ts
```

### CSS / styles referencing old spiders
Search and remove any spider-related CSS from `frontend/src/styles/global.css`.

### Store state (update useAppStore.ts)
Remove: `spiderMode`, `activeSpiderType`, `spawnSpider()` actions.
Add: `spiderMode: SpiderMode`, `spiderPaused: boolean`, `setSpiderMode()`, `setSpiderPaused()`.

---

## 2. New SpiderCrawler Architecture

### 2.1 Location
```
frontend/src/components/spider/
  SpiderCrawler.tsx        — main React component
  SpiderCrawler.types.ts   — TypeScript types
  SpiderLeg.ts             — procedural IK leg solver (clean-room, no copied code)
  useSpiderFPS.ts          — FPS monitor hook
  SpiderCrawler.css        — spider-specific CSS (animations, thread colors)
```

### 2.2 TypeScript Types

```typescript
// SpiderCrawler.types.ts

export type SpiderMode = 'reading' | 'breaking' | 'compare' | 'archive';

export interface AnchorPhrase {
  phrase: string;           // verbatim substring of body_english
  sentence_index: number;   // 0-based index into summary sentences
}

export interface SpiderLegState {
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  jointX: number;
  jointY: number;
  planted: boolean;
}

export interface SpiderBodyState {
  x: number;
  y: number;
  heading: number;          // radians
  legStates: SpiderLegState[]; // always 8 legs
}

export interface SpiderCrawlerProps {
  articleText: string;            // body_english full text
  anchorPhrases: AnchorPhrase[];  // from article.anchor_phrases
  summaryCount: number;           // number of summary sentences
  mode: SpiderMode;
  onPhraseActivate: (sentenceIndex: number) => void;
  onPhraseLand: (phrase: string, sentenceIndex: number) => void;
  paused?: boolean;
  maxSpiders?: number;            // default 1; PRD §5 says default 1
  reducedMotion?: boolean;
}
```

### 2.3 Component Behavior

**Mount:**
1. Render a `<canvas>` overlay (`position: absolute; inset: 0; pointer-events: none; z-index: var(--z-spider)`).
2. Find the article text container DOM node (passed via `ref` from parent `ArticlePanel`).
3. For each `anchorPhrase`, locate the first DOM `Text` node containing that phrase, compute its `getBoundingClientRect()` midpoint → store as `{ phrase, sentenceIndex, x, y }` in a `targets[]` array. Discard any phrase not found.
4. Sort `targets[]` by document order (top to bottom).

**Crawl loop (`requestAnimationFrame`):**
1. Advance `bodyState` toward the next target using linear interpolation (speed from `--spider-step-{mode}` token).
2. For each of 8 legs, alternate: move 4 legs while other 4 stay planted (classic insect gait).
3. Leg placement uses a simple 2-joint IK: femur fixed to body, tibia extends to `targetX/Y`; bend direction alternates left/right per leg side.
4. When body is within 24px of a target phrase, trigger `onPhraseLand(phrase, sentenceIndex)`.
5. On `onPhraseLand`:
   - Highlight the phrase span in the article text (add `.spider-anchor--active` class).
   - Fire `onPhraseActivate(sentenceIndex)` → parent types the next summary sentence.
   - Draw a thread from the phrase to the summary panel edge.

**Rendering (Canvas 2D):**
- Body: filled circle, radius 6px, color `var(--color-ink)` (or `var(--color-accent)` in breaking mode).
- Legs: `lineTo` segments, `strokeStyle` matching body.
- Thread: dashed line from anchor phrase to right-panel summary sentence (breaking mode: solid red web threads).
- FPS-adaptive: if FPS < 45, disable thread rendering. If FPS < 30, pause loop.

### 2.4 Modes

| Mode | Speed token | Body color | Thread color | Extra |
|------|------------|------------|--------------|-------|
| `reading` | `--spider-step-reading` | `--color-ink` | `--color-paper-border` | Default |
| `breaking` | `--spider-step-breaking` | `--color-accent` | `--color-accent` | Red web threads, 2× leg amplitude |
| `compare` | `--spider-step-compare` | `--color-ink` | `--color-ink-secondary` | Second spider optional (if FPS ≥ 50); thread connects matching phrases across two articles |
| `archive` | `--spider-step-archive` | `--color-ink-muted` | `--color-paper-border` | Slower, dimmer |

### 2.5 Settings Integration

| Setting key | Default | Effect |
|-------------|---------|--------|
| `spider_speed` | `1.0` | Multiplier on all step durations |
| `max_spiders` | `1` | PRD default is 1; only deploy second spider in compare mode if FPS ≥ 50 |
| `spider_glitch` | `false` | Page-distortion CSS effect on phrase land; OFF by default |
| `spider_pause_on_hover` | `true` | Pause loop on `mouseenter` into article container |
| `reduce_motion` | (from OS) | If true: hide canvas, still fire `onPhraseActivate` for summary sync |

### 2.6 FPS Monitor

```typescript
// useSpiderFPS.ts
export function useSpiderFPS(threshold: number = 45): { fps: number; below: boolean }
```

Tracks rolling 10-frame average. When `below = true`, parent disables thread rendering.
When FPS < 30, parent sets `paused = true`.

---

## 3. Backend Anchor-Phrase Changes

### 3.1 Migration

```sql
-- backend/src/db/migrations/002_anchor_phrases.sql
ALTER TABLE articles ADD COLUMN anchor_phrases TEXT DEFAULT NULL;
-- JSON format: [{"phrase":"exact text from body_english","sentence_index":0}, ...]
```

### 3.2 Updated AI Prompt (addition to AI_PROMPTS.md §2.2)

New required field in article enrichment output:

```
"anchor_phrases": <array of objects — each is an exact verbatim phrase from body_english
                   that supports a summary sentence.
                   Rules:
                   - phrase MUST appear verbatim (case-sensitive) in body_english
                   - sentence_index is 0-based index into the summary sentences
                   - Provide 1–3 phrases per summary sentence (3–5 sentences = 3–15 total)
                   - Phrases must be 4–80 characters long
                   - Do NOT paraphrase; copy the exact substring>
```

Example:
```json
"anchor_phrases": [
  { "phrase": "at least 30 people have been reported missing", "sentence_index": 0 },
  { "phrase": "army deployed to affected districts", "sentence_index": 2 },
  { "phrase": "state government declared a red alert", "sentence_index": 4 }
]
```

### 3.3 Backend Validator

```typescript
// In backend/src/ai/processor.ts — after AI response is parsed:
function validateAnchorPhrases(
  anchorPhrases: Array<{ phrase: string; sentence_index: number }>,
  bodyEnglish: string,
  summaryCount: number
): Array<{ phrase: string; sentence_index: number }> {
  return anchorPhrases.filter(ap =>
    typeof ap.phrase === 'string' &&
    ap.phrase.length >= 4 &&
    ap.phrase.length <= 80 &&
    bodyEnglish.includes(ap.phrase) &&        // verbatim check
    Number.isInteger(ap.sentence_index) &&
    ap.sentence_index >= 0 &&
    ap.sentence_index < summaryCount
  );
}
```

### 3.4 API Change

`GET /api/articles/:id` response adds field:
```json
{
  "anchor_phrases": [
    { "phrase": "at least 30 people have been reported missing", "sentence_index": 0 }
  ]
}
```

If `anchor_phrases` is `NULL` in DB (older articles), return `[]`.

---

## 4. Accessibility

- Canvas has `aria-hidden="true"` (decorative).
- Phrase highlights have `class="spider-anchor--active"` + `data-sentence-index`.
- Screen reader gets summary via the typing panel, not the spider.
- Pause on hover is keyboard-accessible via `Escape` key to toggle pause.
- `prefers-reduced-motion`: spider canvas is hidden (`display: none`); phrase activation still fires for summary sync.


# PRD B: The Library — AI World News Desk
*Version 1.0 · 2026-11-02 · High-Isolation Section*

---

## 1. Executive Summary & Purpose

**The Library** is a dedicated, lazy-loaded section of *AI World News Desk*. While the main application serves live, fast-paced world news with modern newspaper broadsheet aesthetics, The Library provides a tranquil, contemplative "reading room" space for:
1. **Historical News**: Real archival news stories and "Today in History" events from verified public archives.
2. **Timeless Wisdom**: A structured registry of sacred scriptures (starting with Bhagavad Gita, Mahabharata, Ramayana) and verified philosophical quotes with Sanskrit/Devanagari, translations, and plain-language meanings.
3. **Mind Helps**: Evidence-based psychological self-help techniques derived exclusively from verified open-access and public-domain psychology literature.

The Library operates under a strict isolation contract: it introduces **zero regressions or visual changes** to the main news desk application, utilizes its own scoped token architecture (`--lib-*` under `.lib-root`), its own SQLite database tables (`library_*`), and runs seamlessly in Plain Mode (zero AI required for all stored content).

---

## 2. Global Architectural Invariants (PRD B Rules)

### 2.1 Complete Component & Code Isolation (Rule G1 & B1)
- **Frontend Codebase**: Stored entirely within `/frontend/src/library/**`. No shared components from `/frontend/src/components/**` are edited.
- **Backend Codebase**: Stored entirely within `/backend/src/library/**`. Mounted under the dedicated prefix `/api/library`.
- **Database Tables**: All library data resides in dedicated tables prefixed with `library_` (`library_history_cache`, `library_books`, `library_verses`, `library_quotes`, `library_mind_cards`, `library_bookmarks`, `library_helplines`).
- **Settings Group**: Any library-specific user preferences are stored in a dedicated `library_*` namespace.
- **Allowed Edits Outside Library Directories**:
  1. Route registration: 1 lazy-loaded route in `frontend/src/App.tsx` (or router configuration) mapping `/library` to `React.lazy(() => import('./library/LibraryRoot'))`.
  2. Bat Menu navigation entry: 1 navigation item labelled "Library" in `frontend/src/components/BatMenu.tsx`.
  3. Backend route mount: 1 line in `backend/src/index.ts` mounting `libraryRouter` at `/api/library`.
  4. Database migration: Sequential SQLite migration `014_library_tables.sql` creating `library_*` tables.
  *Zero other files outside `/frontend/src/library/` and `/backend/src/library/` may be created or modified.*

### 2.2 Visual Isolation & Scoped Design System (Rule B1.2)
- The Library has its own "reading room" visual identity: calm, warm, parchment-toned, contemplative, and book-like.
- All styles, custom properties, and fonts are scoped exclusively under the CSS selector `.lib-root`.
- **Prohibited**: Editing `global.css`, `tailwind.config.js`, main `DESIGN_SYSTEM.md` tokens, or global CSS variables (`--color-paper`, `--color-ink`, etc.).

### 2.3 Strict Copyright & Provenance Compliance (Rule G8)
- Only materials with verified Public Domain or Open Source / Open Access licenses (CC BY, CC BY-SA, Public Domain / CC0) are permitted.
- Every single historical dispatch, scripture passage, quote, and self-help technique displays its exact source, publication date/year, and license badge on screen.
- All source licenses and official repository links are cataloged in `/docs/LIBRARY_SOURCES.md`.
- No proprietary or copyright-restricted texts are ingested.

### 2.4 Plain Mode Autonomy (Rule B2)
- All stored library contents (history cache, scriptures, quotes, mind helps, helplines) are 100% accessible and readable with **Zero AI calls**.
- AI is used solely for on-demand generation of plain-language explanations of scriptures and quotes when AI is enabled.
- AI-generated explanations are explicitly stamped: *"AI-assisted explanation, not scholarly commentary"*, and stored in the database with a human review status (`ai_meaning_reviewed = 0 | 1`).

---

## 3. Subpage Specifications

### 3.1 Subpage 1: Historical News (Real Archives)
- **Sources**: Wikimedia "On this day" feed API, Library of Congress (Chronicling America), Internet Archive Historical Newspapers. Optional: The Guardian Open Platform Archive (user key). Proposed international: National Archives of India (Abhilekh Patal), National Diet Library of Japan, National Library of Australia (Trove).
- **Core Features**:
  - **"Today in History" Feed**: Automatically presents events and newspaper dispatches that occurred on today's calendar date across historical centuries.
  - **Archive Date Picker**: Select any specific calendar day and past year.
  - **Decade & Country Filters**: Filter historical dispatches by decade (e.g. 1910s, 1940s, 1960s) and originating nation.
  - **Full-Text Archive Search**: Search cached and upstream historical headlines and dispatches.
  - **Source & Attribution Card**: Every clipping shows: original publication date, publisher/source badge, license badge, verbatim snippet, and direct link to the archival scan/record.
  - **Personal Bookmarks**: Toggle bookmark into `library_bookmarks` table.
- **Cache Policy**:
  - Cached in `library_history_cache`.
  - Immune to the main news desk's 30-day retention purge.
  - Managed by a dedicated cache cap (e.g., maximum 5,000 cached archive articles with LRU eviction).
  - Absolute ban on fabricating or modernizing history: only verbatim source snippets and official archive transcripts are displayed.

### 3.2 Subpage 2: Wisdom (Scriptures & Quotes)
#### Tab A: Scriptures
- **Extensible Holy Book Registry**:
  - Initial active books:
    1. *Bhagavad Gita* (18 Chapters, 700 verses)
    2. *Mahabharata* (18 Parvas, core passages)
    3. *Ramayana* (Valmiki Ramayana, 7 Kandas)
  - Registry Architecture: Stored in `library_books` table. New holy books (Upanishads, Dhammapada, Tao Te Ching, Bible KJV) can be added via database configuration without code refactoring.
- **Verified Public Domain Sources**:
  - Sanskrit originals: Public domain recensions (GRETIL / Wikisource).
  - English translations:
    - Gita: Sir Edwin Arnold, *The Song Celestial* (1885).
    - Mahabharata: Kisari Mohan Ganguli translation (1883–1896).
    - Ramayana: Ralph T. H. Griffith verse translation (1870–1874) and Manmatha Nath Dutt prose translation (1891–1894).
- **Verse Presentation Card**:
  1. Exact canonical citation: Book, Parva/Kanda/Chapter, Verse Number.
  2. Original Sanskrit text rendered in authentic Devanagari script using `@fontsource/noto-serif-devanagari`.
  3. Roman transliteration (IAST standard).
  4. English translation with translator attribution and source publication year.
  5. Section "Meaning": Scholarly source commentary where public domain, or plain-language AI explanation.
- **AI Meaning Generation & Approval Workflow**:
  - AI explanations are generated only when AI mode is ON, processed in quota-safe batches.
  - Explicit disclaimer banner: *"AI-assisted explanation, not scholarly commentary"*.
  - Stored in `library_verses` with `ai_meaning_reviewed` flag.
  - UI includes an "Edit / Approve" drawer for user curation.
  - Plain Mode serves existing stored meanings only with zero outbound AI calls.
- **Navigation & Discovery**:
  - Book selector dropdown, chapter/canto navigator, and verse picker.
  - Thematic tags: *Duty (Dharma), Courage, Anger, Grief, Detachment, Devotion, Leadership, Self-Control*.
  - Verse of the Day carousel and "Random Verse" discovery button.
  - One-click copy with full academic citation format.

#### Tab B: Quotes
- **Verified Sources**: Public domain philosophical works and Wikiquote CC BY-SA with full attribution.
- **Attribution Guard**: Quotes lacking verified source citations are marked *"Attribution unverified"* or excluded. Never fabricate quotes.
- **Quote Card**: Quotation text, attributed speaker/author, primary work/speech title, year, source URL, thematic tags, and short contextual meaning.

### 3.3 Subpage 3: Mind Helps (Evidence-Based Psychology)
- **Sources**: OpenStax *Psychology 2e* (CC BY 4.0), World Health Organization *Doing What Matters in Times of Stress* (CC BY-NC-SA 3.0 IGO), William James *Principles of Psychology* (Public Domain).
- **Format: Structured "Help Cards"**:
  - Technique Name (e.g., *Grounding via 5-4-3-2-1 Sensory Scan*, *Cognitive Reframing of Catastrophic Thinking*, *Progressive Muscle Relaxation*, *Box Breathing*).
  - What it is (concise definition).
  - When it helps (situational triggers).
  - Step-by-step guidance (written in clear, compassionate paraphrasing).
  - Time needed (e.g., "3 minutes", "10 minutes").
  - Exact bibliographic source: Book title, chapter, page/section link, and license.
- **Categories**: Stress, Anxiety, Sleep, Focus, Habits & Motivation, Anger, Grief, Relationships, Self-Talk.
- **Safety Protocol (Non-Negotiable)**:
  - Prominent banner on every screen: *"General education, not medical advice or a substitute for a professional."*
  - Strict prohibition: No medical diagnosis, no medication guidance, no techniques involving pain, physical shock, or deprivation.
  - Helplines Footer: Verified crisis helplines for India, USA, China, Japan, and Australia, maintained in `library_helplines` with verified dates.
  - **Explicit Non-Goal**: NO AI conversational therapy, chatbot counseling, or interactive diagnosis.

---

## 4. Verification & QA Protocol (Rule B6)

1. **Proof of No Change**: Playwright automated suite captures screenshots of all 11 main app screens before starting PRD B. After every step, a pixel-by-pixel diff test verifies 0% change in the main screens.
2. **Git Diff Audit**: `git diff --stat` must confirm only allowed files (`App.tsx`, `BatMenu.tsx`, `backend/src/index.ts`, `014_library_tables.sql`) are touched outside `/src/library/` and `/server/library/`.
3. **Automated Unit & E2E Tests**: Vitest suite for library services and Playwright end-to-end tests for all 3 subpages in both Day and Night modes.
4. **Security & Package Audit**: `npm audit` with 0 high/critical vulnerabilities. Only approved licenses (MIT, Apache-2.0, ISC, OFL-1.1).


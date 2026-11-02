# Library Technical Specification — AI World News Desk
*Version 1.0 · 2026-11-02 · Isolated Subsystem Architecture*

---

## 1. Architecture & Directory Boundaries

All Library code is strictly partitioned from the main newspaper application:

```
frontend/src/library/
├── LibraryRoot.tsx                # Main entry wrapper (<div className="lib-root">)
├── LibraryHeader.tsx              # Distinct reading room masthead & subpage tabs
├── LibrarySearch.tsx              # Scoped library search bar & filter controls
├── components/
│   ├── BookmarksDrawer.tsx        # Saved verses, quotes, articles & mind cards
│   ├── HelplinesFooter.tsx        # Crisis support contacts (IN, US, CN, JP, AU)
│   ├── MeaningApprovalModal.tsx   # Human review & edit interface for AI meanings
│   └── VerificationBadge.tsx      # Public domain / CC license indicator
├── history/
│   ├── HistorySubpage.tsx         # Tab 1: Historical News Archives
│   ├── TodayInHistoryFeed.tsx     # Calendar-matching historic events
│   ├── HistoryDatePicker.tsx      # Day/Month/Year and decade picker
│   └── HistoryArticleCard.tsx     # Archival clipping with source & license
├── wisdom/
│   ├── WisdomSubpage.tsx          # Tab 2: Scriptures & Quotes host
│   ├── ScriptureReader.tsx        # Canonical book reader & verse carousel
│   ├── VerseCard.tsx              # Sanskrit Devanagari, transliteration & meaning
│   ├── QuotesExplorer.tsx         # Philosophical quotes browser
│   └── QuoteCard.tsx              # Verified quote card with author attribution
├── mind/
│   ├── MindHelpsSubpage.tsx       # Tab 3: Psychological self-help desk
│   ├── CategoryFilterBar.tsx      # Stress, Sleep, Focus, Anxiety, etc.
│   └── HelpCard.tsx               # Step-by-step psychological technique card
├── store/
│   └── useLibraryStore.ts         # Scoped Zustand store for library state
├── ui/
│   ├── LibButton.tsx              # Parchment-styled button
│   ├── LibCard.tsx                # Deckle-edged card container
│   ├── LibTabs.tsx                # Subpage navigation tabs
│   └── LibDivider.tsx             # Calligraphic hairline divider
└── styles/
    └── library.css                # Scoped CSS custom properties under .lib-root

backend/src/library/
├── index.ts                       # Router mount for /api/library
├── routes.ts                      # Express route definitions
├── services/
│   ├── historyService.ts          # Wikimedia, Chronicling America & Archive fetchers
│   ├── scriptureService.ts        # Holy book registry, verse queries & random picks
│   ├── quoteService.ts            # Wikiquote & public domain quote retriever
│   ├── mindService.ts             # Psychological techniques & verified helplines
│   └── aiMeaningService.ts        # Quota-safe AI explanation generator & reviewer
└── cache/
    └── libraryCacheManager.ts     # Size-capped LRU storage for historical clippings
```

---

## 2. Database Schema (`014_library_tables.sql`)

All library tables are strictly prefixed with `library_` to avoid any table or index collisions:

```sql
-- Migration 014: Library Subsystem Tables

-- 1. Historical News Archive Cache
CREATE TABLE IF NOT EXISTS library_history_cache (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source_slug     TEXT NOT NULL,          -- 'wikimedia' | 'chronicling_america' | 'internet_archive'
  external_id     TEXT UNIQUE NOT NULL,   -- upstream unique id or URL hash
  event_date      TEXT NOT NULL,          -- ISO date or 'YYYY-MM-DD'
  event_year      INTEGER NOT NULL,       -- e.g. 1914, 1947
  headline        TEXT NOT NULL,
  snippet         TEXT NOT NULL,
  original_url    TEXT NOT NULL,
  country         TEXT,                   -- 'India' | 'USA' | 'International' etc.
  media_url       TEXT,                   -- optional historic photograph/scan
  license         TEXT NOT NULL,          -- 'Public Domain' | 'CC BY-SA 3.0' | 'CC BY-SA 4.0'
  attribution     TEXT NOT NULL,
  cached_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_hist_date ON library_history_cache(event_date);
CREATE INDEX IF NOT EXISTS idx_lib_hist_year ON library_history_cache(event_year);
CREATE INDEX IF NOT EXISTS idx_lib_hist_country ON library_history_cache(country);

-- 2. Holy Books Registry
CREATE TABLE IF NOT EXISTS library_books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT UNIQUE NOT NULL,   -- 'bhagavad_gita' | 'mahabharata' | 'ramayana'
  title_english   TEXT NOT NULL,
  title_original  TEXT NOT NULL,          -- e.g. 'श्रीमद्भगवद्गीता'
  tradition       TEXT NOT NULL,          -- 'Hindu' | 'Buddhist' | 'Universal'
  total_sections  INTEGER NOT NULL,       -- 18 chapters for Gita, etc.
  section_unit    TEXT NOT NULL DEFAULT 'Chapter', -- 'Chapter' | 'Parva' | 'Kanda'
  description     TEXT,
  default_translator TEXT NOT NULL,
  source_license  TEXT NOT NULL DEFAULT 'Public Domain',
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Sacred Verses
CREATE TABLE IF NOT EXISTS library_verses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id             INTEGER NOT NULL REFERENCES library_books(id),
  section_number      INTEGER NOT NULL,
  verse_number        INTEGER NOT NULL,
  verse_ref           TEXT NOT NULL,          -- e.g. 'BG 2.47', 'MB 6.25.47'
  text_original       TEXT NOT NULL,          -- Devanagari Sanskrit
  transliteration     TEXT,                   -- IAST Roman script
  translation_english TEXT NOT NULL,
  translator          TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  source_license      TEXT NOT NULL DEFAULT 'Public Domain',
  ai_meaning          TEXT,                   -- Plain-language summary/explanation
  ai_meaning_reviewed INTEGER NOT NULL DEFAULT 0, -- 1 = Human approved, 0 = Pending/Unchecked
  theme_tags          TEXT,                   -- JSON array: ["duty","action","courage"]
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(book_id, section_number, verse_number)
);

CREATE INDEX IF NOT EXISTS idx_lib_verses_book ON library_verses(book_id, section_number);
CREATE INDEX IF NOT EXISTS idx_lib_verses_ref ON library_verses(verse_ref);

-- 4. Philosophical Quotes
CREATE TABLE IF NOT EXISTS library_quotes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_text          TEXT NOT NULL,
  author              TEXT NOT NULL,
  work_title          TEXT,
  year_published      INTEGER,
  tradition           TEXT,                   -- 'Stoicism' | 'Vedanta' | 'Humanism' etc.
  country             TEXT,
  source_url          TEXT NOT NULL,
  source_license      TEXT NOT NULL,          -- 'Public Domain' | 'CC BY-SA 4.0'
  attribution         TEXT NOT NULL,
  is_verified         INTEGER NOT NULL DEFAULT 1,
  ai_meaning          TEXT,
  ai_meaning_reviewed INTEGER NOT NULL DEFAULT 0,
  theme_tags          TEXT,                   -- JSON array: ["peace","resilience"]
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_quotes_author ON library_quotes(author);

-- 5. Mind Help Cards (Psychology)
CREATE TABLE IF NOT EXISTS library_mind_cards (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT UNIQUE NOT NULL,   -- e.g. 'box-breathing', '54321-grounding'
  title               TEXT NOT NULL,
  category            TEXT NOT NULL           -- 'stress' | 'anxiety' | 'sleep' | 'focus' | 'habits' | 'anger' | 'grief' | 'relationships' | 'selftalk'
    CHECK(category IN ('stress','anxiety','sleep','focus','habits','anger','grief','relationships','selftalk')),
  what_it_is          TEXT NOT NULL,
  when_it_helps       TEXT NOT NULL,
  steps_json          TEXT NOT NULL,          -- JSON array of step strings
  time_needed_minutes INTEGER NOT NULL,       -- e.g. 3, 5, 10
  source_book         TEXT NOT NULL,          -- 'OpenStax Psychology 2e' etc.
  source_chapter      TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  source_license      TEXT NOT NULL,          -- 'CC BY 4.0' | 'Public Domain'
  attribution         TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lib_mind_category ON library_mind_cards(category);

-- 6. Unified Library Bookmarks
CREATE TABLE IF NOT EXISTS library_bookmarks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type       TEXT NOT NULL CHECK(item_type IN ('history','verse','quote','mind')),
  item_id         INTEGER NOT NULL,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_type, item_id)
);

-- 7. Crisis Support Helplines Registry
CREATE TABLE IF NOT EXISTS library_helplines (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code    TEXT NOT NULL,          -- 'IN' | 'US' | 'CN' | 'JP' | 'AU'
  country_name    TEXT NOT NULL,
  org_name        TEXT NOT NULL,
  service_phone   TEXT NOT NULL,
  sms_text        TEXT,
  website_url     TEXT NOT NULL,
  hours_available TEXT NOT NULL DEFAULT '24/7',
  verified_date   TEXT NOT NULL,          -- e.g. '2026-11-02'
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 3. Backend REST API Contract

Mounted at base URL: `http://127.0.0.1:3001/api/library`

### 3.1 Historical News Endpoints

#### `GET /api/library/history/today`
Returns historical dispatches and events corresponding to the current month and day.
- **Query Params**: `month` (1-12, default current), `day` (1-31, default current).
- **Response 200**:
```json
{
  "date_formatted": "November 2",
  "total": 15,
  "events": [
    {
      "id": 101,
      "year": 1947,
      "headline": "Historical Dispatches from Kashmir Accords",
      "snippet": "Archival dispatches reported from the subcontinent...",
      "source_slug": "wikimedia",
      "original_url": "https://en.wikipedia.org/...",
      "license": "CC BY-SA 4.0",
      "attribution": "Wikimedia Foundation (CC BY-SA 4.0)",
      "bookmarked": false
    }
  ]
}
```

#### `GET /api/library/history/search`
Queries archival news by date, decade, country, or keyword.
- **Query Params**: `date` (`YYYY-MM-DD`), `year` (int), `decade` (e.g. `1940`), `country` (string), `q` (string), `limit` (default 30), `offset` (default 0).

---

### 3.2 Sacred Scriptures Endpoints

#### `GET /api/library/scriptures/books`
Lists registered holy books and their metadata.
- **Response 200**:
```json
{
  "books": [
    {
      "id": 1,
      "slug": "bhagavad_gita",
      "title_english": "The Bhagavad Gita",
      "title_original": "श्रीमद्भगवद्गीता",
      "tradition": "Hindu",
      "total_sections": 18,
      "section_unit": "Chapter",
      "default_translator": "Sir Edwin Arnold (1885)",
      "license": "Public Domain"
    }
  ]
}
```

#### `GET /api/library/scriptures/verses`
- **Query Params**: `book_slug` (required), `section` (int), `theme` (string), `q` (string), `limit` (default 20), `offset` (default 0).
- **Response 200**:
```json
{
  "book": { "slug": "bhagavad_gita", "title": "The Bhagavad Gita" },
  "section": 2,
  "total_verses": 72,
  "items": [
    {
      "id": 47,
      "verse_ref": "BG 2.47",
      "section_number": 2,
      "verse_number": 47,
      "text_original": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
      "transliteration": "karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi ||",
      "translation_english": "Thy right is to work only, but never to its fruits; let not the fruits of action be thy motive, nor let thy attachment be to inaction.",
      "translator": "Sir Edwin Arnold (1885)",
      "ai_meaning": "Focus wholeheartedly on your duty and actions without anxiety over results or outcomes beyond your control.",
      "ai_meaning_reviewed": 1,
      "source_url": "https://www.gutenberg.org/ebooks/2388",
      "license": "Public Domain",
      "bookmarked": true
    }
  ]
}
```

#### `GET /api/library/scriptures/verse-of-the-day`
Deterministic daily selection based on day-of-year hash across registered scriptures.

#### `POST /api/library/scriptures/meaning/:id`
Admin/human curation route to approve or edit the plain-language explanation of a verse.
- **Body**: `{ "ai_meaning": "string", "reviewed": true }`

---

### 3.3 Philosophical Quotes Endpoints

#### `GET /api/library/quotes`
- **Query Params**: `author` (string), `theme` (string), `tradition` (string), `q` (string), `limit` (default 30).
- **Response 200**:
```json
{
  "total": 45,
  "items": [
    {
      "id": 12,
      "quote_text": "You have power over your mind - not outside events. Realise this, and you will find strength.",
      "author": "Marcus Aurelius",
      "work_title": "Meditations",
      "year_published": 180,
      "tradition": "Stoicism",
      "source_url": "https://en.wikiquote.org/wiki/Marcus_Aurelius",
      "license": "Public Domain / CC BY-SA 4.0",
      "attribution": "Wikiquote (CC BY-SA 4.0)",
      "is_verified": 1,
      "ai_meaning": "Internal agency is always within our grasp, even when external circumstances fluctuate.",
      "bookmarked": false
    }
  ]
}
```

---

### 3.4 Mind Helps Endpoints

#### `GET /api/library/mind/cards`
- **Query Params**: `category` (optional enum), `max_time` (int), `q` (string).
- **Response 200**:
```json
{
  "total": 18,
  "items": [
    {
      "id": 3,
      "slug": "box-breathing-autonomic-regulation",
      "title": "Box Breathing (4-4-4-4 Cadence)",
      "category": "stress",
      "what_it_is": "A physiological breathing technique that regulates autonomic arousal by balancing oxygen and carbon dioxide levels.",
      "when_it_helps": "During acute stress spikes, sudden anxiety, or before demanding tasks.",
      "steps": [
        "Inhale slowly through the nose for 4 counts.",
        "Hold the breath gently for 4 counts.",
        "Exhale smoothly through the mouth for 4 counts.",
        "Pause and hold empty for 4 counts.",
        "Repeat for 4 full cycles."
      ],
      "time_needed_minutes": 3,
      "source_book": "OpenStax Psychology 2e",
      "source_chapter": "Chapter 14: Stress, Lifestyle, and Health",
      "source_url": "https://openstax.org/details/books/psychology-2e",
      "license": "CC BY 4.0",
      "attribution": "OpenStax Psychology 2e (CC BY 4.0)",
      "bookmarked": false
    }
  ]
}
```

#### `GET /api/library/mind/helplines`
Returns the verified crisis support directory for IN, US, CN, JP, and AU.

---

### 3.5 Bookmarks Endpoints

#### `GET /api/library/bookmarks`
Lists all user-saved bookmarks grouped by `item_type`.

#### `POST /api/library/bookmarks`
Body: `{ "item_type": "history" | "verse" | "quote" | "mind", "item_id": number, "note": string }`

#### `DELETE /api/library/bookmarks/:id`
Deletes an active bookmark.

---

## 4. Frontend State & Offline Plain Mode Guarantees

- **Store Architecture**: `useLibraryStore` maintains the active tab (`'history' | 'wisdom' | 'mind'`), active scripture book slug, active chapter/section, search keyword, category filter, and bookmark IDs.
- **Zero AI Plain Mode Guarantee**:
  - When the app is in Plain Mode (`plain_mode_enabled = 1`), the library operates with 100% functionality on stored data.
  - The "Generate Meaning" AI button is deactivated and displays `[Plain Mode: Stored meanings only]`.
  - Upstream archival fetching relies strictly on deterministic HTTP JSON APIs (Wikimedia / Chronicling America) with zero LLM mediation.


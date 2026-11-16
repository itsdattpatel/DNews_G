/**
 * backend/src/library/services/quoteService.ts
 * Curated public-domain and open-license philosophical quotes service.
 * Follows migration 014 schema: library_quotes.
 * Sources: Marcus Aurelius, Epictetus, Seneca, Swami Vivekananda, Confucius, Shankara, Tagore.
 * Rule G8: Verified public-domain texts with exact citation, author origin, and license attribution.
 */
import Database from 'better-sqlite3';

export interface WisdomQuote {
  id: number;
  quote_text: string;
  author: string;
  author_origin?: string | null;
  tradition?: string | null;
  source_work?: string | null;
  work_title?: string | null;
  source_url?: string | null;
  theme?: string | null;
  theme_tags?: string | null;
  meaning?: string | null;
  plain_meaning?: string | null;
  license: string;
  source_license?: string;
  attribution: string;
  commentary_source?: string | null;
  meaning_reviewed?: number;
  is_verified: boolean;
  is_bookmarked?: boolean;
}

export interface QuoteQueryParams {
  author?: string | undefined;
  theme?: string | undefined;
  tradition?: string | undefined;
  query?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class QuoteService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Retrieves quotes filtered by author, theme, tradition, or keyword.
   */
  getQuotes(params: QuoteQueryParams = {}): WisdomQuote[] {
    const conditions: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.author && params.author !== 'all') {
      conditions.push('q.author = ?');
      sqlParams.push(params.author);
    }

    if (params.tradition && params.tradition !== 'all') {
      conditions.push('q.tradition = ?');
      sqlParams.push(params.tradition);
    }

    if (params.theme && params.theme !== 'all') {
      conditions.push('LOWER(q.theme_tags) LIKE ?');
      sqlParams.push(`%${params.theme.toLowerCase().trim()}%`);
    }

    if (params.query && params.query.trim().length > 0) {
      conditions.push('(q.quote_text LIKE ? OR q.author LIKE ? OR q.work_title LIKE ? OR q.plain_meaning LIKE ?)');
      const term = `%${params.query.trim()}%`;
      sqlParams.push(term, term, term, term);
    }

    const limit = Math.min(params.limit ?? 50, 100);
    const offset = params.offset ?? 0;

    const rows = this.db
      .prepare(`
        SELECT q.*,
               CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_quotes q
        LEFT JOIN library_bookmarks bm 
          ON bm.item_type = 'quote' AND bm.item_id = q.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY q.id ASC
        LIMIT ? OFFSET ?
      `)
      .all(...sqlParams, limit, offset) as any[];

    return rows.map(this.formatQuote);
  }

  /**
   * Deterministic Quote of the Day calculated from date seed.
   */
  getQuoteOfTheDay(dateStr?: string): WisdomQuote {
    const date = dateStr ? new Date(dateStr) : new Date();
    const dayOfYear = Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(date.getFullYear(), 0, 0)) /
        24 /
        60 /
        60 /
        1000
    );

    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM library_quotes').get() as { count: number };
    const total = Math.max(countRow.count, 1);
    const targetOffset = dayOfYear % total;

    const row = this.db
      .prepare(`
        SELECT q.*,
               CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_quotes q
        LEFT JOIN library_bookmarks bm 
          ON bm.item_type = 'quote' AND bm.item_id = q.id
        ORDER BY q.id ASC
        LIMIT 1 OFFSET ?
      `)
      .get(targetOffset) as any;

    if (!row) {
      throw new Error('No quotes available in library registry.');
    }

    return this.formatQuote(row);
  }

  /**
   * Retrieves a random philosophical quote.
   */
  getRandomQuote(): WisdomQuote | null {
    const row = this.db
      .prepare(`
        SELECT q.*,
               CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_quotes q
        LEFT JOIN library_bookmarks bm 
          ON bm.item_type = 'quote' AND bm.item_id = q.id
        ORDER BY RANDOM() LIMIT 1
      `)
      .get() as any;

    return row ? this.formatQuote(row) : null;
  }

  private formatQuote(row: any): WisdomQuote {
    return {
      id: row.id,
      quote_text: row.quote_text,
      author: row.author,
      author_origin: row.country,
      tradition: row.tradition,
      source_work: row.work_title,
      work_title: row.work_title,
      source_url: row.source_url,
      theme: row.theme_tags,
      theme_tags: row.theme_tags,
      meaning: row.plain_meaning,
      plain_meaning: row.plain_meaning,
      license: row.source_license || 'Public Domain',
      source_license: row.source_license || 'Public Domain',
      attribution: row.attribution,
      commentary_source: row.commentary_source ?? null,
      meaning_reviewed: Number(row.meaning_reviewed ?? 0),
      is_verified: Boolean(row.is_verified),
      is_bookmarked: Boolean(row.is_bookmarked),
    };
  }

  private getQuoteColumns(): Set<string> {
    const cols = this.db.prepare('PRAGMA table_info(library_quotes)').all() as Array<{ name: string }>;
    return new Set(cols.map((c) => c.name));
  }

  getQuoteById(id: number): WisdomQuote | null {
    const row = this.db
      .prepare(`
        SELECT q.*,
               CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_quotes q
        LEFT JOIN library_bookmarks bm
          ON bm.item_type = 'quote' AND bm.item_id = q.id
        WHERE q.id = ?
      `)
      .get(id) as any;
    return row ? this.formatQuote(row) : null;
  }

  createQuote(input: {
    quote_text: string;
    author: string;
    work_title?: string | null | undefined;
    year_published?: number | null | undefined;
    tradition?: string | null | undefined;
    country?: string | null | undefined;
    source_url: string;
    source_license: string;
    attribution: string;
    is_verified?: number | boolean | undefined;
    plain_meaning?: string | null | undefined;
    meaning_reviewed?: number | boolean | undefined;
    commentary_source?: string | null | undefined;
    theme_tags?: string | null | undefined;
  }): WisdomQuote {
    const cols = this.getQuoteColumns();
    const sqlCols = [
      'quote_text',
      'author',
      'work_title',
      'year_published',
      'tradition',
      'country',
      'source_url',
      'source_license',
      'attribution',
      'is_verified',
      'plain_meaning',
      'theme_tags',
    ];
    const values: any[] = [
      input.quote_text,
      input.author,
      input.work_title ?? null,
      input.year_published ?? null,
      input.tradition ?? null,
      input.country ?? null,
      input.source_url,
      input.source_license || 'Public Domain',
      input.attribution,
      input.is_verified === undefined ? 1 : input.is_verified ? 1 : 0,
      input.plain_meaning ?? null,
      input.theme_tags ?? null,
    ];

    if (cols.has('meaning_reviewed')) {
      sqlCols.push('meaning_reviewed');
      values.push(input.meaning_reviewed ? 1 : 0);
    }
    if (cols.has('commentary_source')) {
      sqlCols.push('commentary_source');
      values.push(input.commentary_source ?? null);
    }

    const placeholders = sqlCols.map(() => '?').join(', ');
    const res = this.db
      .prepare(`INSERT INTO library_quotes (${sqlCols.join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    const created = this.getQuoteById(Number(res.lastInsertRowid));
    if (!created) throw new Error('Failed to load created quote');
    return created;
  }

  updateQuote(
    id: number,
    patch: Partial<{
      quote_text: string;
      work_title: string | null;
      plain_meaning: string | null;
      meaning_reviewed: number | boolean;
      commentary_source: string | null;
      source_url: string;
      source_license: string;
      attribution: string;
      is_verified: number | boolean;
      theme_tags: string | null;
    }>,
  ): WisdomQuote | null {
    const existing = this.getQuoteById(id);
    if (!existing) return null;

    const cols = this.getQuoteColumns();
    const setClauses: string[] = [];
    const params: any[] = [];

    const assign = (col: string, val: any) => {
      if (cols.has(col)) {
        setClauses.push(`${col} = ?`);
        params.push(val);
      }
    };

    if (patch.quote_text !== undefined) assign('quote_text', patch.quote_text);
    if (patch.work_title !== undefined) assign('work_title', patch.work_title);
    if (patch.plain_meaning !== undefined) assign('plain_meaning', patch.plain_meaning);
    if (patch.meaning_reviewed !== undefined) assign('meaning_reviewed', patch.meaning_reviewed ? 1 : 0);
    if (patch.commentary_source !== undefined) assign('commentary_source', patch.commentary_source);
    if (patch.source_url !== undefined) assign('source_url', patch.source_url);
    if (patch.source_license !== undefined) assign('source_license', patch.source_license);
    if (patch.attribution !== undefined) assign('attribution', patch.attribution);
    if (patch.is_verified !== undefined) assign('is_verified', patch.is_verified ? 1 : 0);
    if (patch.theme_tags !== undefined) assign('theme_tags', patch.theme_tags);

    if (setClauses.length === 0) return existing;

    params.push(id);
    this.db.prepare(`UPDATE library_quotes SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return this.getQuoteById(id);
  }

  /**
   * Idempotently seeds canonical public-domain quotes.
   */
  seedCanonicalQuotes(): void {
    const count = (this.db.prepare('SELECT COUNT(*) as count FROM library_quotes').get() as { count: number }).count;
    if (count > 0) return;

    const insert = this.db.prepare(`
      INSERT INTO library_quotes (
        quote_text, author, country, tradition, work_title, source_url, theme_tags, plain_meaning, source_license, attribution, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    // 1. Marcus Aurelius
    insert.run(
      'You have power over your mind — not outside events. Realize this, and you will find strength.',
      'Marcus Aurelius',
      'Roman Empire (121–180 CE)',
      'Stoic',
      'Meditations (Book IV)',
      'https://www.gutenberg.org/ebooks/2680',
      'strength, peace, self-mastery',
      'External circumstances, rumors, and global upheavals cannot invade your internal sanity unless you grant them assent. Your sovereign power resides exclusively in your own judgment.',
      'Public Domain',
      'Marcus Aurelius, Meditations (tr. George Long, 1862). Public Domain.'
    );

    // 2. Epictetus
    insert.run(
      'Men are disturbed not by things, but by the view which they take of them.',
      'Epictetus',
      'Hierapolis / Rome (50–135 CE)',
      'Stoic',
      'Enchiridion (Chapter V)',
      'https://www.gutenberg.org/ebooks/45109',
      'clarity, emotions, perception',
      'Suffering does not emanate from raw facts, but from the narrative we construct around them. Refining the lens of perception immediately transforms acute anxiety into measured clarity.',
      'Public Domain',
      'Epictetus, Enchiridion (tr. Elizabeth Carter, 1758). Public Domain.'
    );

    // 3. Seneca
    insert.run(
      'We suffer more often in imagination than in reality.',
      'Seneca',
      'Cordoba / Rome (4 BCE – 65 CE)',
      'Stoic',
      'Moral Letters to Lucilius (Letter XIII)',
      'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13',
      'anxiety, courage, reality',
      'Anticipatory dread continually magnifies sorrows that may never arrive. Anchoring consciousness firmly in present reality dissolves the phantoms of hypothetical catastrophe.',
      'Public Domain',
      'Seneca, Letters from a Stoic (tr. Aubrey Stewart, 1900). Public Domain.'
    );

    // 4. Swami Vivekananda
    insert.run(
      'Arise, awake, and stop not till the goal is reached.',
      'Swami Vivekananda',
      'Calcutta, India (1863–1902)',
      'Vedanta / Universal',
      'Complete Works of Swami Vivekananda (Vol. III)',
      'https://www.gutenberg.org/ebooks/41029',
      'courage, perseverance, duty',
      'Draw upon the dormant vitality within your spirit. Shake off lethargy, fatalism, and self-doubt, pursuing noble duty with single-pointed resolution.',
      'Public Domain',
      'Swami Vivekananda, Complete Works (1897). Public Domain worldwide.'
    );

    // 5. Confucius
    insert.run(
      'The superior man is modest in his speech, but exceeds in his actions.',
      'Confucius',
      'Lu State, China (551–479 BCE)',
      'Confucian',
      'The Analects (Book XIV, Chapter 29)',
      'https://www.gutenberg.org/ebooks/4078',
      'humility, action, integrity',
      'True gravitas avoids loud declarations or boastful rhetoric. Let deeds, consistency, and steadfast service demonstrate your worth rather than hollow eloquence.',
      'Public Domain',
      'Confucius, The Analects (tr. James Legge, 1893). Public Domain.'
    );

    // 6. Adi Shankara
    insert.run(
      'He who is free from the bondage of the body, and enjoys the bliss of the Self, he alone is liberated in this life.',
      'Adi Shankara',
      'Kalady, India (788–820 CE)',
      'Advaita Vedanta',
      'Crest-Jewel of Wisdom (Vivekachudamani)',
      'https://sacred-texts.com/hin/cjw/index.htm',
      'liberation, detachment, peace',
      'Liberation is not a distant post-mortem promise, but present enlightenment. When one discontinues identifying solely with temporary physical forms, perpetual inward freedom emerges.',
      'Public Domain',
      'Adi Shankara, Crest-Jewel of Wisdom (tr. Charles Johnston, 1925). Public Domain.'
    );

    // 7. Rabindranath Tagore
    insert.run(
      'Clouds come floating into my life, no longer to carry rain or usher storm, but to add color to my sunset sky.',
      'Rabindranath Tagore',
      'Bengal, India (1861–1941)',
      'Universalist',
      'Stray Birds (Verse 292)',
      'https://www.gutenberg.org/ebooks/6524',
      'acceptance, beauty, peace',
      'Sorrows and hardships, when met with mature equanimity, cease to function as devastating tempests. They become rich hues that illuminate life with poetic grace and depth.',
      'Public Domain',
      'Rabindranath Tagore, Stray Birds (1916). Public Domain.'
    );

    // 8. Laozi
    insert.run(
      'A journey of a thousand miles begins with a single step.',
      'Laozi',
      'Henan, China (6th Century BCE)',
      'Daoist',
      'Tao Te Ching (Chapter 64)',
      'https://www.gutenberg.org/ebooks/216',
      'action, perseverance, patience',
      'Every formidable endeavor, grand architectural edifice, or life-long discipline is forged through humble, unhurried incremental actions taken today.',
      'Public Domain',
      'Laozi, Tao Te Ching (tr. James Legge, 1891). Public Domain.'
    );
  }
}

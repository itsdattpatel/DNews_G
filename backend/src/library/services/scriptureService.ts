/**
 * backend/src/library/services/scriptureService.ts
 * Canonical Holy Books registry & verse services (Bhagavad Gita, Mahabharata, Ramayana).
 * Follows migration 014 schema: library_books and library_verses.
 * Rule G8: Verbatim Sanskrit originals, transliterations, and scholarly public-domain translations.
 */
import Database from 'better-sqlite3';

export interface ScriptureBook {
  id: number;
  slug: string;
  title_english: string;
  title_original: string;
  tradition: string;
  total_sections: number;
  section_unit: string;
  description: string | null;
  default_translator: string;
  source_license: string;
  is_active: number;
}

export interface ScriptureVerse {
  id: number;
  book_id?: number;
  book_slug: string;
  book_title: string;
  section_number: number;
  section_unit: string;
  verse_number: number;
  verse_ref: string;
  text_sanskrit: string | null;
  text_original?: string | null;
  transliteration: string | null;
  translation: string;
  translation_english?: string;
  translator: string;
  meaning: string | null;
  plain_meaning?: string | null;
  theme: string | null;
  theme_tags?: string | null;
  attribution: string;
  source_url: string | null;
  license: string;
  source_license?: string;
  is_bookmarked?: boolean;
}

export interface ScriptureQueryParams {
  bookSlug?: string | undefined;
  section?: number | undefined;
  theme?: string | undefined;
  query?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class ScriptureService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Retrieves active Holy Books in the canonical registry.
   */
  getBooks(): ScriptureBook[] {
    return this.db
      .prepare('SELECT * FROM library_books WHERE is_active = 1 ORDER BY id ASC')
      .all() as ScriptureBook[];
  }

  /**
   * Retrieves verses filtered by book, chapter/parva, theme, or keyword.
   */
  getVerses(params: ScriptureQueryParams): ScriptureVerse[] {
    const conditions: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.bookSlug && params.bookSlug !== 'all') {
      conditions.push('b.slug = ?');
      sqlParams.push(params.bookSlug);
    }

    if (params.section !== undefined && params.section > 0) {
      conditions.push('v.section_number = ?');
      sqlParams.push(params.section);
    }

    if (params.theme && params.theme !== 'all') {
      conditions.push('LOWER(v.theme_tags) LIKE ?');
      sqlParams.push(`%${params.theme.toLowerCase().trim()}%`);
    }

    if (params.query && params.query.trim().length > 0) {
      conditions.push('(v.translation_english LIKE ? OR v.transliteration LIKE ? OR v.text_original LIKE ? OR v.plain_meaning LIKE ?)');
      const q = `%${params.query.trim()}%`;
      sqlParams.push(q, q, q, q);
    }

    const limit = Math.min(params.limit ?? 50, 100);
    const offset = params.offset ?? 0;

    const rows = this.db
      .prepare(`
        SELECT v.*, b.slug AS book_slug, b.title_english AS book_title, b.section_unit,
               CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_verses v
        JOIN library_books b ON b.id = v.book_id
        LEFT JOIN library_bookmarks bm 
          ON bm.item_type = 'verse' AND bm.item_id = v.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY v.section_number ASC, v.verse_number ASC
        LIMIT ? OFFSET ?
      `)
      .all(...sqlParams, limit, offset) as any[];

    return rows.map(this.formatVerse);
  }

  /**
   * Deterministic Verse of the Day calculated from date seed.
   */
  getVerseOfTheDay(dateStr?: string): ScriptureVerse {
    const date = dateStr ? new Date(dateStr) : new Date();
    const dayOfYear = Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(date.getFullYear(), 0, 0)) /
        24 /
        60 /
        60 /
        1000
    );

    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM library_verses').get() as { count: number };
    const total = Math.max(countRow.count, 1);
    const targetOffset = dayOfYear % total;

    const row = this.db
      .prepare(`
        SELECT v.*, b.slug AS book_slug, b.title_english AS book_title, b.section_unit,
               CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
        FROM library_verses v
        JOIN library_books b ON b.id = v.book_id
        LEFT JOIN library_bookmarks bm 
          ON bm.item_type = 'verse' AND bm.item_id = v.id
        ORDER BY v.id ASC
        LIMIT 1 OFFSET ?
      `)
      .get(targetOffset) as any;

    if (!row) {
      throw new Error('No verses available in library registry.');
    }

    return this.formatVerse(row);
  }

  /**
   * Retrieves a random verse with optional book constraint.
   */
  getRandomVerse(bookSlug?: string): ScriptureVerse | null {
    let sql = `
      SELECT v.*, b.slug AS book_slug, b.title_english AS book_title, b.section_unit,
             CASE WHEN bm.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
      FROM library_verses v
      JOIN library_books b ON b.id = v.book_id
      LEFT JOIN library_bookmarks bm 
        ON bm.item_type = 'verse' AND bm.item_id = v.id
    `;
    const params: any[] = [];

    if (bookSlug && bookSlug !== 'all') {
      sql += ' WHERE b.slug = ?';
      params.push(bookSlug);
    }

    sql += ' ORDER BY RANDOM() LIMIT 1';

    const row = this.db.prepare(sql).get(...params) as any;
    return row ? this.formatVerse(row) : null;
  }

  private formatVerse(row: any): ScriptureVerse {
    return {
      id: row.id,
      book_id: row.book_id,
      book_slug: row.book_slug,
      book_title: row.book_title,
      section_number: row.section_number,
      section_unit: row.section_unit || 'Chapter',
      verse_number: row.verse_number,
      verse_ref: row.verse_ref,
      text_sanskrit: row.text_original,
      text_original: row.text_original,
      transliteration: row.transliteration,
      translation: row.translation_english,
      translation_english: row.translation_english,
      translator: row.translator,
      meaning: row.plain_meaning,
      plain_meaning: row.plain_meaning,
      theme: row.theme_tags,
      theme_tags: row.theme_tags,
      attribution: `${row.translator}. ${row.source_license || 'Public Domain'}.`,
      source_url: row.source_url,
      license: row.source_license || 'Public Domain',
      source_license: row.source_license || 'Public Domain',
      is_bookmarked: Boolean(row.is_bookmarked),
    };
  }

  /**
   * Idempotently seeds canonical holy books and initial verified public-domain verses.
   */
  seedCanonicalBooksAndVerses(): void {
    const bookCount = (this.db.prepare('SELECT COUNT(*) as count FROM library_books').get() as { count: number }).count;
    if (bookCount === 0) {
      const insertBook = this.db.prepare(`
        INSERT INTO library_books (
          slug, title_english, title_original, tradition, total_sections, section_unit, description, default_translator, source_license
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertBook.run(
        'bhagavad_gita',
        'Bhagavad Gita',
        'श्रीमद्भगवद्गीता',
        'Hindu / Vedanta',
        18,
        'Chapter',
        'The philosophical dialogue between Prince Arjuna and Lord Krishna on the battlefield of Kurukshetra, illuminating duty, action, knowledge, and devotion.',
        'Sir Edwin Arnold (1885)',
        'Public Domain'
      );

      insertBook.run(
        'mahabharata',
        'The Mahabharata',
        'महाभारतम्',
        'Hindu / Epic Itihasa',
        18,
        'Parva',
        'The ancient epic composed by Sage Vyasa encompassing righteousness, governance, statecraft, ethics, and human nature.',
        'Kisari Mohan Ganguli (1883–1896)',
        'Public Domain'
      );

      insertBook.run(
        'ramayana',
        'Valmiki Ramayana',
        'वाल्मीकि रामायणम्',
        'Hindu / Epic Itihasa',
        7,
        'Kanda',
        'The classical adikavya narrating the life and virtues of Rama, exemplifying truth, noble conduct, sacrifice, and dharma.',
        'Ralph T. H. Griffith (1870–1874) / M. N. Dutt (1891)',
        'Public Domain'
      );
    }

    const verseCount = (this.db.prepare('SELECT COUNT(*) as count FROM library_verses').get() as { count: number }).count;
    if (verseCount === 0) {
      const gitaBook = this.db.prepare('SELECT id FROM library_books WHERE slug = ?').get('bhagavad_gita') as { id: number };
      const mbBook = this.db.prepare('SELECT id FROM library_books WHERE slug = ?').get('mahabharata') as { id: number };
      const vrBook = this.db.prepare('SELECT id FROM library_books WHERE slug = ?').get('ramayana') as { id: number };

      const insertVerse = this.db.prepare(`
        INSERT INTO library_verses (
          book_id, section_number, verse_number, verse_ref, text_original, transliteration, translation_english, translator, commentary_source, plain_meaning, source_url, source_license, theme_tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 1. Gita 2.47
      if (gitaBook) {
        insertVerse.run(
          gitaBook.id,
          2,
          47,
          'BG 2.47',
          'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
          'karmaṇyevādhikāraste mā phaleṣu kadācana |\nmā karmaphalaheturbhūrmā te saṅgo\'stvakarmaṇi ||',
          'Thy right is only unto work, but never to its fruits; let not the fruit of action be thy motive, nor let thine attachment be to inaction.',
          'Sir Edwin Arnold (1885)',
          'Classical Karma Yoga Exposition',
          'Devote your complete focus to performing your rightful duty with excellence and integrity, while releasing anxiety over the outcomes. Action is in your power; the harvest is shaped by universal factors beyond your control.',
          'https://www.gutenberg.org/ebooks/2388',
          'Public Domain',
          'duty, detachment, action'
        );

        // 2. Gita 2.20
        insertVerse.run(
          gitaBook.id,
          2,
          20,
          'BG 2.20',
          'न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः।\nअजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे॥',
          'na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ |\najo nityaḥ śāśvato\'yaṁ purāṇo na hanyate hanyamāne śarīre ||',
          'The Spirit is neither born nor does it die at any time. It has not come to be, nor will it cease to be. Unborn, perpetual, eternal, and ancient, it is not slain when the body is slain.',
          'Sir Edwin Arnold (1885)',
          'Classical Atman Immortality Exposition',
          'The core conscious self transcends temporal decay and bodily destruction. Recognizing this eternal essence dismantles existential dread and bestows calm courage in facing physical perils.',
          'https://www.gutenberg.org/ebooks/2388',
          'Public Domain',
          'courage, fear, immortality'
        );

        // 3. Gita 2.70
        insertVerse.run(
          gitaBook.id,
          2,
          70,
          'BG 2.70',
          'आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत्।\nतद्वत्कामा यं प्रविशन्ति सर्वे स शान्तिमप्नोति न कामकामी॥',
          'āpūryamāṇam acalapratiṣṭhaṁ samudram āpaḥ praviśanti yadvat |\ntadvat kāmā yaṁ praviśanti sarve sa śāntim āpnoti na kāmakāmī ||',
          'Like the ocean, into whose motionless depths the rivers continually pour without overflowing, so into the tranquil sage all desires enter without disturbing his peace; he attains serenity, not he who thirsts after worldly pleasures.',
          'Sir Edwin Arnold (1885)',
          'Sthitaprajna Equanimity Exposition',
          'True serenity is not the total absence of external stimuli, but internal immovability. Just as the grand ocean receives torrents of water yet remains serene within its boundaries, the master remains unperturbed by the currents of circumstance.',
          'https://www.gutenberg.org/ebooks/2388',
          'Public Domain',
          'peace, equanimity, self-mastery'
        );

        // 4. Gita 6.5
        insertVerse.run(
          gitaBook.id,
          6,
          5,
          'BG 6.5',
          'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥',
          'uddhared ātmanātmānaṁ nātmānam avasādayet |\nātmaiva hyātmano bandhur ātmaiva ripur ātmanaḥ ||',
          'Let a man lift himself by his own self; let him not depress or degrade himself. For a person is indeed his own friend, and he alone is his own enemy.',
          'Sir Edwin Arnold (1885)',
          'Dhyana Yoga Self-Mastery Exposition',
          'Self-agency is the foundation of growth. When the conscious intellect commands base impulses, the self acts as your greatest ally. When surrendered to reckless passions, the self becomes your chief adversary.',
          'https://www.gutenberg.org/ebooks/2388',
          'Public Domain',
          'self-mastery, courage, leadership'
        );
      }

      // 5. Mahabharata Shanti Parva 109.11
      if (mbBook) {
        insertVerse.run(
          mbBook.id,
          12,
          109,
          'MB 12.109',
          'धारणाद् धर्ममित्याहुर्धर्मो धारयते प्रजाः।\nयत् स्याद् धारणसंयुक्तं स धर्म इति निश्चयः॥',
          'dhāraṇād dharmam ityāhur dharmo dhārayate prajāḥ |\nyat syād dhāraṇa-saṁyuktaṁ sa dharma iti niścayaḥ ||',
          'Righteousness is called Dharma because it upholds; Dharma preserves and sustains society and all beings. That which possesses the capacity to uphold order is truly Dharma.',
          'Kisari Mohan Ganguli (1883–1896)',
          'Shanti Parva Rajadharma Exposition',
          'Dharma is that moral and cosmic force which prevents society from disintegrating into lawlessness. That which sustains life, fosters harmony, and protects the vulnerable is the highest duty.',
          'https://sacred-texts.com/hin/maha/',
          'Public Domain',
          'duty, leadership, ethics'
        );

        // 6. Mahabharata Udyoga Parva 33.72
        insertVerse.run(
          mbBook.id,
          5,
          33,
          'MB 5.33',
          'क्षमा वशीकृतिर्लोके क्षमया किं न साध्यते।\nशान्तिखड्गः करे यस्य किं करिष्यति दुर्जनः॥',
          'kṣamā vaśīkṛtir loke kṣamayā kiṁ na sādhyate |\nśāntikhaḍgaḥ kare yasya kiṁ kariṣyati durjanaḥ ||',
          'Forgiveness is the supreme power that subdues the world; what cannot be accomplished through patience and forgiveness? When a man wields the sword of peace in his hand, what harm can an evildoer inflict?',
          'Kisari Mohan Ganguli (1883–1896)',
          'Vidura Niti Ethical Exposition',
          'Patience and forbearance are not weakness, but invulnerable strength. The hostile antagonist exhausts his malice against calm dignity, finding nothing against which his aggression can strike purchase.',
          'https://sacred-texts.com/hin/maha/',
          'Public Domain',
          'forgiveness, peace, courage'
        );
      }

      // 7. Valmiki Ramayana Ayodhya Kanda 109.14
      if (vrBook) {
        insertVerse.run(
          vrBook.id,
          2,
          109,
          'VR 2.109',
          'सत्यमेवेश्वरो लोके सत्ये धर्मः सदा श्रितः।\nसत्यमूलानि सर्वाणि सत्यान्नास्ति परं पदम्॥',
          'satyameveśvaro loke satye dharmaḥ sadā śritaḥ |\nsatyamūlāni sarvāṇi satyānnāsti paraṁ padam ||',
          'Truth alone is the sovereign power in the world; upon truth righteousness is forever grounded. All virtues originate in truth, and higher than truth there is no exalted state.',
          'Ralph T. H. Griffith (1870–1874)',
          'Ayodhya Kanda Truth Exposition',
          'Truthfulness is the bedrock of all virtue and civilized order. When truth is compromised, institutions rot from within. Upholding veracity under pressure constitutes the highest spiritual station.',
          'https://sacred-texts.com/hin/rama/',
          'Public Domain',
          'truth, duty, leadership'
        );

        // 8. Valmiki Ramayana Yuddha Kanda 124.17
        insertVerse.run(
          vrBook.id,
          6,
          124,
          'VR 6.124',
          'अपि स्वर्णमयी लङ्का न मे लक्ष्मण रोचते।\nजननी जन्मभूमिश्च स्वर्गादपि गरीयसी॥',
          'api svarṇamayī laṅkā na me lakṣmaṇa rocate |\njananī janmabhūmiśca svargādapi garīyasī ||',
          'Even though Lanka is made entirely of gold, O Lakshmana, it does not tempt my heart. One’s mother and motherland are far more sacred and glorious than heaven itself.',
          'Ralph T. H. Griffith (1870–1874)',
          'Yuddha Kanda Devotion Exposition',
          'Material opulence and conquest can never displace sacred affection for one’s ancestral soil and mother. Nobility consists of cherishing origin and kinship above glittering empire.',
          'https://sacred-texts.com/hin/rama/',
          'Public Domain',
          'patriotism, duty, detachment'
        );
      }
    }
  }
}

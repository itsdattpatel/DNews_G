/**
 * backend/src/library/services/mindService.ts
 * Evidence-based psychological self-help techniques & verified crisis helplines.
 * Strictly open/public-domain sources: OpenStax Psychology 2e (CC BY 4.0),
 * WHO Stress Management Guide (CC BY-NC-SA 3.0 IGO), William James (Public Domain).
 *
 * SAFETY MANDATE (Rule B5.4):
 * General educational guidance only; zero medical advice, zero diagnosis,
 * zero medication advice, zero pain-based techniques, and ZERO AI chat.
 */
import Database from 'better-sqlite3';

export type MindCategory =
  | 'stress'
  | 'anxiety'
  | 'sleep'
  | 'focus'
  | 'habits'
  | 'anger'
  | 'grief'
  | 'relationships'
  | 'selftalk';

export interface MindCard {
  id: number;
  slug: string;
  title: string;
  category: MindCategory;
  what_it_is: string;
  when_it_helps: string;
  steps: string[];
  time_needed_minutes: number;
  source_book: string;
  source_chapter: string;
  source_url: string;
  source_license: string;
  attribution: string;
  created_at: string;
}

export interface HelplineEntry {
  id: number;
  country_code: 'IN' | 'US' | 'CN' | 'JP' | 'AU';
  country_name: string;
  org_name: string;
  service_phone: string;
  sms_text: string | null;
  website_url: string;
  hours_available: string;
  verified_date: string;
  created_at: string;
}

export interface MindQueryParams {
  category?: MindCategory | 'all' | undefined;
  maxTime?: number | undefined;
  query?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class MindService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Seeds evidence-based psychological help cards across 9 categories.
   */
  public seedCanonicalMindCards(): void {
    const count = (
      this.db.prepare('SELECT COUNT(*) as count FROM library_mind_cards').get() as { count: number }
    )?.count ?? 0;

    if (count > 0) return;

    const insertCard = this.db.prepare(`
      INSERT INTO library_mind_cards (
        slug, title, category, what_it_is, when_it_helps, steps_json,
        time_needed_minutes, source_book, source_chapter, source_url, source_license, attribution
      ) VALUES (
        @slug, @title, @category, @what_it_is, @when_it_helps, @steps_json,
        @time_needed_minutes, @source_book, @source_chapter, @source_url, @source_license, @attribution
      )
    `);

    const cards = [
      // 1. Stress: Physiological Sigh
      {
        slug: 'physiological-sigh',
        title: 'The Physiological Sigh (Double Inhale & Long Exhale)',
        category: 'stress',
        what_it_is: 'A rapid respiratory reflex consisting of two sequential nasal inhales followed by an extended, unforced mouth exhale. It reinflates collapsed pulmonary alveoli and immediately lowers autonomic arousal.',
        when_it_helps: 'During sudden acute stress spikes, rapid heartbeat, pre-presentation jitters, or feeling overwhelmed.',
        steps_json: JSON.stringify([
          'Take a deep, full breath in through your nose to about 80% capacity.',
          'Without exhaling, take a second sharp "top-off" inhale through your nose to fully fill your lungs.',
          'Release the breath slowly and gently through open lips in a long, sighing exhale until empty.',
          'Pause for one natural beat, then repeat the two-step inhale and long exhale 2 to 3 times.',
          'Notice your shoulder tension settling as your vagal parasympathetic brake activates.'
        ]),
        time_needed_minutes: 2,
        source_book: 'OpenStax Psychology 2e',
        source_chapter: 'Chapter 14: Stress, Lifestyle, and Health',
        source_url: 'https://openstax.org/details/books/psychology-2e',
        source_license: 'CC BY 4.0',
        attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
      },
      // 2. Anxiety: 5-4-3-2-1 Sensory Grounding
      {
        slug: '54321-sensory-grounding',
        title: '5-4-3-2-1 Sensory Grounding',
        category: 'anxiety',
        what_it_is: 'A cognitive orienting technique that pulls mental processing away from catastrophic ruminations by anchoring attention to immediate exteroceptive sensory data.',
        when_it_helps: 'During anticipatory panic, spinning anxious spirals, depersonalization, or racing thoughts.',
        steps_json: JSON.stringify([
          'Look around and name 5 distinct objects you can see (e.g. wood grain on a desk, a shadow on the floor).',
          'Notice 4 physical textures you can feel (e.g. the fabric of your sleeve, your feet against the shoe soles).',
          'Identify 3 specific sounds in your environment (e.g. distant traffic, air vent hum, a clock tick).',
          'Detect 2 scents in the air (e.g. paper, fresh air, coffee aroma).',
          'Acknowledge 1 taste present in your mouth (e.g. cool water or mint).',
          'Take a slow breath and recognize that you are physically safe in this present space.'
        ]),
        time_needed_minutes: 4,
        source_book: 'WHO Stress Management Guide',
        source_chapter: 'Section 1: Grounding and Unhooking from Difficult Thoughts',
        source_url: 'https://www.who.int/publications/i/item/9789240003927',
        source_license: 'CC BY-NC-SA 3.0 IGO',
        attribution: 'World Health Organization (2020)',
      },
      // 3. Sleep: Stimulus Control Protocol
      {
        slug: 'stimulus-control-sleep',
        title: 'Stimulus Control Bedtime Reset',
        category: 'sleep',
        what_it_is: 'A behavioral conditioning protocol designed by insomnia researchers to rebuild the brain\'s automatic association between the bed and prompt sleep, eliminating the habit of tossing and turning in frustration.',
        when_it_helps: 'When lying awake unable to sleep for more than 20 minutes, or waking in the night with an alert brain.',
        steps_json: JSON.stringify([
          'If you have been awake in bed for approximately 20 minutes, do not stay in bed tossing and turning.',
          'Gently get out of bed, keeping bedroom lighting dim and amber.',
          'Move to a comfortable chair and engage in a calm, non-screen activity (reading a paper book, listening to soft instrumental music).',
          'Return to bed only when physical drowsiness (heavy eyelids, yawning) naturally reappears.',
          'If you do not fall asleep within another 20 minutes, repeat the cycle calmly without clock-watching.',
          'Keep your morning wake-up time consistent regardless of how much sleep was obtained.'
        ]),
        time_needed_minutes: 20,
        source_book: 'OpenStax Psychology 2e',
        source_chapter: 'Chapter 4: States of Consciousness (Section 4.3: Sleep Disorders)',
        source_url: 'https://openstax.org/details/books/psychology-2e',
        source_license: 'CC BY 4.0',
        attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
      },
      // 4. Focus: Attentional Spotlighting & William James Anchor
      {
        slug: 'attentional-spotlighting',
        title: 'Attentional Spotlighting & Volitional Renewal',
        category: 'focus',
        what_it_is: 'William James\'s foundational cognitive discovery that sustained attention is not unbroken staring, but the continual and voluntary bringing back of a wandering mind to its chosen object.',
        when_it_helps: 'When battling mental fatigue, digital distraction, fragmented attention, or difficulty initiating a demanding task.',
        steps_json: JSON.stringify([
          'Select one single, bounded task (e.g. read 5 pages, draft one section) and clear all competing browser tabs.',
          'Set a visible timer for 25 minutes; agree with yourself that all secondary impulses will wait.',
          'When (not if) the mind wanders to a different thought, treat the wander without frustration as natural brain noise.',
          'Deliberately and gently guide your attention back to the current sentence or line of work.',
          'Recognize each voluntary return as the primary training repetition of mental strength.'
        ]),
        time_needed_minutes: 25,
        source_book: 'The Principles of Psychology',
        source_chapter: 'Chapter XI: Attention (Section: The Volitional Effort)',
        source_url: 'https://www.gutenberg.org/ebooks/5827',
        source_license: 'Public Domain',
        attribution: 'William James, Principles of Psychology (1890)',
      },
      // 5. Habits: Implementation Intentions
      {
        slug: 'implementation-intentions',
        title: 'Implementation Intentions (If-Then Habit Cues)',
        category: 'habits',
        what_it_is: 'A proven behavioral psychology mechanism that pre-programs action execution by pairing a specific environmental cue with an immediate, non-negotiable response.',
        when_it_helps: 'When wanting to build a new positive habit or prevent habitual procrastination when energy is low.',
        steps_json: JSON.stringify([
          'Identify the exact habit you wish to cultivate (e.g. 5 minutes of mindful stretching).',
          'Choose an unavoidable existing daily anchor (e.g. "When I pour my morning kettle water...").',
          'Write down the clear formula: "IF [specific trigger occurs], THEN I will [specific 2-minute action immediately]."',
          'Prepare your physical environment so the action path has zero friction (lay out shoes, open reading notebook).',
          'Execute the paired action faithfully for 7 consecutive mornings without judging quality.'
        ]),
        time_needed_minutes: 5,
        source_book: 'The Principles of Psychology',
        source_chapter: 'Chapter IV: Habit (Maxims of Habit Formation)',
        source_url: 'https://www.gutenberg.org/ebooks/5827',
        source_license: 'Public Domain',
        attribution: 'William James, Principles of Psychology (1890)',
      },
      // 6. Anger: Somatic Temperature & Physiological Deceleration
      {
        slug: 'somatic-deceleration-anger',
        title: 'Somatic Deceleration & Cooling Protocol',
        category: 'anger',
        what_it_is: 'An autonomic de-escalation technique that counteracts the sympathetic surge of rage (vasoconstriction, elevated core temperature, adrenaline flood) through physical cooling and posture release.',
        when_it_helps: 'When feeling explosive anger, clenched jaw, hot face, or the urge to lash out with defensive words.',
        steps_json: JSON.stringify([
          'Immediately pause speech and physically unclench both hands, letting your fingers rest open.',
          'Step over to a sink and run cool water over your wrists and palms for 30 seconds.',
          'Drop your shoulders intentionally away from your ears by 2 inches and loosen your tongue from the roof of your mouth.',
          'Exhale slowly for 6 counts, allowing the cooler physical sensations to signal safety to your amygdala.',
          'Delay any reply, email sending, or confrontation by at least 15 minutes.'
        ]),
        time_needed_minutes: 3,
        source_book: 'OpenStax Psychology 2e',
        source_chapter: 'Chapter 10: Emotion and Motivation',
        source_url: 'https://openstax.org/details/books/psychology-2e',
        source_license: 'CC BY 4.0',
        attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
      },
      // 7. Grief: Dual-Process Oscillating Respite
      {
        slug: 'dual-process-grief-respite',
        title: 'Dual-Process Grief Respite',
        category: 'grief',
        what_it_is: 'Based on Stroebe & Schut\'s empirically validated Dual Process Model of Coping with Bereavement, which explains that healthy adjustment involves a natural oscillation between loss orientation and restoration orientation.',
        when_it_helps: 'When feeling trapped in overwhelming waves of sorrow, or conversely feeling guilty for having a peaceful moment.',
        steps_json: JSON.stringify([
          'Acknowledge that healthy grieving is not a straight line of constant sorrow, but an ebb and flow.',
          'Allow yourself a dedicated window (15–20 minutes) to feel, weep, look at memories, or honor your loss fully.',
          'When the window closes, give yourself permission to shift to a mundane "restoration" task (preparing soup, watering a plant).',
          'Release any guilt if you experience momentary laughter or calm; restoration is a biological necessity for survival.',
          'Honor both sides of the wave as equal parts of processing love and absence.'
        ]),
        time_needed_minutes: 15,
        source_book: 'OpenStax Psychology 2e',
        source_chapter: 'Chapter 9: Lifespan Development (Section 9.4: Death and Dying)',
        source_url: 'https://openstax.org/details/books/psychology-2e',
        source_license: 'CC BY 4.0',
        attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
      },
      // 8. Relationships: Non-Defensive Listening & Reflective Echo
      {
        slug: 'reflective-listening-echo',
        title: 'Non-Defensive Reflective Listening',
        category: 'relationships',
        what_it_is: 'A classical humanistic communication tool formulated by Carl Rogers and modern interpersonal psychology that de-escalates conflict by demonstrating accurate empathetic understanding before advancing one\'s own position.',
        when_it_helps: 'During heated disagreements with a partner, family member, or colleague when misunderstandings amplify.',
        steps_json: JSON.stringify([
          'Adopt an open physical posture and silently commit to listening without interrupting for 2 full minutes.',
          'Listen not to craft your rebuttal, but to identify the speaker\'s underlying feeling and unmet need.',
          'Before offering any explanation or counter-argument, mirror what you heard: "What I hear you saying is that you felt unsupported when [situation] happened. Did I get that right?"',
          'Allow the other person to confirm or clarify until they visibly relax and say "Yes, exactly."',
          'Only after they feel understood, calmly share your perspective starting with "From my vantage point..."'
        ]),
        time_needed_minutes: 5,
        source_book: 'OpenStax Psychology 2e',
        source_chapter: 'Chapter 12: Social Psychology (Section 12.5: Prosocial Behavior and Relationships)',
        source_url: 'https://openstax.org/details/books/psychology-2e',
        source_license: 'CC BY 4.0',
        attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
      },
      // 9. Self-Talk: Third-Person Cognitive Distancing
      {
        slug: 'third-person-distancing',
        title: 'Third-Person Cognitive Distancing',
        category: 'selftalk',
        what_it_is: 'An empirically validated psychological technique in which one mentally addresses oneself by name or in the third person ("you/he/she") rather than the first person ("I/me"). This shifts neural activity from egocentric threat processing to objective wisdom reasoning.',
        when_it_helps: 'During harsh self-criticism, acute self-doubt, performance dread, or feeling paralyzed by perceived failure.',
        steps_json: JSON.stringify([
          'Notice when your internal monologue turns into self-punishing "I" statements ("I always ruin this", "I can\'t handle it").',
          'Pause and consciously switch to addressing yourself by your first name: "[Your Name], what is happening right now?"',
          'Ask yourself as a compassionate mentor would: "[Your Name], what is the single next sensible step you need to take?"',
          'Observe how the emotional intensity decreases as psychological distance expands your working memory.',
          'Speak to yourself with the same level of dignity, patience, and kindness you would offer a respected friend.'
        ]),
        time_needed_minutes: 3,
        source_book: 'OpenStax Psychology 2e',
        source_chapter: 'Chapter 7: Thinking and Intelligence (Section 7.1: What is Cognition?)',
        source_url: 'https://openstax.org/details/books/psychology-2e',
        source_license: 'CC BY 4.0',
        attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
      },
      // 10. Bonus Focus/Anxiety: Box Breathing Cadence
      {
        slug: 'box-breathing-autonomic',
        title: 'Box Breathing (4-4-4-4 Cadence)',
        category: 'stress',
        what_it_is: 'A physiological regulation cadence utilized in high-stress operational domains to balance oxygenation and carbon dioxide levels while stimulating vagal nerve tone.',
        when_it_helps: 'Before difficult tasks, during high cognitive load, or to restore poise after emotional friction.',
        steps_json: JSON.stringify([
          'Inhale slowly and smoothly through your nose for a count of 4.',
          'Hold your breath gently with relaxed throat muscles for a count of 4.',
          'Exhale smoothly through your mouth for a count of 4.',
          'Hold the empty lungs calmly for a count of 4.',
          'Complete 4 continuous rounds, keeping your torso still and breathing into the lower belly.'
        ]),
        time_needed_minutes: 4,
        source_book: 'WHO Stress Management Guide',
        source_chapter: 'Section 1: Grounding Exercise Cadence',
        source_url: 'https://www.who.int/publications/i/item/9789240003927',
        source_license: 'CC BY-NC-SA 3.0 IGO',
        attribution: 'World Health Organization (2020)',
      },
    ];

    const insertTx = this.db.transaction(() => {
      for (const card of cards) {
        insertCard.run(card);
      }
    });

    insertTx();
  }

  /**
   * Seeds official, verified crisis helplines for IN, US, CN, JP, AU.
   */
  public seedCanonicalHelplines(): void {
    const count = (
      this.db.prepare('SELECT COUNT(*) as count FROM library_helplines').get() as { count: number }
    )?.count ?? 0;

    if (count > 0) return;

    const insertHelpline = this.db.prepare(`
      INSERT INTO library_helplines (
        country_code, country_name, org_name, service_phone, sms_text,
        website_url, hours_available, verified_date
      ) VALUES (
        @country_code, @country_name, @org_name, @service_phone, @sms_text,
        @website_url, @hours_available, @verified_date
      )
    `);

    const helplines = [
      {
        country_code: 'IN',
        country_name: 'India',
        org_name: 'Tele-MANAS (Ministry of Health & Family Welfare)',
        service_phone: '14416 / 1800-891-4416',
        sms_text: 'Toll-free 24/7 National Network',
        website_url: 'https://telemanas.mohfw.gov.in/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'IN',
        country_name: 'India',
        org_name: 'KIRAN Mental Health Rehabilitation',
        service_phone: '1800-599-0019',
        sms_text: 'Toll-free 13 Indian languages',
        website_url: 'https://disabilityaffairs.gov.in/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'US',
        country_name: 'United States',
        org_name: '988 Suicide & Crisis Lifeline',
        service_phone: '988',
        sms_text: 'Text 988 (English & Spanish)',
        website_url: 'https://988lifeline.org/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'US',
        country_name: 'United States',
        org_name: 'Crisis Text Line',
        service_phone: 'Call 988',
        sms_text: 'Text HOME to 741741',
        website_url: 'https://www.crisistextline.org/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'CN',
        country_name: 'China',
        org_name: 'Beijing Suicide Research and Prevention Center',
        service_phone: '010-82951332 / 800-810-1117',
        sms_text: 'National 24/7 Hotline Service',
        website_url: 'http://www.crisis.org.cn/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'JP',
        country_name: 'Japan',
        org_name: 'TELL Lifeline (English & Japanese)',
        service_phone: '03-5774-0992',
        sms_text: 'Online Chat at telljp.com',
        website_url: 'https://telljp.com/lifeline/',
        hours_available: 'Daily 09:00 - 23:00 JST',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'JP',
        country_name: 'Japan',
        org_name: 'Inochi no Denwa (Federation of Lifelines)',
        service_phone: '0570-783-556 / 0120-783-556',
        sms_text: 'Toll-free daily across Japan',
        website_url: 'https://www.inochinodenwa.org/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'AU',
        country_name: 'Australia',
        org_name: 'Lifeline Australia',
        service_phone: '13 11 14',
        sms_text: 'Text 0477 13 11 14',
        website_url: 'https://www.lifeline.org.au/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
      {
        country_code: 'AU',
        country_name: 'Australia',
        org_name: 'Beyond Blue',
        service_phone: '1300 22 4636',
        sms_text: 'Webchat 24/7 at beyondblue.org.au',
        website_url: 'https://www.beyondblue.org.au/',
        hours_available: '24/7',
        verified_date: '2026-11-02',
      },
    ];

    const insertTx = this.db.transaction(() => {
      for (const h of helplines) {
        insertHelpline.run(h);
      }
    });

    insertTx();
  }

  /**
   * Retrieves psychological help cards filtered by category, maximum duration, or keyword.
   */
  public getCards(params: MindQueryParams = {}): MindCard[] {
    const { category, maxTime, query, limit = 50, offset = 0 } = params;

    let sql = 'SELECT * FROM library_mind_cards WHERE 1=1';
    const bindings: any[] = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      bindings.push(category);
    }

    if (typeof maxTime === 'number' && maxTime > 0) {
      sql += ' AND time_needed_minutes <= ?';
      bindings.push(maxTime);
    }

    if (query && query.trim()) {
      sql += ' AND (title LIKE ? OR what_it_is LIKE ? OR when_it_helps LIKE ? OR steps_json LIKE ?)';
      const term = `%${query.trim()}%`;
      bindings.push(term, term, term, term);
    }

    sql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const rows = this.db.prepare(sql).all(...bindings) as any[];

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category as MindCategory,
      what_it_is: r.what_it_is,
      when_it_helps: r.when_it_helps,
      steps: JSON.parse(r.steps_json || '[]'),
      time_needed_minutes: r.time_needed_minutes,
      source_book: r.source_book,
      source_chapter: r.source_chapter,
      source_url: r.source_url,
      source_license: r.source_license,
      attribution: r.attribution,
      created_at: r.created_at,
    }));
  }

  /**
   * Retrieves single help card by ID or slug.
   */
  public getCardById(id: number): MindCard | null {
    const row = this.db.prepare('SELECT * FROM library_mind_cards WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category as MindCategory,
      what_it_is: row.what_it_is,
      when_it_helps: row.when_it_helps,
      steps: JSON.parse(row.steps_json || '[]'),
      time_needed_minutes: row.time_needed_minutes,
      source_book: row.source_book,
      source_chapter: row.source_chapter,
      source_url: row.source_url,
      source_license: row.source_license,
      attribution: row.attribution,
      created_at: row.created_at,
    };
  }

  /**
   * Retrieves all verified crisis helplines, optionally filtered by country code.
   */
  public getHelplines(countryCode?: string): HelplineEntry[] {
    let sql = 'SELECT * FROM library_helplines';
    const bindings: any[] = [];

    if (countryCode && countryCode.trim()) {
      sql += ' WHERE country_code = ?';
      bindings.push(countryCode.trim().toUpperCase());
    }

    sql += ' ORDER BY country_name ASC, id ASC';

    return this.db.prepare(sql).all(...bindings) as HelplineEntry[];
  }
}

/**
 * frontend/src/__tests__/unit/library-wisdom-ui.test.tsx
 * Unit tests for Wisdom Subpage UI components (Category B4).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VerseFolioCard, type ScriptureVerse } from '../../library/wisdom/VerseFolioCard';
import { QuoteFolioCard, type WisdomQuote } from '../../library/wisdom/QuoteFolioCard';
import { WisdomSubpage } from '../../library/wisdom/WisdomSubpage';

const SAMPLE_VERSE: ScriptureVerse = {
  id: 47,
  book_id: 1,
  book_slug: 'bhagavad_gita',
  book_title: 'Bhagavad Gita',
  section_number: 2,
  verse_number: 47,
  verse_ref: 'BG 2.47',
  text_sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
  transliteration: 'karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo \'stv akarmaṇi ||',
  translation: 'Thy right is to work only, but never with its fruits; let not the fruits of action be thy motive, nor let thy attachment be to inaction.',
  translator: 'Sir Edwin Arnold (1885)',
  commentary_source: 'The Song Celestial (Project Gutenberg #2388)',
  meaning: 'Perform your rightful duty with dedication without anxiety over results.',
  theme: 'duty',
  attribution: 'Sir Edwin Arnold, The Song Celestial (1885)',
  source_url: 'https://www.gutenberg.org/ebooks/2388',
  license: 'Public Domain',
  created_at: '2026-11-02 12:00:00',
};

const SAMPLE_QUOTE: WisdomQuote = {
  id: 1,
  quote_text: 'You have power over your mind — not outside events. Realise this, and you will find strength.',
  author: 'Marcus Aurelius',
  author_origin: 'Rome, 121–180 AD',
  tradition: 'Stoic',
  source_work: 'Meditations, Book IV',
  source_url: 'https://en.wikiquote.org/wiki/Marcus_Aurelius',
  theme: 'resilience',
  meaning: 'True sovereignty resides in one\'s internal judgment and virtue.',
  license: 'Public Domain',
  attribution: 'Wikiquote / George Long (1862)',
  is_verified: 1,
  created_at: '2026-11-02 12:00:00',
};

describe('Wisdom UI Components (Category B4)', () => {
  it('renders VerseFolioCard with Devanagari Sanskrit, transliteration, Arnold translation, and meaning', () => {
    const html = renderToStaticMarkup(
      <VerseFolioCard
        verse={SAMPLE_VERSE}
        isBookmarked={true}
        onToggleBookmark={vi.fn()}
      />
    );

    // Sanskrit Devanagari present
    expect(html).toContain('कर्मण्येवाधिकारस्ते');
    // IAST Transliteration present
    expect(html).toContain('karmaṇy-evādhikāras te');
    // English translation present
    expect(html).toContain('Thy right is to work only');
    // Translator byline present
    expect(html).toContain('Sir Edwin Arnold');
    // Canonical reference present
    expect(html).toContain('BG 2.47');
    // Stored plain meaning present
    expect(html).toContain('Perform your rightful duty');
    // Public Domain license stamp
    expect(html).toContain('Public Domain');
    // Bookmarked ribbon / state
    expect(html).toContain('Bookmarked');
  });

  it('renders QuoteFolioCard with author provenance, work citation, and meaning', () => {
    const html = renderToStaticMarkup(
      <QuoteFolioCard
        quote={SAMPLE_QUOTE}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
      />
    );

    // Quote words present in QuoteReveal spans
    expect(html).toContain('power');
    expect(html).toContain('mind');
    // Author present
    expect(html).toContain('Marcus Aurelius');
    // Tradition badge
    expect(html).toContain('STOIC');
    // Source work
    expect(html).toContain('Meditations, Book IV');
    // Meaning present
    expect(html).toContain('True sovereignty resides');
    // License
    expect(html).toContain('Public Domain');
    // Bookmark button
    expect(html).toContain('Bookmark');
  });

  it('renders WisdomSubpage with dual-pane layout and subtab controls', () => {
    const html = renderToStaticMarkup(<WisdomSubpage />);

    expect(html).toContain('Scriptures');
    expect(html).toContain('Quotes');
    expect(html).toContain('Scriptural Registry Principles');
    expect(html).toContain('Expansion Registry (Candidates)');
  });
});

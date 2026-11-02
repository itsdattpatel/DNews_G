/**
 * frontend/src/library/subpages/WisdomShellView.tsx
 * Subpage 2 Shell: Sacred Scriptures & Philosophical Quotes.
 */
import React, { useState } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { DeckleCard } from '../ui/DeckleCard';
import { InkStampBadge } from '../ui/InkStampBadge';
import { BookRibbon } from '../ui/BookRibbon';
import { QuoteReveal } from '../ui/QuoteReveal';
import { useLibraryStore } from '../store/useLibraryStore';
import {
  BookOpen,
  MessageSquareQuote,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

export const WisdomShellView: React.FC = () => {
  const wisdomSubTab = useLibraryStore((s) => s.wisdomSubTab);
  const setWisdomSubTab = useLibraryStore((s) => s.setWisdomSubTab);
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const [selectedBook, setSelectedBook] = useState<'bhagavad_gita' | 'mahabharata' | 'ramayana'>('bhagavad_gita');
  const [copied, setCopied] = useState(false);

  const bookmarkedGita = isBookmarked('verse', 47);
  const bookmarkedQuote = isBookmarked('quote', 12);

  const handleCopyCitation = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Left Panel: Holy Book / Quotes Index & Section Navigation
  const leftPanel = (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="grid grid-cols-2 p-1 rounded-sm border border-[var(--lib-border)] bg-[var(--lib-surface)]">
        <button
          type="button"
          onClick={() => setWisdomSubTab('scriptures')}
          className={`py-1.5 text-xs font-serif rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            wisdomSubTab === 'scriptures'
              ? 'bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] font-medium shadow-2xs border border-[var(--lib-border-soft)]'
              : 'text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
          <span>Scriptures</span>
        </button>

        <button
          type="button"
          onClick={() => setWisdomSubTab('quotes')}
          className={`py-1.5 text-xs font-serif rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            wisdomSubTab === 'quotes'
              ? 'bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] font-medium shadow-2xs border border-[var(--lib-border-soft)]'
              : 'text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)]'
          }`}
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-[var(--lib-accent)]" />
          <span>Quotes</span>
        </button>
      </div>

      {wisdomSubTab === 'scriptures' ? (
        <div className="space-y-4">
          <div>
            <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block mb-2">
              SELECT HOLY BOOK (REGISTRY):
            </span>
            <div className="space-y-1.5">
              {[
                { id: 'bhagavad_gita', title: 'The Bhagavad Gita', orig: 'श्रीमद्भगवद्गीता', sections: '18 Chapters' },
                { id: 'mahabharata', title: 'The Mahabharata', orig: 'महाभारतम्', sections: '18 Parvas' },
                { id: 'ramayana', title: 'The Ramayana (Valmiki)', orig: 'वाल्मीकि रामायण', sections: '7 Kandas' },
              ].map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBook(book.id as any)}
                  className={`w-full text-left p-3 rounded-md border text-sm transition-all cursor-pointer ${
                    selectedBook === book.id
                      ? 'bg-[var(--lib-surface-elevated)] border-[var(--lib-gold)] shadow-xs'
                      : 'bg-[var(--lib-surface)] border-[var(--lib-border)] hover:border-[var(--lib-gold)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--lib-gold)] font-serif">
                    <span>{book.orig}</span>
                    <span className="text-[10px] font-mono text-[var(--lib-ink-muted)]">{book.sections}</span>
                  </div>
                  <h4 className="font-serif font-medium text-[var(--lib-ink)] mt-0.5">
                    {book.title}
                  </h4>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)]">
            <span className="lib-meta text-[var(--lib-gold)] text-[10px] block mb-1">
              EXPANSION REGISTRY:
            </span>
            <p className="text-xs text-[var(--lib-ink-muted)] font-serif leading-relaxed">
              Approved candidate folios ready for database registry: <em>The Dhammapada</em> (tr. Max Müller), <em>Tao Te Ching</em> (tr. Giles), <em>The Principal Upanishads</em>, and <em>The Holy Bible (KJV 1611)</em>.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block">
            PHILOSOPHICAL TRADITIONS:
          </span>
          <div className="space-y-2">
            {[
              { author: 'Marcus Aurelius', work: 'Meditations', tradition: 'Stoicism', count: 14 },
              { author: 'Lao Tzu', work: 'Tao Te Ching', tradition: 'Classical Daoism', count: 18 },
              { author: 'The Buddha', work: 'Dhammapada', tradition: 'Early Buddhism', count: 22 },
              { author: 'Adi Shankara', work: 'Vivekachudamani', tradition: 'Advaita Vedanta', count: 12 },
            ].map((auth) => (
              <div
                key={auth.author}
                className="p-3 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] hover:border-[var(--lib-gold)] cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-center text-xs text-[var(--lib-ink-muted)] font-serif">
                  <span className="text-[var(--lib-accent)]">{auth.tradition}</span>
                  <span className="font-mono text-[10px]">{auth.count} quotes</span>
                </div>
                <h4 className="font-serif font-medium text-sm text-[var(--lib-ink)] mt-0.5">
                  {auth.author}
                </h4>
                <p className="text-xs text-[var(--lib-ink-muted)] italic font-serif">
                  {auth.work}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Right Panel: Verse or Quote Reader
  const rightPanel = wisdomSubTab === 'scriptures' ? (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="lib-meta text-[var(--lib-gold)] font-medium">
            Bhagavad Gita · Chapter II, Verse 47
          </span>
          <h2 className="lib-display text-2xl md:text-3xl text-[var(--lib-ink)] font-semibold mt-1">
            Yoga of Action (Karma Yoga)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleCopyCitation(
                'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥ — Bhagavad Gita 2.47 (tr. Sir Edwin Arnold, 1885)'
              )
            }
            className="p-2 rounded border border-[var(--lib-border)] bg-[var(--lib-surface)] text-[var(--lib-ink-secondary)] hover:text-[var(--lib-gold)] hover:border-[var(--lib-gold)] transition-colors text-xs flex items-center gap-1 font-serif cursor-pointer"
            aria-label="Copy verse citation"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--lib-sage)]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Cite'}</span>
          </button>

          <BookRibbon
            active={bookmarkedGita}
            onToggle={() => toggleBookmark('verse', 47, 'Bhagavad Gita 2.47')}
            color="gold"
          />
        </div>
      </div>

      <DeckleCard variant="sacred" className="p-6">
        {/* Sanskrit Text in Noto Serif Devanagari */}
        <div className="p-5 bg-[var(--lib-surface-elevated)] border border-[var(--lib-border-soft)] rounded text-center">
          <p className="lib-devanagari text-2xl text-[var(--lib-ink)] font-normal leading-relaxed">
            कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।<br />
            मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
          </p>
          <p className="mt-3 text-sm text-[var(--lib-ink-muted)] font-serif italic">
            karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi ||
          </p>
        </div>

        {/* Translation */}
        <div className="my-5">
          <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block mb-2">
            ENGLISH TRANSLATION:
          </span>
          <blockquote className="font-serif text-lg text-[var(--lib-ink)] leading-relaxed italic border-l-2 border-[var(--lib-border)] pl-4">
            “Thy right is to the work only, but never to its fruits; let not the fruits of action be thy motive, nor yet let there be in thee any attachment to inaction.”
          </blockquote>
          <p className="text-xs text-[var(--lib-ink-muted)] font-serif mt-2 pl-4">
            — Sir Edwin Arnold, <em>The Song Celestial</em> (1885). Public Domain.
          </p>
        </div>

        {/* Pure Curated Scholarly Meaning (Zero AI) */}
        <div className="p-4 bg-[var(--lib-surface-hover)] border border-[var(--lib-border-soft)] rounded text-sm text-[var(--lib-ink-secondary)] font-serif">
          <div className="flex items-center gap-1.5 font-medium text-[var(--lib-ink)] mb-1.5">
            <Sparkles className="w-4 h-4 text-[var(--lib-gold)]" />
            <span>Classical Scholarly Exposition (Human-Curated, Zero AI):</span>
          </div>
          <p className="leading-relaxed">
            This celebrated verse establishes the cornerstone of Nishkama Karma: dedicating one's intellect and effort entirely to current moral duty without becoming paralyzed by longing for praise, fear of disappointment, or anxiety over unwritten future outcomes.
          </p>
        </div>
      </DeckleCard>
    </div>
  ) : (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="lib-meta text-[var(--lib-accent)] font-medium">
            Stoic Folios · Meditations
          </span>
          <h2 className="lib-display text-2xl md:text-3xl text-[var(--lib-ink)] font-semibold mt-1">
            Marcus Aurelius on Inner Agency
          </h2>
        </div>

        <BookRibbon
          active={bookmarkedQuote}
          onToggle={() => toggleBookmark('quote', 12, 'Marcus Aurelius on Inner Agency')}
          color="terracotta"
        />
      </div>

      <QuoteReveal
        text="You have power over your mind - not outside events. Realise this, and you will find immense inner strength."
        author="Marcus Aurelius"
        work="Meditations, Book IV · George Long translation (1862). Public Domain."
      />

      <DeckleCard variant="default" className="p-5">
        <h4 className="font-serif text-sm font-medium text-[var(--lib-ink)] mb-1">
          Context & Provenance
        </h4>
        <p className="font-serif text-sm text-[var(--lib-ink-secondary)] leading-relaxed">
          Written during military campaigns along the Danube frontier between 170 and 180 CE. Aurelius notes that disturbance arises not from external circumstances themselves, but from the subjective judgment we form regarding them.
        </p>
        <div className="mt-3 pt-3 border-t border-[var(--lib-border-soft)] flex items-center justify-between text-xs text-[var(--lib-ink-muted)]">
          <span>License: Public Domain worldwide</span>
          <InkStampBadge variant="muted">Wikiquote Corroborated</InkStampBadge>
        </div>
      </DeckleCard>
    </div>
  );

  return <LibraryShellLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

/**
 * frontend/src/library/LibraryRoot.tsx
 * Isolated Root Component for The Library ("The Reading Room").
 * Scoped strictly under .lib-root with zero styling bleed into the main news desk.
 */
import React, { useState } from 'react';
import './styles/library.css';
import {
  RoughHighlight,
  DeckleCard,
  EmblaReadingCarousel,
  BookRibbon,
  CalligraphicDivider,
  InkStampBadge,
  ParchmentButton,
  ParchmentAccordion,
  QuoteReveal,
  LibraryLoadingState,
  LibraryEmptyState,
  LibraryErrorState,
} from './ui';
import {
  ArrowLeft,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  Feather,
} from 'lucide-react';

export const LibraryRoot: React.FC = () => {
  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const [bookmarkedSample, setBookmarkedSample] = useState(false);
  const [demoState, setDemoState] = useState<'content' | 'loading' | 'empty' | 'error'>('content');

  const handleReturnToDesk = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  const sampleAccordionItems = [
    {
      id: 'step1',
      title: 'Box Breathing (4-4-4-4 Technique)',
      badge: '3 Minutes',
      content:
        'Inhale slowly through the nose for 4 seconds. Hold gently for 4 seconds. Exhale steadily through the mouth for 4 seconds. Pause empty for 4 seconds. Repeat for four cycles to restore autonomic balance.',
    },
    {
      id: 'step2',
      title: 'Cognitive Reframing of Catastrophic Assumptions',
      badge: '5 Minutes',
      content:
        'Identify the catastrophic prediction. Ask: "What is the concrete evidence for and against this outcome? What would I tell a close friend experiencing this thought?" Write down the realistic appraisal.',
    },
    {
      id: 'step3',
      title: '5-4-3-2-1 Sensory Grounding Scan',
      badge: '2 Minutes',
      content:
        'Acknowledge 5 things you can see around you, 4 things you can physically feel, 3 distinct sounds you can hear, 2 scents you can smell, and 1 taste. Anchors working memory to immediate physical reality.',
    },
  ];

  return (
    <div className="lib-root" data-lib-theme={theme}>
      {/* ─── Reading Room Header Bar ────────────────────────────────────────── */}
      <header className="border-b border-[var(--lib-border)] bg-[var(--lib-surface)] px-6 py-4 sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Return to Main News Desk */}
          <div className="flex items-center gap-3">
            <ParchmentButton
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={handleReturnToDesk}
              aria-label="Return to News Desk"
            >
              News Desk
            </ParchmentButton>

            <span className="text-xs px-2.5 py-1 rounded-sm bg-[var(--lib-sage-soft)] text-[var(--lib-sage)] border border-[var(--lib-sage)] font-serif flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Plain Mode (Zero AI)
            </span>
          </div>

          {/* Centered Masthead */}
          <div className="text-center">
            <h1 className="lib-display text-2xl font-semibold tracking-wide text-[var(--lib-ink)]">
              THE READING ROOM
            </h1>
            <p className="lib-meta text-[var(--lib-ink-muted)] text-[10px] tracking-widest mt-0.5">
              THE LIBRARY · HISTORICAL ARCHIVES · SCRIPTURES · MIND HELPS
            </p>
          </div>

          {/* Theme & Preferences Controls */}
          <div className="flex items-center gap-2.5">
            <ParchmentButton
              variant="ghost"
              size="sm"
              icon={theme === 'day' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[var(--lib-gold)]" />}
              onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
              aria-label={`Switch to ${theme === 'day' ? 'Night' : 'Day'} theme`}
            >
              {theme === 'day' ? 'Night' : 'Day'}
            </ParchmentButton>

            <div className="w-px h-5 bg-[var(--lib-border)]" />

            <InkStampBadge variant="gold" shape="seal">
              FOLIO B1
            </InkStampBadge>
          </div>
        </div>
      </header>

      {/* ─── Main Content Canvas ────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Intro Banner */}
        <section className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-3 text-[var(--lib-gold)]">
            <Feather className="w-4 h-4" />
            <span className="lib-meta tracking-widest text-[11px]">ISOLATED UI KIT & DESIGN SYSTEM</span>
            <Feather className="w-4 h-4 transform scale-x-[-1]" />
          </div>
          <h2 className="lib-display text-3xl font-medium text-[var(--lib-ink)] mb-3">
            A Tranquil Haven for <RoughHighlight type="underline" color="var(--lib-gold)">Timeless Inquiry</RoughHighlight>
          </h2>
          <p className="font-serif text-base text-[var(--lib-ink-secondary)] leading-relaxed">
            Strictly isolated under <code className="text-xs px-1.5 py-0.5 bg-[var(--lib-surface-hover)] border border-[var(--lib-border)] rounded">.lib-root</code>.
            Zero styling bleed into the broadsheet newspaper front page.
          </p>

          {/* Interactive State Switcher for QA */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-serif">
            <span className="text-[var(--lib-ink-muted)] mr-1">Preview State:</span>
            {(['content', 'loading', 'empty', 'error'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDemoState(s)}
                className={`px-2.5 py-1 rounded border transition-colors capitalize ${
                  demoState === s
                    ? 'bg-[var(--lib-gold)] text-[#13110E] border-[var(--lib-gold)] font-medium'
                    : 'bg-[var(--lib-surface)] text-[var(--lib-ink-secondary)] border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* ─── State Demonstrations ─────────────────────────────────────────── */}
        {demoState === 'loading' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <LibraryLoadingState rows={4} />
          </div>
        )}

        {demoState === 'empty' && (
          <div className="max-w-2xl mx-auto">
            <LibraryEmptyState
              title="Reading Room Archive Empty"
              message="No folios found for the selected filter. Switch back to Content to view the UI kit components."
              actionLabel="Return to Folio Showcase"
              onAction={() => setDemoState('content')}
            />
          </div>
        )}

        {demoState === 'error' && (
          <div className="max-w-2xl mx-auto">
            <LibraryErrorState
              title="Archive Connection Interrupted"
              error="Demonstration of the tactile ink alert error state with graceful retry capability."
              onRetry={() => setDemoState('content')}
            />
          </div>
        )}

        {demoState === 'content' && (
          <div className="space-y-12">
            {/* 1. Scripture Card with Sanskrit & Rough Notation */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="lib-display text-xl font-medium text-[var(--lib-ink)]">
                  1. Sacred Scripture Card (Devanagari, Arnold Translation & Marginalia)
                </h3>
                <InkStampBadge variant="gold">BHAGAVAD GITA 2.47</InkStampBadge>
              </div>

              <DeckleCard variant="sacred" className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="lib-meta text-[var(--lib-gold)] font-medium">
                      Chapter II: Sānkhya-Yoga · The Book of Religion
                    </span>
                    <h4 className="lib-display text-xl text-[var(--lib-ink)]">
                      Sloka 47 — Duty Without Attachment
                    </h4>
                  </div>
                  <BookRibbon
                    active={bookmarkedSample}
                    onToggle={() => setBookmarkedSample(!bookmarkedSample)}
                    color="gold"
                  />
                </div>

                {/* Original Sanskrit in Noto Serif Devanagari */}
                <div className="my-5 p-4 bg-[var(--lib-surface-elevated)] border border-[var(--lib-border-soft)] rounded text-center">
                  <p className="lib-devanagari text-xl md:text-2xl text-[var(--lib-ink)] font-normal">
                    कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।<br />
                    मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
                  </p>
                  <p className="mt-2 text-sm text-[var(--lib-ink-muted)] font-serif italic">
                    karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi ||
                  </p>
                </div>

                {/* English Translation */}
                <blockquote className="font-serif text-lg text-[var(--lib-ink)] leading-relaxed italic border-l-2 border-[var(--lib-border)] pl-4 my-4">
                  “Thy right is to the work only, but never to its fruits; let not the fruits of action be thy motive, nor yet let there be in thee any attachment to inaction.”
                </blockquote>

                {/* Curated Scholarly Meaning */}
                <div className="mt-4 p-3.5 bg-[var(--lib-surface-hover)] border border-[var(--lib-border-soft)] rounded text-sm text-[var(--lib-ink-secondary)] font-serif">
                  <div className="flex items-center gap-1.5 font-medium text-[var(--lib-ink)] mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
                    <span>Contemplative Exposition:</span>
                  </div>
                  Direct your energy wholly toward the integrity of your actions in the present, releasing anxious obsession over uncontrollable outcomes or prestige.
                </div>

                {/* Provenance Footer */}
                <div className="mt-4 pt-3 border-t border-[var(--lib-border-soft)] flex items-center justify-between text-xs text-[var(--lib-ink-muted)]">
                  <span>Translation: Sir Edwin Arnold, <em>The Song Celestial</em> (1885)</span>
                  <InkStampBadge variant="muted">Public Domain</InkStampBadge>
                </div>
              </DeckleCard>
            </section>

            <CalligraphicDivider glyph="lotus" />

            {/* 2. Fluid Quote Reveal & Embla Carousel */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="lib-display text-xl font-medium text-[var(--lib-ink)]">
                  2. Contemplative Quote Reveal & Reading Carousel
                </h3>
                <InkStampBadge variant="sepia">PHILOSOPHY CAROUSEL</InkStampBadge>
              </div>

              <EmblaReadingCarousel>
                <QuoteReveal
                  text="You have power over your mind - not outside events. Realise this, and you will find immense strength."
                  author="Marcus Aurelius"
                  work="Meditations, Book IV (tr. George Long, 1862)"
                />
                <QuoteReveal
                  text="When you are content to be simply yourself and don't compare or compete, everybody will respect you."
                  author="Lao Tzu"
                  work="Tao Te Ching, Chapter VIII (tr. Lionel Giles, 1904)"
                />
                <QuoteReveal
                  text="Better than a thousand hollow words, is one word that brings peace."
                  author="The Buddha"
                  work="Dhammapada, Verse 100 (tr. F. Max Müller, 1881)"
                />
              </EmblaReadingCarousel>
            </section>

            <CalligraphicDivider glyph="fleuron" />

            {/* 3. Mind Helps Psychology Card & Accordion */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="lib-display text-xl font-medium text-[var(--lib-ink)]">
                  3. Evidence-Based Psychology (Mind Helps Card & Step Accordion)
                </h3>
                <InkStampBadge variant="sage">OPENSTAX PSYCHOLOGY 2E</InkStampBadge>
              </div>

              <DeckleCard variant="sage" className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="lib-meta text-[var(--lib-sage)] font-medium">
                      AUTONOMIC REGULATION & STRESS PROTOCOL
                    </span>
                    <h4 className="lib-display text-2xl text-[var(--lib-ink)] mt-0.5">
                      Somatic Calming Techniques
                    </h4>
                  </div>
                  <InkStampBadge variant="sage" shape="seal">
                    CC BY 4.0
                  </InkStampBadge>
                </div>

                <p className="font-serif text-sm text-[var(--lib-ink-secondary)] mb-5 leading-relaxed">
                  Clear, compassionate techniques paraphrased from peer-reviewed psychological literature. Non-clinical education for self-regulation.
                </p>

                <ParchmentAccordion
                  items={sampleAccordionItems}
                  defaultOpenId="step1"
                />

                <div className="mt-6 pt-3 border-t border-[var(--lib-border-soft)] flex items-center justify-between text-xs text-[var(--lib-ink-muted)]">
                  <span>Source: OpenStax Psychology 2e, Chapter 14 (Stress & Coping)</span>
                  <span className="font-serif italic">General education, not medical advice</span>
                </div>
              </DeckleCard>
            </section>

            <CalligraphicDivider glyph="diamond" />

            {/* 4. UI Kit Palette & Button Matrix */}
            <section className="p-6 border border-[var(--lib-border)] rounded-md bg-[var(--lib-surface)]">
              <h3 className="lib-display text-xl font-medium text-[var(--lib-ink)] mb-4">
                4. Reading Room Interactive Controls Matrix
              </h3>

              <div className="space-y-4">
                {/* Buttons */}
                <div>
                  <span className="lib-meta text-[var(--lib-ink-muted)] text-[11px] block mb-2">
                    PARCHMENT BUTTON VARIANTS:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    <ParchmentButton variant="primary">Terracotta Primary</ParchmentButton>
                    <ParchmentButton variant="secondary">Vellum Secondary</ParchmentButton>
                    <ParchmentButton variant="gold">Illuminated Gold</ParchmentButton>
                    <ParchmentButton variant="sage">Botanical Sage</ParchmentButton>
                    <ParchmentButton variant="ghost">Quiet Ghost</ParchmentButton>
                  </div>
                </div>

                {/* Badges */}
                <div className="pt-2">
                  <span className="lib-meta text-[var(--lib-ink-muted)] text-[11px] block mb-2">
                    INK ACCESSION BADGES:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <InkStampBadge variant="gold">Gold Illumination</InkStampBadge>
                    <InkStampBadge variant="terracotta">Terracotta Archive</InkStampBadge>
                    <InkStampBadge variant="sage">Botanical Sage</InkStampBadge>
                    <InkStampBadge variant="sepia">Walnut Sepia</InkStampBadge>
                    <InkStampBadge variant="muted">Library Marginalia</InkStampBadge>
                    <InkStampBadge variant="gold" shape="seal">Accession Seal</InkStampBadge>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ─── Reading Room Quiet Footer ──────────────────────────────────────── */}
      <footer className="mt-16 border-t border-[var(--lib-border)] bg-[var(--lib-surface)] py-6 text-center text-xs text-[var(--lib-ink-muted)] font-serif">
        <p>The Library · AI World News Desk · Scoped Reading Room Environment</p>
        <p className="mt-1 text-[11px]">All content served in Plain Mode with verified public domain & open licenses.</p>
      </footer>
    </div>
  );
};

export default LibraryRoot;

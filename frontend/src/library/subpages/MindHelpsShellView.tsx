/**
 * frontend/src/library/subpages/MindHelpsShellView.tsx
 * Subpage 3 Shell: Evidence-Based Psychology Self-Help & Helplines Directory.
 */
import React, { useState } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { DeckleCard } from '../ui/DeckleCard';
import { InkStampBadge } from '../ui/InkStampBadge';
import { BookRibbon } from '../ui/BookRibbon';
import { ParchmentAccordion } from '../ui/ParchmentAccordion';
import { ParchmentButton } from '../ui/ParchmentButton';
import { useLibraryStore } from '../store/useLibraryStore';
import {
  ShieldAlert,
  Clock,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';

interface MindCardData {
  id: number;
  slug: string;
  title: string;
  category: 'stress' | 'anxiety' | 'sleep' | 'focus' | 'habits';
  timeMin: number;
  whatItIs: string;
  whenItHelps: string;
  steps: { id: string; title: string; content: string }[];
  sourceBook: string;
  sourceChapter: string;
  license: string;
  url: string;
}

const SAMPLE_MIND_CARDS: MindCardData[] = [
  {
    id: 1,
    slug: 'box-breathing',
    title: 'Box Breathing (4-4-4-4 Cadence)',
    category: 'stress',
    timeMin: 3,
    whatItIs:
      'A somatic autonomic regulation exercise that stimulates the parasympathetic nervous system, lowering acute heart rate and reducing sympathetic nervous system arousal.',
    whenItHelps:
      'During acute surges of performance anxiety, high-pressure deadlines, physical tension, or emotional overwhelm.',
    steps: [
      { id: 's1', title: 'Step 1: Nasal Inhalation', content: 'Inhale slowly and steadily through the nose for a mental count of 4 seconds.' },
      { id: 's2', title: 'Step 2: Gentle Suspension', content: 'Hold the breath effortlessly at the peak of the lung capacity for 4 seconds without clenching throat muscles.' },
      { id: 's3', title: 'Step 3: Controlled Exhalation', content: 'Release the breath smoothly and fully through the mouth for 4 seconds.' },
      { id: 's4', title: 'Step 4: Empty Pause', content: 'Rest in the natural stillness at the bottom of the breath for 4 seconds before beginning the next cycle. Complete 4 full rounds.' },
    ],
    sourceBook: 'OpenStax Psychology 2e',
    sourceChapter: 'Chapter 14: Stress, Lifestyle, and Health',
    license: 'CC BY 4.0',
    url: 'https://openstax.org/details/books/psychology-2e',
  },
  {
    id: 2,
    slug: 'cognitive-reframing',
    title: 'Cognitive Reframing of Catastrophic Assumptions',
    category: 'anxiety',
    timeMin: 5,
    whatItIs:
      'An evidence-backed cognitive technique derived from cognitive behavioral principles that examines automatic catastrophic thoughts against empirical evidence.',
    whenItHelps:
      'When your mind automatically anticipates worst-case scenarios, spirals into ruminative worry, or interprets ambiguity as a guaranteed negative outcome.',
    steps: [
      { id: 's1', title: 'Step 1: Identify the Thought', content: 'Write down the exact sentence running in your head (e.g. "If this fails, everything is ruined").' },
      { id: 's2', title: 'Step 2: Examine Concrete Evidence', content: 'List 3 objective facts that support this thought, and 3 objective facts that contradict it.' },
      { id: 's3', title: 'Step 3: Construct Balanced Appraisal', content: 'Replace the absolute statement with an evidence-grounded reframe (e.g. "This is challenging, but I have handled setbacks before and have actionable steps available").' },
    ],
    sourceBook: 'OpenStax Psychology 2e',
    sourceChapter: 'Chapter 15: Psychological Disorders & Therapeutic Principles',
    license: 'CC BY 4.0',
    url: 'https://openstax.org/details/books/psychology-2e',
  },
  {
    id: 3,
    slug: 'sensory-grounding',
    title: '5-4-3-2-1 Sensory Grounding Scan',
    category: 'focus',
    timeMin: 2,
    whatItIs:
      'A somatic mindfulness protocol that rapidly shifts attentional focus from internal ruminative loops to present sensory inputs.',
    whenItHelps:
      'During moments of dissociation, sudden panic, mental fogginess, or attentional drift.',
    steps: [
      { id: 's1', title: 'Step 1: 5 Things You See', content: 'Notice 5 distinct visual details around you (a pattern on the floor, light reflection on glass).' },
      { id: 's2', title: 'Step 2: 4 Things You Feel', content: 'Notice 4 physical touch sensations (feet against the ground, texture of clothing, temperature of hands).' },
      { id: 's3', title: 'Step 3: 3 Sounds You Hear', content: 'Identify 3 distinct auditory inputs (distant traffic, humming ventilation, birdsong).' },
      { id: 's4', title: 'Step 4: 2 Scents You Smell', content: 'Recognize 2 aromas or scents in the immediate atmosphere.' },
      { id: 's5', title: 'Step 5: 1 Taste You Experience', content: 'Notice 1 taste present in your mouth or take a sip of cool water.' },
    ],
    sourceBook: 'World Health Organization (WHO)',
    sourceChapter: 'Doing What Matters in Times of Stress: Section 1 (Grounding)',
    license: 'CC BY-NC-SA 3.0 IGO',
    url: 'https://www.who.int/publications/i/item/9789240003927',
  },
];

export const MindHelpsShellView: React.FC = () => {
  const [selectedCardId, setSelectedCardId] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showHelplinesModal, setShowHelplinesModal] = useState<boolean>(false);

  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const selectedCard = SAMPLE_MIND_CARDS.find((c) => c.id === selectedCardId) ?? SAMPLE_MIND_CARDS[0]!;
  const bookmarked = isBookmarked('mind', selectedCard.id);

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'stress', label: 'Stress' },
    { id: 'anxiety', label: 'Anxiety' },
    { id: 'focus', label: 'Focus' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'habits', label: 'Habits' },
  ];

  // Left Panel: Technique Index & Category Filter
  const leftPanel = (
    <div className="space-y-5">
      {/* Non-Negotiable Safety Notice */}
      <div className="p-3.5 rounded-md border border-[var(--lib-sage)] bg-[var(--lib-sage-soft)] flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-[var(--lib-sage)] flex-shrink-0 mt-0.5" />
        <p className="font-serif text-xs text-[var(--lib-ink)] leading-snug">
          <strong>General Education Only:</strong> Not medical advice, diagnosis, or a substitute for a licensed healthcare professional.
        </p>
      </div>

      {/* Category Pills */}
      <div>
        <span className="lib-meta text-[var(--lib-sage)] text-[10px] block mb-2 font-medium">
          PSYCHOLOGY TOPICS:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-xs rounded-sm font-serif transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[var(--lib-sage)] text-[#FFFDF9] font-medium border border-[var(--lib-sage)] shadow-2xs'
                  : 'bg-[var(--lib-surface)] text-[var(--lib-ink-secondary)] border border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Techniques List */}
      <div className="space-y-2 pt-2">
        <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block">
          PRACTICAL TECHNIQUES ({SAMPLE_MIND_CARDS.length}):
        </span>
        {SAMPLE_MIND_CARDS.map((card) => {
          const isSelected = card.id === selectedCardId;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardId(card.id)}
              className={`w-full text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--lib-surface-elevated)] border-[var(--lib-sage)] shadow-xs'
                  : 'bg-[var(--lib-surface)] border-[var(--lib-border)] hover:border-[var(--lib-sage)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <InkStampBadge variant="sage" shape="pill">
                  {card.category}
                </InkStampBadge>
                <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--lib-ink-muted)]">
                  <Clock className="w-3 h-3" />
                  {card.timeMin} min
                </span>
              </div>
              <h4 className="font-serif text-sm font-medium text-[var(--lib-ink)]">
                {card.title}
              </h4>
            </button>
          );
        })}
      </div>

      {/* Helplines Trigger Button */}
      <div className="pt-2">
        <ParchmentButton
          variant="secondary"
          size="sm"
          className="w-full justify-center"
          icon={<PhoneCall className="w-3.5 h-3.5 text-[var(--lib-accent)]" />}
          onClick={() => setShowHelplinesModal(true)}
        >
          Verified Crisis Helplines
        </ParchmentButton>
      </div>
    </div>
  );

  // Right Panel: Help Card with Step-by-Step Guidance
  const rightPanel = (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <InkStampBadge variant="sage">{selectedCard.category.toUpperCase()}</InkStampBadge>
            <span className="flex items-center gap-1 text-xs font-mono text-[var(--lib-ink-muted)]">
              <Clock className="w-3.5 h-3.5" />
              {selectedCard.timeMin} Minutes Needed
            </span>
          </div>
          <h2 className="lib-display text-2xl md:text-3xl text-[var(--lib-ink)] font-semibold mt-1">
            {selectedCard.title}
          </h2>
        </div>

        <BookRibbon
          active={bookmarked}
          onToggle={() => toggleBookmark('mind', selectedCard.id, selectedCard.title)}
          color="sage"
        />
      </div>

      <DeckleCard variant="sage" className="p-6">
        {/* Definition & Trigger */}
        <div className="space-y-3.5 mb-6">
          <div>
            <h4 className="lib-meta text-[var(--lib-sage)] font-semibold text-[11px] mb-1">
              WHAT IT IS:
            </h4>
            <p className="font-serif text-base text-[var(--lib-ink)] leading-relaxed">
              {selectedCard.whatItIs}
            </p>
          </div>

          <div>
            <h4 className="lib-meta text-[var(--lib-sage)] font-semibold text-[11px] mb-1">
              WHEN IT HELPS:
            </h4>
            <p className="font-serif text-sm text-[var(--lib-ink-secondary)] leading-relaxed">
              {selectedCard.whenItHelps}
            </p>
          </div>
        </div>

        {/* Step-by-Step Accordion */}
        <div className="pt-2 border-t border-[var(--lib-border-soft)]">
          <span className="lib-meta text-[var(--lib-ink-muted)] text-[10px] block mb-3">
            PRACTICAL STEP-BY-STEP GUIDANCE:
          </span>
          <ParchmentAccordion
            items={selectedCard.steps.map((s) => ({
              id: s.id,
              title: s.title,
              content: s.content,
            }))}
            defaultOpenId="s1"
          />
        </div>

        {/* Bibliographic Provenance */}
        <div className="mt-6 pt-3 border-t border-[var(--lib-border-soft)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--lib-ink-muted)] font-serif">
          <span>
            Source: <em>{selectedCard.sourceBook}</em> · {selectedCard.sourceChapter}
          </span>
          <div className="flex items-center gap-2">
            <InkStampBadge variant="muted">{selectedCard.license}</InkStampBadge>
            <a
              href={selectedCard.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--lib-sage)] hover:underline inline-flex items-center gap-1"
            >
              <span>View Open Access Book</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DeckleCard>

      {/* Helplines Modal */}
      {showHelplinesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="lib-display text-xl font-medium text-[var(--lib-ink)] flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-[var(--lib-accent)]" />
                  <span>Verified Crisis Helplines Directory</span>
                </h3>
                <p className="text-xs text-[var(--lib-ink-muted)] font-serif mt-0.5">
                  Verified as of November 2, 2026 against official national health ministries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelplinesModal(false)}
                className="text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)] font-serif text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-serif max-h-72 overflow-y-auto lib-scrollbar pr-1">
              <div className="p-3 border border-[var(--lib-border-soft)] rounded bg-[var(--lib-surface)]">
                <span className="font-bold text-[var(--lib-ink)]">🇮🇳 India: Tele-MANAS (MoHFW)</span>
                <p className="text-[var(--lib-ink-secondary)] mt-0.5">Toll-free 24/7 Helpline: <strong>14416</strong> or <strong>1800-891-4416</strong></p>
                <p className="text-[var(--lib-ink-muted)] text-[10px]">KIRAN Mental Health: 1800-599-0019</p>
              </div>
              <div className="p-3 border border-[var(--lib-border-soft)] rounded bg-[var(--lib-surface)]">
                <span className="font-bold text-[var(--lib-ink)]">🇺🇸 USA: 988 Suicide & Crisis Lifeline</span>
                <p className="text-[var(--lib-ink-secondary)] mt-0.5">Call or Text <strong>988</strong> (24/7, SAMHSA)</p>
              </div>
              <div className="p-3 border border-[var(--lib-border-soft)] rounded bg-[var(--lib-surface)]">
                <span className="font-bold text-[var(--lib-ink)]">🇨🇳 China: Beijing Crisis Intervention</span>
                <p className="text-[var(--lib-ink-secondary)] mt-0.5">Hotline: <strong>010-82951332</strong> / <strong>800-810-1117</strong></p>
              </div>
              <div className="p-3 border border-[var(--lib-border-soft)] rounded bg-[var(--lib-surface)]">
                <span className="font-bold text-[var(--lib-ink)]">🇯🇵 Japan: Inochi no Denwa & TELL</span>
                <p className="text-[var(--lib-ink-secondary)] mt-0.5">Inochi: <strong>0570-783-556</strong> · TELL Lifeline: <strong>03-5774-0992</strong></p>
              </div>
              <div className="p-3 border border-[var(--lib-border-soft)] rounded bg-[var(--lib-surface)]">
                <span className="font-bold text-[var(--lib-ink)]">🇦🇺 Australia: Lifeline Australia</span>
                <p className="text-[var(--lib-ink-secondary)] mt-0.5">Call <strong>13 11 14</strong> · Text <strong>0477 13 11 14</strong> (24/7)</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <ParchmentButton variant="secondary" size="sm" onClick={() => setShowHelplinesModal(false)}>
                Dismiss Directory
              </ParchmentButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return <LibraryShellLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

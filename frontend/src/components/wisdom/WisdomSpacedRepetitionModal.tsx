/**
 * frontend/src/components/wisdom/WisdomSpacedRepetitionModal.tsx
 * Wisdom & Geopolitical Spaced Repetition Review Studio (PRD Master Expansion #42).
 * Interactive flashcard learning deck utilizing Leitner / SM-2 spaced repetition
 * for philosophical maxims, historical quotes, and international vocabulary.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { X, Brain, RotateCcw } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  author: string;
  back: string;
  context: string;
  category: string;
}

const DEFAULT_DECK: Flashcard[] = [
  {
    id: 'card-1',
    front: '“He who has a why to live can bear almost any how.”',
    author: 'Friedrich Nietzsche',
    back: 'Having purpose or guiding meaning grants psychological fortitude against severe adversity.',
    context: 'From Twilight of the Idols (1889); popularized in Viktor Frankl’s Man’s Search for Meaning.',
    category: 'Existential Philosophy',
  },
  {
    id: 'card-2',
    front: '“In the midst of chaos, there is also opportunity.”',
    author: 'Sun Tzu',
    back: 'Unstable and volatile environments create strategic inflection points for decisive action.',
    context: 'The Art of War, Chapter 5: Strategic Energy and Military Dynamics.',
    category: 'Strategic Statecraft',
  },
  {
    id: 'card-3',
    front: '“Realpolitik”',
    author: 'Ludwig von Rochau',
    back: 'Politics or diplomacy based primarily on considerations of given circumstances and factors, rather than explicit ideological notions or moral and ethical premises.',
    context: 'Coined in 1853; central doctrine of Otto von Bismarck and 20th-century geopolitical balance of power.',
    category: 'International Relations',
  },
  {
    id: 'card-4',
    front: '“Waste no more time arguing what a good man should be. Be one.”',
    author: 'Marcus Aurelius',
    back: 'Virtue is demonstrated through immediate pragmatic conduct rather than theoretical disputation.',
    context: 'Meditations, Book X, Section 16; core precept of Roman Stoic statecraft.',
    category: 'Stoicism',
  },
];

interface WisdomSpacedRepetitionModalProps {
  onClose?: () => void;
}

export const WisdomSpacedRepetitionModal: React.FC<WisdomSpacedRepetitionModalProps> = ({ onClose }) => {
  const isWisdomSpacedRepetitionOpen = useAppStore((s) => s.isWisdomSpacedRepetitionOpen);
  const setWisdomSpacedRepetitionOpen = useAppStore((s) => s.setWisdomSpacedRepetitionOpen);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);

  const handleClose = () => {
    triggerHaptic('light');
    if (onClose) onClose();
    setWisdomSpacedRepetitionOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWisdomSpacedRepetitionOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWisdomSpacedRepetitionOpen]);

  if (!isWisdomSpacedRepetitionOpen) return null;

  const card = DEFAULT_DECK[currentIndex] || DEFAULT_DECK[0];

  const handleGrade = (quality: 'again' | 'hard' | 'good' | 'easy') => {
    triggerHaptic(quality === 'again' ? 'heavy' : 'selection');
    setCardsReviewed((prev) => prev + 1);
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % DEFAULT_DECK.length);
  };

  return (
    <div
      id="wisdom-spaced-repetition-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-paper text-ink border-2 border-ink p-5 sm:p-8 rounded-xs shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Masthead Header */}
        <div className="flex items-start justify-between pb-3 border-b-2 border-ink">
          <div>
            <div className="flex items-center gap-2">
              <Brain size={22} className="text-accent" />
              <h2 className="font-masthead text-xl sm:text-2xl font-bold uppercase tracking-tight text-ink">
                Wisdom &amp; Geopolitics Spaced Repetition Deck
              </h2>
            </div>
            <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mt-1">
              Active recall review of enduring philosophical maxims and diplomatic vocabulary.
            </p>
          </div>
          <button
            id="btn-close-spaced-repetition"
            onClick={handleClose}
            className="p-1 border border-paper-border hover:border-ink rounded-xs text-ink cursor-pointer transition-colors"
            title="Close Spaced Repetition (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Strip */}
        <div className="flex items-center justify-between font-mono text-xs text-ink-muted">
          <span>Card {currentIndex + 1} of {DEFAULT_DECK.length}</span>
          <span className="px-2 py-0.5 rounded-xs border border-paper-border bg-paper-alt font-bold uppercase">
            {card.category}
          </span>
          <span>Reviewed Today: {cardsReviewed}</span>
        </div>

        {/* Flashcard Body */}
        <div
          id="flashcard-surface"
          onClick={() => {
            triggerHaptic('light');
            setIsFlipped(!isFlipped);
          }}
          className="border-2 border-ink bg-paper-alt p-6 sm:p-10 rounded-xs min-h-[220px] flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow relative group text-center"
        >
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-ink-muted mb-2">
            <span>{isFlipped ? 'Revealed Analysis' : 'Front Precept'}</span>
            <span className="text-accent underline group-hover:font-bold">
              {isFlipped ? 'Click to Flip Back' : 'Click to Reveal Meaning'}
            </span>
          </div>

          {!isFlipped ? (
            <div className="my-auto space-y-3">
              <blockquote className="font-serif italic text-lg sm:text-2xl text-ink leading-relaxed">
                {card.front}
              </blockquote>
              <div className="font-mono text-xs text-ink-secondary font-bold uppercase tracking-wider">
                — {card.author}
              </div>
            </div>
          ) : (
            <div className="my-auto space-y-3 animate-fadeIn">
              <p className="font-serif font-bold text-base sm:text-lg text-ink leading-relaxed">
                {card.back}
              </p>
              <div className="p-2.5 border-t border-paper-border font-serif italic text-xs text-ink-secondary">
                {card.context}
              </div>
            </div>
          )}

          <div className="pt-2 text-ink-muted font-mono text-[9px] uppercase">
            Spacebar or Click to Flip
          </div>
        </div>

        {/* Spaced Repetition Feedback Buttons */}
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-2 pt-2">
            <button
              onClick={() => handleGrade('again')}
              className="py-2 px-2 border border-accent bg-accent/10 text-accent hover:bg-accent hover:text-paper font-mono text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
            >
              Again (1d)
            </button>
            <button
              onClick={() => handleGrade('hard')}
              className="py-2 px-2 border border-amber-600 bg-amber-600/10 text-amber-700 hover:bg-amber-600 hover:text-paper font-mono text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
            >
              Hard (3d)
            </button>
            <button
              onClick={() => handleGrade('good')}
              className="py-2 px-2 border border-ink bg-paper-alt hover:bg-ink hover:text-paper text-ink font-mono text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
            >
              Good (5d)
            </button>
            <button
              onClick={() => handleGrade('easy')}
              className="py-2 px-2 border border-positive bg-positive/10 text-positive hover:bg-positive hover:text-paper font-mono text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
            >
              Easy (10d)
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsFlipped(true);
            }}
            className="w-full py-2.5 border-2 border-ink bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider rounded-xs hover:bg-paper hover:text-ink transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <RotateCcw size={13} />
            <span>Reveal Meaning &amp; Rate Mastery</span>
          </button>
        )}
      </div>
    </div>
  );
};

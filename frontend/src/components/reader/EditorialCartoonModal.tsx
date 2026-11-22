/**
 * frontend/src/components/reader/EditorialCartoonModal.tsx
 * Daily Syndicated Editorial Cartoon Desk (PRD Master Expansion #16).
 * Halftone & newsprint styled daily editorial cartoon with satire caption and artist stamp.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { X, Calendar } from 'lucide-react';

const CARTOONS = [
  {
    title: 'The Great Telegraph Exchange of 2026',
    caption: '“Gentlemen, the artificial intelligences are debating whether to summarize our headlines or write their own!”',
    artist: 'H. Davenport — The Daily Bugle Syndicate',
    date: 'Broadsheet Edition • Morning Edition',
  },
  {
    title: 'High Seas Diplomacy',
    caption: '“82 nations sign the ocean accord; the whales reserve comment until the ink dries.”',
    artist: 'E. Kemble — Syndicate Press',
    date: 'Global Dispatch • Special Issue',
  },
  {
    title: 'The Algorithmic Wire',
    caption: '“Faster than the teletype, sharper than the linotype, yet always thirsty for more paper!”',
    artist: 'T. Nast — Newsprint Folio',
    date: 'Saturday Broadsheet Folio',
  },
];

export const EditorialCartoonModal: React.FC = () => {
  const isOpen = useAppStore((s) => s.isEditorialCartoonOpen);
  const setIsOpen = useAppStore((s) => s.setIsEditorialCartoonOpen);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Rotate cartoon based on day of month
  const dayIndex = new Date().getDate() % CARTOONS.length;
  const cartoon = CARTOONS[dayIndex];

  return (
    <div
      id="editorial-cartoon-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        id="editorial-cartoon-modal"
        className="w-full max-w-lg bg-paper border-3 border-ink shadow-2xl rounded-xs p-5 text-ink animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Masthead Banner */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-ink mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/15 px-2 py-0.5 border border-accent rounded-xs">
              Daily Satire
            </span>
            <span className="font-masthead text-xs font-bold uppercase tracking-wider text-ink">
              The Daily Bugle Cartoon Desk
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsOpen(false);
            }}
            className="p-1 rounded-xs hover:bg-paper-alt text-ink-secondary hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cartoon Artwork Canvas (Halftone Newsprint Style) */}
        <div className="my-3 border-2 border-ink p-4 bg-paper-alt/80 rounded-xs text-center relative overflow-hidden shadow-inner">
          {/* Subtle newsprint halftone dot pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#1A1208 1px, transparent 1px)',
              backgroundSize: '6px 6px',
            }}
          />

          {/* Authentic Broadsheet Engraving Vector Illustration */}
          <svg
            viewBox="0 0 400 220"
            className="w-full h-44 mx-auto text-ink stroke-current"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Vintage Printing Press & Globe Engraving */}
            <rect x="30" y="30" width="340" height="160" strokeDasharray="3 3" opacity="0.4" />
            <circle cx="200" cy="100" r="50" strokeWidth="2" />
            <ellipse cx="200" cy="100" rx="50" ry="22" strokeDasharray="4 2" />
            <ellipse cx="200" cy="100" rx="22" ry="50" strokeDasharray="4 2" />
            <path d="M 120 160 L 280 160" strokeWidth="3" />
            <path d="M 140 160 L 140 185 L 260 185 L 260 160" strokeWidth="2" />
            <path d="M 170 185 L 170 200 L 230 200 L 230 185" strokeWidth="2" />
            {/* Satirical Telegraph lightning flashes */}
            <path d="M 110 80 L 140 95 L 125 105 L 150 120" strokeWidth="2" className="text-accent stroke-accent" />
            <path d="M 290 80 L 260 95 L 275 105 L 250 120" strokeWidth="2" className="text-accent stroke-accent" />
            {/* Scroll of News dispatches */}
            <path d="M 80 130 C 120 145, 160 125, 200 135 C 240 145, 280 125, 320 135" strokeWidth="1.8" />
            <path d="M 80 140 C 120 155, 160 135, 200 145 C 240 155, 280 135, 320 145" strokeWidth="1.8" />
          </svg>

          {/* Headline */}
          <h3 className="font-headline text-lg font-bold text-ink uppercase tracking-wide mt-2">
            {cartoon.title}
          </h3>
        </div>

        {/* Caption */}
        <blockquote className="font-serif italic text-sm text-center text-ink leading-relaxed my-3 px-4">
          {cartoon.caption}
        </blockquote>

        {/* Byline & Date */}
        <div className="flex items-center justify-between pt-2 border-t border-paper-border font-mono text-[10px] text-ink-muted">
          <span>{cartoon.artist}</span>
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            <span>{cartoon.date}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

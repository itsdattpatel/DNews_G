/**
 * frontend/src/components/history/HistoryFrontPageModal.tsx
 * On This Day in History — Archival Front Page Broadsheet (PRD Master Expansion #41).
 * Features vintage front pages and dispatches from 50, 100, and 150 years ago.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { X, History } from 'lucide-react';

interface HistoryFrontPageModalProps {
  onClose?: () => void;
}

interface HistoricalDispatch {
  era: string;
  year: number;
  dateStr: string;
  masthead: string;
  headline: string;
  subhead: string;
  body: string;
  impact: string;
}

const HISTORICAL_EDITIONS: Record<number, HistoricalDispatch> = {
  1976: {
    era: '50 Years Ago',
    year: 1976,
    dateStr: 'November 22, 1976',
    masthead: 'The Daily Chronicle & Global Telegraph',
    headline: 'SUPERSONIC CONCORDE PASSENGER SERVICE COMMENCES TRANSATLANTIC CROSSINGS',
    subhead: 'London and Paris Connect with Washington in Unprecedented 3 Hours and 32 Minutes',
    body: 'Commercial aviation entered a revolutionary supersonic chapter today as the Anglo-French Concorde completed its inaugural passenger services between Europe and North America. Flying at twice the speed of sound at an altitude of 58,000 feet, passengers observed the curvature of the earth while breakfasting over the mid-Atlantic.',
    impact: 'Pioneered international civil supersonic aviation and catalyzed contemporary bilateral aviation treaties.',
  },
  1926: {
    era: '100 Years Ago',
    year: 1926,
    dateStr: 'November 22, 1926',
    masthead: 'The Imperial & International Gazette',
    headline: 'IMPERIAL CONFERENCE CONCLUDES: BALFOUR DECLARATION ESTABLISHES COMMONWEALTH AUTONOMY',
    subhead: 'Dominions Declared Autonomous Communities Equal in Status, United by Common Allegiance',
    body: 'At the historic gathering in London, the Committee on Inter-Imperial Relations concluded negotiations that fundamentally redefine international sovereignty. Henceforth, Great Britain and the self-governing Dominions are recognized as autonomous communities within the British Empire, in no way subordinate one to another.',
    impact: 'Laid the constitutional foundation for the modern Commonwealth of Nations and 20th-century multilateral diplomacy.',
  },
  1876: {
    era: '150 Years Ago',
    year: 1876,
    dateStr: 'November 22, 1876',
    masthead: 'The Broadsheet & Commercial Advertiser',
    headline: 'ELECTRIC SPEAKING TELEGRAPH DEMONSTRATED ACROSS TWO MILES OF WIRE',
    subhead: 'Human Voice Transmitted Intelligibly in First Successful Outdoor Telephonic Test',
    body: 'Professor Alexander Graham Bell and his assistants accomplished an unprecedented feat of telegraphic science yesterday, transmitting clear vocal speech between Boston and Cambridge along an ordinary telegraph wire. Observers confirmed hearing distinctly every modulation and syllable spoken into the apparatus.',
    impact: 'Initiated the global telecommunications infrastructure that directly underpins modern real-time news syndication.',
  },
};

export const HistoryFrontPageModal: React.FC<HistoryFrontPageModalProps> = ({ onClose }) => {
  const isHistoryFrontPageOpen = useAppStore((s) => s.isHistoryFrontPageOpen);
  const setHistoryFrontPageOpen = useAppStore((s) => s.setHistoryFrontPageOpen);
  const [selectedYear, setSelectedYear] = useState<number>(1926);

  const handleClose = () => {
    triggerHaptic('light');
    if (onClose) onClose();
    setHistoryFrontPageOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHistoryFrontPageOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryFrontPageOpen]);

  if (!isHistoryFrontPageOpen) return null;

  const currentEdition = HISTORICAL_EDITIONS[selectedYear] || HISTORICAL_EDITIONS[1926];

  return (
    <div
      id="history-front-page-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-paper text-ink border-2 border-ink p-5 sm:p-8 rounded-xs shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Masthead Header */}
        <div className="flex items-start justify-between pb-3 border-b-2 border-ink">
          <div>
            <div className="flex items-center gap-2">
              <History size={22} className="text-accent" />
              <h2 className="font-masthead text-xl sm:text-2xl font-bold uppercase tracking-tight text-ink">
                On This Day in History — Front Page Archive
              </h2>
            </div>
            <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mt-1">
              Historical front-page dispatches from the telegraph wire exactly 50, 100, and 150 years ago.
            </p>
          </div>
          <button
            id="btn-close-history-front-page"
            onClick={handleClose}
            className="p-1 border border-paper-border hover:border-ink rounded-xs text-ink cursor-pointer transition-colors"
            title="Close Historical Archive (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Year Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[1976, 1926, 1876].map((year) => {
            const ed = HISTORICAL_EDITIONS[year];
            return (
              <button
                key={year}
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedYear(year);
                }}
                className={`flex-1 min-w-[90px] py-2 px-2 sm:px-3 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-xs border transition-colors cursor-pointer text-center shrink-0 sm:shrink ${
                  selectedYear === year
                    ? 'bg-ink text-paper border-ink shadow-xs'
                    : 'bg-paper-alt text-ink-secondary border-paper-border hover:border-ink'
                }`}
              >
                <span>{year} ({ed.era})</span>
              </button>
            );
          })}
        </div>

        {/* Vintage Front Page Newspaper Facsimile */}
        <article className="border-4 border-double border-ink bg-paper-alt p-6 sm:p-8 rounded-xs shadow-sm space-y-5">
          {/* Historical Newspaper Banner */}
          <div className="text-center border-b-2 border-ink pb-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold block mb-1">
              Archival Wire Microfilm Facsimile · Price: Two Pence
            </span>
            <h3 className="font-masthead text-2xl sm:text-3xl font-bold uppercase tracking-tight text-ink">
              {currentEdition.masthead}
            </h3>
            <div className="flex items-center justify-between pt-2 border-t border-paper-border mt-2 font-mono text-[10px] text-ink-secondary">
              <span>VOL. LXIV · NO. 18,421</span>
              <span>{currentEdition.dateStr}</span>
              <span>TELEGRAPHIC MORGUE</span>
            </div>
          </div>

          {/* Lead Headline */}
          <div>
            <h4 className="font-headline text-xl sm:text-2xl font-bold text-ink uppercase tracking-tight leading-snug">
              {currentEdition.headline}
            </h4>
            <p className="font-serif italic text-sm text-ink-secondary mt-1.5 pb-3 border-b border-paper-border">
              {currentEdition.subhead}
            </p>
          </div>

          {/* Body Text in Newspaper Columns */}
          <div className="font-serif text-sm sm:text-base leading-relaxed text-ink space-y-4">
            <p className="first-letter:text-4xl first-letter:font-masthead first-letter:font-bold first-letter:float-left first-letter:mr-2.5 first-letter:text-ink">
              {currentEdition.body}
            </p>
          </div>

          {/* Historical Impact Box */}
          <div className="p-3 border-l-2 border-accent bg-paper border border-paper-border rounded-r-xs font-serif text-xs">
            <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-accent block mb-0.5">
              Historical Legacy &amp; Enduring Impact
            </span>
            <p className="text-ink-secondary">
              {currentEdition.impact}
            </p>
          </div>
        </article>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-paper-border text-ink-muted font-mono text-[10px]">
          <span>Source: The World Desk Historical Public Records Microfilm Archive</span>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 border border-ink bg-ink text-paper rounded-xs font-bold uppercase hover:bg-paper hover:text-ink transition-colors cursor-pointer"
          >
            Dismiss History Desk
          </button>
        </div>
      </div>
    </div>
  );
};

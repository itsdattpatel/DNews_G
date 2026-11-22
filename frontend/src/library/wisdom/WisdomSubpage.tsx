/**
 * frontend/src/library/wisdom/WisdomSubpage.tsx
 * Complete Subpage 2 view: Sacred Scriptures & Philosophical Quotes.
 */
import React from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { ScriptureReader } from './ScriptureReader';
import { QuotesExplorer } from './QuotesExplorer';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import {
  BookOpen,
  MessageSquareQuote,
  Scroll,
  Sparkles,
  Brain,
} from 'lucide-react';

export const WisdomSubpage: React.FC = () => {
  const wisdomSubTab = useLibraryStore((s) => s.wisdomSubTab);
  const setWisdomSubTab = useLibraryStore((s) => s.setWisdomSubTab);

  // Left Panel: Sub-tab switcher & Registry overview
  const leftPanel = (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="grid grid-cols-2 p-1 rounded-sm border border-[var(--lib-border)] bg-[var(--lib-surface)]">
        <button
          type="button"
          onClick={() => setWisdomSubTab('scriptures')}
          className={`py-2 text-xs font-serif rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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
          className={`py-2 text-xs font-serif rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            wisdomSubTab === 'quotes'
              ? 'bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] font-medium shadow-2xs border border-[var(--lib-border-soft)]'
              : 'text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)]'
          }`}
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-[var(--lib-accent)]" />
          <span>Quotes</span>
        </button>
      </div>

      {/* Spaced Repetition Review Deck Trigger (PRD Master Expansion #42) */}
      <div className="flex items-center justify-between p-2.5 rounded-sm border border-[var(--lib-gold)]/40 bg-[var(--lib-gold-soft)]/20">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[var(--lib-gold)] shrink-0" />
          <div>
            <span className="text-xs font-serif font-bold text-[var(--lib-ink)] block leading-tight">
              Memory Review Deck
            </span>
            <span className="text-[10px] text-[var(--lib-ink-muted)] font-serif block leading-tight">
              SM-2 Leitner Flashcards
            </span>
          </div>
        </div>
        <button
          id="btn-wisdom-subpage-review"
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            useAppStore.getState().setWisdomSpacedRepetitionOpen(true);
          }}
          className="px-2.5 py-1 text-xs font-serif font-bold rounded-xs bg-[var(--lib-surface-elevated)] border border-[var(--lib-gold)] text-[var(--lib-ink)] hover:bg-[var(--lib-gold)] hover:text-white transition-all cursor-pointer shadow-xs shrink-0"
          title="Open Philosophical Spaced Repetition Review Deck"
        >
          Review
        </button>
      </div>

      {wisdomSubTab === 'scriptures' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] space-y-2">
            <div className="flex items-center gap-2 text-[var(--lib-gold)]">
              <Scroll className="w-4 h-4" />
              <h4 className="font-serif font-medium text-sm text-[var(--lib-ink)]">
                Scriptural Registry Principles
              </h4>
            </div>
            <p className="text-xs text-[var(--lib-ink-secondary)] font-serif leading-relaxed">
              Texts are preserved in their classical public-domain translations (Sir Edwin Arnold, Kisari Mohan Ganguli, Ralph Griffith) alongside authentic Sanskrit Devanagari verse forms.
            </p>
          </div>

          <div className="p-3.5 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)]">
            <span className="lib-meta text-[var(--lib-gold)] text-[10px] block mb-1 font-mono uppercase tracking-wider">
              Expansion Registry (Candidates):
            </span>
            <p className="text-xs text-[var(--lib-ink-muted)] font-serif leading-relaxed">
              Approved candidates ready for future database ingestion: <em>The Dhammapada</em> (tr. Max Müller, 1881), <em>Tao Te Ching</em> (tr. Lionel Giles, 1905), <em>The Principal Upanishads</em>, and <em>The Holy Bible (King James Version 1611)</em>.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] space-y-2">
            <div className="flex items-center gap-2 text-[var(--lib-accent)]">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-serif font-medium text-sm text-[var(--lib-ink)]">
                Philosophical Lineages
              </h4>
            </div>
            <p className="text-xs text-[var(--lib-ink-secondary)] font-serif leading-relaxed">
              Curated from public-domain manuscripts and verified Wikiquote entries across Stoic, Vedanta, Confucian, and Classical humanist traditions. Zero AI fabrication; authentic attributions only.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { tradition: 'Stoicism', authors: 'Marcus Aurelius, Epictetus, Seneca', desc: 'Inner agency and equanimity' },
              { tradition: 'Vedanta & Indic', authors: 'Swami Vivekananda, Adi Shankara, Tagore', desc: 'Self-knowledge and universal oneness' },
              { tradition: 'Eastern Classics', authors: 'Confucius, Laozi', desc: 'Harmonious action and virtue' },
            ].map((t) => (
              <div
                key={t.tradition}
                className="p-3 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] space-y-1"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-serif font-medium text-[var(--lib-accent)]">
                    {t.tradition}
                  </span>
                </div>
                <p className="text-xs text-[var(--lib-ink)] font-serif">
                  {t.authors}
                </p>
                <p className="text-[11px] text-[var(--lib-ink-muted)] italic font-serif">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Right Panel Content: Scripture Reader or Quotes Explorer
  const rightPanel = (
    <div>
      {wisdomSubTab === 'scriptures' ? (
        <ScriptureReader />
      ) : (
        <QuotesExplorer />
      )}
    </div>
  );

  return (
    <LibraryShellLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      defaultLeftSize={34}
      minLeftSize={25}
      maxLeftSize={48}
    />
  );
};

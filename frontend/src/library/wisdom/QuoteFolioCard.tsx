/**
 * frontend/src/library/wisdom/QuoteFolioCard.tsx
 * Archival reading desk folio for timeless philosophical quotes.
 */
import React, { useState } from 'react';
import { DeckleCard } from '../ui/DeckleCard';
import { InkStampBadge } from '../ui/InkStampBadge';
import { BookRibbon } from '../ui/BookRibbon';
import { QuoteReveal } from '../ui/QuoteReveal';
import {
  ExternalLink,
  Bookmark,
  Share2,
  Check,
  ShieldCheck,
  Quote as QuoteIcon,
  Compass,
} from 'lucide-react';

export interface WisdomQuote {
  id: number;
  quote_text: string;
  author: string;
  author_origin?: string;
  tradition?: string;
  source_work?: string;
  source_url: string;
  theme?: string;
  meaning?: string;
  commentary_source?: string;
  meaning_reviewed?: number;
  license: string;
  attribution: string;
  is_verified: number;
  created_at: string;
}

export interface QuoteFolioCardProps {
  quote: WisdomQuote;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onSaveMeaning?: (
    quoteId: number,
    patch: { plain_meaning: string; meaning_reviewed: number; commentary_source?: string },
  ) => Promise<void>;
  isSaving?: boolean;
}

export const QuoteFolioCard: React.FC<QuoteFolioCardProps> = ({
  quote,
  isBookmarked,
  onToggleBookmark,
  onSaveMeaning,
  isSaving = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingMeaning, setIsEditingMeaning] = useState(false);
  const [draftMeaning, setDraftMeaning] = useState(quote.meaning ?? '');
  const [draftSource, setDraftSource] = useState(quote.commentary_source ?? '');
  const [savingLocal, setSavingLocal] = useState(false);

  const isReviewed = Number(quote.meaning_reviewed ?? 0) === 1;

  const handleOpenEdit = () => {
    setDraftMeaning(quote.meaning ?? '');
    setDraftSource(quote.commentary_source ?? '');
    setIsEditingMeaning(true);
  };

  const handleSaveAndApprove = async () => {
    if (!draftMeaning.trim()) return;
    setSavingLocal(true);
    try {
      const patch = {
        plain_meaning: draftMeaning.trim(),
        meaning_reviewed: 1,
        ...(draftSource.trim() ? { commentary_source: draftSource.trim() } : {}),
      };
      if (onSaveMeaning) {
        await onSaveMeaning(quote.id, patch);
      } else {
        await fetch(`/api/library/wisdom/quotes/${quote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      }
      setIsEditingMeaning(false);
    } finally {
      setSavingLocal(false);
    }
  };

  const handleCopyCitation = async () => {
    const citation = `"${quote.quote_text}"\n— ${quote.author}${quote.source_work ? `, ${quote.source_work}` : ''}\nAttribution: ${quote.attribution} [${quote.license}]\nSource: ${quote.source_url}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative">
      {/* Hanging Leather Ribbon Marker if bookmarked */}
      <BookRibbon
        active={isBookmarked}
        onToggle={onToggleBookmark}
        color="terracotta"
        className="hidden sm:block"
      />

      <DeckleCard className="p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Giant Archival Quotation Mark Watermark */}
        <div
          aria-hidden="true"
          className="absolute -right-4 -bottom-10 text-[140px] sm:text-[180px] font-serif font-bold text-[var(--lib-ink)] opacity-[0.03] pointer-events-none select-none tracking-tighter"
        >
          &rdquo;
        </div>

        {/* Provenance Header & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lib-border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {quote.tradition && (
              <InkStampBadge variant="terracotta">
                {quote.tradition.toUpperCase()}
              </InkStampBadge>
            )}

            {quote.author_origin && (
              <span className="flex items-center gap-1 text-xs font-mono text-[var(--lib-accent)] font-semibold px-2 py-0.5 rounded bg-[var(--lib-surface)] border border-[var(--lib-border)]">
                <Compass className="w-3 h-3" />
                <span>{quote.author_origin}</span>
              </span>
            )}

            {quote.theme && (
              <span className="text-xs font-serif text-[var(--lib-ink-muted)]">
                • {quote.theme.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--lib-sage)] bg-[var(--lib-surface)] px-2 py-0.5 rounded border border-[var(--lib-border)]">
            <ShieldCheck className="w-3 h-3" />
            <span>{quote.license}</span>
          </div>
        </div>

        {/* Large Quote Presentation */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-[var(--lib-accent)]">
            <QuoteIcon className="w-5 h-5 fill-current opacity-80" />
            <span className="lib-meta text-[11px] text-[var(--lib-ink-muted)] uppercase tracking-wider">
              {quote.source_work ? quote.source_work : 'Verified Maxim'}
            </span>
          </div>

          <div className="font-serif text-xl sm:text-2xl text-[var(--lib-ink)] leading-relaxed italic pl-3 border-l-2 border-[var(--lib-accent)]">
            <QuoteReveal text={`“${quote.quote_text}”`} author={quote.author} work={quote.source_work} />
          </div>

          <div className="text-right pt-1">
            <p className="font-serif font-medium text-base text-[var(--lib-ink)]">
              — {quote.author}
            </p>
            {quote.source_work && (
              <p className="text-xs font-serif text-[var(--lib-ink-muted)] italic">
                {quote.source_work}
              </p>
            )}
          </div>
        </div>

        {/* Classical Meaning / Reflection Block */}
        {(quote.meaning || isEditingMeaning || onSaveMeaning) && (
          <div className="p-4 sm:p-5 rounded-md bg-[var(--lib-surface)] border border-[var(--lib-border-soft)] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="lib-meta text-[10px] text-[var(--lib-accent)] font-mono tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lib-accent)] inline-block" />
                Philosophical Reflection · Plain Mode Only
              </span>
              <div className="flex items-center gap-2">
                {quote.commentary_source && (
                  <span className="text-[10px] font-serif text-[var(--lib-ink-muted)] italic">
                    {quote.commentary_source}
                  </span>
                )}
                <InkStampBadge variant={isReviewed ? 'sage' : 'sepia'}>
                  {isReviewed ? 'Reviewed' : 'Pending Review'}
                </InkStampBadge>
                <button
                  id="btn-edit-quote-meaning"
                  type="button"
                  onClick={handleOpenEdit}
                  className="text-[11px] font-serif px-2 py-0.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] hover:border-[var(--lib-accent)] cursor-pointer"
                >
                  Edit / Approve
                </button>
              </div>
            </div>

            {isEditingMeaning ? (
              <div className="space-y-2 pt-1">
                <textarea
                  id="input-quote-meaning"
                  aria-label="Edit philosophical reflection"
                  value={draftMeaning}
                  onChange={(e) => setDraftMeaning(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-sm font-serif text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)]"
                />
                <input
                  id="input-quote-commentary-source"
                  type="text"
                  placeholder="Commentary source (optional)"
                  value={draftSource}
                  onChange={(e) => setDraftSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-xs font-serif text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    id="btn-save-quote-meaning"
                    type="button"
                    disabled={savingLocal || isSaving || !draftMeaning.trim()}
                    onClick={handleSaveAndApprove}
                    className="px-3 py-1 rounded border border-[var(--lib-accent)] bg-[var(--lib-accent-soft)] text-xs font-serif font-medium text-[var(--lib-ink)] cursor-pointer disabled:opacity-50"
                  >
                    {savingLocal || isSaving ? 'Saving...' : 'Save & Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMeaning(false)}
                    className="px-3 py-1 rounded border border-[var(--lib-border)] bg-[var(--lib-surface)] text-xs font-serif text-[var(--lib-ink-muted)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              quote.meaning && (
                <p className="font-serif text-sm sm:text-base text-[var(--lib-ink-secondary)] leading-relaxed">
                  {quote.meaning}
                </p>
              )
            )}
          </div>
        )}

        {/* Action Controls & External Archival Reference */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--lib-border)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCitation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-surface)] hover:bg-[var(--lib-surface-hover)] border border-[var(--lib-border)] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--lib-sage)]" />
                  <span className="text-[var(--lib-sage)] font-medium">Citation Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[var(--lib-ink-muted)]" />
                  <span>Copy Citation</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleBookmark}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-serif border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-[var(--lib-accent-soft)] border-[var(--lib-accent)] text-[var(--lib-ink)] font-medium'
                  : 'bg-[var(--lib-surface)] hover:bg-[var(--lib-surface-hover)] border-[var(--lib-border)] text-[var(--lib-ink)]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[var(--lib-accent)] text-[var(--lib-accent)]' : 'text-[var(--lib-ink-muted)]'}`} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          </div>

          <a
            href={quote.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-serif text-[var(--lib-accent)] hover:underline cursor-pointer"
          >
            <span>Archival Record: {quote.attribution}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DeckleCard>
    </div>
  );
};

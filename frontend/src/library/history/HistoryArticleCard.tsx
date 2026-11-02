/**
 * frontend/src/library/history/HistoryArticleCard.tsx
 * The primary reading desk folio for the selected historical news clipping.
 */
import React, { useState } from 'react';
import { DeckleCard } from '../ui/DeckleCard';
import { InkStampBadge } from '../ui/InkStampBadge';
import { BookRibbon } from '../ui/BookRibbon';
import { RoughHighlight } from '../ui/RoughHighlight';
import type { HistoryFeedItem } from './TodayInHistoryFeed';
import {
  ExternalLink,
  Bookmark,
  Share2,
  Check,
  Calendar,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

export interface HistoryArticleCardProps {
  item: HistoryFeedItem;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const HistoryArticleCard: React.FC<HistoryArticleCardProps> = ({
  item,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = `"${item.headline}" (${item.event_year}). Archival record: ${item.snippet} — Source: ${item.attribution} (${item.original_url})`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
    }
  };

  const formattedDate = item.event_year > 0
    ? `${item.event_date.replace(/^\d{4}-/, '')}, ${item.event_year}`
    : `${item.event_date}`;

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
        {/* Giant Archival Year Watermark */}
        <div
          aria-hidden="true"
          className="absolute -right-4 -bottom-10 text-[110px] sm:text-[140px] font-mono font-bold text-[var(--lib-ink)] opacity-[0.04] pointer-events-none select-none tracking-tighter"
        >
          {item.event_year}
        </div>

        {/* Provenance Header & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lib-border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <InkStampBadge variant="terracotta">
              {item.source_slug.replace(/_/g, ' ').toUpperCase()}
            </InkStampBadge>

            <span className="flex items-center gap-1 text-xs font-mono text-[var(--lib-accent)] font-semibold px-2 py-0.5 rounded bg-[var(--lib-surface)] border border-[var(--lib-border)]">
              <Calendar className="w-3 h-3" />
              <span>{item.event_year > 0 ? item.event_year : `${Math.abs(item.event_year)} BCE`}</span>
            </span>

            {item.country && (
              <span className="text-xs font-serif text-[var(--lib-ink-muted)]">
                • {item.country}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--lib-sage)] bg-[var(--lib-surface)] px-2 py-0.5 rounded border border-[var(--lib-border)]">
            <ShieldCheck className="w-3 h-3" />
            <span>{item.license}</span>
          </div>
        </div>

        {/* Archival Headline */}
        <div>
          <h2 className="lib-display text-2xl sm:text-3xl text-[var(--lib-ink)] leading-tight tracking-tight">
            <RoughHighlight type="underline" color="var(--lib-gold)" padding={2}>
              {item.headline}
            </RoughHighlight>
          </h2>
          <p className="text-xs text-[var(--lib-ink-muted)] font-serif mt-2 flex items-center gap-1.5">
            <Landmark className="w-3 h-3 text-[var(--lib-gold)]" />
            <span>Official Archival Clipping recorded for {formattedDate}</span>
          </p>
        </div>

        {/* Historic Media/Scan Thumbnail if present */}
        {item.media_url && (
          <div className="rounded-lg overflow-hidden border border-[var(--lib-border)] bg-[var(--lib-surface)] p-2 max-w-md mx-auto">
            <img
              src={item.media_url}
              alt={item.headline}
              className="w-full h-auto max-h-72 object-contain rounded filter sepia-[0.15]"
              loading="lazy"
            />
            <p className="text-[10px] text-[var(--lib-ink-muted)] font-serif italic text-center mt-1.5">
              Archival photograph / contemporary publication record
            </p>
          </div>
        )}

        {/* Verbatim Excerpt Text */}
        <div className="relative">
          <div className="prose prose-invert max-w-none">
            <p className="text-base sm:text-lg font-serif text-[var(--lib-ink)] leading-relaxed first-letter:float-left first-letter:text-4xl first-letter:font-display first-letter:font-bold first-letter:mr-2.5 first-letter:text-[var(--lib-accent)] first-letter:leading-none">
              {item.snippet}
            </p>
          </div>
        </div>

        {/* Verbatim Source Integrity Note */}
        <div className="p-3.5 rounded bg-[var(--lib-surface)] border border-[var(--lib-border)] text-xs font-serif text-[var(--lib-ink-muted)] space-y-1">
          <div className="font-sans text-[10px] uppercase tracking-wider font-semibold text-[var(--lib-ink)] flex items-center gap-1">
            <span>Archival Attribution & License</span>
          </div>
          <p className="leading-normal">
            {item.attribution}. Content provided verbatim from historic open registries under {item.license}.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--lib-border)]">
          {/* Bookmark Button */}
          <button
            type="button"
            onClick={onToggleBookmark}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-serif rounded-md border transition-all duration-150 ${
              isBookmarked
                ? 'bg-[var(--lib-terracotta)] text-white border-[var(--lib-terracotta)] shadow-sm'
                : 'bg-[var(--lib-surface)] text-[var(--lib-ink)] border-[var(--lib-border)] hover:border-[var(--lib-terracotta)] hover:text-[var(--lib-terracotta)]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Saved to Folio' : 'Save to Reading Folio'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Copy Citation */}
            <button
              type="button"
              onClick={handleCopyCitation}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-serif rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] text-[var(--lib-ink)] hover:border-[var(--lib-gold)] transition-colors"
              title="Copy academic citation to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--lib-sage)]" />
                  <span className="text-[var(--lib-sage)] font-medium">Citation Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[var(--lib-ink-muted)]" />
                  <span>Cite Record</span>
                </>
              )}
            </button>

            {/* View Original Archival Record */}
            <a
              href={item.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-serif rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] text-[var(--lib-accent)] hover:bg-[var(--lib-accent)] hover:text-white hover:border-[var(--lib-accent)] transition-all"
            >
              <span>Archival Document</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DeckleCard>
    </div>
  );
};

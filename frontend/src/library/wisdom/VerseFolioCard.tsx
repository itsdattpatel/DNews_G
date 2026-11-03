/**
 * frontend/src/library/wisdom/VerseFolioCard.tsx
 * Archival reading desk folio for sacred scripture verses.
 */
import React, { useState } from 'react';
import { DeckleCard } from '../ui/DeckleCard';
import { InkStampBadge } from '../ui/InkStampBadge';
import { BookRibbon } from '../ui/BookRibbon';
import { RoughHighlight } from '../ui/RoughHighlight';
import {
  ExternalLink,
  Bookmark,
  Share2,
  Check,
  BookOpen,
  ShieldCheck,
  Scroll,
} from 'lucide-react';

export interface ScriptureVerse {
  id: number;
  book_id: number;
  book_slug: string;
  book_title: string;
  section_number: number;
  verse_number: number;
  verse_ref: string;
  text_sanskrit: string;
  transliteration?: string;
  translation: string;
  translator: string;
  commentary_source?: string;
  meaning?: string;
  theme?: string;
  attribution: string;
  source_url: string;
  license: string;
  created_at: string;
}

export interface VerseFolioCardProps {
  verse: ScriptureVerse;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const VerseFolioCard: React.FC<VerseFolioCardProps> = ({
  verse,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = `${verse.book_title} (${verse.verse_ref}):\n\n${verse.text_sanskrit ? `${verse.text_sanskrit}\n\n` : ''}${verse.translation}\n— Translation: ${verse.translator} [${verse.license}]\nSource: ${verse.source_url}`;
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
        color="gold"
        className="hidden sm:block"
      />

      <DeckleCard className="p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Giant Archival Reference Watermark */}
        <div
          aria-hidden="true"
          className="absolute -right-6 -bottom-10 text-[90px] sm:text-[120px] font-mono font-bold text-[var(--lib-ink)] opacity-[0.03] pointer-events-none select-none tracking-tighter"
        >
          {verse.verse_ref.replace(/\s+/g, '')}
        </div>

        {/* Provenance Header & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lib-border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <InkStampBadge variant="gold">
              {verse.book_title.toUpperCase()}
            </InkStampBadge>

            <span className="flex items-center gap-1 text-xs font-mono text-[var(--lib-gold)] font-semibold px-2 py-0.5 rounded bg-[var(--lib-surface)] border border-[var(--lib-border)]">
              <BookOpen className="w-3 h-3" />
              <span>{verse.verse_ref}</span>
            </span>

            {verse.theme && (
              <span className="text-xs font-serif text-[var(--lib-ink-muted)]">
                • {verse.theme.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--lib-sage)] bg-[var(--lib-surface)] px-2 py-0.5 rounded border border-[var(--lib-border)]">
            <ShieldCheck className="w-3 h-3" />
            <span>{verse.license}</span>
          </div>
        </div>

        {/* Original Sanskrit / Devanagari Block */}
        {verse.text_sanskrit && (
          <div className="pl-4 sm:pl-6 border-l-2 border-[var(--lib-gold)] py-1 space-y-3 bg-[var(--lib-surface)]/40 rounded-r-sm">
            <div
              className="text-xl sm:text-2xl text-[var(--lib-ink)] font-normal whitespace-pre-line leading-[2] tracking-wide"
              style={{ fontFamily: 'var(--lib-font-devanagari), "Noto Serif Devanagari", serif' }}
            >
              {verse.text_sanskrit}
            </div>

            {/* Transliteration */}
            {verse.transliteration && (
              <div className="text-sm font-serif italic text-[var(--lib-ink-secondary)] leading-relaxed">
                {verse.transliteration}
              </div>
            )}
          </div>
        )}

        {/* English Translation */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Scroll className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
            <span className="lib-meta text-[11px] text-[var(--lib-ink-muted)] uppercase tracking-wider">
              English Translation ({verse.translator})
            </span>
          </div>
          <blockquote className="font-serif text-lg sm:text-xl text-[var(--lib-ink)] leading-relaxed pl-4 border-l-2 border-[var(--lib-border)]">
            <RoughHighlight type="highlight" color="var(--lib-gold-soft)" padding={3}>
              &ldquo;{verse.translation}&rdquo;
            </RoughHighlight>
          </blockquote>
        </div>

        {/* Classical Meaning / Reflection Block */}
        {verse.meaning && (
          <div className="p-4 sm:p-5 rounded-md bg-[var(--lib-surface)] border border-[var(--lib-border-soft)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="lib-meta text-[10px] text-[var(--lib-gold)] font-mono tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lib-gold)] inline-block" />
                Classical Reflection · Stored Plain Text
              </span>
              {verse.commentary_source && (
                <span className="text-[10px] font-serif text-[var(--lib-ink-muted)] italic">
                  {verse.commentary_source}
                </span>
              )}
            </div>
            <p className="font-serif text-sm sm:text-base text-[var(--lib-ink-secondary)] leading-relaxed">
              {verse.meaning}
            </p>
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
                  ? 'bg-[var(--lib-gold-soft)] border-[var(--lib-gold)] text-[var(--lib-ink)] font-medium'
                  : 'bg-[var(--lib-surface)] hover:bg-[var(--lib-surface-hover)] border-[var(--lib-border)] text-[var(--lib-ink)]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[var(--lib-gold)] text-[var(--lib-gold)]' : 'text-[var(--lib-ink-muted)]'}`} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          </div>

          <a
            href={verse.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-serif text-[var(--lib-gold)] hover:underline cursor-pointer"
          >
            <span>Archival Record: {verse.attribution}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DeckleCard>
    </div>
  );
};


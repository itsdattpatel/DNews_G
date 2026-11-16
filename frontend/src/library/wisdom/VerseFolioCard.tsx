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
  book_title?: string;
  section_number: number;
  verse_number: number;
  verse_ref: string;
  text_sanskrit?: string | null;
  text_original?: string | null;
  transliteration?: string | null;
  translation: string;
  translation_english?: string;
  translator: string;
  commentary_source?: string | null;
  meaning?: string | null;
  plain_meaning?: string | null;
  meaning_reviewed?: number;
  theme?: string | null;
  theme_tags?: string | null;
  attribution?: string;
  source_url: string;
  license?: string;
  source_license?: string;
  created_at: string;
}

export interface VerseFolioCardProps {
  verse: ScriptureVerse;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onSaveMeaning?: (
    verseId: number,
    patch: { plain_meaning: string; meaning_reviewed: number; commentary_source?: string },
  ) => Promise<void>;
  isSaving?: boolean;
}

export const VerseFolioCard: React.FC<VerseFolioCardProps> = ({
  verse,
  isBookmarked,
  onToggleBookmark,
  onSaveMeaning,
  isSaving = false,
}) => {
  const [copied, setCopied] = useState(false);
  const resolvedMeaning = verse.meaning ?? verse.plain_meaning ?? '';
  const resolvedTheme = verse.theme ?? verse.theme_tags ?? '';
  const resolvedBookTitle = verse.book_title || verse.book_slug || 'Sacred Text';
  const resolvedTranslation = verse.translation || verse.translation_english || '';
  const resolvedSanskrit = verse.text_sanskrit ?? verse.text_original ?? '';
  const resolvedLicense = verse.license || verse.source_license || 'Public Domain';
  const resolvedAttribution = verse.attribution || `${verse.translator}. ${resolvedLicense}.`;

  const [isEditingMeaning, setIsEditingMeaning] = useState(false);
  const [draftMeaning, setDraftMeaning] = useState(resolvedMeaning);
  const [draftSource, setDraftSource] = useState(verse.commentary_source ?? '');
  const [savingLocal, setSavingLocal] = useState(false);

  const isReviewed = Number(verse.meaning_reviewed ?? 0) === 1;

  const handleOpenEdit = () => {
    setDraftMeaning(resolvedMeaning);
    setDraftSource(verse.commentary_source ?? '');
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
        await onSaveMeaning(verse.id, patch);
      } else {
        await fetch(`/api/library/wisdom/verses/${verse.id}`, {
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
    const citation = `${resolvedBookTitle} (${verse.verse_ref}):\n\n${resolvedSanskrit ? `${resolvedSanskrit}\n\n` : ''}${resolvedTranslation}\n— Translation: ${verse.translator} [${resolvedLicense}]\nSource: ${verse.source_url}`;
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
              {resolvedBookTitle.toUpperCase()}
            </InkStampBadge>

            <span className="flex items-center gap-1 text-xs font-mono text-[var(--lib-gold)] font-semibold px-2 py-0.5 rounded bg-[var(--lib-surface)] border border-[var(--lib-border)]">
              <BookOpen className="w-3 h-3" />
              <span>{verse.verse_ref}</span>
            </span>

            {resolvedTheme && (
              <span className="text-xs font-serif text-[var(--lib-ink-muted)]">
                • {resolvedTheme.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--lib-sage)] bg-[var(--lib-surface)] px-2 py-0.5 rounded border border-[var(--lib-border)]">
            <ShieldCheck className="w-3 h-3" />
            <span>{resolvedLicense}</span>
          </div>
        </div>

        {/* Original Sanskrit / Devanagari Block */}
        {resolvedSanskrit && (
          <div className="pl-4 sm:pl-6 border-l-2 border-[var(--lib-gold)] py-1 space-y-3 bg-[var(--lib-surface)]/40 rounded-r-sm">
            <div
              className="text-xl sm:text-2xl text-[var(--lib-ink)] font-normal whitespace-pre-line leading-[2] tracking-wide"
              style={{ fontFamily: 'var(--lib-font-devanagari), "Noto Serif Devanagari", serif' }}
            >
              {resolvedSanskrit}
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
              &ldquo;{resolvedTranslation}&rdquo;
            </RoughHighlight>
          </blockquote>
        </div>

        {/* Classical Meaning / Reflection Block */}
        {(resolvedMeaning || isEditingMeaning || onSaveMeaning) && (
          <div className="p-4 sm:p-5 rounded-md bg-[var(--lib-surface)] border border-[var(--lib-border-soft)] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="lib-meta text-[10px] text-[var(--lib-gold)] font-mono tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lib-gold)] inline-block" />
                Classical Reflection · Stored Plain Text
              </span>
              <div className="flex items-center gap-2">
                {verse.commentary_source && (
                  <span className="text-[10px] font-serif text-[var(--lib-ink-muted)] italic">
                    {verse.commentary_source}
                  </span>
                )}
                <InkStampBadge variant={isReviewed ? 'sage' : 'sepia'}>
                  {isReviewed ? 'Reviewed' : 'Pending Review'}
                </InkStampBadge>
                <button
                  id="btn-edit-verse-meaning"
                  type="button"
                  onClick={handleOpenEdit}
                  className="text-[11px] font-serif px-2 py-0.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-[var(--lib-ink)] hover:border-[var(--lib-gold)] cursor-pointer"
                >
                  Edit / Approve
                </button>
              </div>
            </div>

            {isEditingMeaning ? (
              <div className="space-y-2 pt-1">
                <textarea
                  id="input-verse-meaning"
                  aria-label="Edit classical reflection"
                  value={draftMeaning}
                  onChange={(e) => setDraftMeaning(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-sm font-serif text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-gold)]"
                />
                <input
                  id="input-verse-commentary-source"
                  type="text"
                  placeholder="Commentary source (optional)"
                  value={draftSource}
                  onChange={(e) => setDraftSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] text-xs font-serif text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-gold)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    id="btn-save-verse-meaning"
                    type="button"
                    disabled={savingLocal || isSaving || !draftMeaning.trim()}
                    onClick={handleSaveAndApprove}
                    className="px-3 py-1 rounded border border-[var(--lib-gold)] bg-[var(--lib-gold-soft)] text-xs font-serif font-medium text-[var(--lib-ink)] cursor-pointer disabled:opacity-50"
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
              resolvedMeaning && (
                <p className="font-serif text-sm sm:text-base text-[var(--lib-ink-secondary)] leading-relaxed">
                  {resolvedMeaning}
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
            <span>Archival Record: {resolvedAttribution}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DeckleCard>
    </div>
  );
};


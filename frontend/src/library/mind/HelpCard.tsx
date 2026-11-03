/**
 * frontend/src/library/mind/HelpCard.tsx
 * Reading desk folio for evidence-based psychological self-help techniques.
 * Sourced strictly from open textbooks and public-domain classics.
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
  Clock,
  ShieldCheck,
  BookOpen,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export type MindCategory =
  | 'stress'
  | 'anxiety'
  | 'sleep'
  | 'focus'
  | 'habits'
  | 'anger'
  | 'grief'
  | 'relationships'
  | 'selftalk';

export interface MindCardData {
  id: number;
  slug: string;
  title: string;
  category: MindCategory;
  what_it_is: string;
  when_it_helps: string;
  steps: string[];
  time_needed_minutes: number;
  source_book: string;
  source_chapter: string;
  source_url: string;
  source_license: string;
  attribution: string;
  created_at: string;
}

export interface HelpCardProps {
  card: MindCardData;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const HelpCard: React.FC<HelpCardProps> = ({
  card,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citation = `"${card.title}" (${card.time_needed_minutes} min technique):\n\nMechanism: ${card.what_it_is}\n\nWhen it helps: ${card.when_it_helps}\n\nSource: ${card.attribution} (${card.source_url}) [${card.source_license}]`;
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
        color="sage"
        className="hidden sm:block"
      />

      <DeckleCard className="p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Giant Archival Duration Watermark */}
        <div
          aria-hidden="true"
          className="absolute -right-4 -bottom-10 text-[100px] sm:text-[130px] font-mono font-bold text-[var(--lib-ink)] opacity-[0.03] pointer-events-none select-none tracking-tighter"
        >
          {card.time_needed_minutes}m
        </div>

        {/* Provenance Header & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lib-border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <InkStampBadge variant="sage" shape="pill">
              {card.category.toUpperCase()}
            </InkStampBadge>

            <span className="flex items-center gap-1 text-xs font-mono text-[var(--lib-sage)] font-semibold px-2 py-0.5 rounded bg-[var(--lib-surface)] border border-[var(--lib-border)]">
              <Clock className="w-3 h-3" />
              <span>{card.time_needed_minutes} min practice</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--lib-sage)] bg-[var(--lib-surface)] px-2 py-0.5 rounded border border-[var(--lib-border)]">
            <ShieldCheck className="w-3 h-3" />
            <span>{card.source_license}</span>
          </div>
        </div>

        {/* Technique Title */}
        <div>
          <h2 className="lib-display text-2xl sm:text-3xl text-[var(--lib-ink)] leading-tight tracking-tight">
            <RoughHighlight type="underline" color="var(--lib-sage)" padding={2}>
              {card.title}
            </RoughHighlight>
          </h2>
          <p className="text-xs text-[var(--lib-ink-muted)] font-serif mt-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[var(--lib-sage)]" />
            <span>
              {card.source_book} • {card.source_chapter}
            </span>
          </p>
        </div>

        {/* Cognitive / Physiological Rationale Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-md bg-[var(--lib-surface)] border border-[var(--lib-border-soft)] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--lib-sage)] uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              <span>Physiological Mechanism</span>
            </div>
            <p className="font-serif text-sm text-[var(--lib-ink-secondary)] leading-relaxed">
              {card.what_it_is}
            </p>
          </div>

          <div className="p-4 rounded-md bg-[var(--lib-surface)] border border-[var(--lib-border-soft)] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--lib-accent)] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>When It Helps</span>
            </div>
            <p className="font-serif text-sm text-[var(--lib-ink-secondary)] leading-relaxed">
              {card.when_it_helps}
            </p>
          </div>
        </div>

        {/* Step-by-Step Guidance */}
        <div className="space-y-3 pt-2">
          <span className="lib-meta text-[11px] text-[var(--lib-sage)] uppercase tracking-wider block font-mono">
            Step-by-Step Practice ({card.steps.length} Steps):
          </span>
          <div className="space-y-2.5">
            {card.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-sm bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] transition-colors hover:border-[var(--lib-sage)]"
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold text-[var(--lib-sage)] bg-[var(--lib-sage-soft)] border border-[var(--lib-sage)] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="font-serif text-sm text-[var(--lib-ink)] leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

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
                  <span className="text-[var(--lib-sage)] font-medium">Technique Copied</span>
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
                  ? 'bg-[var(--lib-sage-soft)] border-[var(--lib-sage)] text-[var(--lib-ink)] font-medium'
                  : 'bg-[var(--lib-surface)] hover:bg-[var(--lib-surface-hover)] border-[var(--lib-border)] text-[var(--lib-ink)]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[var(--lib-sage)] text-[var(--lib-sage)]' : 'text-[var(--lib-ink-muted)]'}`} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          </div>

          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-serif text-[var(--lib-sage)] hover:underline cursor-pointer"
          >
            <span>Archival Source: {card.attribution}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DeckleCard>
    </div>
  );
};


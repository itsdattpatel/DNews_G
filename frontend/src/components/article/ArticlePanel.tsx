/**
 * frontend/src/components/article/ArticlePanel.tsx
 * Left Main Reader Column (60%): Broadsheet newspaper article desk.
 * Pure Tailwind, authentic ink-and-paper typography (Playfair Display + Source Serif 4),
 * original language toggle, anchor phrase highlights, and complete loading/empty/error states.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ExternalLink, Globe2, Languages, BookOpen, Sparkles } from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';
import { WelcomeBackCard } from './WelcomeBackCard';
import { AutoAdvanceProgressBar } from './AutoAdvanceProgressBar';
import { ConfirmationBadge } from '../common/ConfirmationBadge';
import type { Article } from '../../types';

// Ink-stamp category background & text colors per DESIGN_SYSTEM.md
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  World: { bg: 'bg-[#2C4A7C]/15', text: 'text-[#2C4A7C] dark:text-[#88B0E8]', border: 'border-[#2C4A7C]/40' },
  Politics: { bg: 'bg-[#5C1A1A]/15', text: 'text-[#5C1A1A] dark:text-[#E88888]', border: 'border-[#5C1A1A]/40' },
  Business: { bg: 'bg-[#1A3D1A]/15', text: 'text-[#1A3D1A] dark:text-[#88E888]', border: 'border-[#1A3D1A]/40' },
  Tech: { bg: 'bg-[#1A2A4A]/15', text: 'text-[#1A2A4A] dark:text-[#88A8E8]', border: 'border-[#1A2A4A]/40' },
  Science: { bg: 'bg-[#3A1A5C]/15', text: 'text-[#3A1A5C] dark:text-[#C888E8]', border: 'border-[#3A1A5C]/40' },
  Health: { bg: 'bg-[#1A3A3A]/15', text: 'text-[#1A3A3A] dark:text-[#88E8E8]', border: 'border-[#1A3A3A]/40' },
  Sports: { bg: 'bg-[#3A2A0A]/15', text: 'text-[#3A2A0A] dark:text-[#E8C888]', border: 'border-[#3A2A0A]/40' },
  Entertainment: { bg: 'bg-[#4A1A3A]/15', text: 'text-[#4A1A3A] dark:text-[#E888C8]', border: 'border-[#4A1A3A]/40' },
  Environment: { bg: 'bg-[#1A3A1A]/15', text: 'text-[#1A3A1A] dark:text-[#88E888]', border: 'border-[#1A3A1A]/40' },
  Crime: { bg: 'bg-[#3A1A1A]/15', text: 'text-[#3A1A1A] dark:text-[#E88888]', border: 'border-[#3A1A1A]/40' },
  Animals: { bg: 'bg-[#2A3A1A]/15', text: 'text-[#2A3A1A] dark:text-[#A8E888]', border: 'border-[#2A3A1A]/40' },
};

export interface ArticlePanelProps {
  article?: Article | null;
  plainMode?: boolean;
}

export const ArticlePanel: React.FC<ArticlePanelProps> = ({
  article: propArticle,
  plainMode: propPlainMode,
}) => {
  const storeArticle = useAppStore((s) => s.selectedArticle);
  const storePlainMode = useAppStore((s) => s.settings.plain_mode_enabled ?? false);
  const article = propArticle !== undefined ? propArticle : storeArticle;
  const isPlainMode = propPlainMode !== undefined ? propPlainMode : storePlainMode;
  const isLoading = useAppStore((s) => s.isLoading);
  const activeSentenceIndex = useAppStore((s) => s.activeSentenceIndex);
  const setActiveSentenceIndex = useAppStore((s) => s.setActiveSentenceIndex);
  const isEvidenceHighlightEnabled = useAppStore(
    (s) => s.settings.evidence_highlight_enabled ?? true
  );
  const setIsArticlePanelHovered = useAppStore((s) => s.setIsArticlePanelHovered);
  const enrichArticlePass2 = useAppStore((s) => s.enrichArticlePass2);

  const [showOriginal, setShowOriginal] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSummarizeStory = async () => {
    if (!article?.id || isEnriching) return;
    setIsEnriching(true);
    try {
      await enrichArticlePass2(article.id);
    } finally {
      setIsEnriching(false);
    }
  };

  const rawBody = showOriginal && article?.body_original
    ? article.body_original
    : (article?.body_english || article?.body_original || article?.summary || '');

  // Paragraphs formatting with anchor phrase highlighting
  const paragraphs = useMemo(() => {
    if (!rawBody) return [];
    return rawBody.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
  }, [rawBody]);

  // Reset showOriginal when article changes
  useEffect(() => {
    setShowOriginal(false);
  }, [article?.id]);

  // Scroll to active anchor when activeSentenceIndex changes (respecting reduced-motion)
  useEffect(() => {
    if (activeSentenceIndex !== null && scrollContainerRef.current) {
      const el = scrollContainerRef.current.querySelector(`#anchor-sentence-${activeSentenceIndex}`);
      if (el) {
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeSentenceIndex]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div
        id="article-panel-loading"
        data-lenis-prevent="true"
        className="w-full h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain p-8 sm:p-12 border-r border-paper-border bg-paper animate-pulse"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-20 bg-paper-border rounded-xs" />
          <div className="h-4 w-32 bg-paper-border rounded-xs" />
        </div>
        <div className="h-10 w-4/5 bg-paper-border rounded-xs mb-3" />
        <div className="h-10 w-3/5 bg-paper-border rounded-xs mb-8" />
        <div className="w-full flex flex-col gap-[3px] my-6">
          <div className="h-[2px] bg-paper-border w-full" />
          <div className="h-[1px] bg-paper-border w-full" />
        </div>
        <div className="space-y-4 max-w-prose">
          <div className="h-4 w-full bg-paper-border rounded-xs" />
          <div className="h-4 w-11/12 bg-paper-border rounded-xs" />
          <div className="h-4 w-full bg-paper-border rounded-xs" />
          <div className="h-4 w-4/5 bg-paper-border rounded-xs" />
          <div className="h-16 w-full" />
          <div className="h-4 w-full bg-paper-border rounded-xs" />
          <div className="h-4 w-10/12 bg-paper-border rounded-xs" />
        </div>
      </div>
    );
  }

  // Empty State
  if (!article) {
    return (
      <div
        id="article-panel-empty"
        data-lenis-prevent="true"
        className="w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center p-8 text-center border-r border-paper-border bg-paper"
      >
        <div className="p-4 border-2 border-ink rounded-xs bg-paper-alt mb-4 shadow-xs">
          <BookOpen size={36} className="text-ink" />
        </div>
        <h2 className="font-headline text-2xl font-bold text-ink tracking-tight mb-2">
          The Wire Dispatch Desk
        </h2>
        <p className="font-ui text-sm text-ink-secondary max-w-sm mb-4">
          Select any news story from the category rail or the bottom dispatch feed to read the full report.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-paper-border bg-paper-alt rounded-xs font-mono text-xs text-ink-muted">
          <span>Tip: Use keyboard <kbd className="font-bold text-ink">j</kbd> / <kbd className="font-bold text-ink">k</kbd> to cycle dispatches</span>
        </div>
      </div>
    );
  }

  const primaryCategory = (article.categories && article.categories[0]) || 'World';
  const catStyle = CATEGORY_STYLES[primaryCategory] || CATEGORY_STYLES.World;

  const title = showOriginal && article.title_original ? article.title_original : article.title_english;

  // Words count & reading time estimate
  const wordCount = rawBody ? rawBody.split(/\s+/).length : 0;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 220));

  const hasOriginal = Boolean(
    article.title_original &&
    article.title_original !== article.title_english &&
    article.language_detected &&
    article.language_detected.toLowerCase() !== 'en',
  );

  return (
    <div
      id="article-panel"
      ref={scrollContainerRef}
      data-lenis-prevent="true"
      onMouseEnter={() => setIsArticlePanelHovered(true)}
      onMouseLeave={() => setIsArticlePanelHovered(false)}
      className="w-full h-full min-h-0 min-w-0 relative overflow-y-auto overscroll-contain p-6 sm:p-10 lg:p-12 border-r border-paper-border bg-paper text-ink transition-colors duration-150"
    >
      {/* Auto-Advance Hairline Bar & Ambient Status (PRD A Category 2) */}
      <div className="-mx-6 sm:-mx-10 lg:-mx-12 -mt-6 sm:-mt-10 lg:-mt-12 mb-6 sticky top-0 z-30">
        <AutoAdvanceProgressBar />
      </div>

      {/* Real-time Downtime Welcome-Back Card (PRD A Category 1B) */}
      <WelcomeBackCard />

      {/* 1. Broadsheet Kicker & Wire Byline Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-paper-border">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Ink-Stamp Pill */}
          <span
            className={`font-ui text-[0.6875rem] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-xs border shadow-xs ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            {primaryCategory}
          </span>

          {/* Source Outlet */}
          <span className="font-ui text-xs font-bold uppercase tracking-wider text-ink">
            {article.source.name}
          </span>

          <span className="text-ink-muted text-xs">·</span>

          {/* Country */}
          <span className="inline-flex items-center gap-1 font-ui text-xs text-ink-secondary">
            <Globe2 size={12} className="text-ink-muted" />
            <span>{article.source.country}</span>
          </span>

          <span className="text-ink-muted text-xs">·</span>

          {/* Dual Timestamp (Category 1) */}
          <DualTimestamp
            publishedAt={article.published_at}
            ingestedAt={article.ingested_at || article.fetched_at}
            isCatchup={Boolean(article.is_catchup)}
          />

          <span className="text-ink-muted text-xs">·</span>

          {/* Reading Time */}
          <span className="font-ui text-xs text-ink-muted">
            {readTimeMin} min read
          </span>

          <span className="text-ink-muted text-xs">·</span>

          {/* Multi-Source Story Corroboration Stamp (PRD A Category 9) */}
          <ConfirmationBadge article={article} />

          {isPlainMode && (
            <>
              <span className="text-ink-muted text-xs">·</span>
              <span
                id="badge-plainmode-highlights"
                className="font-mono text-[0.6875rem] font-semibold text-ink-muted px-2 py-0.5 rounded-xs border border-paper-border bg-paper-alt"
                title="Plain Mode active: AI evidence highlights are offline"
              >
                Highlights offline (Plain Mode)
              </span>
            </>
          )}
        </div>

        {/* Translation Switch & Direct Source Link */}
        <div className="flex items-center gap-2">
          {isPlainMode ? (
            <div
              id="badge-plainmode-translation"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border border-paper-border bg-paper-alt text-xs font-mono text-ink-muted"
              title="Plain Mode active: AI translation is offline"
            >
              <Languages size={12} className="text-ink-muted" />
              <span>Translation offline (Plain Mode)</span>
            </div>
          ) : (
            hasOriginal && (
              <button
                id="language-toggle-btn"
                onClick={() => setShowOriginal(!showOriginal)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs border text-xs font-semibold transition-all shadow-xs ${
                  showOriginal
                    ? 'border-ink bg-ink text-paper'
                    : 'border-paper-border bg-paper-alt text-ink hover:border-ink hover:bg-paper'
                }`}
                title="Toggle Original vs English Translation"
              >
                <Languages size={13} />
                <span>{showOriginal ? `Original (${article.language_detected?.toUpperCase()})` : 'English Edition'}</span>
              </button>
            )
          )}

          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs border border-paper-border bg-paper-alt hover:border-ink text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
              title="View original article on publisher site"
            >
              <span>Publisher</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* 2. Main Broadsheet Headline */}
      <h1
        id="article-headline"
        className="font-headline text-3xl sm:text-4xl lg:text-[2.65rem] font-bold text-ink tracking-tight leading-[1.18] my-6"
      >
        {title}
      </h1>

      {/* 3. Broadsheet Double Rule Divider */}
      <div className="w-full flex flex-col gap-[3px] my-6" role="separator">
        <div className="h-[2px] bg-ink w-full" />
        <div className="h-[1px] bg-ink/50 w-full" />
      </div>

      {/* Pass 1 Lightweight Triage Banner & Summarize Story Action (PRD A Category 10) */}
      {!article.summary && !isPlainMode && (
        <div
          id="pass1-triage-callout"
          className="my-5 p-4 sm:p-5 rounded-xs border-2 border-dashed border-ink/40 bg-paper-alt shadow-xs"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="font-mono text-[0.6875rem] font-bold text-accent uppercase tracking-wider px-2 py-0.5 rounded-xs border border-accent bg-accent/15">
                  ✦ Triaged via Pass 1
                </span>
                <span className="font-ui text-xs font-semibold text-ink-secondary">
                  Urgency Score: {article.breaking_score}%
                </span>
              </div>
              <p className="font-ui text-xs text-ink-secondary mt-1.5 leading-relaxed">
                In-depth executive synthesis and verbatim anchor phrases deferred to conserve AI quota.
              </p>
            </div>
            <button
              id="btn-summarize-story-pass2"
              onClick={handleSummarizeStory}
              disabled={isEnriching}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink rounded-xs font-ui text-xs font-bold uppercase tracking-wider transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
              title="Request deep executive summary and verbatim anchor phrases"
            >
              {isEnriching ? (
                <>
                  <span className="animate-spin text-sm">✦</span>
                  <span>Synthesizing Story…</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Summarize Story</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. Article Body Reading Surface */}
      <article
        id="article-body-surface"
        className="font-body text-[1.125rem] leading-[1.8] text-ink font-normal space-y-5 max-w-prose select-text"
      >
        {paragraphs.map((para: string, pIdx: number) => {
          const anchors = article.anchor_phrases || [];
          let renderedContent: React.ReactNode = para;

          if (isEvidenceHighlightEnabled && !showOriginal && anchors.length > 0) {
            type Match = { start: number; end: number; phrase: string; sentence_index: number };
            const matches: Match[] = [];

            for (const a of anchors) {
              if (!a?.phrase) continue;
              let pos = 0;
              while ((pos = para.indexOf(a.phrase, pos)) !== -1) {
                matches.push({
                  start: pos,
                  end: pos + a.phrase.length,
                  phrase: a.phrase,
                  sentence_index: a.sentence_index,
                });
                pos += a.phrase.length;
              }
            }

            if (matches.length > 0) {
              matches.sort((a, b) => a.start - b.start);
              const nonOverlapping: Match[] = [];
              let lastEnd = 0;
              for (const m of matches) {
                if (m.start >= lastEnd) {
                  nonOverlapping.push(m);
                  lastEnd = m.end;
                }
              }

              const nodes: React.ReactNode[] = [];
              let cursor = 0;
              nonOverlapping.forEach((m, mIdx) => {
                if (m.start > cursor) {
                  nodes.push(para.slice(cursor, m.start));
                }
                const isActive = activeSentenceIndex === m.sentence_index;
                nodes.push(
                  <mark
                    key={`anchor-${pIdx}-${mIdx}`}
                    id={`anchor-sentence-${m.sentence_index}`}
                    data-sentence-index={m.sentence_index}
                    onMouseEnter={() => setActiveSentenceIndex(m.sentence_index)}
                    onMouseLeave={() => setActiveSentenceIndex(null)}
                    onClick={() => setActiveSentenceIndex(m.sentence_index)}
                    className={`evidence-anchor evidence-marker cursor-pointer ${
                      isActive ? 'evidence-marker--active' : ''
                    }`}
                    title={`Verbatim evidence supporting Summary § ${m.sentence_index + 1}`}
                  >
                    {m.phrase}
                  </mark>
                );
                cursor = m.end;
              });

              if (cursor < para.length) {
                nodes.push(para.slice(cursor));
              }

              renderedContent = nodes;
            }
          }

          return (
            <p
              key={pIdx}
              className={`${
                pIdx === 0
                  ? 'first-letter:text-5xl first-letter:font-headline first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-ink'
                  : ''
              }`}
            >
              {renderedContent}
            </p>
          );
        })}
      </article>

      {/* 5. End of Story Colophon */}
      <div className="mt-12 pt-6 border-t border-paper-border flex items-center justify-between font-ui text-xs text-ink-muted">
        <span>The World Desk Dispatch Archives · Published under Fair Use News Monitoring</span>
        <span className="font-mono text-[0.625rem]">REF #{article.id}</span>
      </div>
    </div>
  );
};

export default ArticlePanel;

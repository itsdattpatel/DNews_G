/**
 * frontend/src/components/article/ArticlePanel.tsx
 * Left Main Reader Column (60%): Broadsheet newspaper article desk.
 * Pure Tailwind, authentic ink-and-paper typography (Playfair Display + Source Serif 4),
 * original language toggle, anchor phrase highlights, and complete loading/empty/error states.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ExternalLink, Globe2, Languages, Clock, BookOpen } from 'lucide-react';

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

export const ArticlePanel: React.FC = () => {
  const article = useAppStore((s) => s.selectedArticle);
  const isLoading = useAppStore((s) => s.isLoading);
  const activeSentenceIndex = useAppStore((s) => s.activeSentenceIndex);
  const setActiveSentenceIndex = useAppStore((s) => s.setActiveSentenceIndex);

  const [showOriginal, setShowOriginal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const rawBody = showOriginal && article?.body_original
    ? article.body_original
    : (article?.body_english || article?.body_original || article?.summary || '');

  // Paragraphs formatting with anchor phrase highlighting
  const paragraphs = useMemo(() => {
    if (!rawBody) return [];
    return rawBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  }, [rawBody]);

  // Reset showOriginal when article changes
  useEffect(() => {
    setShowOriginal(false);
  }, [article?.id]);

  // Scroll to active anchor when activeSentenceIndex changes
  useEffect(() => {
    if (activeSentenceIndex !== null && scrollContainerRef.current) {
      const el = scrollContainerRef.current.querySelector(`#anchor-sentence-${activeSentenceIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSentenceIndex]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div
        id="article-panel-loading"
        className="flex-[3] h-full overflow-y-auto p-8 sm:p-12 border-r-2 border-ink bg-paper animate-pulse"
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
        className="flex-[3] h-full flex flex-col items-center justify-center p-8 text-center border-r-2 border-ink bg-paper"
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

  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Wire Report';

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
      className="flex-[3] h-full overflow-y-auto p-6 sm:p-10 lg:p-12 border-r-2 border-ink bg-paper text-ink transition-colors duration-150"
    >
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

          {/* Timestamp */}
          <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-ink-muted">
            <Clock size={11} />
            <span>{formattedDate}</span>
          </span>

          <span className="text-ink-muted text-xs">·</span>

          {/* Reading Time */}
          <span className="font-ui text-xs text-ink-muted">
            {readTimeMin} min read
          </span>
        </div>

        {/* Translation Switch & Direct Source Link */}
        <div className="flex items-center gap-2">
          {hasOriginal && (
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

      {/* 4. Article Body Reading Surface */}
      <article
        id="article-body-surface"
        className="font-body text-[1.125rem] leading-[1.8] text-ink font-normal space-y-5 max-w-prose select-text"
      >
        {paragraphs.map((para, pIdx) => {
          // If anchor phrases exist, check if paragraph contains them
          const anchors = article.anchor_phrases || [];
          let renderedContent: React.ReactNode = para;

          if (anchors.length > 0 && !showOriginal) {
            // Find anchors matching this paragraph
            for (let aIdx = 0; aIdx < anchors.length; aIdx++) {
              const a = anchors[aIdx];
              if (a && a.phrase && para.includes(a.phrase)) {
                const parts = para.split(a.phrase);
                const isActive = activeSentenceIndex === a.sentence_index;

                renderedContent = (
                  <>
                    {parts[0]}
                    <mark
                      id={`anchor-sentence-${a.sentence_index}`}
                      data-sentence-index={a.sentence_index}
                      onMouseEnter={() => setActiveSentenceIndex(a.sentence_index)}
                      onMouseLeave={() => setActiveSentenceIndex(null)}
                      className={`spider-anchor cursor-pointer px-1 py-0.5 rounded-xs transition-all ${
                        isActive
                          ? 'bg-accent/25 text-ink font-medium border-b-2 border-accent'
                          : 'bg-amber-200/50 dark:bg-amber-900/35 hover:bg-amber-300/60 dark:hover:bg-amber-800/50 text-ink'
                      }`}
                      title={`Linked to Summary Sentence § ${a.sentence_index + 1}`}
                    >
                      {a.phrase}
                    </mark>
                    {parts.slice(1).join(a.phrase)}
                  </>
                );
                break;
              }
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

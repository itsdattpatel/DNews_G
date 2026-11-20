/**
 * frontend/src/components/article/ArticlePanel.tsx
 * Unified Full-Box Broadsheet Reader Desk:
 * - Pure broadsheet typography (Playfair Display + Source Serif 4)
 * - Telegraphic Scrambled Text headline animation with full custom settings
 * - Integrated Executive Wire Synthesis & Evidence Anchor Highlights
 * - Expansive single-box layout with bottom clearance for floating Circular Dock
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ExternalLink, Globe2, Languages, BookOpen, Sparkles, Layers, Clock, Star, Radio, RefreshCw } from 'lucide-react';
import { DualTimestamp } from '../common/DualTimestamp';
import { WelcomeBackCard } from './WelcomeBackCard';
import { ConfirmationBadge } from '../common/ConfirmationBadge';
import { EntityDossierDrawer } from './EntityDossierDrawer';
import { ReaderLayoutSwitcher } from './ReaderLayoutSwitcher';
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
  articles?: Article[];
  plainMode?: boolean;
}

export const ArticlePanel: React.FC<ArticlePanelProps> = ({
  article: propArticle,
  articles: propArticles,
  plainMode: propPlainMode,
}) => {
  const storeArticle = useAppStore((s) => s.selectedArticle);
  const storePlainMode = useAppStore((s) => s.settings.plain_mode_enabled ?? false);
  const storeArticles = useAppStore((s) => s.articles);
  const articles = propArticles !== undefined ? propArticles : storeArticles;
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
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);
  const setTimelineClusterId = useAppStore((s) => s.setTimelineClusterId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const readerLayout = useAppStore((s) => s.readerLayout);

  const [showOriginal, setShowOriginal] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isManualFetching, setIsManualFetching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleManualFetchNow = async () => {
    setIsManualFetching(true);
    try {
      await fetch('/api/control-room/fetch-cycle', { method: 'POST' });
      const res = await fetch('/api/articles?limit=60&status=done');
      if (res.ok) {
        const data = (await res.json()) as { total: number; items: Article[] };
        if (data.items?.length > 0) {
          useAppStore.getState().setArticles(data.items, data.total);
        }
      }
    } catch (err) {
      console.warn('[ArticlePanel] Manual fetch failed:', err);
    } finally {
      setIsManualFetching(false);
    }
  };

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

  // Split summary into sentences for executive highlights
  const summarySentences = useMemo(() => {
    if (!article?.summary) return [];
    const raw = article.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [article.summary];
    return raw.map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }, [article?.summary]);

  // Paragraphs formatting with anchor phrase highlighting
  const paragraphs = useMemo(() => {
    if (!rawBody) return [];
    return rawBody.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
  }, [rawBody]);

  // Entity Dossier state
  const [selectedEntityForDossier, setSelectedEntityForDossier] = useState<string | null>(null);

  const entityKeywords = useMemo(() => {
    if (!article) return [];
    if (article.keywords && article.keywords.length > 0) {
      return Array.from(new Set(article.keywords)).slice(0, 8);
    }
    // Fallback: extract key proper nouns from the title
    const titleWords = (article.title_english || '')
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter((w) => w.length > 3 && w[0] === w[0].toUpperCase());
    return Array.from(new Set(titleWords)).slice(0, 5);
  }, [article]);

  // Reset showOriginal when article changes
  useEffect(() => {
    setShowOriginal(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [article?.id]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div
        id="article-panel-loading"
        data-lenis-prevent="true"
        className="w-full h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain p-6 sm:p-10 lg:p-12 bg-paper animate-pulse space-y-6"
      >
        <div className="h-4 bg-paper-border/60 rounded-xs w-1/4" />
        <div className="h-10 bg-paper-border/80 rounded-xs w-3/4" />
        <div className="h-2 bg-paper-border/40 rounded-xs w-full" />
        <div className="space-y-3 pt-4">
          <div className="h-4 bg-paper-border/60 rounded-xs w-full" />
          <div className="h-4 bg-paper-border/60 rounded-xs w-5/6" />
          <div className="h-4 bg-paper-border/60 rounded-xs w-4/6" />
        </div>
      </div>
    );
  }

  // Empty State
  if (!article) {
    if (!articles || articles.length === 0) {
      return (
        <div
          id="article-panel-first-run"
          data-lenis-prevent="true"
          className="w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center p-8 text-center bg-paper"
        >
          <div className="inline-block px-3 py-1 border border-accent/40 bg-accent/10 rounded-xs font-mono text-[11px] font-bold tracking-widest text-accent uppercase mb-4">
            ★ HOT OFF THE PRESS — FIRST EDITION ★
          </div>
          <div className="p-4 border-2 border-ink rounded-xs bg-paper-alt mb-4 shadow-sm relative">
            <Radio size={36} className="text-ink animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
            </span>
          </div>
          <h2 className="font-headline text-3xl font-bold text-ink tracking-tight mb-2">
            Printing Today's First Edition
          </h2>
          <div className="w-32 h-0.5 bg-ink/20 my-2 mx-auto" />
          <p className="font-serif italic text-base text-ink-secondary max-w-md mb-2">
            The global telegraph wire is actively gathering and formatting dispatches from 155 international bureaus across 70+ nations.
          </p>
          <p className="font-ui text-xs text-ink-muted max-w-sm mb-6">
            Stories will appear on your broadsheet desk automatically as incoming reports are verified and normalized.
          </p>
          <button
            type="button"
            onClick={handleManualFetchNow}
            disabled={isManualFetching}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-ink bg-paper-alt hover:bg-paper active:bg-paper-alt font-ui text-xs font-bold uppercase tracking-wider text-ink shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isManualFetching ? 'animate-spin' : ''} />
            <span>{isManualFetching ? 'Connecting to Global Wires...' : 'Fetch Wire Dispatches Now'}</span>
          </button>
        </div>
      );
    }

    return (
      <div
        id="article-panel-empty"
        data-lenis-prevent="true"
        className="w-full h-full min-h-0 min-w-0 flex flex-col items-center justify-center p-8 text-center bg-paper"
      >
        <div className="p-4 border-2 border-ink rounded-xs bg-paper-alt mb-4 shadow-xs">
          <BookOpen size={36} className="text-ink" />
        </div>
        <h2 className="font-headline text-2xl font-bold text-ink tracking-tight mb-2">
          The Wire Dispatch Desk
        </h2>
        <p className="font-ui text-sm text-ink-secondary max-w-sm mb-4">
          Select any news story from the category rail or the bottom circling docker to read the full report.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-paper-border bg-paper-alt rounded-xs font-mono text-xs text-ink-muted">
          <span>Tip: Use keyboard <kbd className="font-bold text-ink">j</kbd> / <kbd className="font-bold text-ink">k</kbd> to cycle dispatches</span>
        </div>
      </div>
    );
  }

  const primaryCategory = (article.categories && article.categories[0]) || 'World';
  const catStyle = CATEGORY_STYLES[primaryCategory] || CATEGORY_STYLES.World;

  const title = (showOriginal && article.title_original ? article.title_original : article.title_english) || 'Untitled Dispatch';

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
      className="w-full h-full min-h-0 min-w-0 relative overflow-y-auto overscroll-contain px-6 sm:px-12 lg:px-20 pt-6 sm:pt-10 pb-56 sm:pb-64 bg-paper text-ink transition-colors duration-150 scroll-anchor-auto"
    >
      {/* Real-time Downtime Welcome-Back Card */}
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

          {/* Dual Timestamp */}
          <DualTimestamp
            publishedAt={article.published_at}
            ingestedAt={article.ingested_at || article.fetched_at}
            isCatchup={Boolean(article.is_catchup)}
          />

          <span className="text-ink-muted text-xs">·</span>

          {/* Reading Time */}
          <span className="font-ui text-xs tabular-nums text-ink-muted">
            {readTimeMin} min read
          </span>

          <span className="text-ink-muted text-xs">·</span>

          {/* Multi-Source Story Corroboration Stamp */}
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

        {/* Right Action Links: Layout Switcher, Translation Toggle & Original Publisher */}
        <div className="flex flex-wrap items-center gap-2">
          <ReaderLayoutSwitcher />

          <button
            onClick={() => toggleBookmark(article.id)}
            className="p-1.5 rounded-xs border border-paper-border bg-paper-alt hover:border-ink text-ink-secondary hover:text-amber-600 transition-colors"
            title={article.bookmarked ? 'Remove bookmark' : 'Bookmark story'}
          >
            <Star
              size={13}
              fill={article.bookmarked ? 'currentColor' : 'none'}
              className={article.bookmarked ? 'text-amber-600' : 'text-ink-muted'}
            />
          </button>

          {hasOriginal && (
            isPlainMode ? (
              <span
                id="tooltip-plainmode-trans-toggle"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs border border-paper-border/60 bg-paper-alt/40 text-xs font-semibold text-ink-muted opacity-60 cursor-not-allowed"
                title="Language switching disabled while in Plain Mode"
              >
                <Languages size={13} />
                <span>Original ({article.language_detected?.toUpperCase()})</span>
              </span>
            ) : (
              <button
                id="btn-language-toggle"
                onClick={() => setShowOriginal(!showOriginal)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs border border-paper-border bg-paper-alt hover:border-ink text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                title={showOriginal ? 'Switch to English translation' : 'Switch to original language text'}
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

      {/* 2. Main Headline Presentation based on readerLayout */}
      {readerLayout === 'wire' ? (
        <div id="wire-terminal-headline-box" className="my-6 p-4 border-2 border-ink bg-paper-alt shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-accent font-mono text-[11px] font-bold uppercase tracking-widest pb-2 border-b border-paper-border mb-3">
            <span>&gt;&gt;&gt; URGENT WIRE TELETYPE DISPATCH // REF #{article.id}</span>
            <span className="px-2 py-0.5 bg-accent/15 border border-accent rounded-xs">
              URGENCY: {article.breaking_score}%
            </span>
          </div>
          <h1
            id="article-headline"
            className="font-mono text-2xl sm:text-3xl font-bold text-ink uppercase tracking-tight leading-snug"
          >
            {title}
          </h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-paper-border font-mono text-[11px] text-ink-secondary">
            <div>LOC: <span className="text-ink font-bold uppercase">{article.source.country}</span></div>
            <div>BUREAU: <span className="text-ink font-bold uppercase">{article.source.name}</span></div>
            <div>STATUS: <span className="text-positive font-bold uppercase">VERIFIED</span></div>
            <div>LENGTH: <span className="text-ink font-bold tabular-nums">{wordCount} WORDS</span></div>
          </div>
        </div>
      ) : readerLayout === 'photojournalism' ? (
        <div id="photojournalism-layout-header" className="my-6 space-y-4">
          {/* Full-Bleed Editorial Hero Visual */}
          <div
            id="photojournalism-hero-banner"
            className="relative w-full h-64 sm:h-80 md:h-96 rounded-xs overflow-hidden border-2 border-ink bg-paper-alt shadow-sm"
          >
            <img
              src={(article as { image_url?: string }).image_url || `https://picsum.photos/seed/${article.id}/1200/600`}
              alt={title}
              className="w-full h-full object-cover filter contrast-[1.05]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${article.id + 10}/1200/600`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-paper">
              <span className="bg-ink/90 px-2 py-0.5 rounded-2xs uppercase tracking-wider font-bold">
                Photojournalism Bureau • {article.source.name}
              </span>
              <span className="text-paper/80 italic font-serif">
                Dispatch location: {article.source.country}
              </span>
            </div>
          </div>

          <h1
            id="article-headline"
            className="font-headline text-3xl sm:text-4xl lg:text-[2.85rem] font-black text-ink tracking-tight leading-[1.15] pt-2"
          >
            {title}
          </h1>

          <div className="w-full h-[1px] bg-paper-border" />
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Entity & Key Figures Dossier Bar */}
      {entityKeywords.length > 0 && (
        <div id="entity-dossier-bar" className="my-4 p-3 bg-paper-alt border border-paper-border rounded-xs flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-ink-muted font-mono text-[10px] uppercase font-bold tracking-wider mr-1">
            <span className="text-accent font-bold">✦</span>
            <span>Key Figures:</span>
          </div>
          {entityKeywords.map((kw, i) => (
            <button
              key={i}
              id={`btn-entity-dossier-${i}`}
              onClick={() => setSelectedEntityForDossier(kw)}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-paper-border hover:border-ink bg-paper rounded-xs font-mono text-xs text-ink transition-colors hover:shadow-2xs cursor-pointer group"
              title={`Inspect Intelligence Dossier for ${kw}`}
            >
              <span className="text-accent text-[10px]">✦</span>
              <span className="font-semibold underline decoration-accent/60 underline-offset-2 group-hover:text-accent">
                {kw}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pass 1 Lightweight Triage Banner */}
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

      {/* Integrated Executive Synthesis Brief */}
      {article.summary && (
        <section
          id="executive-wire-brief"
          aria-label="Executive Wire Dispatch"
          className="my-6 p-5 sm:p-6 rounded-lg border-2 border-ink/30 bg-paper-alt/80 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-paper-border">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" />
              <h3 className="font-headline text-base sm:text-lg font-bold text-ink uppercase tracking-wide">
                Executive Dispatch Brief
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {article.cluster_id && (
                <>
                  <button
                    onClick={() => {
                      setCompareClusterId(article.cluster_id);
                      setCurrentView('compare');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-paper-border bg-paper hover:border-ink text-ink transition-colors"
                    title="Compare coverage across global newsrooms"
                  >
                    <Layers size={12} />
                    <span>Compare Outlets</span>
                  </button>
                  <button
                    onClick={() => {
                      setTimelineClusterId(article.cluster_id);
                      setCurrentView('timeline');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-paper-border bg-paper hover:border-ink text-ink transition-colors"
                    title="View evolutionary timeline of this story"
                  >
                    <Clock size={12} />
                    <span>Story Timeline</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2.5 font-body text-base sm:text-[1.0625rem] text-ink leading-relaxed">
            {summarySentences.map((s, idx) => {
              const isActive = activeSentenceIndex === idx;
              return (
                <p
                  key={idx}
                  onMouseEnter={() => setActiveSentenceIndex(idx)}
                  onMouseLeave={() => setActiveSentenceIndex(null)}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    isActive ? 'bg-amber-100/70 dark:bg-amber-950/40 font-semibold' : 'hover:bg-paper/60'
                  }`}
                >
                  <span className="font-mono text-xs text-ink-muted mr-2 font-bold select-none">
                    §{idx + 1}
                  </span>
                  {s}
                </p>
              );
            })}
          </div>
        </section>
      )}

      {/* Photojournalism Pull-Quote Callout (Pillar 4) */}
      {readerLayout === 'photojournalism' && article.summary && (
        <div
          id="photojournalism-pullquote"
          className="my-8 py-6 px-8 border-y-2 border-ink bg-paper-alt/50 relative text-center max-w-2xl mx-auto"
        >
          <span className="text-accent text-5xl font-serif leading-none absolute -top-4 left-6 select-none opacity-80">“</span>
          <blockquote className="font-serif italic text-xl sm:text-2xl text-ink leading-relaxed">
            {summarySentences[0] || article.summary}
          </blockquote>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
            — Key Dispatch Quote • The World Desk
          </div>
        </div>
      )}

      {/* 4. Article Body Reading Surface adapted for readerLayout */}
      <article
        id="article-body-surface"
        className={`select-text my-8 ${
          readerLayout === 'wire'
            ? 'font-mono text-xs sm:text-sm leading-relaxed text-ink space-y-4 max-w-4xl p-5 border border-paper-border bg-paper-alt/40 rounded-xs'
            : readerLayout === 'photojournalism'
            ? 'font-serif text-[1.1875rem] sm:text-[1.25rem] leading-[2.0] text-ink font-normal space-y-7 max-w-2xl mx-auto'
            : 'font-body text-[1.125rem] sm:text-[1.1875rem] leading-[1.85] text-ink font-normal space-y-6 max-w-3xl'
        }`}
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
                readerLayout === 'broadsheet' && pIdx === 0
                  ? 'first-letter:text-5xl first-letter:font-headline first-letter:font-bold first-letter:float-left first-letter:mr-3.5 first-letter:leading-none first-letter:text-ink'
                  : readerLayout === 'wire'
                  ? 'flex items-start gap-2.5 font-mono'
                  : ''
              }`}
            >
              {readerLayout === 'wire' && (
                <span className="font-mono text-[10px] text-accent select-none shrink-0 pt-0.5 font-bold">
                  &gt;&gt; [{String(pIdx + 1).padStart(3, '0')}]
                </span>
              )}
              <span className="flex-1">{renderedContent}</span>
            </p>
          );
        })}
      </article>

      {/* 5. End of Story Colophon */}
      <div className="mt-12 pt-6 border-t border-paper-border flex items-center justify-between font-ui text-xs text-ink-muted">
        <span>The World Desk Dispatch Archives · Published under Fair Use News Monitoring</span>
        <span className="font-mono text-[0.625rem]">REF #{article.id}</span>
      </div>

      {/* Slide-over Entity Dossier Panel */}
      <EntityDossierDrawer
        entityName={selectedEntityForDossier}
        onClose={() => setSelectedEntityForDossier(null)}
      />
    </div>
  );
};

export default ArticlePanel;

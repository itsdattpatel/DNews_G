/**
 * frontend/src/components/sunday/SundayEditionDesk.tsx
 * The Sunday Broadsheet Magazine Edition (PRD Master Expansion #38).
 * Curated long-form weekend synthesis of major investigative stories,
 * scientific breakthroughs, and cultural essays in luxury magazine typography.
 */
import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { generateArticleMarkdown, downloadMarkdownFile } from '../../lib/exportToMarkdown';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Sparkles,
  Download,
  Feather,
  Globe2,
} from 'lucide-react';
import type { Article } from '../../types';

export const SundayEditionDesk: React.FC = () => {
  const articles = useAppStore((s) => s.articles);
  const setSelectedArticle = useAppStore((s) => s.setSelectedArticle);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Group articles into Sunday departments
  const leadStory = articles[0] || null;
  const investigativeFeatures = useMemo(() => articles.slice(1, 4), [articles]);
  const scienceAndNature = useMemo(
    () => articles.filter((a) => a.categories?.some((c) => ['Science', 'Tech', 'Environment', 'Animals'].includes(c))).slice(0, 3),
    [articles]
  );
  const globalDispatches = useMemo(() => articles.slice(4, 8), [articles]);

  const handleRead = (art: Article) => {
    triggerHaptic('selection');
    setSelectedArticle(art);
    setCurrentView('reader');
  };

  const handleExportSundayFolio = () => {
    triggerHaptic('bookmark');
    if (!leadStory) return;
    const md = generateArticleMarkdown(leadStory);
    downloadMarkdownFile(`Sunday-Edition-${new Date().toISOString().split('T')[0]}.md`, md);
  };

  return (
    <div
      id="sunday-edition-desk"
      className="w-full h-full min-h-0 min-w-0 overflow-y-auto bg-paper text-ink p-4 sm:p-8 lg:p-14 select-none"
    >
      {/* Magazine Folio Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-4 border-double border-ink mb-8">
        <div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setCurrentView('reader');
            }}
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink-secondary hover:text-ink mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to Dispatch Reader</span>
          </button>
          <div className="flex items-center gap-2.5">
            <Feather size={24} className="text-accent" />
            <h1 className="font-masthead text-3xl sm:text-4xl font-bold uppercase tracking-tight text-ink">
              The Sunday Broadsheet Magazine
            </h1>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-ink-muted mt-1.5">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              <span>Weekly Long-Form Edition · Vol. XLVIII</span>
            </span>
            <span>·</span>
            <span>Comprehensive Investigative Inquiries &amp; Essays</span>
          </div>
        </div>

        {/* Action Button: Export Folio */}
        <button
          id="btn-export-sunday-edition"
          onClick={handleExportSundayFolio}
          className="px-4 py-2 border-2 border-ink bg-ink text-paper rounded-xs font-mono text-xs font-bold uppercase tracking-wider hover:bg-paper hover:text-ink transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <Download size={13} />
          <span>Export Sunday Folio (MD)</span>
        </button>
      </div>

      {/* 1. Cover Lead Investigation */}
      {leadStory && (
        <section className="mb-12 border-2 border-ink bg-paper-alt p-6 sm:p-10 rounded-xs shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-paper-border">
            <span className="font-mono text-xs font-bold text-accent uppercase tracking-widest px-2.5 py-0.5 rounded-xs border border-accent/40 bg-accent/10">
              ★ Cover Feature Story
            </span>
            <span className="font-mono text-xs text-ink-muted">
              {leadStory.source.name} · {leadStory.source.country}
            </span>
          </div>

          <h2
            onClick={() => handleRead(leadStory)}
            className="font-headline text-2xl sm:text-4xl font-bold text-ink leading-tight hover:text-accent transition-colors cursor-pointer mb-4"
          >
            {leadStory.title_english}
          </h2>

          <div className="font-serif text-base sm:text-lg text-ink-secondary leading-relaxed space-y-4 max-w-4xl">
            <p className="first-letter:text-5xl first-letter:font-bold first-letter:font-masthead first-letter:float-left first-letter:mr-3 first-letter:text-ink">
              {leadStory.summary || leadStory.body_english?.slice(0, 320) || 'An in-depth geopolitical retrospective exploring long-term global currents.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-paper-border flex items-center justify-between">
            <button
              onClick={() => handleRead(leadStory)}
              className="font-mono text-xs font-bold uppercase tracking-wider text-ink hover:text-accent flex items-center gap-1.5 cursor-pointer"
            >
              <span>Read Complete Cover Dispatch</span>
              <span>&rarr;</span>
            </button>
            <span className="font-mono text-[11px] text-ink-muted">
              8 min long-form read
            </span>
          </div>
        </section>
      )}

      {/* 2. Two-Column Feature Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
        {/* Left Column: Investigative Features */}
        <div>
          <h3 className="font-masthead text-lg font-bold uppercase tracking-wider text-ink pb-2 border-b-2 border-ink mb-6 flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <span>Investigative Dispatches</span>
          </h3>

          <div className="space-y-6">
            {investigativeFeatures.map((art) => (
              <article
                key={art.id}
                onClick={() => handleRead(art)}
                className="p-5 border border-paper-border bg-paper hover:border-ink rounded-xs transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between text-ink-muted font-mono text-[10px] uppercase mb-1.5">
                  <span className="font-bold text-ink">{art.source.name}</span>
                  <span>{art.categories?.[0] || 'Investigation'}</span>
                </div>
                <h4 className="font-serif font-bold text-base sm:text-lg text-ink group-hover:underline leading-snug mb-2">
                  {art.title_english}
                </h4>
                {art.summary && (
                  <p className="font-serif italic text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                    “{art.summary}”
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>

        {/* Right Column: Science, Nature & Exploration */}
        <div>
          <h3 className="font-masthead text-lg font-bold uppercase tracking-wider text-ink pb-2 border-b-2 border-ink mb-6 flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span>Frontiers &amp; Exploration</span>
          </h3>

          <div className="space-y-6">
            {scienceAndNature.map((art) => (
              <article
                key={art.id}
                onClick={() => handleRead(art)}
                className="p-5 border border-paper-border bg-paper hover:border-ink rounded-xs transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between text-ink-muted font-mono text-[10px] uppercase mb-1.5">
                  <span className="font-bold text-ink">{art.source.name}</span>
                  <span>{art.categories?.[0] || 'Science'}</span>
                </div>
                <h4 className="font-serif font-bold text-base sm:text-lg text-ink group-hover:underline leading-snug mb-2">
                  {art.title_english}
                </h4>
                {art.summary && (
                  <p className="font-serif italic text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                    “{art.summary}”
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Weekend Global Dispatches Folio Strip */}
      {globalDispatches.length > 0 && (
        <div className="mt-12 pt-8 border-t-2 border-ink">
          <h3 className="font-masthead text-lg font-bold uppercase tracking-wider text-ink mb-6 flex items-center gap-2">
            <Globe2 size={16} className="text-accent" />
            <span>Weekend Global Dispatches Folio</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {globalDispatches.map((art) => (
              <article
                key={art.id}
                onClick={() => handleRead(art)}
                className="p-4 border border-paper-border bg-paper hover:border-ink rounded-xs transition-colors cursor-pointer group"
              >
                <div className="text-ink-muted font-mono text-[9px] uppercase mb-1">{art.source.name}</div>
                <h5 className="font-serif font-bold text-xs sm:text-sm text-ink group-hover:underline line-clamp-2 mb-1.5">
                  {art.title_english}
                </h5>
                <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                  {art.summary || art.title_english}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

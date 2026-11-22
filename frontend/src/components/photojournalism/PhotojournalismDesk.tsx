/**
 * frontend/src/components/photojournalism/PhotojournalismDesk.tsx
 * Award-Winning Photojournalism & Press Imagery Gallery Desk (PRD Master Expansion #31).
 * Presents visual reporting in authentic darkroom mats and broadsheet editorial captions.
 */
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { Camera, ArrowLeft, Maximize2, Globe2 } from 'lucide-react';
import type { Article, Category } from '../../types';

export const PhotojournalismDesk: React.FC = () => {
  const articles = useAppStore((s) => s.articles);
  const setSelectedArticle = useAppStore((s) => s.setSelectedArticle);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxArticle, setLightboxArticle] = useState<Article | null>(null);

  // Filter articles with images or assign editorial press seed imagery
  const visualArticles = articles.map((a) => ({
    ...a,
    imageUrl: (a as { image_url?: string }).image_url || `https://picsum.photos/seed/${a.id + 42}/1000/650`,
  })).filter((a) => selectedCategory === 'All' || a.categories?.includes(selectedCategory as Category));

  const categories = ['All', 'World', 'Environment', 'Politics', 'Science', 'Tech', 'Sports'];

  const handleOpenArticle = (art: Article) => {
    triggerHaptic('selection');
    setSelectedArticle(art);
    setCurrentView('reader');
  };

  return (
    <div
      id="photojournalism-desk"
      className="w-full h-full min-h-0 min-w-0 overflow-y-auto bg-paper text-ink p-4 sm:p-8 lg:p-12 select-none"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink mb-6">
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
          <div className="flex items-center gap-2">
            <Camera size={22} className="text-accent" />
            <h1 className="font-masthead text-2xl sm:text-3xl font-bold uppercase tracking-tight text-ink">
              International Photojournalism Gallery
            </h1>
          </div>
          <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mt-1">
            Visual press reporting and documentary photography from global field correspondents.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic('selection');
                setSelectedCategory(cat);
              }}
              className={`px-2.5 py-1 rounded-xs font-mono text-[11px] font-bold uppercase transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-ink text-paper border border-ink'
                  : 'bg-paper-alt text-ink-secondary border border-paper-border hover:border-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Photojournalism Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {visualArticles.map((art) => (
          <div
            key={art.id}
            className="border-2 border-ink bg-paper-alt rounded-xs overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-shadow"
          >
            {/* Image Mat */}
            <div className="relative w-full h-56 sm:h-64 overflow-hidden bg-[#16120E] cursor-pointer flex items-center justify-center group/mat" onClick={() => setLightboxArticle(art)}>
              {/* Fallback Archival Wire Negative */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#16120E] text-[#D8D0C2] select-none">
                <div className="absolute inset-3 border border-dashed border-[#44382B]/60 pointer-events-none" />
                <Camera size={34} className="text-[#8C7E6A] mb-2 group-hover/mat:scale-110 transition-transform" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#B2A48E] font-bold">
                  Field Wire Negative
                </span>
                <span className="font-serif italic text-xs text-[#E8DFD0] mt-1.5 line-clamp-2 max-w-[85%]">
                  “{art.title_english}”
                </span>
                <span className="font-mono text-[8px] uppercase tracking-wider text-[#756A59] mt-2">
                  Archival Press Monotype • {art.source.name}
                </span>
              </div>

              {art.imageUrl && (
                <img
                  src={art.imageUrl}
                  alt={art.title_english}
                  loading="lazy"
                  onError={(e) => {
                    // Gracefully hide broken remote image to reveal broadsheet archival negative
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover filter contrast-[1.05] group-hover:scale-102 transition-transform duration-300 relative z-10"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-20" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-paper font-mono text-[10px] z-30">
                <span className="uppercase font-bold tracking-wider">{art.source.name}</span>
                <span className="flex items-center gap-1">
                  <Globe2 size={10} />
                  <span>{art.source.country}</span>
                </span>
              </div>
            </div>

            {/* Editorial Caption Box */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs border border-ink/30 bg-paper text-ink">
                    {art.categories?.[0] || 'Dispatch'}
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted">
                    {new Date(art.published_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <h3
                  onClick={() => handleOpenArticle(art)}
                  className="font-serif font-bold text-base text-ink line-clamp-2 hover:text-accent cursor-pointer transition-colors leading-snug"
                >
                  {art.title_english}
                </h3>
                {art.summary && (
                  <p className="font-serif italic text-xs text-ink-secondary line-clamp-2 mt-2 leading-relaxed">
                    “{art.summary}”
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-paper-border font-mono text-[10px]">
                <button
                  onClick={() => handleOpenArticle(art)}
                  className="text-ink font-bold uppercase hover:text-accent transition-colors cursor-pointer"
                >
                  Read Broadsheet &rarr;
                </button>
                <button
                  onClick={() => setLightboxArticle(art)}
                  className="text-ink-muted hover:text-ink cursor-pointer p-1"
                  title="Expand Full Photo"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxArticle && (
        <div
          id="photojournalism-lightbox"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
          onClick={() => setLightboxArticle(null)}
        >
          <div
            className="w-full max-w-4xl bg-paper border-2 border-ink rounded-xs overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-h-[60vh] bg-black">
              <img
                src={(lightboxArticle as { imageUrl?: string }).imageUrl || `https://picsum.photos/seed/${lightboxArticle.id + 42}/1200/800`}
                alt={lightboxArticle.title_english}
                className="w-full h-full max-h-[60vh] object-contain mx-auto"
              />
            </div>
            <div className="p-5 text-ink">
              <div className="flex items-center justify-between pb-2 border-b border-paper-border mb-2 font-mono text-xs">
                <span className="font-bold text-accent uppercase">
                  {lightboxArticle.source.name} • {lightboxArticle.source.country}
                </span>
                <span className="text-ink-muted">Press Wire Dispatch #{lightboxArticle.id}</span>
              </div>
              <h2 className="font-headline text-lg sm:text-xl font-bold text-ink mb-2">
                {lightboxArticle.title_english}
              </h2>
              {lightboxArticle.summary && (
                <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mb-4">
                  {lightboxArticle.summary}
                </p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-paper-border font-mono text-xs">
                <button
                  onClick={() => setLightboxArticle(null)}
                  className="px-3 py-1.5 border border-paper-border bg-paper-alt hover:border-ink rounded-xs cursor-pointer"
                >
                  Close Lightbox
                </button>
                <button
                  onClick={() => handleOpenArticle(lightboxArticle)}
                  className="px-4 py-1.5 border-2 border-ink bg-ink text-paper font-bold uppercase rounded-xs hover:bg-accent transition-colors cursor-pointer"
                >
                  Read Complete Story &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

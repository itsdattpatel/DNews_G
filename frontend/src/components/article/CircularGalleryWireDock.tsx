/**
 * frontend/src/components/article/CircularGalleryWireDock.tsx
 * Orbit Wire Dispatch Docker powered by React Bits <CircularGallery /> WebGL Component.
 * - Renders authentic rectangular broadsheet cards onto a 3D curved cylinder
 * - Synchronizes active focus bidirectionally with main desk (j/k, arrows, auto-advance, click)
 * - Highlights the focused card on top with elevated ring and clear prominence
 * - Fully customizable curvature (bend), card size, aspect ratio, motion speed, and damping
 */
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CircularGallery, type CircularGalleryItem, type CircularGalleryHandle } from '../ui/CircularGallery';
import { generateArticleCardTexture } from '../../utils/cardTextureGenerator';
import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import type { Article } from '../../types';

export interface CircularGalleryWireDockProps {
  forcedArticles?: Article[];
  forcedSelectedArticleId?: number | null;
}

export const CircularGalleryWireDock: React.FC<CircularGalleryWireDockProps> = ({
  forcedArticles,
  forcedSelectedArticleId,
}) => {
  const storeArticles = useAppStore((s) => s.articles);
  const articles = forcedArticles ?? storeArticles;
  const storeSelectedArticleId = useAppStore((s) => s.selectedArticleId);
  const selectedArticleId = forcedSelectedArticleId !== undefined ? forcedSelectedArticleId : storeSelectedArticleId;
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const prevArticle = useAppStore((s) => s.prevArticle);
  const theme = useAppStore((s) => s.theme);
  const isAutoAdvance = useAppStore((s) => s.settings.auto_advance_enabled ?? false);
  const autoAdvanceInterval = useAppStore((s) => s.settings.auto_advance_interval_sec ?? 7);

  // Gallery settings from store (user editable)
  const bend = useAppStore((s) => s.settings.gallery_bend ?? 2.5);
  const itemSize = useAppStore((s) => s.settings.gallery_item_size ?? 0.72);
  const itemAspect = useAppStore((s) => s.settings.gallery_item_aspect ?? 2.0);
  const scrollSpeed = useAppStore((s) => s.settings.gallery_scroll_speed ?? 1.8);
  const scrollEase = useAppStore((s) => s.settings.gallery_scroll_ease ?? 0.08);
  const wave = useAppStore((s) => s.settings.gallery_wave ?? 0.2);
  const fadeEdges = useAppStore((s) => s.settings.gallery_fade_edges ?? 0.18);
  const gap = useAppStore((s) => s.settings.gallery_gap ?? 0.18);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const galleryRef = useRef<CircularGalleryHandle>(null);
  const [showTuningBar, setShowTuningBar] = useState(false);

  // Compute active index
  const activeIndex = useMemo(() => {
    if (!articles || articles.length === 0) return 0;
    const idx = articles.findIndex((a) => a.id === selectedArticleId);
    return idx >= 0 ? idx : 0;
  }, [articles, selectedArticleId]);

  // Synchronize gallery focus whenever selected story changes from desk
  useEffect(() => {
    if (galleryRef.current && activeIndex >= 0) {
      galleryRef.current.focusIndex(activeIndex);
    }
  }, [activeIndex]);

  // Generate rectangular broadsheet card textures for all articles
  const galleryItems = useMemo<CircularGalleryItem[]>(() => {
    if (!articles || articles.length === 0) return [];
    const isDark = theme === 'night';

    return articles.map((art) => {
      const isSelected = art.id === selectedArticleId;
      const textureDataUrl = generateArticleCardTexture(art, isSelected, {
        isDark,
      });

      return {
        id: art.id,
        image: textureDataUrl,
        text: art.title_english || art.title_original || 'Dispatch',
        description: art.summary ? art.summary.slice(0, 160) + '…' : undefined,
        alt: art.title_english || 'News dispatch',
        article: art,
      };
    });
  }, [articles, selectedArticleId, theme]);

  const handleItemClick = useCallback(
    (item: CircularGalleryItem) => {
      if (item.id) {
        selectArticleById(item.id);
      }
    },
    [selectArticleById]
  );

  const handleActiveChange = useCallback(
    (index: number) => {
      if (articles && articles[index] && articles[index].id !== selectedArticleId) {
        selectArticleById(articles[index].id);
      }
    },
    [articles, selectedArticleId, selectArticleById]
  );

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <aside
      id="circular-dock"
      aria-label="Orbit Wire Dispatch Docker"
      className="absolute bottom-2 left-0 right-0 z-30 pointer-events-none flex justify-center items-end px-3 sm:px-6"
    >
      {/* Outer Shell: Frosted broadsheet panel */}
      <div className="relative w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl backdrop-blur-xl bg-paper/90 dark:bg-paper/95 border border-paper-border/90 shadow-2xl rounded-2xl pt-2 pb-1.5 px-3 pointer-events-auto overflow-hidden">
        
        {/* Header Indicator & Control Bar */}
        <div className="flex items-center justify-between px-3 pb-1 text-[0.6875rem] font-mono text-ink-secondary border-b border-paper-border/50 select-none">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-ink">React Bits Orbit Docker</span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-muted tabular-nums">
              Dispatch {activeIndex + 1} of {articles.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAutoAdvance && (
              <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] text-accent px-1.5 py-0.5 rounded border border-accent/30 bg-accent/10">
                <span>Auto ({autoAdvanceInterval}s)</span>
              </span>
            )}

            {/* Quick Live Tuning Toggle */}
            <button
              onClick={() => setShowTuningBar(!showTuningBar)}
              className={`p-1 rounded transition-colors ${
                showTuningBar ? 'bg-ink text-paper' : 'hover:bg-paper-border/40 text-ink'
              }`}
              title="Quick Orbit Curve & Motion Tuning"
              aria-label="Toggle Orbit Tuning"
            >
              <Sliders size={13} />
            </button>

            <button
              onClick={() => prevArticle()}
              className="p-1 rounded hover:bg-paper-border/40 text-ink transition-colors"
              title="Previous Story (k / Left Arrow)"
              aria-label="Previous Story"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => nextArticle()}
              className="p-1 rounded hover:bg-paper-border/40 text-ink transition-colors"
              title="Next Story (j / Right Arrow)"
              aria-label="Next Story"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Quick Tuning Drawer (Editable live parameters) */}
        {showTuningBar && (
          <div className="p-2.5 my-1.5 bg-paper-alt/90 border border-paper-border rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-ink-secondary uppercase">Arc Bend:</span>
                <span className="font-bold">{bend}</span>
              </div>
              <input
                type="range"
                min="-4"
                max="5"
                step="0.5"
                value={bend}
                onChange={(e) => updateSettings({ gallery_bend: parseFloat(e.target.value) })}
                className="w-full accent-ink cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-ink-secondary uppercase">Card Size:</span>
                <span className="font-bold">{itemSize}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.2"
                step="0.04"
                value={itemSize}
                onChange={(e) => updateSettings({ gallery_item_size: parseFloat(e.target.value) })}
                className="w-full accent-ink cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-ink-secondary uppercase">Scroll Ease:</span>
                <span className="font-bold">{scrollEase}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.01"
                value={scrollEase}
                onChange={(e) => updateSettings({ gallery_scroll_ease: parseFloat(e.target.value) })}
                className="w-full accent-ink cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-ink-secondary uppercase">Edge Fade:</span>
                <span className="font-bold">{fadeEdges}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.02"
                value={fadeEdges}
                onChange={(e) => updateSettings({ gallery_fade_edges: parseFloat(e.target.value) })}
                className="w-full accent-ink cursor-pointer h-1.5"
              />
            </div>
          </div>
        )}

        {/* WebGL2 CircularGallery Container */}
        <div className="relative w-full h-[185px] sm:h-[210px] my-1">
          <CircularGallery
            ref={galleryRef}
            items={galleryItems}
            bend={bend}
            itemSize={itemSize}
            itemAspect={itemAspect}
            gap={gap}
            scrollSpeed={scrollSpeed}
            scrollEase={scrollEase}
            wave={wave}
            fadeEdges={fadeEdges}
            shadow={0.3}
            borderRadius={0.04}
            showTitles={false}
            openOnClick={false}
            snap={true}
            activeIndex={activeIndex}
            onItemClick={handleItemClick}
            onActiveChange={handleActiveChange}
            textColor={theme === 'night' ? '#E8E4DA' : '#1A1208'}
            className="w-full h-full"
          />
        </div>
      </div>
    </aside>
  );
};

export default CircularGalleryWireDock;

/**
 * frontend/src/components/article/CircularGalleryWireDock.tsx
 * Orbit Wire Dispatch Docker powered by React Bits <CircularGallery /> WebGL Component.
 * - Pure floating 3D broadsheet cards with zero background box or backdrop blur
 * - Synchronizes active focus bidirectionally with main desk (j/k, arrows, auto-advance, click)
 * - Zero white flashing on focused/unfocused cards (stable textures & theme-toned placeholder)
 * - All tuning controls migrated to Unified Settings Dialog with comprehensive customization
 */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CircularGallery, type CircularGalleryItem, type CircularGalleryHandle } from '../ui/CircularGallery';
import { generateArticleCardTexture } from '../../utils/cardTextureGenerator';
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
  const theme = useAppStore((s) => s.theme);

  // Gallery settings from store (user editable via main Settings dialog)
  const bend = useAppStore((s) => s.settings.gallery_bend ?? 2.5);
  const itemSize = useAppStore((s) => s.settings.gallery_item_size ?? 0.72);
  const itemAspect = useAppStore((s) => s.settings.gallery_item_aspect ?? 2.0);
  const scrollSpeed = useAppStore((s) => s.settings.gallery_scroll_speed ?? 1.8);
  const scrollEase = useAppStore((s) => s.settings.gallery_scroll_ease ?? 0.08);
  const wave = useAppStore((s) => s.settings.gallery_wave ?? 0.2);
  const fadeEdges = useAppStore((s) => s.settings.gallery_fade_edges ?? 0.18);
  const gap = useAppStore((s) => s.settings.gallery_gap ?? 0.18);
  const borderRadius = useAppStore((s) => s.settings.gallery_border_radius ?? 0.04);
  const shadow = useAppStore((s) => s.settings.gallery_shadow ?? 0.25);
  const grayscale = useAppStore((s) => s.settings.gallery_grayscale ?? false);
  const autoScroll = useAppStore((s) => s.settings.gallery_auto_scroll ?? 0);

  const galleryRef = useRef<CircularGalleryHandle>(null);

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
  // Note: Textures are static per article and theme to ensure zero reloading/white flashing
  const galleryItems = useMemo<CircularGalleryItem[]>(() => {
    if (!articles || articles.length === 0) return [];
    const isDark = theme === 'night';

    return articles.map((art) => {
      const textureDataUrl = generateArticleCardTexture(art, false, {
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
  }, [articles, theme]);

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
      className="absolute bottom-1 left-0 right-0 z-30 pointer-events-none flex flex-col justify-end items-center px-2 sm:px-6"
    >
      {/* Pure WebGL2 CircularGallery: 100% transparent floating cards, no background box, no blur */}
      <div className="relative w-full max-w-7xl h-[185px] sm:h-[210px] pointer-events-auto">
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
          shadow={shadow}
          borderRadius={borderRadius}
          grayscale={grayscale}
          autoScroll={autoScroll}
          showTitles={false}
          openOnClick={false}
          snap={true}
          activeIndex={activeIndex}
          onItemClick={handleItemClick}
          onActiveChange={handleActiveChange}
          textColor={theme === 'night' ? '#E8E4DA' : '#1A1208'}
          placeholderColor={theme === 'night' ? '#1C1914' : '#FDFCFA'}
          showRing={false}
          className="w-full h-full"
        />
      </div>
    </aside>
  );
};

export default CircularGalleryWireDock;

/**
 * frontend/src/components/article/CircularGalleryWireDock.tsx
 * Orbit Wire Dispatch Docker powered by React Bits <CircularGallery /> WebGL Component.
 * - Pure floating 3D broadsheet cards with zero background box or backdrop blur
 * - Dynamic Idle Auto-Drop & Flattening:
 *   - Automatically drops down as a straight flat line (half-shown over wire ticker) and dims to 35%
 *     when unhovered and idle for N seconds (configurable from 1.0s to 7.0s, default 2.5s).
 *   - Smoothly rises up and bends back into the circular grid whenever hovered OR when news changes!
 * - Full Dynamic Theme Synchronization: adapts colors to any active theme (50 themes + custom).
 * - Zero white flashing on focused/unfocused cards.
 */
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
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
  const activeThemeId = useAppStore((s) => s.activeThemeId);
  const customBgColor = useAppStore((s) => s.customBgColor);

  // Gallery settings from store (user editable via main Settings dialog)
  const configuredBend = useAppStore((s) => s.settings.gallery_bend ?? 2.5);
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
  const autoDropDelaySec = useAppStore((s) => s.settings.gallery_auto_drop_delay ?? 2.5);

  const galleryRef = useRef<CircularGalleryHandle>(null);

  // Idle state & timer tracking
  const [isHovered, setIsHovered] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset idle state and restart timer
  const scheduleIdleTimeout = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    // Only schedule drop if not currently hovered
    if (!isHovered) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, Math.max(1000, autoDropDelaySec * 1000));
    }
  }, [isHovered, autoDropDelaySec]);

  // When selected article changes from any source (j/k, arrows, auto-advance):
  // Immediately wake up into circular grid and reset the countdown timer
  useEffect(() => {
    setIsIdle(false);
    scheduleIdleTimeout();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [selectedArticleId, scheduleIdleTimeout]);

  // Handle mouse enter/leave on the dock
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    scheduleIdleTimeout();
  }, [scheduleIdleTimeout]);

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

  // Resolve theme colors dynamically for matching styling
  const themeColors = useMemo(() => {
    const isDark = theme === 'night';
    if (typeof document === 'undefined') {
      return {
        textColor: isDark ? '#E8E4DA' : '#1A1208',
        placeholderColor: isDark ? '#1C1914' : '#FDFCFA',
      };
    }
    const comp = getComputedStyle(document.documentElement);
    return {
      textColor: comp.getPropertyValue('--color-ink')?.trim() || (isDark ? '#E8E4DA' : '#1A1208'),
      placeholderColor:
        comp.getPropertyValue('--color-paper-card')?.trim() ||
        comp.getPropertyValue('--color-paper-alt')?.trim() ||
        (isDark ? '#1C1914' : '#FDFCFA'),
    };
  }, [theme, activeThemeId, customBgColor]);

  // Generate rectangular broadsheet card textures for all articles
  // Note: Textures are static per article & theme to ensure zero reloading/white flashing
  const galleryItems = useMemo<CircularGalleryItem[]>(() => {
    if (!articles || articles.length === 0) return [];
    const isDark = theme === 'night';

    return articles.map((art) => {
      const textureDataUrl = generateArticleCardTexture(art, false, {
        isDark,
        themeId: activeThemeId || theme,
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
  }, [articles, theme, activeThemeId, customBgColor]);

  const handleItemClick = useCallback(
    (item: CircularGalleryItem) => {
      // Waking up immediately on click
      setIsIdle(false);
      scheduleIdleTimeout();
      if (item.id) {
        selectArticleById(item.id);
      }
    },
    [selectArticleById, scheduleIdleTimeout]
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

  // When idle: bend unbends smoothly to 0 (flat straight line).
  // When active/hovered: bend uses the configured circular curvature.
  const activeBend = isIdle ? 0 : configuredBend;

  return (
    <aside
      id="circular-dock"
      aria-label="Orbit Wire Dispatch Docker"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col justify-end items-center px-2 sm:px-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isIdle
          ? 'translate-y-[85px] sm:translate-y-[92px] opacity-35 hover:opacity-100 hover:translate-y-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Pure WebGL2 CircularGallery: 100% transparent floating cards, no background box, no blur */}
      <div className="relative w-full max-w-7xl h-[185px] sm:h-[210px] pointer-events-auto">
        <CircularGallery
          ref={galleryRef}
          items={galleryItems}
          bend={activeBend}
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
          textColor={themeColors.textColor}
          placeholderColor={themeColors.placeholderColor}
          showRing={false}
          className="w-full h-full"
        />
      </div>
    </aside>
  );
};

export default CircularGalleryWireDock;

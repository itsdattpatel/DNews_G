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
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { CircularGallery, type CircularGalleryItem, type CircularGalleryHandle } from '../ui/CircularGallery';
import { generateArticleCardTexture } from '../../utils/cardTextureGenerator';
import { broadsheetAudio } from '../../utils/broadsheetAudio';
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

  // Audio & Auto-Advance settings from store
  const soundEnabled = useAppStore((s) => s.settings.sound_enabled ?? true);
  const audioVolume = useAppStore((s) => s.settings.audio_volume ?? 0.6);
  const audioTeletypeEnabled = useAppStore((s) => s.settings.audio_teletype_enabled ?? true);
  const autoAdvanceEnabled = useAppStore((s) => s.settings.auto_advance_enabled ?? false);
  const isAutoAdvanceManualPaused = useAppStore((s) => s.isAutoAdvanceManualPaused);
  const autoAdvanceProgressPercent = useAppStore((s) => s.autoAdvanceProgressPercent);

  const galleryRef = useRef<CircularGalleryHandle>(null);

  // Sync volume & mute settings to synthesized audio engine
  useEffect(() => {
    broadsheetAudio.setMuted(!soundEnabled);
    broadsheetAudio.setVolume(audioVolume);
  }, [soundEnabled, audioVolume]);

  // Teletype acoustic click on story transition
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (soundEnabled && audioTeletypeEnabled) {
      broadsheetAudio.playTeletypeClick();
    }
  }, [selectedArticleId, soundEnabled, audioTeletypeEnabled]);

  // Idle state & timer tracking
  const [isHovered, setIsHovered] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quick-Peek Hover Tooltip State
  const [peekState, setPeekState] = useState<{
    item: CircularGalleryItem;
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const peekTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Paper rustle on dock unbend / drop
  useEffect(() => {
    if (soundEnabled) {
      broadsheetAudio.playPaperRustle();
    }
  }, [isIdle, soundEnabled]);

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

  const handleItemHover = useCallback(
    (item: CircularGalleryItem | null, index: number | null, coords?: { clientX: number; clientY: number } | null) => {
      if (peekTimerRef.current) {
        clearTimeout(peekTimerRef.current);
        peekTimerRef.current = null;
      }

      if (item && coords && index !== null) {
        peekTimerRef.current = setTimeout(() => {
          setPeekState({
            item,
            index,
            x: coords.clientX,
            y: coords.clientY,
          });
        }, 120);
      } else {
        setPeekState(null);
      }
    },
    []
  );

  const handleItemClick = useCallback(
    (item: CircularGalleryItem) => {
      // Waking up immediately on click
      setIsIdle(false);
      setPeekState(null);
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
      {/* 1.1 Auto-Advance Countdown Indicator on Active Focused Card */}
      {autoAdvanceEnabled && !isAutoAdvanceManualPaused && (
        <div
          id="dock-auto-advance-bar"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-48 sm:w-60 h-1.5 bg-[var(--color-paper-border,#D9D0BE)]/80 rounded-full overflow-hidden shadow-xs pointer-events-none z-40 border border-[var(--color-paper-border,#D9D0BE)]"
          title={`Auto-advancing: ${Math.round(autoAdvanceProgressPercent)}%`}
        >
          <div
            className="h-full bg-accent transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${Math.max(5, autoAdvanceProgressPercent)}%` }}
          />
        </div>
      )}

      {/* 1.2 Quick-Peek Broadsheet Floating Tooltip for Unfocused Cards */}
      {peekState && peekState.item && typeof document !== 'undefined' && createPortal(
        <div
          id="dock-quick-peek-tooltip"
          className="fixed z-50 pointer-events-none transition-opacity duration-200 ease-out animate-in fade-in"
          style={{
            left: `${Math.max(16, Math.min(window.innerWidth - 320, peekState.x - 150))}px`,
            top: `${Math.max(20, peekState.y - 145)}px`,
          }}
        >
          <div className="w-[300px] p-3 rounded-xs border border-[var(--color-paper-border,#D9D0BE)] bg-[var(--color-paper-alt,#F2EDE2)] text-ink shadow-2xl backdrop-blur-xs font-sans text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-paper-border,#D9D0BE)] pb-1 mb-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              <span className="font-bold text-accent truncate max-w-[170px]">
                {peekState.item.article?.source?.name || 'World Desk'}
              </span>
              <span>{peekState.item.article?.country || 'Global'}</span>
            </div>
            <h4 className="font-serif font-bold text-xs leading-snug line-clamp-2 text-ink mb-1">
              {peekState.item.article?.title_english || peekState.item.text}
            </h4>
            {peekState.item.description && (
              <p className="text-[10px] text-ink-secondary italic line-clamp-2">
                "{peekState.item.description}"
              </p>
            )}
            <div className="mt-1.5 pt-1 border-t border-[var(--color-paper-border,#D9D0BE)] text-[8px] font-mono text-ink-muted flex justify-between items-center">
              <span>Quick Peek Dispatch</span>
              <span className="text-accent font-bold">Click to Read</span>
            </div>
          </div>
        </div>,
        document.body
      )}

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
          onItemHover={handleItemHover}
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

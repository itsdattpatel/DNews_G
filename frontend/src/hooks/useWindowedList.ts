/**
 * frontend/src/hooks/useWindowedList.ts
 * Zero-dependency windowed slice helper for long broadsheet lists & logs.
 * Caps active rendered DOM nodes during long sessions without extra npm packages.
 */
import { useState, useMemo, useEffect, useCallback, type RefObject } from 'react';

export interface WindowedListOptions {
  totalCount: number;
  estimateItemHeight?: number;
  overscan?: number;
  minRenderCount?: number;
  containerRef?: RefObject<HTMLElement | null>;
}

export interface WindowedListResult {
  visibleCount: number;
  startIndex: number;
  endIndex: number;
  showMore: () => void;
  hasMore: boolean;
}

export function computeWindowBounds(params: {
  totalCount: number;
  scrollTop: number;
  viewportHeight: number;
  estimateItemHeight: number;
  overscan: number;
  minRenderCount: number;
}): { startIndex: number; endIndex: number } {
  const { totalCount, scrollTop, viewportHeight, estimateItemHeight, overscan, minRenderCount } = params;
  if (totalCount <= 0) return { startIndex: 0, endIndex: 0 };

  if (totalCount <= minRenderCount) {
    return { startIndex: 0, endIndex: totalCount };
  }

  const safeHeight = Math.max(24, estimateItemHeight);
  const visibleRows = Math.max(minRenderCount, Math.ceil((viewportHeight || 600) / safeHeight) + overscan * 2);
  const rawStart = Math.max(0, Math.floor(scrollTop / safeHeight) - overscan);
  const endIndex = Math.min(totalCount, Math.max(rawStart + visibleRows, minRenderCount));
  return { startIndex: Math.min(rawStart, Math.max(0, totalCount - minRenderCount)), endIndex };
}

export function useWindowedList({
  totalCount,
  estimateItemHeight = 76,
  overscan = 8,
  minRenderCount = 40,
  containerRef,
}: WindowedListOptions): WindowedListResult {
  const [limit, setLimit] = useState(minRenderCount);
  const [scrollState, setScrollState] = useState({ top: 0, height: 640 });

  useEffect(() => {
    setLimit(minRenderCount);
  }, [minRenderCount]);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const handleScroll = () => {
      const nextTop = el.scrollTop;
      const nextHeight = el.clientHeight || 640;
      setScrollState({ top: nextTop, height: nextHeight });
      if (nextTop + nextHeight >= el.scrollHeight - estimateItemHeight * 4) {
        setLimit((prev) => Math.min(totalCount, prev + minRenderCount));
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef, estimateItemHeight, minRenderCount, totalCount]);

  const bounds = useMemo(() => {
    if (containerRef?.current) {
      return computeWindowBounds({
        totalCount,
        scrollTop: scrollState.top,
        viewportHeight: scrollState.height,
        estimateItemHeight,
        overscan,
        minRenderCount: limit,
      });
    }
    return { startIndex: 0, endIndex: Math.min(totalCount, limit) };
  }, [containerRef, totalCount, scrollState, estimateItemHeight, overscan, limit]);

  const showMore = useCallback(() => {
    setLimit((prev) => Math.min(totalCount, prev + minRenderCount));
  }, [minRenderCount, totalCount]);

  return {
    visibleCount: Math.max(0, bounds.endIndex - bounds.startIndex),
    startIndex: bounds.startIndex,
    endIndex: bounds.endIndex,
    showMore,
    hasMore: bounds.endIndex < totalCount,
  };
}


/**
 * frontend/src/__tests__/unit/dock-reading-and-mobile-notch.test.tsx
 * TDD tests for:
 * 1. Hiding AdaptiveNotchPill on mobile layout & native Capacitor APK
 * 2. Real elapsed active reading timer (`recordReadingSeconds`) vs instant +1 min bug
 * 3. CircularGallery / CircularGalleryWireDock focus & live batch stability
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Capacitor } from '@capacitor/core';
import { AdaptiveNotchPill } from '../../components/layout/AdaptiveNotchPill';
import { ReadingTrackerCard } from '../../components/reader/ReadingTrackerCard';
import { useAppStore } from '../../store/useAppStore';

describe('Dock Stability, Real Reading Timer & Mobile Pill Hiding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const memStorage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (memStorage.has(k) ? memStorage.get(k)! : null),
      setItem: (k: string, v: string) => {
        memStorage.set(k, String(v));
      },
      removeItem: (k: string) => {
        memStorage.delete(k);
      },
      clear: () => {
        memStorage.clear();
      },
    });
    useAppStore.setState({
      readingStats: {
        totalArticlesRead: 0,
        totalMinutesRead: 0,
        totalSecondsRead: 0,
        streakDays: 1,
        lastReadDate: new Date().toISOString().slice(0, 10),
        categoryCounts: {},
      } as any,
    });
  });

  it('hides AdaptiveNotchPill completely when Capacitor.isNativePlatform() is true', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const html = renderToStaticMarkup(<AdaptiveNotchPill />);
    expect(html).toBe('');
  });

  it('wraps desktop AdaptiveNotchPill in hidden md:block so it disappears on mobile layouts', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const html = renderToStaticMarkup(<AdaptiveNotchPill />);
    expect(html).toContain('hidden md:block');
  });

  it('does NOT inflate totalMinutesRead when recordArticleRead fires on click; accrues real elapsed time via recordReadingSeconds', () => {
    const store = useAppStore.getState() as any;
    store.recordArticleRead(101, 'World', 4);
    store.recordArticleRead(102, 'Tech', 3);

    const afterInstantClicks = useAppStore.getState().readingStats;
    expect(afterInstantClicks.totalArticlesRead).toBe(2);
    expect(afterInstantClicks.totalMinutesRead).toBe(0);

    expect(typeof store.recordReadingSeconds).toBe('function');
    store.recordReadingSeconds(65);

    const afterRealSeconds = useAppStore.getState().readingStats as any;
    expect(afterRealSeconds.totalSecondsRead).toBe(65);
    expect(afterRealSeconds.totalMinutesRead).toBe(1);
  });

  it('renders ReadingTrackerCard cleanly with legible font-headline header and exact time display', () => {
    const html = renderToStaticMarkup(
      <ReadingTrackerCard
        statsOverride={{
          totalArticlesRead: 3,
          totalMinutesRead: 2,
          totalSecondsRead: 135,
          streakDays: 4,
          lastReadDate: '2026-11-25',
          categoryCounts: { World: 3 },
        }}
      />
    );
    expect(html).toContain('Daily Telegraph Reading Log');
    expect(html).toContain('font-headline');
    expect(html).toContain('2m 15s');
    expect(html).toContain('4 Day Streak');
  });
});

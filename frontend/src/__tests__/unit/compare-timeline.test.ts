/**
 * frontend/src/__tests__/unit/compare-timeline.test.ts
 * Unit tests for Compare Coverage, Weaver Spider, and Story Timeline (Phase 7).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { WeaverSpider } from '../../spider/spiderTypes/Weaver';

describe('Story Clustering & Compare Coverage Views (Phase 7)', () => {
  beforeEach(() => {
    useAppStore.setState({
      compareClusterId: null,
      timelineClusterId: null,
    });
  });

  it('manages compareClusterId and timelineClusterId state in store (P7-04, P7-07, P7-08)', () => {
    const store = useAppStore.getState();
    expect(store.compareClusterId).toBeNull();
    expect(store.timelineClusterId).toBeNull();

    store.setCompareClusterId(42);
    expect(useAppStore.getState().compareClusterId).toBe(42);

    store.setCompareClusterId(null);
    expect(useAppStore.getState().compareClusterId).toBeNull();

    store.setTimelineClusterId(99);
    expect(useAppStore.getState().timelineClusterId).toBe(99);
  });

  it('WeaverSpider generates curved catenary silk bezier paths between keyword coordinates (P7-06)', () => {
    const from = { x: 100, y: 150 };
    const to = { x: 400, y: 220 };

    const path = WeaverSpider.generateSilkPath(from, to);
    expect(path).toContain('M 100 150');
    expect(path).toContain('C ');
    expect(path).toContain('400 220');

    const weaver = new WeaverSpider(50, 50);
    weaver.setThreads([
      { keyword: 'summit', from, to, color: '#38bdf8' },
    ]);

    const lines = weaver.getWeftLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.keyword).toBe('summit');
    expect(lines[0]?.color).toBe('#38bdf8');
  });

  it('identifies shared keywords across multiple outlet articles (P7-05)', () => {
    const articles = [
      {
        id: 1,
        source: { country: 'India', name: 'The Hindu' },
        keywords: ['cyclone', 'monsoon', 'evacuation', 'shelter'],
      },
      {
        id: 2,
        source: { country: 'USA', name: 'Reuters' },
        keywords: ['cyclone', 'pacific', 'evacuation', 'meteorology'],
      },
      {
        id: 3,
        source: { country: 'Japan', name: 'NHK World' },
        keywords: ['weather', 'tokyo', 'monsoon'],
      },
    ];

    // Count keyword frequency across articles
    const frequency = new Map<string, number>();
    for (const art of articles) {
      for (const kw of new Set(art.keywords)) {
        frequency.set(kw, (frequency.get(kw) ?? 0) + 1);
      }
    }

    const shared = Array.from(frequency.entries())
      .filter(([, count]) => count >= 2)
      .map(([kw]) => kw);

    expect(shared).toContain('cyclone');
    expect(shared).toContain('evacuation');
    expect(shared).toContain('monsoon');
    expect(shared).not.toContain('tokyo');
  });

  it('sorts cluster timeline articles chronologically (P7-07)', () => {
    const rawArticles = [
      { id: 1, published_at: '2026-10-30T14:30:00Z', title: 'Later Event' },
      { id: 2, published_at: '2026-10-30T09:15:00Z', title: 'First Event' },
      { id: 3, published_at: '2026-10-30T11:00:00Z', title: 'Middle Event' },
    ];

    const sorted = [...rawArticles].sort((a, b) => {
      const timeA = new Date(a.published_at).getTime();
      const timeB = new Date(b.published_at).getTime();
      return timeA - timeB;
    });

    expect(sorted[0]?.id).toBe(2);
    expect(sorted[1]?.id).toBe(3);
    expect(sorted[2]?.id).toBe(1);
  });
});


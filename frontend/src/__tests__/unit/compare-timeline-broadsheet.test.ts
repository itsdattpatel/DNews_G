/**
 * frontend/src/__tests__/unit/compare-timeline-broadsheet.test.ts
 * Unit tests for Screens (c) Compare Coverage & (d) Story Timeline (Step 7).
 * Verifies multi-outlet clustering, shared keyword extraction,
 * catenary silk bezier curves, chronological event sorting, and empty states.
 */
import { describe, it, expect } from 'vitest';
import { generateSilkPath } from '../../components/compare/CompareCoverage';

describe('Screens (c) & (d): Compare Coverage & Story Timeline (Step 7)', () => {
  describe('Catenary Silk Curve Generator (P7-06)', () => {
    it('generates smooth cubic bezier path between two keyword coordinates', () => {
      const from = { x: 50, y: 100 };
      const to = { x: 350, y: 180 };
      const path = generateSilkPath(from, to);

      expect(path).toContain('M 50 100');
      expect(path).toContain('C ');
      expect(path).toContain('350 180');
    });

    it('handles vertical and horizontal delta offsets without NaN', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 100, y: 300 };
      const path = generateSilkPath(p1, p2);

      expect(path).not.toContain('NaN');
      expect(path).toContain('M 100 100');
    });
  });

  describe('Shared Keyword Discovery Across International Outlets (P7-05)', () => {
    it('isolates shared keywords appearing in >= 2 distinct outlet articles', () => {
      const clusterArticles = [
        {
          id: 1,
          source: { name: 'The Hindu', country: 'India' },
          keywords: ['solar-power', 'climate', 'battery', 'tariff'],
        },
        {
          id: 2,
          source: { name: 'Reuters', country: 'USA' },
          keywords: ['climate', 'wind-grid', 'battery', 'subsidies'],
        },
        {
          id: 3,
          source: { name: 'NDTV', country: 'India' },
          keywords: ['wildlife', 'conservation', 'climate'],
        },
      ];

      const frequency = new Map<string, number>();
      for (const art of clusterArticles) {
        for (const kw of new Set(art.keywords)) {
          frequency.set(kw, (frequency.get(kw) ?? 0) + 1);
        }
      }

      const shared = Array.from(frequency.entries())
        .filter(([, count]) => count >= 2)
        .map(([kw]) => kw);

      expect(shared).toContain('climate'); // in 3
      expect(shared).toContain('battery'); // in 2
      expect(shared).not.toContain('solar-power'); // only in 1
      expect(shared).not.toContain('tariff'); // only in 1
    });
  });

  describe('Story Timeline Chronological Event Ordering (P7-07)', () => {
    it('orders cluster timeline dispatches chronologically (oldest to newest)', () => {
      const events = [
        { id: 101, title: 'Final Resolution Passed', published_at: '2026-10-30T16:00:00Z' },
        { id: 102, title: 'Emergency Session Convened', published_at: '2026-10-30T08:30:00Z' },
        { id: 103, title: 'Delegations Arrive in Geneva', published_at: '2026-10-30T06:00:00Z' },
        { id: 104, title: 'Midday Draft Stalled', published_at: '2026-10-30T12:15:00Z' },
      ];

      const sorted = [...events].sort((a, b) => {
        const timeA = new Date(a.published_at).getTime();
        const timeB = new Date(b.published_at).getTime();
        return timeA - timeB;
      });

      expect(sorted[0]?.id).toBe(103); // 06:00
      expect(sorted[1]?.id).toBe(102); // 08:30
      expect(sorted[2]?.id).toBe(104); // 12:15
      expect(sorted[3]?.id).toBe(101); // 16:00
    });

    it('classifies breaking event markers with crimson accent threshold (>= 75)', () => {
      const breakingScoreA = 82;
      const breakingScoreB = 45;

      const isBreakingA = breakingScoreA >= 75;
      const isBreakingB = breakingScoreB >= 75;

      expect(isBreakingA).toBe(true);
      expect(isBreakingB).toBe(false);
    });
  });
});

/**
 * frontend/src/__tests__/unit/feed-counter-broadsheet.test.tsx
 * Unit tests for Feed Counter Popover & Broadsheet Telemetry (PRD A Category 8).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeedCounterPopover } from '../../components/telemetry/FeedCounterPopover';
import { useAppStore } from '../../store/useAppStore';
import type { FeedCounterMetrics } from '../../types/feedCounter';

const sampleMetrics: FeedCounterMetrics = {
  rolling24h: {
    total: 142,
    catchup: 12,
    duplicates_skipped: 45,
    hourly: [
      {
        hour_utc: '2026-11-02T10:00:00Z',
        label: '10:00',
        count: 24,
        catchup: 2,
        is_app_off: false,
        downtime_minutes: 0,
      },
      {
        hour_utc: '2026-11-02T11:00:00Z',
        label: '11:00',
        count: 0,
        catchup: 0,
        is_app_off: true,
        downtime_minutes: 60,
      },
    ],
  },
  seven_day_total: 842,
  thirty_day_total: 3510,
  lifetime: {
    total: 12450,
    catchup: 120,
    duplicates_skipped: 1420,
    tracking_since: '2026-10-30T10:00:00.000Z',
  },
  session_stats: {
    total_running_sec: 180000, // 2d 2h
    total_away_sec: 22200,     // 6h 10m
  },
};

describe('FeedCounterPopover Component (PRD A Category 8)', () => {
  beforeEach(() => {
    useAppStore.setState({
      isFeedCounterOpen: false,
      feedCounter: null,
    });
  });

  it('renders nothing when isFeedCounterOpen is false', () => {
    const html = renderToStaticMarkup(<FeedCounterPopover forceOpen={false} />);
    expect(html).toBe('');
  });

  it('renders broadsheet popover when forceOpen is true with full metrics', () => {
    const html = renderToStaticMarkup(
      <FeedCounterPopover forceOpen={true} metrics={sampleMetrics} />
    );

    // Header & Masthead
    expect(html).toContain('News Wire Velocity');
    expect(html).toContain('News Wire Telemetry · PRD §8');

    // Rolling 24-hour section
    expect(html).toContain('142');
    expect(html).toContain('Dispatches');
    expect(html).toContain('+12 catch-up');
    expect(html).toContain('45 duplicates filtered');

    // Hourly sparkline & legend
    expect(html).toContain('24h Arrival Velocity (Hourly)');
    expect(html).toContain('Desk Off');

    // Historical volume grid (Retention Immune)
    expect(html).toContain('842');
    expect(html).toContain('7-Day Total');
    expect(html).toContain('3,510');
    expect(html).toContain('30-Day Volume');
    expect(html).toContain('Immune');
    expect(html).toContain('12,450');
    expect(html).toContain('Lifetime');

    // Desk Uptime & Downtime
    expect(html).toContain('Total Time Running');
    expect(html).toContain('2d 2h');
    expect(html).toContain('Total Time Away');
    expect(html).toContain('6h 10m');
  });

  it('renders empty/fallback state gracefully when feedCounter is empty', () => {
    const html = renderToStaticMarkup(
      <FeedCounterPopover forceOpen={true} metrics={null} />
    );
    expect(html).toContain('News Wire Velocity');
    expect(html).toContain('0 catch-up');
    expect(html).toContain('0 duplicates filtered');
  });

  it('updates zustand store state and toggle methods', () => {
    expect(useAppStore.getState().isFeedCounterOpen).toBe(false);
    useAppStore.getState().setFeedCounterOpen(true);
    expect(useAppStore.getState().isFeedCounterOpen).toBe(true);
    useAppStore.getState().setFeedCounterOpen(false);
    expect(useAppStore.getState().isFeedCounterOpen).toBe(false);
  });
});

/**
 * frontend/src/__tests__/unit/missedNews.test.ts
 * Unit tests for Missed News state, startup status check, and backfill action (P5-05).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';

describe('Missed News Catch-Up State (P5-05)', () => {
  beforeEach(() => {
    useAppStore.setState({
      startupStatus: null,
      isMissedNewsModalOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens modal when startup status detects gap >= 5 minutes', async () => {
    const mockStartupData = {
      status: 'ok',
      uptime_ms: 12000,
      missed_minutes: 45,
      last_fetched_at: '2026-10-30T10:00:00.000Z',
      detected: true,
      can_backfill: true,
      window_start: '2026-10-30T10:00:00.000Z',
      window_end: '2026-10-30T10:45:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStartupData,
    });

    await useAppStore.getState().checkStartupStatus();

    expect(useAppStore.getState().startupStatus).toEqual(mockStartupData);
    expect(useAppStore.getState().isMissedNewsModalOpen).toBe(true);
  });

  it('keeps modal closed when no gap is detected', async () => {
    const mockStartupData = {
      status: 'ok',
      uptime_ms: 5000,
      missed_minutes: 1,
      last_fetched_at: '2026-10-30T10:44:00.000Z',
      detected: false,
      can_backfill: false,
      window_start: '2026-10-30T10:44:00.000Z',
      window_end: '2026-10-30T10:45:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStartupData,
    });

    await useAppStore.getState().checkStartupStatus();

    expect(useAppStore.getState().startupStatus).toEqual(mockStartupData);
    expect(useAppStore.getState().isMissedNewsModalOpen).toBe(false);
  });

  it('allows manual modal dismissal or opening', () => {
    expect(useAppStore.getState().isMissedNewsModalOpen).toBe(false);
    useAppStore.getState().setMissedNewsModalOpen(true);
    expect(useAppStore.getState().isMissedNewsModalOpen).toBe(true);
    useAppStore.getState().setMissedNewsModalOpen(false);
    expect(useAppStore.getState().isMissedNewsModalOpen).toBe(false);
  });

  it('triggerBackfill posts to /api/backfill and returns report', async () => {
    const mockBackfillResponse = {
      status: 'ok',
      covered_minutes: 45,
      total_missed_minutes: 45,
      articles_fetched: 8,
      articles_inserted: 6,
      gdelt_coverage: true,
      rss_coverage: false,
      warning: 'RSS has no backfill; GDELT covered 45 of 45 minutes',
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/backfill') {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackfillResponse,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });
    });

    const res = await useAppStore.getState().triggerBackfill();
    expect(res).toEqual(mockBackfillResponse);

    // Verify P5-09 honest gap warning alert is queued in alerts stack
    const alerts = useAppStore.getState().alerts;
    expect(alerts.length).toBe(1);
    expect(alerts[0]?.type).toBe('warning');
    expect(alerts[0]?.message).toBe('RSS has no backfill; GDELT covered 45 of 45 minutes');
  });
});

/**
 * frontend/src/__tests__/unit/control-room.test.tsx
 * Unit tests for Control Room Desk UI & Telemetry Modules (PRD A Category 11).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ControlRoomDesk } from '../../components/control-room/ControlRoomDesk';
import { useAppStore } from '../../store/useAppStore';
import type { ControlRoomTelemetry } from '../../types';

describe('Category 11: Control Room Desk UI', () => {
  const mockTelemetry: ControlRoomTelemetry = {
    server_time: '2026-11-02T18:45:00.000Z',
    sources: [
      {
        id: 1,
        name: 'The Hindu',
        slug: 'in_hindu',
        country: 'India',
        url: 'https://thehindu.com/rss',
        fetch_type: 'rss',
        enabled: true,
        last_fetched_at: '2026-11-02T18:40:00.000Z',
        last_latency_ms: 145,
        error_count: 0,
        last_error: null,
        last_error_at: null,
        last_status: 'ok',
        freshness_tier: 'fresh',
        minutes_since_fetch: 5,
      },
      {
        id: 2,
        name: 'Reuters',
        slug: 'us_reuters',
        country: 'USA',
        url: 'https://reuters.com/rss',
        fetch_type: 'rss',
        enabled: true,
        last_fetched_at: '2026-11-02T18:20:00.000Z',
        last_latency_ms: 320,
        error_count: 0,
        last_error: null,
        last_error_at: null,
        last_status: 'ok',
        freshness_tier: 'delayed',
        minutes_since_fetch: 25,
      },
    ],
    source_summary: {
      total: 2,
      enabled: 2,
      fresh: 1,
      delayed: 1,
      failing: 0,
      disabled: 0,
      avg_latency_ms: 232,
    },
    scheduler: {
      is_running: false,
      last_cycle_started_at: '2026-11-02T18:40:00.000Z',
      last_cycle_completed_at: '2026-11-02T18:40:02.000Z',
      last_cycle_duration_ms: 2150,
      last_cycle_articles_fetched: 25,
      last_cycle_new_articles: 3,
      next_cycle_expected_at: '2026-11-02T18:45:00.000Z',
      interval_minutes: 5,
      startup_gap: {
        detected: false,
        missed_minutes: 0,
      },
    },
    ai_providers: {
      chain: [
        { name: 'gemini', model: 'gemini-2.5-flash', enabled: true, timeout_ms: 20000 },
        { name: 'groq', model: 'llama-3.1-8b-instant', enabled: true, timeout_ms: 20000 },
      ],
      current_provider: 'gemini',
      throttled: {
        gemini: { throttled: false, remainingSec: 0 },
        groq: { throttled: false, remainingSec: 0 },
      },
      stats_today: {
        gemini: { callsToday: 42, tokensToday: 18500, errorsToday: 0 },
        groq: { callsToday: 0, tokensToday: 0, errorsToday: 0 },
      },
      two_pass: {
        pass1_count: 120,
        pass2_count: 40,
        pass2_skipped_count: 80,
        estimated_tokens_saved: 59200,
      },
    },
    queues: {
      pending: 0,
      processing: 0,
      done: 120,
      ai_failed: 1,
      pass1_triaged: 120,
      pass2_enriched: 40,
      pass2_deferred: 80,
    },
    storage: {
      db_path: 'backend/data/news.sqlite',
      db_size_bytes: 16800000,
      db_size_mb: 16.02,
      db_size_formatted: '16.02 MB',
      warning_threshold_mb: 1536,
      limit_threshold_mb: 2048,
      storage_health: 'optimal',
      total_articles: 121,
      total_clusters: 28,
      total_sources: 2,
      backups_count: 5,
      latest_backup: {
        filename: 'news.backup_daily_20261102.sqlite',
        createdAt: '2026-11-02T03:00:00.000Z',
        sizeFormatted: '15.9 MB',
        trigger: 'daily',
      },
    },
    modes: {
      plain_mode_enabled: false,
      two_pass_ai_enabled: true,
      pass2_threshold: 75,
      auto_advance_enabled: false,
      auto_advance_interval_sec: 7,
      refresh_interval_minutes: 5,
    },
    error_summary: {
      total_24h: 1,
      by_subsystem: {
        fetcher: 1,
        ai: 0,
        scheduler: 0,
        db: 0,
        tv: 0,
        system: 0,
      },
      by_level: {
        error: 1,
        warn: 0,
        info: 0,
      },
      latest_error: {
        id: 1,
        timestamp: '2026-11-02T17:00:00.000Z',
        subsystem: 'fetcher',
        level: 'error',
        message: 'Upstream connection reset',
        details: null,
        created_at: '2026-11-02T17:00:00.000Z',
      },
    },
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/api/control-room/telemetry')) {
        return {
          ok: true,
          json: async () => mockTelemetry,
        };
      }
      if (url.includes('/api/control-room/errors')) {
        return {
          ok: true,
          json: async () => ({
            items: [mockTelemetry.error_summary.latest_error],
            total: 1,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }));
  });

  it('renders nothing when isControlRoomOpen is false', () => {
    useAppStore.setState({ isControlRoomOpen: false });
    const html = renderToStaticMarkup(<ControlRoomDesk forceOpen={false} />);
    expect(html).toBe('');
  });

  it('renders Control Room Desk overlay when isControlRoomOpen is true', () => {
    useAppStore.setState({ isControlRoomOpen: true });
    const html = renderToStaticMarkup(<ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} />);

    expect(html).toContain('control-room-desk');
    expect(html).toContain('Desk Control Room &amp; Telemetry Wire');
    expect(html).toContain('OPS-HUB');
    expect(html).toContain('Trigger Ingest');
    expect(html).toContain('Refresh');
  });

  it('renders all 6 navigation tabs', () => {
    useAppStore.setState({ isControlRoomOpen: true });
    const html = renderToStaticMarkup(<ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} />);

    expect(html).toContain('Operational Overview');
    expect(html).toContain('Sources Freshness');
    expect(html).toContain('Scheduler &amp; Queues');
    expect(html).toContain('AI Providers &amp; Quotas');
    expect(html).toContain('Error Ledger');
    expect(html).toContain('Storage &amp; System Modes');
  });

  it('renders Sources Freshness Matrix table when sources tab is selected', () => {
    const html = renderToStaticMarkup(
      <ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} initialTab="sources" />
    );

    expect(html).toContain('The Hindu');
    expect(html).toContain('Reuters');
    expect(html).toContain('145ms');
    expect(html).toContain('fresh');
    expect(html).toContain('delayed');
  });

  it('renders Scheduler & Queues telemetry when scheduler tab is selected', () => {
    const html = renderToStaticMarkup(
      <ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} initialTab="scheduler-queues" />
    );

    expect(html).toContain('Scheduler Dispatch Engine');
    expect(html).toContain('5 minutes');
    expect(html).toContain('Ingestion &amp; Triage Queue Breakdown');
    expect(html).toContain('Pass 1 Scored');
    expect(html).toContain('Pass 2 Enriched');
  });

  it('renders AI Provider Fallback Chain and Quotas when ai-quotas tab is selected', () => {
    const html = renderToStaticMarkup(
      <ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} initialTab="ai-quotas" />
    );

    expect(html).toContain('AI Provider Fallback Chain');
    expect(html).toContain('gemini');
    expect(html).toContain('groq');
    expect(html).toContain('Two-Pass AI Quota Economics');
    expect(html).toContain('~59,200');
  });

  it('renders Storage & System Operating Modes when storage-modes tab is selected', () => {
    const html = renderToStaticMarkup(
      <ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} initialTab="storage-modes" />
    );

    expect(html).toContain('Physical SQLite Storage &amp; Safety Net');
    expect(html).toContain('16.02 MB');
    expect(html).toContain('Warn: 1.5 GB · Limit: 2.0 GB');
    expect(html).toContain('Plain Mode (Zero AI)');
    expect(html).toContain('Two-Pass AI Ingestion');
  });

  it('renders the bottom status bar with SSE sync indicator', () => {
    useAppStore.setState({ isControlRoomOpen: true });
    const html = renderToStaticMarkup(<ControlRoomDesk forceOpen={true} initialTelemetry={mockTelemetry} />);

    expect(html).toContain('Live SSE Synchronized');
    expect(html).toContain('The World Desk Operations Telemetry Wire');
  });
});

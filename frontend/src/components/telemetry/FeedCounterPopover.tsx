/**
 * frontend/src/components/telemetry/FeedCounterPopover.tsx
 * Broadsheet Live Feed Counter & Telemetry Panel (PRD A Category 8).
 * Features 24-hour sliding window, catchup badges, duplicates skipped,
 * 24-hour activity sparkline with hatched "app off" downtime bars,
 * 7-day, 30-day (retention-immune), all-time volume, and uptime/downtime totals.
 */
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HatchedSparkline, type SparklinePoint } from '../common/HatchedSparkline';
import { Radio, Clock, ShieldCheck, X } from 'lucide-react';
import type { FeedCounterMetrics, HourlySparklinePoint } from '../../types/feedCounter';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

function formatTrackingDate(isoString?: string): string {
  if (!isoString) return 'Launch';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export interface FeedCounterPopoverProps {
  forceOpen?: boolean;
  metrics?: FeedCounterMetrics | null;
}

export const FeedCounterPopover: React.FC<FeedCounterPopoverProps> = ({
  forceOpen,
  metrics,
}) => {
  const storeIsFeedCounterOpen = useAppStore((s) => s.isFeedCounterOpen);
  const setFeedCounterOpen = useAppStore((s) => s.setFeedCounterOpen);
  const storeFeedCounter = useAppStore((s) => s.feedCounter);
  const fetchFeedCounter = useAppStore((s) => s.fetchFeedCounter);

  const isFeedCounterOpen = forceOpen ?? storeIsFeedCounterOpen;
  const feedCounter = metrics !== undefined ? metrics : storeFeedCounter;

  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFeedCounterOpen) {
      fetchFeedCounter();
    }
  }, [isFeedCounterOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isFeedCounterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Only close if not clicking the toggle button (topbar or rail)
        const railBtn = document.getElementById('btn-rail-feed-counter');
        const topbarBtn = document.getElementById('btn-topbar-feed-counter');
        if ((railBtn && railBtn.contains(e.target as Node)) || (topbarBtn && topbarBtn.contains(e.target as Node))) return;
        setFeedCounterOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedCounterOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFeedCounterOpen]);

  if (!isFeedCounterOpen) return null;

  // Map 24-hour hourly telemetry to HatchedSparkline points
  const sparklinePoints: SparklinePoint[] = (feedCounter?.rolling24h.hourly || []).map((h: HourlySparklinePoint) => ({
    label: `${h.label} UTC`,
    value: h.count,
    isDowntime: h.is_app_off,
    downtimeMinutes: h.downtime_minutes,
  }));

  const rolling24Total = feedCounter?.rolling24h.total ?? 0;
  const catchupCount = feedCounter?.rolling24h.catchup ?? 0;
  const duplicatesSkipped = feedCounter?.rolling24h.duplicates_skipped ?? 0;

  return (
    <div
      id="feed-counter-popover"
      ref={popoverRef}
      role="region"
      aria-label="Live Feed Counter & Telemetry Panel"
      className="fixed right-14 top-14 w-[26rem] max-w-[calc(100vw-4rem)] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay p-4 z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* 1. Broadsheet Header */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
            <Radio size={12} className="text-accent animate-pulse" />
            <span>News Wire Telemetry · PRD §8</span>
          </div>
          <h3 className="font-masthead text-xl font-bold tracking-tight text-ink leading-tight">
            News Wire Velocity
          </h3>
        </div>
        <button
          id="btn-close-feed-counter"
          onClick={() => setFeedCounterOpen(false)}
          className="p-1 border border-paper-border hover:border-ink bg-paper-alt hover:bg-ink hover:text-paper rounded-xs transition-colors"
          title="Close Popover (Esc)"
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. Rolling 24-Hour Arrival Velocity */}
      <div className="p-3 border border-ink bg-paper-alt rounded-xs mb-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="space-y-0.5">
            <span className="font-mono text-[10px] uppercase font-bold text-ink-muted">
              Rolling 24-Hour Velocity
            </span>
            <div className="flex items-baseline gap-2">
              <span id="feed-counter-rolling-24h" className="font-headline text-3xl font-extrabold text-ink leading-none">
                {rolling24Total.toLocaleString()}
              </span>
              <span className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Dispatches
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 font-mono text-[11px]">
            {catchupCount > 0 ? (
              <span
                id="feed-counter-catchup-badge"
                className="px-1.5 py-0.5 border border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-400 font-bold rounded-xs"
                title="Articles fetched during catch-up window"
              >
                +{catchupCount} catch-up
              </span>
            ) : (
              <span className="text-[10px] text-ink-muted">0 catch-up</span>
            )}
            <span
              id="feed-counter-duplicates-count"
              className="text-ink-muted text-[10px]"
              title="Duplicate URLs skipped by deduplication engine"
            >
              {duplicatesSkipped.toLocaleString()} duplicates filtered
            </span>
          </div>
        </div>

        {/* 24-Hour Sparkline with Downtime Hatches */}
        <div className="pt-2 border-t border-paper-border/60">
          <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted mb-1.5">
            <span>24h Arrival Velocity (Hourly)</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-ink rounded-2xs inline-block" />
                <span>Ingested</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 border border-ink-muted inline-block bg-[linear-gradient(45deg,#888_25%,transparent_25%,transparent_50%,#888_50%,#888_75%,transparent_75%)] bg-[length:4px_4px]" />
                <span>Desk Off</span>
              </span>
            </div>
          </div>

          <div className="bg-paper p-2 border border-paper-border rounded-xs">
            <HatchedSparkline
              data={sparklinePoints}
              height={36}
              barWidth={8}
              gap={3}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 3. Historical Volumes & Retention Immunity Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 border border-paper-border bg-paper rounded-xs text-center space-y-0.5">
          <span className="font-mono text-[9px] uppercase font-bold text-ink-muted block">
            7-Day Total
          </span>
          <span id="feed-counter-7d" className="font-headline text-base font-bold text-ink block">
            {(feedCounter?.seven_day_total ?? 0).toLocaleString()}
          </span>
          <span className="font-serif text-[10px] text-ink-secondary italic block">
            Recent Intake
          </span>
        </div>

        <div className="p-2 border border-paper-border bg-paper rounded-xs text-center space-y-0.5">
          <span className="font-mono text-[9px] uppercase font-bold text-ink-muted block">
            30-Day Volume
          </span>
          <span id="feed-counter-30d" className="font-headline text-base font-bold text-ink block">
            {(feedCounter?.thirty_day_total ?? 0).toLocaleString()}
          </span>
          <span className="font-mono text-[9px] text-positive font-bold flex items-center justify-center gap-0.5">
            <ShieldCheck size={9} />
            <span>Immune</span>
          </span>
        </div>

        <div className="p-2 border border-paper-border bg-paper rounded-xs text-center space-y-0.5">
          <span className="font-mono text-[9px] uppercase font-bold text-ink-muted block">
            Lifetime
          </span>
          <span id="feed-counter-lifetime" className="font-headline text-base font-bold text-ink block">
            {(feedCounter?.lifetime.total ?? 0).toLocaleString()}
          </span>
          <span className="font-serif text-[9px] text-ink-muted block truncate" title={`Tracking since ${formatTrackingDate(feedCounter?.lifetime.tracking_since)}`}>
            Since {formatTrackingDate(feedCounter?.lifetime.tracking_since)}
          </span>
        </div>
      </div>

      {/* 4. Desk Operational Uptime Telemetry */}
      <div className="p-2.5 border border-paper-border bg-paper-alt rounded-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-ink-secondary" />
          <div>
            <span className="font-mono text-[10px] uppercase font-bold text-ink-muted block leading-none">
              Total Time Running
            </span>
            <span id="feed-counter-uptime" className="font-mono text-[11px] font-bold text-ink">
              {formatDuration(feedCounter?.session_stats.total_running_sec ?? 0)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-[10px] uppercase font-bold text-ink-muted block leading-none">
            Total Time Away
          </span>
          <span id="feed-counter-downtime" className="font-mono text-[11px] font-bold text-ink-secondary">
            {formatDuration(feedCounter?.session_stats.total_away_sec ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FeedCounterPopover;

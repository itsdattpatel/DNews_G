/**
 * frontend/src/utils/dateFormatter.ts
 * Dual timestamp formatting & live relative date utility per PRD A Category 1.
 * Supports "Published X ago" and "Arrived Y ago" with exact local timestamps on hover/focus.
 * Implements strict "Date unverified" rules for missing, future, and stale dates (>30d).
 */
import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export interface DateDisplayInfo {
  publishedRelative: string;      // "Published 2h ago" | "Date unverified"
  arrivedRelative: string;        // "Arrived 1h 58m ago"
  combinedDisplay: string;        // "Published 2h ago · Arrived 1h 58m ago"
  publishedExactLocal: string;    // Exact formatted local time
  arrivedExactLocal: string;      // Exact formatted local time
  tooltip: string;                // Complete hover/focus text
  isUnverified: boolean;
  isCatchup: boolean;
  catchupLabel?: string;
}

// Clock synchronization state (PRD A Category 1B)
let serverClockOffsetMs = 0;

/** Sets the offset between server clock and laptop clock in milliseconds */
export function setServerClockOffset(offsetMs: number): void {
  serverClockOffsetMs = offsetMs;
}

/** Gets the current server clock offset in milliseconds */
export function getServerClockOffset(): number {
  return serverClockOffsetMs;
}

/** Returns the current time adjusted by the server clock offset */
export function getSynchronizedNow(): Date {
  return new Date(Date.now() + serverClockOffsetMs);
}

/**
 * Synchronizes client clock with /api/time, compensating for estimated network latency.
 */
export async function syncClockWithServer(): Promise<number> {
  try {
    const t0 = Date.now();
    const res = await apiFetch('/api/time');
    if (!res.ok) return 0;
    const t1 = Date.now();
    const data = (await res.json()) as { utc: string; timestamp: number };
    const latency = Math.max(0, Math.floor((t1 - t0) / 2));
    const estimatedServerNow = data.timestamp + latency;
    const offset = estimatedServerNow - t1;
    setServerClockOffset(offset);
    return offset;
  } catch {
    return 0;
  }
}

/** Formats a millisecond duration into human-readable relative time */
export function formatRelativeSpan(diffMs: number): string {
  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  const remMinutes = diffMin % 60;

  if (diffHours < 6) {
    return remMinutes > 0 ? `${diffHours}h ${remMinutes}m ago` : `${diffHours}h ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Formats a date string into user laptop local time with timezone code */
export function formatExactLocal(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Validates published_at against ingested_at and computes dual timestamp metrics.
 */
export function formatDualTimestamps(
  publishedAt: string | null | undefined,
  ingestedAt: string | null | undefined,
  isCatchup: boolean = false,
  nowReference: Date = getSynchronizedNow(),
): DateDisplayInfo {
  const nowMs = nowReference.getTime();

  // Ingest date defaults to now if somehow missing
  const ingestDate = ingestedAt ? new Date(ingestedAt) : nowReference;
  const ingestMs = isNaN(ingestDate.getTime()) ? nowMs : ingestDate.getTime();
  const arrivedRelative = `Arrived ${formatRelativeSpan(nowMs - ingestMs)}`;
  const arrivedExactLocal = formatExactLocal(ingestedAt);

  // Validate published_at
  let isUnverified = false;
  let publishedRelative = 'Date unverified';
  let publishedExactLocal = 'Date unverified';

  if (!publishedAt || !publishedAt.trim()) {
    isUnverified = true;
  } else {
    const pubDate = new Date(publishedAt);
    if (isNaN(pubDate.getTime())) {
      isUnverified = true;
    } else {
      const pubMs = pubDate.getTime();
      const fifteenMinutesMs = 15 * 60 * 1000;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      // Future date check (>15m ahead of now or ingest)
      if (pubMs > nowMs + fifteenMinutesMs || pubMs > ingestMs + fifteenMinutesMs) {
        isUnverified = true;
      }
      // Stale date check (>30 days older than ingest time)
      else if (ingestMs - pubMs > thirtyDaysMs) {
        isUnverified = true;
      } else {
        publishedRelative = `Published ${formatRelativeSpan(nowMs - pubMs)}`;
        publishedExactLocal = formatExactLocal(publishedAt);
      }
    }
  }

  const combinedDisplay = `${publishedRelative} · ${arrivedRelative}`;
  const catchupText = isCatchup ? ' (arrived late via catch-up)' : '';

  const tooltip = isUnverified
    ? `Published: Date unverified\nArrived: ${arrivedExactLocal}${catchupText}`
    : `Published: ${publishedExactLocal}\nArrived: ${arrivedExactLocal}${catchupText}`;

  return {
    publishedRelative,
    arrivedRelative,
    combinedDisplay,
    publishedExactLocal,
    arrivedExactLocal,
    tooltip,
    isUnverified,
    isCatchup,
    catchupLabel: isCatchup ? 'arrived late' : undefined,
  };
}

/**
 * React hook that triggers a state update every intervalMs so relative times refresh live.
 */
export function useLiveRelativeTime(intervalMs: number = 30000): Date {
  const [currentNow, setCurrentNow] = useState(() => getSynchronizedNow());

  useEffect(() => {
    // Initial clock sync on hook mount
    syncClockWithServer().then(() => {
      setCurrentNow(getSynchronizedNow());
    });

    const timer = setInterval(() => {
      setCurrentNow(getSynchronizedNow());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return currentNow;
}


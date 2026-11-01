/**
 * frontend/src/utils/tv.ts
 * Utility helpers, health dot calculator, and shelf filters for Screen (h) TV View.
 */
import type { TvChannel } from '../types';

/**
 * Calculates 0 to 5 dot health score from stream availability and ping latency
 */
export function calculateHealthRating(isAlive: boolean, latencyMs?: number): number {
  if (!isAlive) return 0;
  if (latencyMs === undefined || latencyMs === null) return 4; // Default healthy if alive
  if (latencyMs <= 150) return 5;
  if (latencyMs <= 400) return 4;
  if (latencyMs <= 800) return 3;
  if (latencyMs <= 1500) return 2;
  return 1;
}

/**
 * Formats 0-5 score into a 5-dot broadsheet indicator string e.g. [●●●●○]
 */
export function renderHealthDots(score: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(score)));
  const filled = '●'.repeat(clamped);
  const empty = '○'.repeat(5 - clamped);
  return `[${filled}${empty}]`;
}

/**
 * Formats stream URL into desktop VLC media player protocol link
 */
export function getVlcUrl(streamUrl: string): string {
  if (!streamUrl) return '';
  return `vlc://${streamUrl}`;
}

export type TvShelf = 'all' | 'animals' | 'favorites';

/**
 * Filters a list of IPTV channels by shelf, search query, and dead/offline visibility
 */
export function filterChannels(
  channels: TvChannel[],
  shelf: TvShelf,
  searchQuery: string,
  includeDead: boolean,
): TvChannel[] {
  let list = channels;

  // Filter dead streams
  if (!includeDead) {
    list = list.filter((c) => c.is_alive);
  }

  // Shelf filtering
  if (shelf === 'animals') {
    list = list.filter(
      (c) =>
        (c.category || '').toLowerCase().includes('animal') ||
        (c.category || '').toLowerCase().includes('nature') ||
        (c.category || '').toLowerCase().includes('wild') ||
        (c.name || '').toLowerCase().includes('animal') ||
        (c.name || '').toLowerCase().includes('earth') ||
        (c.name || '').toLowerCase().includes('wild'),
    );
  } else if (shelf === 'favorites') {
    list = list.filter((c) => c.is_favorite);
  }

  // Search filtering
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q),
    );
  }

  return list;
}

/**
 * frontend/src/utils/sources.ts
 * Utility helpers for Screen (m): API & Sources Settings Desk.
 */
import type { Source } from '../types';

/**
 * Masks sensitive API keys showing only prefix and last 4 characters.
 */
export function maskApiKey(key?: string): string {
  if (!key || typeof key !== 'string') return '••••••••••••';
  const trimmed = key.trim();
  if (trimmed.length <= 6) return '••••••';
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Computes quota percentage clamped to 0–100%.
 */
export function calculateQuotaPercentage(callsToday: number, dailyLimit: number = 1000): number {
  if (!dailyLimit || dailyLimit <= 0) return 0;
  const ratio = (callsToday / dailyLimit) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

/**
 * Renders 5-dot quota telegraph indicator string (e.g. "[●●●●○ 80%]").
 */
export function renderQuotaDots(percent: number): string {
  const p = Math.min(100, Math.max(0, percent));
  const filled = Math.min(5, Math.floor(p / 20));
  const empty = 5 - filled;
  return `[${'●'.repeat(filled)}${'○'.repeat(empty)} ${p}%]`;
}

/**
 * Filters source bureaus by country and search query.
 */
export function filterSources(
  sources: Source[],
  countryFilter?: string | null,
  searchQuery?: string
): Source[] {
  if (!Array.isArray(sources)) return [];

  let result = sources;

  if (countryFilter && countryFilter !== 'All') {
    result = result.filter(
      (s) => s.country?.toLowerCase() === countryFilter.toLowerCase()
    );
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q)
    );
  }

  return result;
}

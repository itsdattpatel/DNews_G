/**
 * backend/src/library/services/libraryRefreshScheduler.ts
 * Background Library refresh scheduler (Historical Today-in-History cache sync)
 * that emits typed SSE status and item updates without blocking server requests.
 */
import { getDb } from '../../db/db';
import { emitSseEvent } from '../../routes/sse';
import { HistoryService } from './historyService';

export interface LibraryRefreshStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  last_run_at: string | null;
  next_run_at: string | null;
  added: number;
  total_cached: number;
  month_day: string;
  error: string | null;
}

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // Every 6 hours

let timer: NodeJS.Timeout | null = null;
let currentStatus: LibraryRefreshStatus = {
  status: 'idle',
  last_run_at: null,
  next_run_at: null,
  added: 0,
  total_cached: 0,
  month_day: formatMonthDay(new Date()),
  error: null,
};

function formatMonthDay(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLibraryRefreshStatus(): LibraryRefreshStatus {
  try {
    const db = getDb();
    const total =
      (db.prepare('SELECT COUNT(*) as c FROM library_history_cache').get() as { c: number } | undefined)?.c ?? 0;
    return { ...currentStatus, total_cached: total };
  } catch {
    return { ...currentStatus };
  }
}

export async function runLibraryHistoryRefresh(
  monthDayOverride?: string,
  options: { skipExternalFetch?: boolean } = {},
): Promise<LibraryRefreshStatus> {
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();

  if (monthDayOverride && /^\d{2}-\d{2}$/.test(monthDayOverride)) {
    const [mStr, dStr] = monthDayOverride.split('-');
    month = parseInt(mStr!, 10);
    day = parseInt(dStr!, 10);
  }

  const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  currentStatus = {
    ...currentStatus,
    status: 'running',
    month_day: monthDay,
    error: null,
  };
  emitSseEvent('library_refresh_status', { ...currentStatus });

  try {
    const db = getDb();
    const historyService = new HistoryService(db);
    const result = await historyService.refreshMonthDay(month, day, options);

    for (const item of result.added) {
      emitSseEvent('library_history_update', {
        action: 'created',
        record: item,
      });
    }

    const totalCached =
      (db.prepare('SELECT COUNT(*) as c FROM library_history_cache').get() as { c: number })?.c ?? result.total;

    currentStatus = {
      status: 'completed',
      last_run_at: new Date().toISOString(),
      next_run_at: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
      added: result.added.length,
      total_cached: totalCached,
      month_day: monthDay,
      error: null,
    };
    emitSseEvent('library_refresh_status', { ...currentStatus });
    return { ...currentStatus };
  } catch (err: any) {
    currentStatus = {
      ...currentStatus,
      status: 'error',
      last_run_at: new Date().toISOString(),
      next_run_at: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
      error: err?.message ?? 'Refresh failed',
    };
    emitSseEvent('library_refresh_status', { ...currentStatus });
    return { ...currentStatus };
  }
}

export function startLibraryRefreshScheduler(): void {
  if (process.env.NODE_ENV === 'test' || timer) return;
  currentStatus = {
    ...currentStatus,
    next_run_at: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
  };
  timer = setInterval(() => {
    void runLibraryHistoryRefresh();
  }, REFRESH_INTERVAL_MS);
  if (timer.unref) timer.unref();
}

export function stopLibraryRefreshScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}


/**
 * backend/src/fetch/scheduler.ts
 * Manages the periodic fetch cycle. Reads refresh_interval from settings.
 * Emits fetched articles into the pipeline.
 */
import { getDb, getSetting } from '../db/db';
import { SOURCES } from '../../../config/sources';
import { FEATURES } from '../../../config/features';
import { fetchRss, type ArticleRaw } from './rss';
import { fetchGdelt } from './gdelt';
import { scrapeArticle } from './scraper';
import { insertPendingArticles } from '../pipeline/dedup';
import { updateSourceTelemetry, logSystemError } from '../services/controlRoom';
import { emitSseEvent } from '../routes/sse';

type FetchCallback = (articles: ArticleRaw[]) => Promise<void>;

let _timer: ReturnType<typeof setInterval> | null = null;
let _onFetch: FetchCallback | null = null;

// Telemetry State
let _isCycleRunning = false;
let _lastCycleStartedAt: string | null = null;
let _lastCycleCompletedAt: string | null = null;
let _lastCycleDurationMs: number | null = null;
let _lastCycleArticlesFetched = 0;
let _lastCycleNewArticles = 0;
let _nextCycleExpectedAt: string | null = null;

export function startScheduler(onFetch: FetchCallback): void {
  _onFetch = onFetch;
  scheduleNext();
  console.log('[Scheduler] Started');
}

export function stopScheduler(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

export function getIntervalMs(): number {
  const minutes = parseInt(getSetting('refresh_interval_minutes', '5'), 10);
  const clamped = Math.min(60, Math.max(1, minutes));
  return clamped * 60 * 1000;
}

function scheduleNext(): void {
  if (_timer) clearInterval(_timer);
  const intervalMs = getIntervalMs();
  _nextCycleExpectedAt = new Date(Date.now() + intervalMs).toISOString();
  _timer = setInterval(() => void runFetchCycle(), intervalMs);
  // Run immediately on first start
  void runFetchCycle();
}

/** Re-read interval from DB so changes take effect without restart */
export function refreshInterval(): void {
  if (_onFetch) {
    scheduleNext();
  }
}

async function runFetchCycle(): Promise<void> {
  if (_isCycleRunning) {
    console.log('[Scheduler] Fetch cycle already running, skipping overlapping invocation');
    return;
  }

  _isCycleRunning = true;
  _lastCycleStartedAt = new Date().toISOString();
  const cycleStartMs = Date.now();

  try {
    const enabledSources = SOURCES.filter((s) => s.enabled);

    console.log(`[Scheduler] Fetch cycle started — ${enabledSources.length} sources`);
    const allArticles: ArticleRaw[] = [];

    for (const source of enabledSources) {
      const sourceStart = Date.now();
      try {
        let articles: ArticleRaw[] = [];

        if (source.fetchType === 'rss' && FEATURES.rss) {
          articles = await fetchRss(source.url, source.slug, source.name, source.country);
        } else if (source.fetchType === 'gdelt' && FEATURES.gdelt) {
          articles = await fetchGdelt(source.url, source.slug, source.name, source.country);
        } else if (source.fetchType === 'scrape' && FEATURES.scraper) {
          const scraped = await scrapeArticle(source.url);
          if (scraped) {
            articles = [
              {
                url: source.url,
                titleOriginal: scraped.title,
                bodyOriginal: scraped.body,
                publishedAt: new Date().toISOString(),
                sourceSlug: source.slug,
                sourceName: source.name,
                country: source.country,
              },
            ];
          }
        }

        allArticles.push(...articles);
        const sourceLatency = Date.now() - sourceStart;

        // Update telemetry and last_fetched_at in database
        updateSourceTelemetry(source.slug, sourceLatency, null);
      } catch (err) {
        const sourceLatency = Date.now() - sourceStart;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Scheduler] Error fetching ${source.slug}: ${msg}`);
        updateSourceTelemetry(source.slug, sourceLatency, msg);
        logSystemError('fetcher', `Fetch failed for ${source.name} (${source.slug}): ${msg}`, 'error', {
          slug: source.slug,
          url: source.url,
          latencyMs: sourceLatency,
        });
      }
    }

    const newCount = await insertPendingArticles(allArticles);
    _lastCycleArticlesFetched = allArticles.length;
    _lastCycleNewArticles = newCount;
    _lastCycleDurationMs = Date.now() - cycleStartMs;
    _lastCycleCompletedAt = new Date().toISOString();
    _nextCycleExpectedAt = new Date(Date.now() + getIntervalMs()).toISOString();

    console.log(`[Scheduler] Cycle complete — ${allArticles.length} fetched, ${newCount} new in ${_lastCycleDurationMs}ms`);

    // Broadcast SSE update so Control Room and client surfaces reflect cycle completion
    emitSseEvent('control_room_update', {
      type: 'fetch_cycle_completed',
      articlesFetched: allArticles.length,
      newArticles: newCount,
      durationMs: _lastCycleDurationMs,
      completedAt: _lastCycleCompletedAt,
    });

    if (_onFetch && allArticles.length > 0) {
      await _onFetch(allArticles);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logSystemError('scheduler', `Fatal scheduler cycle error: ${msg}`, 'error');
  } finally {
    _isCycleRunning = false;
  }
}

/** Manually trigger an immediate fetch cycle on demand from the Control Room */
export async function triggerManualFetchCycle(): Promise<{
  status: 'completed' | 'already_running';
  fetched: number;
  newCount: number;
  durationMs: number;
}> {
  if (_isCycleRunning) {
    return {
      status: 'already_running',
      fetched: _lastCycleArticlesFetched,
      newCount: _lastCycleNewArticles,
      durationMs: _lastCycleDurationMs ?? 0,
    };
  }

  const startMs = Date.now();
  await runFetchCycle();
  return {
    status: 'completed',
    fetched: _lastCycleArticlesFetched,
    newCount: _lastCycleNewArticles,
    durationMs: Date.now() - startMs,
  };
}

/** Retrieve live scheduler telemetry metrics */
export function getSchedulerMetrics() {
  const gap = getStartupGap();
  return {
    isCycleRunning: _isCycleRunning,
    lastCycleStartedAt: _lastCycleStartedAt,
    lastCycleCompletedAt: _lastCycleCompletedAt,
    lastCycleDurationMs: _lastCycleDurationMs,
    lastCycleArticlesFetched: _lastCycleArticlesFetched,
    lastCycleNewArticles: _lastCycleNewArticles,
    nextCycleExpectedAt: _nextCycleExpectedAt,
    startupGap: {
      detected: gap.detected,
      missedMinutes: gap.missedMinutes,
    },
  };
}

/** Update the last_fetched_at timestamp for a source in DB */
export function updateSourceLastFetched(slug: string, timestamp: string = new Date().toISOString()): void {
  const db = getDb();
  db.prepare('UPDATE sources SET last_fetched_at = ? WHERE slug = ?').run(timestamp, slug);
}

/** Retrieve the last_fetched_at timestamp for a source from DB */
export function getSourceLastFetched(slug: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT last_fetched_at FROM sources WHERE slug = ?').get(slug) as
    | { last_fetched_at: string | null }
    | undefined;
  return row?.last_fetched_at ?? null;
}

export interface MissedWindow {
  detected: boolean;
  missedMinutes: number;
  lastFetchedAt: string | null;
  startedAt: string;
  windowStart: string | null;
  windowEnd: string;
  canBackfill: boolean;
}

let _startupGap: MissedWindow | null = null;

/**
 * Pure function to compute the missed window gap from last_fetched_at to now.
 */
export function computeMissedWindow(
  lastFetchedAt: string | null,
  now: Date = new Date(),
  canBackfillSourceAvailable: boolean = FEATURES.gdelt,
): MissedWindow {
  const startedAt = now.toISOString();

  if (!lastFetchedAt) {
    return {
      detected: false,
      missedMinutes: 0,
      lastFetchedAt: null,
      startedAt,
      windowStart: null,
      windowEnd: startedAt,
      canBackfill: false,
    };
  }

  const iso = lastFetchedAt.includes('T') ? lastFetchedAt : lastFetchedAt.replace(' ', 'T') + 'Z';
  const lastFetch = new Date(iso);
  const missedMs = Math.max(0, now.getTime() - lastFetch.getTime());
  const missedMinutes = Math.floor(missedMs / 60000);

  // A gap is considered detected if missedMinutes >= 5
  const detected = missedMinutes >= 5;
  const canBackfill = detected && canBackfillSourceAvailable;

  return {
    detected,
    missedMinutes,
    lastFetchedAt,
    startedAt,
    windowStart: lastFetchedAt,
    windowEnd: startedAt,
    canBackfill,
  };
}

/**
 * Captured once on startup before scheduled fetch cycles overwrite last_fetched_at.
 */
export function initStartupGap(): MissedWindow {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT last_fetched_at FROM sources WHERE last_fetched_at IS NOT NULL ORDER BY last_fetched_at DESC LIMIT 1',
    )
    .get() as { last_fetched_at: string } | undefined;

  _startupGap = computeMissedWindow(row?.last_fetched_at ?? null);
  return _startupGap;
}

/**
 * Get the current startup gap. Computes on demand if not yet initialized.
 */
export function getStartupGap(): MissedWindow {
  if (!_startupGap) {
    return initStartupGap();
  }
  return _startupGap;
}

/** Reset startup gap (used in tests or after successful backfill) */
export function resetStartupGap(): void {
  _startupGap = null;
}

/** Called at startup to detect gaps since last run (backward compatible wrapper) */
export interface StartupGap {
  missedMinutes: number;
  lastFetchedAt: string | null;
}

export function detectStartupGap(): StartupGap {
  const gap = getStartupGap();
  return { missedMinutes: gap.missedMinutes, lastFetchedAt: gap.lastFetchedAt };
}


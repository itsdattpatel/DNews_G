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

type FetchCallback = (articles: ArticleRaw[]) => Promise<void>;

let _timer: ReturnType<typeof setInterval> | null = null;
let _onFetch: FetchCallback | null = null;

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
  const enabledSources = SOURCES.filter((s) => s.enabled);

  console.log(`[Scheduler] Fetch cycle started — ${enabledSources.length} sources`);
  const allArticles: ArticleRaw[] = [];

  for (const source of enabledSources) {
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

      // Update last_fetched_at with ISO-8601 UTC timestamp
      updateSourceLastFetched(source.slug);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Scheduler] Error fetching ${source.slug}: ${msg}`);
    }
  }

  const newCount = await insertPendingArticles(allArticles);
  console.log(`[Scheduler] Cycle complete — ${allArticles.length} fetched, ${newCount} new`);

  if (_onFetch && allArticles.length > 0) {
    await _onFetch(allArticles);
  }
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


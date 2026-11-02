/**
 * backend/src/services/feedCounter.ts
 * Ingest Velocity Telemetry & Retention Immunity (PRD A Category 8)
 * 24-hour rolling window, 7-day, 30-day, and lifetime counters.
 * Hourly activity sparkline with hatched downtime indicators and session stats.
 */
import { getDb } from '../db/db';
import type { DbIngestHourly, DbLifetimeCounter, DbAppSession } from '../db/types';
import { emitSseEvent } from '../routes/sse';

export interface HourlySparklinePoint {
  hour_utc: string;          // ISO string e.g. "2026-11-02T12:00:00Z"
  label: string;             // Local hour label e.g. "12:00"
  count: number;             // Number of new unique articles
  catchup: number;           // Catch-up articles in this hour
  is_app_off: boolean;       // True if desk was offline / laptop off
  downtime_minutes: number;  // Estimated downtime minutes in this hour (0-60)
}

export interface FeedCounterMetrics {
  rolling24h: {
    total: number;
    catchup: number;
    duplicates_skipped: number;
    hourly: HourlySparklinePoint[];
  };
  seven_day_total: number;
  thirty_day_total: number;
  lifetime: {
    total: number;
    catchup: number;
    duplicates_skipped: number;
    tracking_since: string;
  };
  session_stats: {
    total_running_sec: number;
    total_away_sec: number;
  };
}

/**
 * Record ingest velocity metrics atomically when articles are fetched & deduplicated.
 */
export function recordFeedIngestion(params: {
  inserted: number;
  catchup: number;
  duplicatesSkipped: number;
  timestampIso?: string;
}): void {
  const { inserted, catchup, duplicatesSkipped } = params;
  if (inserted <= 0 && duplicatesSkipped <= 0) return;

  const db = getDb();
  const nowIso = params.timestampIso || new Date().toISOString();
  const bucketUtc = nowIso.slice(0, 13) + ':00:00Z';
  const dateUtc = nowIso.slice(0, 10);

  const tx = db.transaction(() => {
    // 1. Ingest Hourly Table
    db.prepare(`
      INSERT INTO ingest_hourly (bucket_utc, count, catchup_count, duplicates_skipped)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bucket_utc) DO UPDATE SET
        count = count + excluded.count,
        catchup_count = catchup_count + excluded.catchup_count,
        duplicates_skipped = duplicates_skipped + excluded.duplicates_skipped
    `).run(bucketUtc, inserted, catchup, duplicatesSkipped);

    // 2. Ingest Daily Table
    db.prepare(`
      INSERT INTO ingest_daily (date_utc, count, catchup_count, duplicates_skipped)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date_utc) DO UPDATE SET
        count = count + excluded.count,
        catchup_count = catchup_count + excluded.catchup_count,
        duplicates_skipped = duplicates_skipped + excluded.duplicates_skipped
    `).run(dateUtc, inserted, catchup, duplicatesSkipped);

    // 3. Lifetime Counter Table
    db.prepare(`
      UPDATE lifetime_counter SET
        total_ingested = total_ingested + ?,
        total_catchup = total_catchup + ?,
        total_duplicates_skipped = total_duplicates_skipped + ?,
        last_updated_at = ?
      WHERE id = 1
    `).run(inserted, catchup, duplicatesSkipped, nowIso);
  });

  try {
    tx();
    // Emit live SSE update event to connected clients
    emitSseEvent('feed_counter_update', {
      inserted,
      catchup,
      duplicatesSkipped,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error('[FeedCounter] Failed to record ingest telemetry:', err);
  }
}

/**
 * Computes all feed counter metrics for the rolling 24h, 7-day, 30-day, and all-time windows.
 */
export function getFeedCounterMetrics(referenceTime?: Date): FeedCounterMetrics {
  const db = getDb();
  const now = referenceTime || new Date();
  const nowMs = now.getTime();

  // 1. Rolling 24-hour boundary (UTC ISO-8601 with trailing 'Z')
  const twentyFourHoursAgoMs = nowMs - 24 * 60 * 60 * 1000;
  const twentyFourHoursAgoIso = new Date(twentyFourHoursAgoMs).toISOString();

  // Count new unique articles and catchup in rolling 24h from articles
  const r24Row = db.prepare<{ cutoff: string }, { total: number; catchup: number }>(`
    SELECT 
      COUNT(*) AS total,
      COALESCE(SUM(is_catchup), 0) AS catchup
    FROM articles
    WHERE ingested_at >= @cutoff
  `).get({ cutoff: twentyFourHoursAgoIso }) || { total: 0, catchup: 0 };

  // Rolling 24h duplicates skipped from ingest_hourly
  const hourlyCutoff = twentyFourHoursAgoIso.slice(0, 13) + ':00:00Z';
  const dupRow = db.prepare<{ cutoff: string }, { dups: number }>(`
    SELECT COALESCE(SUM(duplicates_skipped), 0) AS dups
    FROM ingest_hourly
    WHERE bucket_utc >= @cutoff
  `).get({ cutoff: hourlyCutoff }) || { dups: 0 };

  // 2. Query all app_sessions to determine downtime gaps & lifetime running/away totals
  const sessions = db
    .prepare<[], DbAppSession>('SELECT * FROM app_sessions ORDER BY id ASC')
    .all();

  let totalRunningSec = 0;
  let totalAwaySec = 0;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]!;
    const startMs = new Date(s.started_at).getTime();
    const endMs = s.ended_at
      ? new Date(s.ended_at).getTime()
      : s.last_heartbeat_at
        ? new Date(s.last_heartbeat_at).getTime()
        : startMs;

    const durationSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    totalRunningSec += durationSec;

    // Check gap to previous session
    if (i > 0) {
      const prev = sessions[i - 1]!;
      const prevEndMs = prev.ended_at
        ? new Date(prev.ended_at).getTime()
        : new Date(prev.last_heartbeat_at).getTime();
      const gapSec = Math.max(0, Math.floor((startMs - prevEndMs) / 1000));
      totalAwaySec += gapSec;
    }
  }

  // 3. Hourly sparkline buckets for 24 hours (T-23 to T-0)
  const hourlyData: HourlySparklinePoint[] = [];

  // Pre-fetch hourly rows in range
  const hourlyDbRows = db.prepare<{ cutoff: string }, DbIngestHourly>(`
    SELECT * FROM ingest_hourly
    WHERE bucket_utc >= @cutoff
    ORDER BY bucket_utc ASC
  `).all({ cutoff: hourlyCutoff });

  const hourlyMap = new Map<string, DbIngestHourly>();
  for (const row of hourlyDbRows) {
    hourlyMap.set(row.bucket_utc, row);
  }

  for (let h = 23; h >= 0; h--) {
    const bucketStartMs = nowMs - h * 3600 * 1000;
    const bucketDate = new Date(bucketStartMs);
    bucketDate.setUTCMinutes(0, 0, 0);

    const bucketIso = bucketDate.toISOString().slice(0, 13) + ':00:00Z';
    const hourLabel = `${bucketDate.getUTCHours().toString().padStart(2, '0')}:00`;

    const hourRecord = hourlyMap.get(bucketIso);
    const count = hourRecord?.count || 0;
    const catchup = hourRecord?.catchup_count || 0;

    // Determine if the app was OFF during this hour
    const hourStartMs = bucketDate.getTime();
    const hourEndMs = hourStartMs + 3600 * 1000;

    // Calculate how many milliseconds the app was running in this hour
    let runningMsInHour = 0;
    for (const s of sessions) {
      const sStart = new Date(s.started_at).getTime();
      const sEnd = s.ended_at
        ? new Date(s.ended_at).getTime()
        : s.last_heartbeat_at
          ? new Date(s.last_heartbeat_at).getTime()
          : sStart;

      const overlapStart = Math.max(hourStartMs, sStart);
      const overlapEnd = Math.min(hourEndMs, sEnd);
      if (overlapEnd > overlapStart) {
        runningMsInHour += (overlapEnd - overlapStart);
      }
    }

    // If app ran for less than 5 minutes in this hour, mark as downtime / app off
    const runningMinutes = Math.min(60, Math.round(runningMsInHour / 60000));
    const downtimeMinutes = 60 - runningMinutes;
    const isAppOff = runningMinutes < 5;

    hourlyData.push({
      hour_utc: bucketIso,
      label: hourLabel,
      count,
      catchup,
      is_app_off: isAppOff,
      downtime_minutes: downtimeMinutes,
    });
  }

  // 4. 7-Day Total from ingest_daily
  const sevenDaysAgoDate = new Date(nowMs - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const sevenDayRow = db.prepare<{ cutoff: string }, { total: number }>(`
    SELECT COALESCE(SUM(count), 0) AS total
    FROM ingest_daily
    WHERE date_utc >= @cutoff
  `).get({ cutoff: sevenDaysAgoDate }) || { total: 0 };

  // 5. 30-Day Total from ingest_daily (retention immune)
  const thirtyDaysAgoDate = new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const thirtyDayRow = db.prepare<{ cutoff: string }, { total: number }>(`
    SELECT COALESCE(SUM(count), 0) AS total
    FROM ingest_daily
    WHERE date_utc >= @cutoff
  `).get({ cutoff: thirtyDaysAgoDate }) || { total: 0 };

  // 6. Lifetime Counter
  const lifetimeRow = db
    .prepare<[], DbLifetimeCounter>('SELECT * FROM lifetime_counter WHERE id = 1')
    .get() || {
      id: 1,
      tracking_since: now.toISOString(),
      total_ingested: 0,
      total_catchup: 0,
      total_duplicates_skipped: 0,
      last_updated_at: now.toISOString(),
    };

  return {
    rolling24h: {
      total: r24Row.total,
      catchup: r24Row.catchup,
      duplicates_skipped: dupRow.dups,
      hourly: hourlyData,
    },
    seven_day_total: sevenDayRow.total,
    thirty_day_total: thirtyDayRow.total,
    lifetime: {
      total: lifetimeRow.total_ingested,
      catchup: lifetimeRow.total_catchup,
      duplicates_skipped: lifetimeRow.total_duplicates_skipped,
      tracking_since: lifetimeRow.tracking_since,
    },
    session_stats: {
      total_running_sec: totalRunningSec,
      total_away_sec: totalAwaySec,
    },
  };
}


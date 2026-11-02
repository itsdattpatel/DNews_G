/**
 * backend/src/services/controlRoom.ts
 * Centralized telemetry aggregator, error ledger, and system health service (PRD A Category 11).
 * Gathers metrics across sources, scheduler, AI providers, ingestion queues, SQLite storage, and system modes.
 */
import fs from 'fs';
import { getDb, getDbPath, getSetting } from '../db/db';
import { getSchedulerMetrics } from '../fetch/scheduler';
import { PROVIDER_CHAIN } from '../../../config/ai-providers';
import { getCurrentProvider, getThrottledStatus, getModelName } from '../ai/router';
import { getAllProviderStats } from '../ai/quota';
import { listBackups, formatBytes } from './backupManager';
import { emitSseEvent } from '../routes/sse';

export type SubsystemName = 'fetcher' | 'ai' | 'scheduler' | 'db' | 'tv' | 'system';
export type ErrorLevel = 'error' | 'warn' | 'info';
export type FreshnessTier = 'fresh' | 'delayed' | 'failing' | 'disabled';

export interface SystemErrorRecord {
  id: number;
  timestamp: string;
  subsystem: SubsystemName;
  level: ErrorLevel;
  message: string;
  details: string | null;
  created_at: string;
}

export interface SourceTelemetryItem {
  id: number;
  name: string;
  slug: string;
  country: string;
  url: string;
  fetch_type: string;
  enabled: boolean;
  last_fetched_at: string | null;
  last_latency_ms: number | null;
  error_count: number;
  last_error: string | null;
  last_error_at: string | null;
  last_status: string;
  freshness_tier: FreshnessTier;
  minutes_since_fetch: number | null;
}

export interface ControlRoomTelemetry {
  server_time: string;
  sources: SourceTelemetryItem[];
  source_summary: {
    total: number;
    enabled: number;
    fresh: number;
    delayed: number;
    failing: number;
    disabled: number;
    avg_latency_ms: number;
  };
  scheduler: {
    is_running: boolean;
    last_cycle_started_at: string | null;
    last_cycle_completed_at: string | null;
    last_cycle_duration_ms: number | null;
    last_cycle_articles_fetched: number;
    last_cycle_new_articles: number;
    next_cycle_expected_at: string | null;
    interval_minutes: number;
    startup_gap: {
      detected: boolean;
      missed_minutes: number;
    };
  };
  ai_providers: {
    chain: Array<{
      name: string;
      model: string;
      enabled: boolean;
      timeout_ms: number;
    }>;
    current_provider: string;
    throttled: Record<string, { throttled: boolean; remainingSec: number }>;
    stats_today: Record<string, {
      callsToday: number;
      tokensToday: number;
      errorsToday: number;
    }>;
    two_pass: {
      pass1_count: number;
      pass2_count: number;
      pass2_skipped_count: number;
      estimated_tokens_saved: number;
    };
  };
  queues: {
    pending: number;
    processing: number;
    done: number;
    ai_failed: number;
    pass1_triaged: number;
    pass2_enriched: number;
    pass2_deferred: number;
  };
  storage: {
    db_path: string;
    db_size_bytes: number;
    db_size_mb: number;
    db_size_formatted: string;
    warning_threshold_mb: number;
    limit_threshold_mb: number;
    storage_health: 'optimal' | 'warning' | 'critical';
    total_articles: number;
    total_clusters: number;
    total_sources: number;
    backups_count: number;
    latest_backup: {
      filename: string;
      createdAt: string;
      sizeFormatted: string;
      trigger: string;
    } | null;
  };
  modes: {
    plain_mode_enabled: boolean;
    two_pass_ai_enabled: boolean;
    pass2_threshold: number;
    auto_advance_enabled: boolean;
    auto_advance_interval_sec: number;
    refresh_interval_minutes: number;
  };
  error_summary: {
    total_24h: number;
    by_subsystem: Record<SubsystemName, number>;
    by_level: Record<ErrorLevel, number>;
    latest_error: SystemErrorRecord | null;
  };
}

/**
 * Log a diagnostic system event or failure into the system_errors ledger.
 */
export function logSystemError(
  subsystem: SubsystemName,
  message: string,
  level: ErrorLevel = 'error',
  details?: unknown
): SystemErrorRecord {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const detailsStr = details !== undefined
    ? (typeof details === 'string' ? details : JSON.stringify(details))
    : null;

  const result = db.prepare(`
    INSERT INTO system_errors (timestamp, subsystem, level, message, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(timestamp, subsystem, level, message, detailsStr);

  const row = db.prepare(`
    SELECT id, timestamp, subsystem, level, message, details, created_at
    FROM system_errors
    WHERE id = ?
  `).get(result.lastInsertRowid) as SystemErrorRecord;

  // Broadcast live SSE notifications
  try {
    emitSseEvent('system_error', row);
    emitSseEvent('control_room_update', { type: 'new_error', error: row });
  } catch (err) {
    console.warn('[ControlRoom] SSE notification error:', err);
  }

  return row;
}

/**
 * Query filterable system errors with pagination and optional text search.
 */
export function getSystemErrors(options: {
  subsystem?: string | undefined;
  level?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  q?: string | undefined;
} = {}): { items: SystemErrorRecord[]; total: number } {
  const db = getDb();
  const limit = Math.max(1, Math.min(200, options.limit ?? 50));
  const offset = Math.max(0, options.offset ?? 0);

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (options.subsystem && options.subsystem !== 'all') {
    whereClauses.push('subsystem = ?');
    params.push(options.subsystem);
  }

  if (options.level && options.level !== 'all') {
    whereClauses.push('level = ?');
    params.push(options.level);
  }

  if (options.q && options.q.trim().length > 0) {
    whereClauses.push('(message LIKE ? OR details LIKE ?)');
    const term = `%${options.q.trim()}%`;
    params.push(term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM system_errors ${whereSql}
  `).get(...params) as { cnt: number };

  const rows = db.prepare(`
    SELECT id, timestamp, subsystem, level, message, details, created_at
    FROM system_errors
    ${whereSql}
    ORDER BY timestamp DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as SystemErrorRecord[];

  return {
    items: rows,
    total: countRow?.cnt ?? 0,
  };
}

/**
 * Clear errors from the system error ledger.
 */
export function clearSystemErrors(beforeTimestamp?: string): number {
  const db = getDb();
  let result;
  if (beforeTimestamp) {
    result = db.prepare('DELETE FROM system_errors WHERE timestamp < ?').run(beforeTimestamp);
  } else {
    result = db.prepare('DELETE FROM system_errors').run();
  }

  emitSseEvent('control_room_update', { type: 'errors_cleared', clearedCount: result.changes });
  return result.changes;
}

/**
 * Update source health metrics (latency, error count, last fetch).
 */
export function updateSourceTelemetry(
  slug: string,
  latencyMs: number,
  errorMessage: string | null
): void {
  const db = getDb();
  const now = new Date().toISOString();

  if (errorMessage) {
    db.prepare(`
      UPDATE sources
      SET error_count = error_count + 1,
          last_error = ?,
          last_error_at = ?,
          last_latency_ms = ?,
          last_status = 'failing'
      WHERE slug = ?
    `).run(errorMessage, now, latencyMs, slug);
  } else {
    db.prepare(`
      UPDATE sources
      SET last_fetched_at = ?,
          last_latency_ms = ?,
          last_status = 'ok'
      WHERE slug = ?
    `).run(now, latencyMs, slug);
  }
}

/**
 * Gather complete real-time telemetry snapshot for the Control Room dashboard.
 */
export function getControlRoomTelemetry(): ControlRoomTelemetry {
  const db = getDb();
  const now = new Date();
  const nowMs = now.getTime();
  const intervalMinutes = parseInt(getSetting('refresh_interval_minutes', '5'), 10);
  const intervalClamped = Math.max(1, Math.min(60, intervalMinutes));

  // 1. Sources Telemetry
  const sourceRows = db.prepare(`
    SELECT id, name, slug, country, url, fetch_type, enabled,
           last_fetched_at, last_latency_ms, error_count, last_error, last_error_at, last_status
    FROM sources
    ORDER BY country ASC, name ASC
  `).all() as Array<{
    id: number;
    name: string;
    slug: string;
    country: string;
    url: string;
    fetch_type: string;
    enabled: number;
    last_fetched_at: string | null;
    last_latency_ms: number | null;
    error_count: number;
    last_error: string | null;
    last_error_at: string | null;
    last_status: string;
  }>;

  let freshCount = 0;
  let delayedCount = 0;
  let failingCount = 0;
  let disabledCount = 0;
  let totalLatency = 0;
  let latencySampleCount = 0;

  const sources: SourceTelemetryItem[] = sourceRows.map((r) => {
    const isEnabled = Boolean(r.enabled);
    let minutesSince: number | null = null;
    let tier: FreshnessTier = 'fresh';

    if (r.last_latency_ms !== null && r.last_latency_ms > 0) {
      totalLatency += r.last_latency_ms;
      latencySampleCount++;
    }

    if (!isEnabled) {
      tier = 'disabled';
      disabledCount++;
    } else if (r.error_count > 0 || r.last_status === 'failing' || !r.last_fetched_at) {
      tier = 'failing';
      failingCount++;
      if (r.last_fetched_at) {
        const fetchTime = new Date(r.last_fetched_at).getTime();
        minutesSince = Math.max(0, Math.floor((nowMs - fetchTime) / 60000));
      }
    } else {
      const fetchTime = new Date(r.last_fetched_at).getTime();
      minutesSince = Math.max(0, Math.floor((nowMs - fetchTime) / 60000));

      if (minutesSince <= intervalClamped * 2) {
        tier = 'fresh';
        freshCount++;
      } else if (minutesSince <= intervalClamped * 5) {
        tier = 'delayed';
        delayedCount++;
      } else {
        tier = 'failing';
        failingCount++;
      }
    }

    return {
      ...r,
      enabled: isEnabled,
      freshness_tier: tier,
      minutes_since_fetch: minutesSince,
    };
  });

  const avgLatencyMs = latencySampleCount > 0 ? Math.round(totalLatency / latencySampleCount) : 0;

  // 2. Scheduler Telemetry
  const schedulerMetrics = getSchedulerMetrics();

  // 3. AI Providers
  const currentProvider = getCurrentProvider();
  const throttledStatus = getThrottledStatus();
  const statsToday = getAllProviderStats();

  const twoPassRow = db.prepare(`
    SELECT pass1_count, pass2_count, pass2_skipped_count, estimated_tokens_saved
    FROM two_pass_stats
    WHERE id = 1
  `).get() as {
    pass1_count: number;
    pass2_count: number;
    pass2_skipped_count: number;
    estimated_tokens_saved: number;
  } | undefined;

  // 4. Queues
  const queueRow = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_cnt,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_cnt,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_cnt,
      SUM(CASE WHEN status = 'ai_failed' THEN 1 ELSE 0 END) as failed_cnt,
      SUM(CASE WHEN pass1_completed_at IS NOT NULL THEN 1 ELSE 0 END) as pass1_cnt,
      SUM(CASE WHEN pass2_completed_at IS NOT NULL THEN 1 ELSE 0 END) as pass2_cnt,
      SUM(CASE WHEN pass1_completed_at IS NOT NULL AND pass2_completed_at IS NULL THEN 1 ELSE 0 END) as deferred_cnt
    FROM articles
  `).get() as {
    pending_cnt: number | null;
    processing_cnt: number | null;
    done_cnt: number | null;
    failed_cnt: number | null;
    pass1_cnt: number | null;
    pass2_cnt: number | null;
    deferred_cnt: number | null;
  };

  // 5. Database & Physical Storage
  const dbPath = getDbPath();
  let dbSizeBytes = 0;
  if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
    try {
      dbSizeBytes = fs.statSync(dbPath).size;
    } catch {
      dbSizeBytes = 0;
    }
  }

  const dbSizeMb = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));
  let storageHealth: 'optimal' | 'warning' | 'critical' = 'optimal';
  if (dbSizeMb >= 2048) {
    storageHealth = 'critical';
  } else if (dbSizeMb >= 1536) {
    storageHealth = 'warning';
  }

  const articleCountRow = db.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number };
  const clusterCountRow = db.prepare('SELECT COUNT(*) as cnt FROM clusters').get() as { cnt: number };
  const backups = listBackups();
  const latestBackup = backups.length > 0 ? {
    filename: backups[0]!.filename,
    createdAt: backups[0]!.createdAt,
    sizeFormatted: backups[0]!.sizeFormatted,
    trigger: backups[0]!.trigger,
  } : null;

  // 6. System Operating Modes
  const plainModeEnabled = getSetting('plain_mode_enabled', '0') === '1';
  const twoPassAiEnabled = getSetting('two_pass_ai_enabled', '1') === '1';
  const pass2Threshold = parseInt(getSetting('pass2_threshold', '75'), 10);
  const autoAdvanceEnabled = getSetting('auto_advance_enabled', '0') === '1';
  const autoAdvanceIntervalSec = parseInt(getSetting('auto_advance_interval_sec', '7'), 10);

  // 7. Error Summary (Past 24h)
  const past24hIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const errorCountRow = db.prepare(`
    SELECT COUNT(*) as total_24h FROM system_errors WHERE timestamp >= ?
  `).get(past24hIso) as { total_24h: number };

  const bySubsystemRows = db.prepare(`
    SELECT subsystem, COUNT(*) as cnt
    FROM system_errors
    WHERE timestamp >= ?
    GROUP BY subsystem
  `).all(past24hIso) as Array<{ subsystem: SubsystemName; cnt: number }>;

  const bySubsystem: Record<SubsystemName, number> = {
    fetcher: 0,
    ai: 0,
    scheduler: 0,
    db: 0,
    tv: 0,
    system: 0,
  };
  for (const row of bySubsystemRows) {
    if (bySubsystem[row.subsystem] !== undefined) {
      bySubsystem[row.subsystem] = row.cnt;
    }
  }

  const byLevelRows = db.prepare(`
    SELECT level, COUNT(*) as cnt
    FROM system_errors
    WHERE timestamp >= ?
    GROUP BY level
  `).all(past24hIso) as Array<{ level: ErrorLevel; cnt: number }>;

  const byLevel: Record<ErrorLevel, number> = {
    error: 0,
    warn: 0,
    info: 0,
  };
  for (const row of byLevelRows) {
    if (byLevel[row.level] !== undefined) {
      byLevel[row.level] = row.cnt;
    }
  }

  const latestError = db.prepare(`
    SELECT id, timestamp, subsystem, level, message, details, created_at
    FROM system_errors
    ORDER BY timestamp DESC, id DESC
    LIMIT 1
  `).get() as SystemErrorRecord | undefined;

  return {
    server_time: now.toISOString(),
    sources,
    source_summary: {
      total: sources.length,
      enabled: sources.length - disabledCount,
      fresh: freshCount,
      delayed: delayedCount,
      failing: failingCount,
      disabled: disabledCount,
      avg_latency_ms: avgLatencyMs,
    },
    scheduler: {
      is_running: schedulerMetrics.isCycleRunning,
      last_cycle_started_at: schedulerMetrics.lastCycleStartedAt,
      last_cycle_completed_at: schedulerMetrics.lastCycleCompletedAt,
      last_cycle_duration_ms: schedulerMetrics.lastCycleDurationMs,
      last_cycle_articles_fetched: schedulerMetrics.lastCycleArticlesFetched,
      last_cycle_new_articles: schedulerMetrics.lastCycleNewArticles,
      next_cycle_expected_at: schedulerMetrics.nextCycleExpectedAt,
      interval_minutes: intervalClamped,
      startup_gap: {
        detected: schedulerMetrics.startupGap.detected,
        missed_minutes: schedulerMetrics.startupGap.missedMinutes,
      },
    },
    ai_providers: {
      chain: PROVIDER_CHAIN.map((p) => ({
        name: p.name,
        model: getModelName(p.name),
        enabled: p.enabled,
        timeout_ms: p.timeoutMs,
      })),
      current_provider: currentProvider,
      throttled: throttledStatus,
      stats_today: statsToday,
      two_pass: {
        pass1_count: twoPassRow?.pass1_count ?? 0,
        pass2_count: twoPassRow?.pass2_count ?? 0,
        pass2_skipped_count: twoPassRow?.pass2_skipped_count ?? 0,
        estimated_tokens_saved: twoPassRow?.estimated_tokens_saved ?? 0,
      },
    },
    queues: {
      pending: queueRow?.pending_cnt ?? 0,
      processing: queueRow?.processing_cnt ?? 0,
      done: queueRow?.done_cnt ?? 0,
      ai_failed: queueRow?.failed_cnt ?? 0,
      pass1_triaged: queueRow?.pass1_cnt ?? 0,
      pass2_enriched: queueRow?.pass2_cnt ?? 0,
      pass2_deferred: queueRow?.deferred_cnt ?? 0,
    },
    storage: {
      db_path: dbPath,
      db_size_bytes: dbSizeBytes,
      db_size_mb: dbSizeMb,
      db_size_formatted: formatBytes(dbSizeBytes),
      warning_threshold_mb: 1536,
      limit_threshold_mb: 2048,
      storage_health: storageHealth,
      total_articles: articleCountRow?.cnt ?? 0,
      total_clusters: clusterCountRow?.cnt ?? 0,
      total_sources: sources.length,
      backups_count: backups.length,
      latest_backup: latestBackup,
    },
    modes: {
      plain_mode_enabled: plainModeEnabled,
      two_pass_ai_enabled: twoPassAiEnabled,
      pass2_threshold: pass2Threshold,
      auto_advance_enabled: autoAdvanceEnabled,
      auto_advance_interval_sec: autoAdvanceIntervalSec,
      refresh_interval_minutes: intervalClamped,
    },
    error_summary: {
      total_24h: errorCountRow?.total_24h ?? 0,
      by_subsystem: bySubsystem,
      by_level: byLevel,
      latest_error: latestError ?? null,
    },
  };
}

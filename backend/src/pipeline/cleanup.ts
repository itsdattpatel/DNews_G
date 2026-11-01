/**
 * backend/src/pipeline/cleanup.ts
 * 30-Day Auto-Cleanup & Database Storage Size Monitor (P8-06, P8-07, P8-08).
 * Purges unbookmarked articles exceeding retention policy and alerts on storage limits.
 */
import fs from 'fs';
import { getDb, getDbPath } from '../db/db';
import { emitSseEvent } from '../routes/sse';

const WARN_SIZE_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB limit

export interface CleanupResult {
  deletedArticles: number;
  retentionDays: number;
  autoCleanupEnabled: boolean;
}

export interface StorageStatus {
  sizeBytes: number;
  sizeFormatted: string;
  isWarning: boolean;
}

/**
 * Runs retention cleanup: deletes unbookmarked articles older than retention_days.
 * Skips articles where bookmarked = 1 (P8-07).
 */
export function runDataCleanup(): CleanupResult {
  const db = getDb();

  const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'auto_cleanup_enabled'").get() as
    | { value?: string }
    | undefined;
  const isEnabled = enabledRow?.value === '1' || enabledRow?.value === 'true';

  const retentionRow = db.prepare("SELECT value FROM settings WHERE key = 'retention_days'").get() as
    | { value?: string }
    | undefined;
  const retentionDays = retentionRow?.value ? parseInt(retentionRow.value, 10) : 30;

  if (!isEnabled) {
    return {
      deletedArticles: 0,
      retentionDays,
      autoCleanupEnabled: false,
    };
  }

  // Find candidate IDs to delete
  const cutoffDays = `-${Math.max(1, retentionDays)} days`;
  const expiredRows = db
    .prepare(
      `SELECT id FROM articles WHERE bookmarked = 0 AND fetched_at < datetime('now', ?)`,
    )
    .all(cutoffDays) as Array<{ id: number }>;

  if (expiredRows.length === 0) {
    return {
      deletedArticles: 0,
      retentionDays,
      autoCleanupEnabled: true,
    };
  }

  const ids = expiredRows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  const cleanupTx = db.transaction(() => {
    // Delete associated relations
    db.prepare(`DELETE FROM keywords WHERE article_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM article_categories WHERE article_id IN (${placeholders})`).run(...ids);
    const delRes = db.prepare(`DELETE FROM articles WHERE id IN (${placeholders})`).run(...ids);
    return delRes.changes;
  });

  const deletedCount = cleanupTx();
  console.log(`[Cleanup] Purged ${deletedCount} unbookmarked article(s) older than ${retentionDays} days`);

  return {
    deletedArticles: deletedCount,
    retentionDays,
    autoCleanupEnabled: true,
  };
}

/**
 * Monitors SQLite database storage size and triggers a warning alert if >= 1.5 GB (P8-08).
 */
export function checkDatabaseSize(): StorageStatus {
  const db = getDb();
  const dbPath = getDbPath();

  let sizeBytes = 0;
  try {
    if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      sizeBytes = stat.size;
    }
  } catch (err) {
    console.warn('[Storage] Could not stat database file:', err);
  }

  const isWarning = sizeBytes >= WARN_SIZE_BYTES;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  const sizeFormatted = `${sizeMB} MB`;

  if (isWarning) {
    const checkAlert = db.prepare(
      "SELECT id FROM alerts WHERE type = 'error' AND message LIKE '%Database storage warning%' LIMIT 1",
    ).get();

    if (!checkAlert) {
      const message = `⚠️ Database storage warning: Local news database has reached ${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB (Threshold: 1.5 GB). Consider enabling auto-cleanup in Settings.`;
      const insRes = db
        .prepare("INSERT INTO alerts (type, message, fired_at, acknowledged) VALUES ('error', ?, datetime('now'), 0)")
        .run(message);

      emitSseEvent('alert', {
        id: Number(insRes.lastInsertRowid),
        type: 'error',
        message,
        size_bytes: sizeBytes,
      });
    }
  }

  return {
    sizeBytes,
    sizeFormatted,
    isWarning,
  };
}

/**
 * Initializes automatic background cleanup schedule on startup and daily at 03:00.
 */
export function initCleanupScheduler(): void {
  // Run on startup
  try {
    runDataCleanup();
    checkDatabaseSize();
  } catch (err) {
    console.warn('[Cleanup] Startup cleanup warning:', err);
  }

  // Calculate milliseconds until next 03:00 UTC
  const now = new Date();
  const next3am = new Date(now);
  next3am.setUTCHours(3, 0, 0, 0);
  if (next3am.getTime() <= now.getTime()) {
    next3am.setUTCDate(next3am.getUTCDate() + 1);
  }
  const msUntil3am = next3am.getTime() - now.getTime();

  setTimeout(() => {
    try {
      runDataCleanup();
      checkDatabaseSize();
    } catch (err) {
      console.warn('[Cleanup] Scheduled 03:00 cleanup error:', err);
    }
    // Repeat every 24 hours
    setInterval(() => {
      try {
        runDataCleanup();
        checkDatabaseSize();
      } catch (err) {
        console.warn('[Cleanup] Daily cleanup error:', err);
      }
    }, 24 * 60 * 60 * 1000);
  }, msUntil3am);
}

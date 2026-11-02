/**
 * backend/src/services/backupManager.ts
 * Automated SQLite Database Backups, Retention Pruning, and Restoration Safety Net (PRD A Category 4).
 * Handles daily cron backups (03:00 local), pre-migration hooks, manual triggers, and double-confirmation restore.
 */
import fs from 'fs';
import path from 'path';
import { getDbPath, closeDb, getDb } from '../db/db';

export interface BackupRecord {
  filename: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  trigger: 'daily' | 'migration' | 'manual' | 'pre-restore' | 'pre-upgrade';
}

export function getBackupsDir(): string {
  if (process.env['BACKUPS_DIR']) {
    const customDir = path.resolve(process.env['BACKUPS_DIR']);
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }
  // Always resolves to workspace root /backups
  const rootBackups = path.resolve('backups');
  if (!fs.existsSync(rootBackups)) {
    fs.mkdirSync(rootBackups, { recursive: true });
  }
  return rootBackups;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function parseBackupTrigger(filename: string): BackupRecord['trigger'] {
  if (filename.includes('migration')) return 'migration';
  if (filename.includes('daily')) return 'daily';
  if (filename.includes('pre_restore') || filename.includes('pre-restore')) return 'pre-restore';
  if (filename.includes('before_cat') || filename.includes('backup_2026')) return 'pre-upgrade';
  return 'manual';
}

/**
 * Lists all available SQLite backups in the backups directory sorted newest first.
 */
export function listBackups(): BackupRecord[] {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite'))
    .sort()
    .reverse();

  return files.map((filename) => {
    const fullPath = path.join(dir, filename);
    const stat = fs.statSync(fullPath);
    return {
      filename,
      path: fullPath,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      createdAt: stat.mtime.toISOString(),
      trigger: parseBackupTrigger(filename),
    };
  });
}

/**
 * Creates an atomic backup snapshot of the active SQLite database.
 * Flushes active WAL journal to disk before copying.
 */
export function createBackup(
  trigger: 'daily' | 'migration' | 'manual' | 'pre-restore',
  extraLabel?: string
): BackupRecord {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Cannot create backup: active database file does not exist at ${dbPath}`);
  }

  const dir = getBackupsDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const label = extraLabel ? `_${extraLabel}` : '';
  const filename = `news.backup_${trigger}${label}_${ts}.sqlite`;
  const destPath = path.join(dir, filename);

  // Checkpoint active WAL so all writes are committed into the main file
  try {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // If DB is busy or locked, file copy will still succeed
  }

  fs.copyFileSync(dbPath, destPath);

  // Apply retention pruning rules (keep last 7 daily + last 4 weekly)
  try {
    pruneBackups();
  } catch (err) {
    console.warn('[BackupManager] Retention pruning warning:', err);
  }

  const stat = fs.statSync(destPath);
  console.log(`[BackupManager] Created ${trigger} backup: ${filename} (${formatBytes(stat.size)})`);

  return {
    filename,
    path: destPath,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: stat.mtime.toISOString(),
    trigger,
  };
}

/**
 * Enforces PRD A §4.1 retention policy:
 * - Keep last 7 daily backups
 * - Keep last 4 weekly backups for older archives
 * - Always preserve at least 3 backups total regardless of age
 */
export function pruneBackups(): { kept: number; deleted: number } {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir)) return { kept: 0, deleted: 0 };

  const allFiles = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite'))
    .map((filename) => {
      const fullPath = path.join(dir, filename);
      const stat = fs.statSync(fullPath);
      return {
        filename,
        fullPath,
        time: stat.mtime.getTime(),
        trigger: parseBackupTrigger(filename),
      };
    })
    .sort((a, b) => b.time - a.time);

  if (allFiles.length <= 3) {
    return { kept: allFiles.length, deleted: 0 };
  }

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * oneDayMs;

  const toKeep = new Set<string>();

  // Always keep the 3 newest files
  for (let i = 0; i < Math.min(3, allFiles.length); i++) {
    toKeep.add(allFiles[i]!.filename);
  }

  // Pre-upgrade backups (e.g. step 0 baseline) are preserved
  for (const f of allFiles) {
    if (f.trigger === 'pre-upgrade') {
      toKeep.add(f.filename);
    }
  }

  // Keep up to 7 daily backups
  const dailyBackups = allFiles.filter((f) => f.trigger === 'daily');
  for (let i = 0; i < Math.min(7, dailyBackups.length); i++) {
    toKeep.add(dailyBackups[i]!.filename);
  }

  // Keep up to 4 weekly backups for backups older than 7 days
  const olderBackups = allFiles.filter((f) => f.time < sevenDaysAgo);
  const weekBuckets = new Map<string, typeof allFiles[0]>();
  for (const f of olderBackups) {
    const weekKey = new Date(f.time).toISOString().slice(0, 10);
    // Group into 7-day windows
    const weekIndex = Math.floor((now - f.time) / (7 * oneDayMs));
    if (weekIndex <= 4 && !weekBuckets.has(String(weekIndex))) {
      weekBuckets.set(String(weekIndex), f);
      toKeep.add(f.filename);
    }
  }

  // Keep up to 5 most recent migration hooks
  const migrationBackups = allFiles.filter((f) => f.trigger === 'migration');
  for (let i = 0; i < Math.min(5, migrationBackups.length); i++) {
    toKeep.add(migrationBackups[i]!.filename);
  }

  // Prune any file not marked to keep
  let deletedCount = 0;
  for (const f of allFiles) {
    if (!toKeep.has(f.filename)) {
      try {
        fs.unlinkSync(f.fullPath);
        deletedCount++;
        console.log(`[BackupManager] Pruned expired backup: ${f.filename}`);
      } catch (err) {
        console.warn(`[BackupManager] Failed to prune ${f.filename}:`, err);
      }
    }
  }

  return { kept: toKeep.size, deleted: deletedCount };
}

/**
 * Restores the active database from a specified backup file.
 * Automatically takes a safety pre-restore backup first and verifies SQLite integrity.
 */
export function restoreBackup(backupFilename: string): {
  success: boolean;
  message: string;
  articlesCount: number;
  preRestoreBackup: string;
} {
  const dir = getBackupsDir();
  const safeName = path.basename(backupFilename);
  const backupPath = path.join(dir, safeName);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found in ${dir}: ${safeName}`);
  }

  // Validate SQLite header: first 16 bytes must equal "SQLite format 3\0"
  const fd = fs.openSync(backupPath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  const header = buffer.toString('utf8');
  if (!header.startsWith('SQLite format 3')) {
    throw new Error(`File is not a valid SQLite database: ${safeName}`);
  }

  // 1. Create a safety backup of the active database before replacing it!
  const preRestore = createBackup('pre-restore');

  // 2. Close active database connection
  closeDb();

  // 3. Overwrite active database file
  const activeDbPath = getDbPath();
  fs.copyFileSync(backupPath, activeDbPath);

  // 4. Remove stale WAL and SHM files so SQLite starts cleanly with the snapshot
  const walPath = `${activeDbPath}-wal`;
  const shmPath = `${activeDbPath}-shm`;
  if (fs.existsSync(walPath)) {
    try { fs.unlinkSync(walPath); } catch {}
  }
  if (fs.existsSync(shmPath)) {
    try { fs.unlinkSync(shmPath); } catch {}
  }

  // 5. Re-open connection and verify database integrity
  const restoredDb = getDb();
  const integrity = restoredDb.pragma('integrity_check', { simple: true }) as string;
  if (integrity !== 'ok') {
    throw new Error(`Database integrity check failed after restore: ${integrity}`);
  }

  const articlesRow = restoredDb.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number };
  const articlesCount = articlesRow?.cnt ?? 0;

  console.log(`[BackupManager] Restored ${safeName} successfully. ${articlesCount} articles verified.`);

  return {
    success: true,
    message: `Restored ${safeName} successfully (${articlesCount} articles verified). Safety backup saved as ${preRestore.filename}.`,
    articlesCount,
    preRestoreBackup: preRestore.filename,
  };
}

// Module state for daily cron tracking
let _lastDailyBackupDate: string | null = null;
let _schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Initializes recurring check for daily 03:00 local time backup (PRD A §4.1).
 */
export function initBackupScheduler(): void {
  if (_schedulerInterval) return;

  _schedulerInterval = setInterval(() => {
    try {
      const now = new Date();
      const localHour = now.getHours();
      const todayStr = now.toISOString().slice(0, 10);

      // Trigger if hour is 03 and not yet run today
      if (localHour === 3 && _lastDailyBackupDate !== todayStr) {
        _lastDailyBackupDate = todayStr;
        console.log(`[BackupManager] Triggering scheduled daily 03:00 backup for ${todayStr}...`);
        createBackup('daily');
      }
    } catch (err) {
      console.warn('[BackupManager] Scheduled backup check error:', err);
    }
  }, 60000); // Check once every minute
}

export function stopBackupScheduler(): void {
  if (_schedulerInterval) {
    clearInterval(_schedulerInterval);
    _schedulerInterval = null;
  }
}

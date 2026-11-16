/**
 * backend/src/db/db.ts
 * Singleton better-sqlite3 connection with automatic migration runner.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDataDir, ensureAppDataDirs } from '../utils/appPaths';

let _db: Database.Database | null = null;
let _currentDbPath: string | null = null;

export function getDbPath(): string {
  if (process.env['DB_PATH']) {
    if (process.env['DB_PATH'] === ':memory:') {
      return ':memory:';
    }
    return path.resolve(process.env['DB_PATH']);
  }
  return path.join(getDataDir(), 'news.sqlite');
}

export function getDb(): Database.Database {
  const dbPath = getDbPath();

  // Test-Data Guard (PRD A §4.3): Block test execution against production database
  if (process.env.NODE_ENV === 'test' && process.env['ALLOW_PROD_DB_IN_TEST'] !== 'true') {
    const normalized = path.resolve(dbPath).toLowerCase().replace(/\\/g, '/');
    if (normalized.endsWith('/data/news.sqlite')) {
      throw new Error(
        `[Test-Data Guard] FATAL: Tests attempted to connect to production database (${dbPath}). Tests must use an isolated test directory or in-memory database (:memory:) to prevent test pollution of production news.`
      );
    }
  }

  // If already open to the same path and not closed, return it
  if (_db && _currentDbPath === dbPath) {
    return _db;
  }

  // If switched paths, close existing
  if (_db) {
    try {
      _db.close();
    } catch {
      // ignore
    }
    _db = null;
  }

  ensureAppDataDirs();

  _db = new Database(dbPath, { timeout: 10000 });
  _currentDbPath = dbPath;
  if (dbPath !== ':memory:') {
    _db.pragma('journal_mode = WAL');
  }
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');

  runMigrations(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    try {
      _db.close();
    } catch {
      // ignore
    }
    _db = null;
    _currentDbPath = null;
  }
}

function runMigrations(db: Database.Database): void {
  const versionRow = db.pragma('user_version', { simple: true }) as number;
  let currentVersion = versionRow;

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort();

  const pendingMigrations = migrationFiles.filter((file) => {
    const fileVersion = parseInt(file.split('_')[0]!, 10);
    return fileVersion > currentVersion;
  });

  // Automated Pre-Migration Backup Hook (PRD A §4.1)
  if (pendingMigrations.length > 0) {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath) && process.env.NODE_ENV !== 'test') {
      try {
        const { createBackup } = require('../services/backupManager');
        createBackup(
          'migration',
          `v${currentVersion}_to_v${pendingMigrations[pendingMigrations.length - 1]!.split('_')[0]}`
        );
      } catch (err) {
        console.warn('[DB] Pre-migration backup hook warning:', err);
      }
    }
  }

  for (const file of migrationFiles) {
    const fileVersion = parseInt(file.split('_')[0]!, 10);
    if (fileVersion <= currentVersion) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[DB] Running migration: ${file}`);

    db.exec(sql);
    currentVersion = fileVersion;
    db.pragma(`user_version = ${currentVersion}`);
  }
}

/** Helper: get a single settings value */
export function getSetting(key: string, defaultValue: string): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? defaultValue;
}

/** Helper: set a settings value */
export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

/**
 * backend/src/db/db.ts
 * Singleton better-sqlite3 connection with automatic migration runner.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let _db: Database.Database | null = null;
let _currentDbPath: string | null = null;

function getDataDir(): string {
  if (process.env['DATA_DIR']) {
    return path.resolve(process.env['DATA_DIR']);
  }
  // If running from root and backend/data exists, use backend/data
  const backendData = path.resolve('backend/data');
  if (fs.existsSync(backendData)) {
    return backendData;
  }
  return path.resolve('./data');
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'news.sqlite');
}

export function getDb(): Database.Database {
  const dbPath = getDbPath();

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

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(dbPath, { timeout: 10000 });
  _currentDbPath = dbPath;
  _db.pragma('journal_mode = WAL');
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

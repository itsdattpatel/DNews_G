/**
 * backend/src/utils/appPaths.ts
 * Unified AppData directory and file path management for DNews (PRD E Category 2).
 * Resolves paths dynamically between development, test, and production Electron desktop environments.
 */
import fs from 'fs';
import path from 'path';

/**
 * Returns true if running in packaged or production desktop mode.
 */
export function isProductionDesktop(): boolean {
  return Boolean(
    process.env['DNEWS_APP_DATA_DIR'] ||
      (process.env.NODE_ENV === 'production' && process.env['ELECTRON_RUN_AS_NODE'] !== '1'),
  );
}

/**
 * Returns the root AppData directory for DNews.
 * In production desktop mode (via Electron):
 *   Uses process.env['DNEWS_APP_DATA_DIR'] or %APPDATA%\DNews
 * In dev / test mode:
 *   Falls back to workspace root or backend directory.
 */
export function getAppDataRootDir(): string {
  if (process.env['DNEWS_APP_DATA_DIR']) {
    return path.resolve(process.env['DNEWS_APP_DATA_DIR']);
  }

  // If in production without explicit DNEWS_APP_DATA_DIR, resolve default OS AppData
  if (process.env.NODE_ENV === 'production' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'DNews');
  }

  // Development / fallback workspace root
  const cwd = process.cwd();
  if (path.basename(cwd) === 'backend') {
    return path.resolve(cwd, '..');
  }
  return cwd;
}

/**
 * Returns directory where SQLite database files reside.
 */
export function getDataDir(): string {
  if (process.env['DATA_DIR']) {
    return path.resolve(process.env['DATA_DIR']);
  }

  if (process.env['DNEWS_APP_DATA_DIR']) {
    return path.join(path.resolve(process.env['DNEWS_APP_DATA_DIR']), 'data');
  }

  if (process.env.NODE_ENV === 'production' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'DNews', 'data');
  }

  const cwd = process.cwd();
  if (path.basename(cwd) === 'backend') {
    return path.resolve(cwd, 'data');
  }
  const rootBackendData = path.resolve(cwd, 'backend', 'data');
  if (fs.existsSync(rootBackendData)) {
    return rootBackendData;
  }
  return path.resolve(cwd, 'data');
}

/**
 * Returns directory where automated backups reside.
 */
export function getBackupsDir(): string {
  if (process.env['BACKUPS_DIR']) {
    return path.resolve(process.env['BACKUPS_DIR']);
  }

  if (process.env['DNEWS_APP_DATA_DIR']) {
    return path.join(path.resolve(process.env['DNEWS_APP_DATA_DIR']), 'backups');
  }

  if (process.env.NODE_ENV === 'production' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'DNews', 'backups');
  }

  const cwd = process.cwd();
  if (path.basename(cwd) === 'backend') {
    return path.resolve(cwd, '..', 'backups');
  }
  return path.resolve(cwd, 'backups');
}

/**
 * Returns directory where application logs reside.
 */
export function getLogsDir(): string {
  if (process.env['LOGS_DIR']) {
    return path.resolve(process.env['LOGS_DIR']);
  }

  if (process.env['DNEWS_APP_DATA_DIR']) {
    return path.join(path.resolve(process.env['DNEWS_APP_DATA_DIR']), 'logs');
  }

  if (process.env.NODE_ENV === 'production' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'DNews', 'logs');
  }

  const cwd = process.cwd();
  if (path.basename(cwd) === 'backend') {
    return path.resolve(cwd, '..', 'logs');
  }
  return path.resolve(cwd, 'logs');
}

/**
 * Returns path to user-managed environment file (Secrets Manager).
 */
export function getUserEnvPath(): string {
  if (process.env['USER_ENV_PATH']) {
    return path.resolve(process.env['USER_ENV_PATH']);
  }

  if (process.env['DNEWS_APP_DATA_DIR']) {
    return path.join(path.resolve(process.env['DNEWS_APP_DATA_DIR']), 'user.env');
  }

  if (process.env.NODE_ENV === 'production' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'DNews', 'user.env');
  }

  const cwd = process.cwd();
  if (path.basename(cwd) === 'backend') {
    return path.resolve(cwd, '..', 'user.env');
  }
  return path.resolve(cwd, 'user.env');
}

/**
 * Ensures that data, backups, and logs directories exist on disk.
 */
export function ensureAppDataDirs(): { dataDir: string; backupsDir: string; logsDir: string } {
  const dataDir = getDataDir();
  const backupsDir = getBackupsDir();
  const logsDir = getLogsDir();

  for (const dir of [dataDir, backupsDir, logsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return { dataDir, backupsDir, logsDir };
}

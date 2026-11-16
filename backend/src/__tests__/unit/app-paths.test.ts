/**
 * backend/src/__tests__/unit/app-paths.test.ts
 * Unit tests for Unified AppData directory and file path management (PRD E Category 2).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getAppDataRootDir,
  getDataDir,
  getBackupsDir,
  getLogsDir,
  getUserEnvPath,
  ensureAppDataDirs,
  isProductionDesktop,
} from '../../utils/appPaths';

describe('AppPaths (PRD E Category 2: Data Directory Isolation)', () => {
  const originalEnv = { ...process.env };
  let tempBaseDir: string;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dnews-apppaths-test-'));
    process.env = { ...originalEnv };
    delete process.env['DNEWS_APP_DATA_DIR'];
    delete process.env['DATA_DIR'];
    delete process.env['BACKUPS_DIR'];
    delete process.env['LOGS_DIR'];
    delete process.env['USER_ENV_PATH'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    try {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('DNEWS_APP_DATA_DIR Override (Desktop App Packaging)', () => {
    it('resolves all paths inside DNEWS_APP_DATA_DIR when set by Electron', () => {
      const desktopRoot = path.join(tempBaseDir, 'DesktopAppData');
      process.env['DNEWS_APP_DATA_DIR'] = desktopRoot;

      expect(isProductionDesktop()).toBe(true);
      expect(getAppDataRootDir()).toBe(path.resolve(desktopRoot));
      expect(getDataDir()).toBe(path.join(path.resolve(desktopRoot), 'data'));
      expect(getBackupsDir()).toBe(path.join(path.resolve(desktopRoot), 'backups'));
      expect(getLogsDir()).toBe(path.join(path.resolve(desktopRoot), 'logs'));
      expect(getUserEnvPath()).toBe(path.join(path.resolve(desktopRoot), 'user.env'));
    });
  });

  describe('Production Environment without explicit DNEWS_APP_DATA_DIR', () => {
    it('resolves paths relative to %APPDATA%\\DNews on Windows in production', () => {
      const mockAppData = path.join(tempBaseDir, 'Roaming');
      process.env.NODE_ENV = 'production';
      process.env.APPDATA = mockAppData;

      expect(getAppDataRootDir()).toBe(path.join(mockAppData, 'DNews'));
      expect(getDataDir()).toBe(path.join(mockAppData, 'DNews', 'data'));
      expect(getBackupsDir()).toBe(path.join(mockAppData, 'DNews', 'backups'));
      expect(getLogsDir()).toBe(path.join(mockAppData, 'DNews', 'logs'));
      expect(getUserEnvPath()).toBe(path.join(mockAppData, 'DNews', 'user.env'));
    });
  });

  describe('Specific Directory Overrides', () => {
    it('prioritizes DATA_DIR over default fallback', () => {
      const customData = path.join(tempBaseDir, 'custom-data');
      process.env['DATA_DIR'] = customData;
      expect(getDataDir()).toBe(path.resolve(customData));
    });

    it('prioritizes BACKUPS_DIR over default fallback', () => {
      const customBackups = path.join(tempBaseDir, 'custom-backups');
      process.env['BACKUPS_DIR'] = customBackups;
      expect(getBackupsDir()).toBe(path.resolve(customBackups));
    });

    it('prioritizes LOGS_DIR over default fallback', () => {
      const customLogs = path.join(tempBaseDir, 'custom-logs');
      process.env['LOGS_DIR'] = customLogs;
      expect(getLogsDir()).toBe(path.resolve(customLogs));
    });

    it('prioritizes USER_ENV_PATH over default fallback', () => {
      const customEnv = path.join(tempBaseDir, 'custom.env');
      process.env['USER_ENV_PATH'] = customEnv;
      expect(getUserEnvPath()).toBe(path.resolve(customEnv));
    });
  });

  describe('ensureAppDataDirs', () => {
    it('recursively creates data, backups, and logs directories on disk', () => {
      const desktopRoot = path.join(tempBaseDir, 'AppDirsTest');
      process.env['DNEWS_APP_DATA_DIR'] = desktopRoot;

      const created = ensureAppDataDirs();
      expect(fs.existsSync(created.dataDir)).toBe(true);
      expect(fs.existsSync(created.backupsDir)).toBe(true);
      expect(fs.existsSync(created.logsDir)).toBe(true);
      expect(created.dataDir).toBe(path.join(desktopRoot, 'data'));
    });
  });

  describe('Development Mode Fallback', () => {
    it('falls back to workspace directories in dev environment', () => {
      process.env.NODE_ENV = 'development';
      const rootDir = getAppDataRootDir();
      expect(typeof rootDir).toBe('string');
      expect(rootDir.length).toBeGreaterThan(0);

      const dataDir = getDataDir();
      expect(dataDir).toContain('data');
    });
  });
});

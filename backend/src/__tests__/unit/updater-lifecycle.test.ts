/**
 * backend/src/__tests__/unit/updater-lifecycle.test.ts
 * Unit tests for Auto-Update Architecture via GitHub Releases (PRD E Category 9).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Auto-Update via GitHub Releases Architecture (PRD E Category 9)', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const updaterFilePath = path.join(rootDir, 'electron', 'updater.ts');
  const mainFilePath = path.join(rootDir, 'electron', 'main.ts');
  const preloadFilePath = path.join(rootDir, 'electron', 'preload.ts');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const electronBuilderPath = path.join(rootDir, 'electron-builder.json');

  describe('Static & Dependency Verification', () => {
    it('declares electron-updater dependency in package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.dependencies['electron-updater']).toBeDefined();
      expect(pkg.dependencies['electron-updater']).toBe('6.3.9');
    });

    it('configures GitHub Releases repository target in electron-builder.json', () => {
      const config = JSON.parse(fs.readFileSync(electronBuilderPath, 'utf-8'));
      expect(config.publish).toBeDefined();
      expect(config.publish.provider).toBe('github');
      expect(config.publish.owner).toBe('itsdattpatel');
      expect(config.publish.repo).toBe('DNews_G');
    });

    it('defines electron/updater.ts with AppUpdater implementation', () => {
      expect(fs.existsSync(updaterFilePath)).toBe(true);
      const content = fs.readFileSync(updaterFilePath, 'utf-8');

      // Controlled download (user initiates via Update Now)
      expect(content).toContain('autoUpdater.autoDownload = false');
      expect(content).toContain('autoUpdater.autoInstallOnAppQuit = true');

      // Required event listeners
      expect(content).toContain("'checking-for-update'");
      expect(content).toContain("'update-available'");
      expect(content).toContain("'update-not-available'");
      expect(content).toContain("'download-progress'");
      expect(content).toContain("'update-downloaded'");
      expect(content).toContain("'error'");

      // IPC handles
      expect(content).toContain("ipcMain.handle('check-for-updates'");
      expect(content).toContain("ipcMain.handle('download-update'");
      expect(content).toContain("ipcMain.on('install-update'");
    });

    it('integrates AppUpdater and automatic startup check into electron/main.ts', () => {
      const content = fs.readFileSync(mainFilePath, 'utf-8');

      expect(content).toContain("import { AppUpdater } from './updater'");
      expect(content).toContain('appUpdater = new AppUpdater');
      expect(content).toContain('appUpdater?.checkForUpdates()');
      expect(content).toContain('Check for Updates...');
    });

    it('exposes updater methods in preload.ts contextBridge', () => {
      const content = fs.readFileSync(preloadFilePath, 'utf-8');

      expect(content).toContain('checkForUpdates');
      expect(content).toContain('downloadUpdate');
      expect(content).toContain('installUpdate');
      expect(content).toContain('onUpdateAvailable');
      expect(content).toContain('onUpdateProgress');
      expect(content).toContain('onUpdateDownloaded');
      expect(content).toContain('onUpdateError');
    });
  });
});

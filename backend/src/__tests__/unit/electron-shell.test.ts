/**
 * backend/src/__tests__/unit/electron-shell.test.ts
 * Unit tests for Electron Shell & Windows App Identity (PRD E Category 6).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Electron Shell & Windows App Identity (PRD E Category 6)', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const electronBuilderPath = path.join(rootDir, 'electron-builder.json');
  const assetsDir = path.join(rootDir, 'assets');

  describe('electron-builder.json configuration', () => {
    it('contains exact valid metadata for DNews Windows executable', () => {
      expect(fs.existsSync(electronBuilderPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(electronBuilderPath, 'utf-8'));

      // Product identity
      expect(config.appId).toBe('com.dnews.app');
      expect(config.productName).toBe('DNews');
      expect(config.copyright).toContain('DNews');

      // Windows NSIS settings
      expect(config.win.target).toContain('nsis');
      expect(config.win.icon).toBe('assets/icon.ico');
      expect(config.nsis.oneClick).toBe(false);
      expect(config.nsis.createDesktopShortcut).toBe(true);
      expect(config.nsis.createStartMenuShortcut).toBe(true);
      expect(config.nsis.shortcutName).toBe('DNews');

      // GitHub Releases update channel
      expect(config.publish.provider).toBe('github');
      expect(config.publish.owner).toBe('itsdattpatel');
      expect(config.publish.repo).toBe('DNews_G');
    });
  });

  describe('App Icon Assets Integrity', () => {
    it('provides high-resolution 512x512 master PNG icon', () => {
      const pngPath = path.join(assetsDir, 'icon.png');
      expect(fs.existsSync(pngPath)).toBe(true);
      const stats = fs.statSync(pngPath);
      expect(stats.size).toBeGreaterThan(1000);

      // Verify PNG header bytes: 0x89 0x50 0x4E 0x47
      const buffer = fs.readFileSync(pngPath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it('provides multi-resolution Windows ICO icon with valid header', () => {
      const icoPath = path.join(assetsDir, 'icon.ico');
      expect(fs.existsSync(icoPath)).toBe(true);
      const stats = fs.statSync(icoPath);
      expect(stats.size).toBeGreaterThan(10000);

      // Verify ICO magic bytes: 0x00 0x00 0x01 0x00
      const buffer = fs.readFileSync(icoPath);
      expect(buffer[0]).toBe(0x00);
      expect(buffer[1]).toBe(0x00);
      expect(buffer[2]).toBe(0x01);
      expect(buffer[3]).toBe(0x00);

      // Verify directory layer count (2 bytes at offset 4)
      const layerCount = buffer.readUInt16LE(4);
      expect(layerCount).toBeGreaterThanOrEqual(5);
    });

    it('provides 32x32 system tray icon', () => {
      const trayPath = path.join(assetsDir, 'icon-tray.png');
      expect(fs.existsSync(trayPath)).toBe(true);
      const stats = fs.statSync(trayPath);
      expect(stats.size).toBeGreaterThan(200);
    });
  });

  describe('Electron Main & Preload scripts', () => {
    it('defines electron/main.ts with single-instance lock and AppData isolation', () => {
      const mainPath = path.join(rootDir, 'electron', 'main.ts');
      expect(fs.existsSync(mainPath)).toBe(true);
      const content = fs.readFileSync(mainPath, 'utf-8');

      expect(content).toContain('requestSingleInstanceLock');
      expect(content).toContain('DNEWS_APP_DATA_DIR');
      expect(content).toContain('window-state.json');
      expect(content).toContain('waitForBackendHealth');
      expect(content).toContain('createTray');
      expect(content).toContain('ELECTRON_RUN_AS_NODE');
    });

    it('defines electron/preload.ts exposing safe contextBridge methods', () => {
      const preloadPath = path.join(rootDir, 'electron', 'preload.ts');
      expect(fs.existsSync(preloadPath)).toBe(true);
      const content = fs.readFileSync(preloadPath, 'utf-8');

      expect(content).toContain('contextBridge.exposeInMainWorld');
      expect(content).toContain('electronBridge');
      expect(content).toContain('getAppVersion');
      expect(content).toContain('getAppDataDir');
      expect(content).toContain('openExternal');
      expect(content).toContain('showNotification');
      expect(content).toContain('quitApp');
    });
  });
});

/**
 * electron/updater.ts
 * Auto-update manager using electron-updater for DNews (PRD E Category 9).
 * Checks GitHub Releases (itsdattpatel/DNews_G), notifies renderer via IPC,
 * supports background downloading with progress, and prompts for restart.
 */
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';

export class AppUpdater {
  private getMainWindow: () => BrowserWindow | null;
  private isChecking = false;

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow;
    this.configureUpdater();
    this.setupIpc();
  }

  private configureUpdater(): void {
    // Disable automatic download so user controls when to download via "Update Now"
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Use current app version and logger
    autoUpdater.logger = console;

    // In dev / unpackaged mode, electron-updater will fail unless configured or simulated
    if (!app.isPackaged) {
      console.log('[AppUpdater] Running in development mode; updater active for IPC inspection.');
    }

    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true;
      console.log('[AppUpdater] Checking for updates on GitHub...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.isChecking = false;
      console.log('[AppUpdater] Update available:', info.version);
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
        releaseDate: info.releaseDate,
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.isChecking = false;
      console.log('[AppUpdater] App is up to date:', info.version);
      this.sendToRenderer('update-not-available', { version: info.version });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('update-download-progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[AppUpdater] Update downloaded successfully:', info.version);
      this.sendToRenderer('update-downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      this.isChecking = false;
      console.warn('[AppUpdater] Error in auto-updater:', err.message);
      this.sendToRenderer('update-error', { message: err.message });
    });
  }

  private setupIpc(): void {
    ipcMain.handle('check-for-updates', async () => {
      if (this.isChecking) return;
      try {
        if (!app.isPackaged) {
          console.log('[AppUpdater] Skipping network check in development mode');
          return;
        }
        await autoUpdater.checkForUpdates();
      } catch (err: any) {
        console.warn('[AppUpdater] Failed to check for updates:', err.message);
      }
    });

    ipcMain.handle('download-update', async () => {
      try {
        if (!app.isPackaged) {
          // In development mode, simulate progress for developer testing
          this.simulateDevDownload();
          return;
        }
        await autoUpdater.downloadUpdate();
      } catch (err: any) {
        console.warn('[AppUpdater] Failed to download update:', err.message);
        this.sendToRenderer('update-error', { message: err.message });
      }
    });

    ipcMain.on('install-update', () => {
      console.log('[AppUpdater] Quitting and installing update...');
      autoUpdater.quitAndInstall();
    });
  }

  public checkForUpdates(): void {
    if (!app.isPackaged) {
      console.log('[AppUpdater] Development mode: update check skipped on startup.');
      return;
    }
    void autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AppUpdater] Startup update check failed:', err.message);
    });
  }

  private sendToRenderer(channel: string, payload?: any): void {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }

  private simulateDevDownload(): void {
    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      this.sendToRenderer('update-download-progress', {
        percent: p,
        transferred: p * 1000000,
        total: 100000000,
        bytesPerSecond: 2500000,
      });
      if (p >= 100) {
        clearInterval(interval);
        this.sendToRenderer('update-downloaded', { version: '1.1.0' });
      }
    }, 400);
  }
}

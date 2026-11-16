/**
 * electron/preload.ts
 * Secure IPC Context Bridge (PRD E Category 6.3 & 9).
 * Exposes controlled native capabilities to the frontend renderer process via contextBridge.
 */
import { contextBridge, ipcRenderer } from 'electron';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
  url?: string;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface ElectronBridge {
  getAppVersion: () => Promise<string>;
  getAppDataDir: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  showNotification: (
    title: string,
    body: string,
    action?: { type?: string; id?: number; url?: string },
  ) => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => void;
  quitApp: () => void;
  onNotificationAction: (callback: (action: { type?: string; id?: number }) => void) => () => void;
  onNavigateFilter: (callback: (filter: { breaking?: boolean }) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (err: { message: string }) => void) => () => void;
  platform: 'win32' | 'darwin' | 'linux';
}

const bridge: ElectronBridge = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppDataDir: () => ipcRenderer.invoke('get-app-data-dir'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showNotification: (title: string, body: string, action?: { type?: string; id?: number; url?: string }) =>
    ipcRenderer.send('show-notification', { title, body, action }),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  quitApp: () => ipcRenderer.send('quit-app'),
  onNotificationAction: (callback) => {
    const handler = (_: unknown, action: { type?: string; id?: number }) => callback(action);
    ipcRenderer.on('notification-action', handler);
    return () => {
      ipcRenderer.removeListener('notification-action', handler);
    };
  },
  onNavigateFilter: (callback) => {
    const handler = (_: unknown, filter: { breaking?: boolean }) => callback(filter);
    ipcRenderer.on('navigate-filter', handler);
    return () => {
      ipcRenderer.removeListener('navigate-filter', handler);
    };
  },
  onOpenSettings: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-settings', handler);
    return () => {
      ipcRenderer.removeListener('open-settings', handler);
    };
  },
  onUpdateAvailable: (callback) => {
    const handler = (_: unknown, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => {
      ipcRenderer.removeListener('update-available', handler);
    };
  },
  onUpdateProgress: (callback) => {
    const handler = (_: unknown, progress: UpdateProgress) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => {
      ipcRenderer.removeListener('update-download-progress', handler);
    };
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_: unknown, info: { version: string }) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('update-downloaded', handler);
    };
  },
  onUpdateNotAvailable: (callback) => {
    const handler = (_: unknown, info: { version: string }) => callback(info);
    ipcRenderer.on('update-not-available', handler);
    return () => {
      ipcRenderer.removeListener('update-not-available', handler);
    };
  },
  onUpdateError: (callback) => {
    const handler = (_: unknown, err: { message: string }) => callback(err);
    ipcRenderer.on('update-error', handler);
    return () => {
      ipcRenderer.removeListener('update-error', handler);
    };
  },
  platform: process.platform as 'win32' | 'darwin' | 'linux',
};

contextBridge.exposeInMainWorld('electronBridge', bridge);

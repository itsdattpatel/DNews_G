/**
 * electron/preload.ts
 * Secure IPC Context Bridge (PRD E Category 6.3).
 * Exposes controlled native capabilities to the frontend renderer process via contextBridge.
 */
import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronBridge {
  getAppVersion: () => Promise<string>;
  getAppDataDir: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  showNotification: (title: string, body: string, action?: { type?: string; id?: number; url?: string }) => void;
  checkForUpdates: () => void;
  quitApp: () => void;
  onNotificationAction: (callback: (action: { type?: string; id?: number }) => void) => () => void;
  onNavigateFilter: (callback: (filter: { breaking?: boolean }) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  platform: 'win32' | 'darwin' | 'linux';
}

const bridge: ElectronBridge = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppDataDir: () => ipcRenderer.invoke('get-app-data-dir'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showNotification: (title: string, body: string, action?: { type?: string; id?: number; url?: string }) =>
    ipcRenderer.send('show-notification', { title, body, action }),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
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
  platform: process.platform as 'win32' | 'darwin' | 'linux',
};

contextBridge.exposeInMainWorld('electronBridge', bridge);

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
  showNotification: (title: string, body: string) => void;
  checkForUpdates: () => void;
  quitApp: () => void;
  platform: 'win32' | 'darwin' | 'linux';
}

const bridge: ElectronBridge = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppDataDir: () => ipcRenderer.invoke('get-app-data-dir'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', { title, body }),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  quitApp: () => ipcRenderer.send('quit-app'),
  platform: process.platform as 'win32' | 'darwin' | 'linux',
};

contextBridge.exposeInMainWorld('electronBridge', bridge);

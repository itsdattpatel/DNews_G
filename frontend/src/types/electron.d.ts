/**
 * frontend/src/types/electron.d.ts
 * TypeScript type definitions for the Native Electron Context Bridge (PRD E Category 6, 7, 8, 9).
 */

export interface ElectronBridgeNotificationAction {
  type?: 'article' | 'alert' | 'control_room' | 'settings' | 'update';
  id?: number;
  url?: string;
}

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
    action?: ElectronBridgeNotificationAction,
  ) => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => void;
  quitApp: () => void;
  getBackendPort?: () => Promise<number>;
  getBackendHealthy?: () => Promise<boolean>;
  onNotificationAction: (
    callback: (action: ElectronBridgeNotificationAction) => void,
  ) => () => void;
  onNavigateFilter: (
    callback: (filter: { breaking?: boolean }) => void,
  ) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (err: { message: string }) => void) => () => void;
  setZoomFactor?: (factor: number) => void;
  getZoomFactor?: () => number;
  platform: 'win32' | 'darwin' | 'linux';
}

declare global {
  interface Window {
    electronBridge?: ElectronBridge;
  }
}

export { };

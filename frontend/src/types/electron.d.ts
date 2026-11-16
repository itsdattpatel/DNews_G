/**
 * frontend/src/types/electron.d.ts
 * TypeScript type definitions for the Native Electron Context Bridge (PRD E Category 6.3 & 7).
 */

export interface ElectronBridgeNotificationAction {
  type?: 'article' | 'alert' | 'control_room' | 'settings' | 'update';
  id?: number;
  url?: string;
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
  checkForUpdates: () => void;
  quitApp: () => void;
  onNotificationAction: (
    callback: (action: ElectronBridgeNotificationAction) => void,
  ) => () => void;
  onNavigateFilter: (
    callback: (filter: { breaking?: boolean }) => void,
  ) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  platform: 'win32' | 'darwin' | 'linux';
}

declare global {
  interface Window {
    electronBridge?: ElectronBridge;
  }
}

export {};

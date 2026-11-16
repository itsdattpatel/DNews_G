/**
 * frontend/src/utils/notifications.ts
 * Browser Desktop Notification API integration (P6-04).
 * Handles permission requesting on first run and dispatching system notifications.
 */

import type { ElectronBridgeNotificationAction } from '../types/electron';

function getNotificationClass(): typeof Notification | null {
  if (typeof Notification !== 'undefined') {
    return Notification;
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return (window as unknown as { Notification: typeof Notification }).Notification;
  }
  return null;
}

export function isNotificationSupported(): boolean {
  return getNotificationClass() !== null;
}

export function getNotificationPermission(): NotificationPermission {
  const Notif = getNotificationClass();
  if (!Notif) return 'denied';
  return Notif.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const Notif = getNotificationClass();
  if (!Notif) return 'denied';
  try {
    const permission = await Notif.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export interface ShowNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
  action?: ElectronBridgeNotificationAction;
}

export function showDesktopNotification({
  title,
  body,
  tag,
  onClick,
  action,
}: ShowNotificationOptions): Notification | null {
  // If running inside Electron desktop shell, dispatch via native bridge
  if (typeof window !== 'undefined' && window.electronBridge?.showNotification) {
    try {
      window.electronBridge.showNotification(title, body, action);
    } catch {
      // Fall through to browser notification
    }
  }

  const Notif = getNotificationClass();
  if (!Notif) return null;
  if (Notif.permission !== 'granted') return null;

  try {
    const notif = new Notif(title, {
      body,
      tag,
      icon: '/favicon.ico',
      silent: false,
    });

    if (onClick) {
      notif.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        onClick();
        notif.close();
      };
    }

    return notif;
  } catch {
    return null;
  }
}

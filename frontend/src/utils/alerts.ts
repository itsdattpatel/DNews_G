/**
 * frontend/src/utils/alerts.ts
 * Utility functions for Screen (k): Alerts Center broadsheet dispatch console.
 */
import type { Alert, AlertType } from '../types';

export type AlertFilterTab = 'all' | 'breaking' | 'quota' | 'provider' | 'error';

/**
 * Filters alerts by selected category tab.
 */
export function filterAlerts(alerts: Alert[], tab: AlertFilterTab): Alert[] {
  if (!Array.isArray(alerts)) return [];
  if (tab === 'all') return alerts;

  if (tab === 'breaking') {
    return alerts.filter((a) => a.type === 'breaking');
  }
  if (tab === 'quota') {
    return alerts.filter((a) => a.type === 'quota');
  }
  if (tab === 'provider') {
    return alerts.filter((a) => a.type === 'provider_switch');
  }
  if (tab === 'error') {
    return alerts.filter((a) => a.type === 'error' || a.type === 'warning');
  }

  return alerts;
}

/**
 * Counts total unacknowledged alerts.
 */
export function countUnreadAlerts(alerts: Alert[]): number {
  if (!Array.isArray(alerts)) return 0;
  return alerts.filter((a) => !a.acknowledged).length;
}

/**
 * Formats ISO date into clean broadsheet telegraph timestamp: "14:32" or "Nov 1, 14:32".
 */
export function formatAlertTime(isoStr: string): string {
  if (!isoStr) return '00:00';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '00:00';

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const isToday = new Date().toDateString() === d.toDateString();

  if (isToday) {
    return timeStr;
  }

  const monthDay = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${monthDay}, ${timeStr}`;
}

export interface AlertBadgeMeta {
  stampLabel: string;
  stampClass: string;
  dotColor: string;
}

/**
 * Returns broadsheet ink-stamp badge styling based on alert type.
 */
export function getAlertBadgeStyle(type: AlertType): AlertBadgeMeta {
  switch (type) {
    case 'breaking':
      return {
        stampLabel: 'BREAKING',
        stampClass: 'border-accent bg-accent/10 text-accent font-bold',
        dotColor: 'bg-accent',
      };
    case 'quota':
      return {
        stampLabel: 'QUOTA',
        stampClass: 'border-amber-700/60 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-bold',
        dotColor: 'bg-amber-600',
      };
    case 'provider_switch':
      return {
        stampLabel: 'PROVIDER',
        stampClass: 'border-positive/60 bg-positive/10 text-positive font-bold',
        dotColor: 'bg-positive',
      };
    case 'error':
    case 'warning':
      return {
        stampLabel: 'ERROR',
        stampClass: 'border-negative bg-negative/15 text-negative font-bold',
        dotColor: 'bg-negative',
      };
    case 'watchlist':
      return {
        stampLabel: 'WATCHLIST',
        stampClass: 'border-ink/60 bg-ink/10 text-ink font-bold',
        dotColor: 'bg-ink',
      };
    default:
      return {
        stampLabel: 'WIRE',
        stampClass: 'border-paper-border bg-paper-alt text-ink-secondary',
        dotColor: 'bg-ink-muted',
      };
  }
}


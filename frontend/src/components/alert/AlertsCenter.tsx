/**
 * frontend/src/components/alert/AlertsCenter.tsx
 * Screen (k): Alerts Center `/alerts`.
 * Master telegraph dispatch monitor for breaking news, quota limits, provider switches, and wire errors.
 * Features ink-stamp category filters, batch acknowledgement, deeplink to story clusters, and broadsheet typography.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import type { Alert } from '../../types';
import {
  filterAlerts,
  countUnreadAlerts,
  formatAlertTime,
  getAlertBadgeStyle,
  type AlertFilterTab,
} from '../../utils/alerts';
import { formatExactLocal } from '../../utils/dateFormatter';
import { ConfirmationBadge } from '../common/ConfirmationBadge';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Radio,
  ExternalLink,
  Flame,
  Zap,
  RefreshCw,
  AlertOctagon,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';

export const AlertsCenter: React.FC = () => {
  const isAlertsOpen = useAppStore((s) => s.isAlertsOpen);
  const setAlertsOpen = useAppStore((s) => s.setAlertsOpen);
  const currentProvider = useAppStore((s) => s.currentProvider);
  const setCompareClusterId = useAppStore((s) => s.setCompareClusterId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<AlertFilterTab>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  // Fetch alerts from API
  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const items = await api.getAlerts({ limit: 50 });
      setAlerts(items);
    } catch (err) {
      console.error('[AlertsCenter] Failed to fetch alerts:', err);
      toast.error('Failed to load alert wire dispatches.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAlertsOpen) {
      fetchAlerts();
    }
  }, [isAlertsOpen]);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAlertsOpen) {
        setAlertsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAlertsOpen, setAlertsOpen]);

  // Calculate unread counts
  const unreadCount = useMemo(() => countUnreadAlerts(alerts), [alerts]);

  const filteredAlerts = useMemo(
    () => filterAlerts(alerts, activeTab),
    [alerts, activeTab]
  );

  // Acknowledge a single alert
  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
      toast.success('Alert dispatch acknowledged.');
    } catch (err) {
      console.error('[AlertsCenter] Failed to acknowledge alert:', err);
      toast.error('Failed to acknowledge alert.');
    }
  };

  // Mark all unread alerts acknowledged
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await api.acknowledgeAllAlerts();
      setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
      toast.success('All telegraph alerts marked as acknowledged.');
    } catch (err) {
      console.error('[AlertsCenter] Failed to mark all read:', err);
      toast.error('Failed to mark all alerts read.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Open story cluster in compare or reader
  const handleOpenCluster = (clusterId: number) => {
    setCompareClusterId(clusterId);
    setAlertsOpen(false);
    setCurrentView('compare');
    toast.info(`Opening Story Cluster #${clusterId} in Coverage Desk.`);
  };

  if (!isAlertsOpen) return null;

  const tabs: { key: AlertFilterTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'all', label: 'All Dispatches', icon: Bell },
    { key: 'breaking', label: 'Breaking', icon: Flame },
    { key: 'quota', label: 'Quota', icon: Zap },
    { key: 'provider', label: 'Provider', icon: RefreshCw },
    { key: 'error', label: 'Errors', icon: AlertOctagon },
  ];

  return (
    <div
      id="alerts-center-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-center-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAlertsOpen(false);
      }}
    >
      <div className="flex flex-col w-full max-w-4xl h-[88vh] bg-paper text-ink border-2 border-ink shadow-overlay overflow-hidden relative">
        {/* Masthead Header */}
        <header className="px-6 py-4 border-b-2 border-ink bg-paper-alt flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-ink bg-paper text-accent">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase bg-ink text-paper px-1.5 py-0.5 font-bold">
                  TELEGRAPH LOG
                </span>
                <h2
                  id="alerts-center-heading"
                  className="font-masthead text-xl tracking-tight text-ink font-black uppercase"
                >
                  Alerts Center
                </h2>
                <div
                  id="alerts-unread-counter-badge"
                  className={`font-mono text-xs px-2 py-0.5 border font-bold uppercase tracking-wider ${
                    unreadCount > 0
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-paper-border bg-paper text-ink-muted'
                  }`}
                >
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All Quiet'}
                </div>
              </div>
              <p className="font-serif text-xs text-ink-secondary italic mt-0.5">
                Real-time incident log • Monitored via AI Provider: {currentProvider?.toUpperCase() || 'GEMINI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-alerts-center"
              onClick={() => setAlertsOpen(false)}
              className="p-1.5 border border-paper-border hover:border-ink hover:bg-paper text-ink transition-colors"
              aria-label="Close Alerts Center"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Ink-Stamp Filter Tabs Bar */}
        <section
          data-lenis-prevent="true"
          className="px-6 py-2.5 border-b-2 border-ink bg-paper flex items-center justify-between gap-3 overflow-x-auto overscroll-x-contain no-scrollbar font-mono text-xs"
        >
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  id={`tab-alerts-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1 border text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'border-ink bg-ink text-paper shadow-xs'
                      : 'border-paper-border bg-paper hover:border-ink text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {unreadCount > 0 && (
            <button
              id="btn-mark-all-alerts-read"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="flex items-center gap-1.5 px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper font-mono text-xs uppercase font-bold tracking-wider transition-colors shrink-0 disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-positive" />
              <span>{isMarkingAll ? 'Marking…' : 'Mark All Read'}</span>
            </button>
          )}
        </section>

        {/* Main Alerts Log Stage */}
        <main
          data-lenis-prevent="true"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-paper p-4 sm:p-6 select-text"
        >
          {isLoading && (
            <div id="alerts-loading-state" className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-4 border border-paper-border bg-paper-alt animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-paper-border" />
                    <div className="w-20 h-5 bg-paper-border" />
                    <div className="w-64 h-4 bg-paper-border" />
                  </div>
                  <div className="w-16 h-4 bg-paper-border" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredAlerts.length === 0 && (
            <div
              id="alerts-empty-state"
              className="flex flex-col items-center justify-center text-center p-12 text-ink-secondary"
            >
              <Inbox className="w-12 h-12 text-ink-muted mb-3 opacity-60" />
              <div className="font-mono text-xs tracking-widest uppercase text-ink-muted font-bold mb-1">
                TELEGRAPH WIRE CALM
              </div>
              <h3 className="font-serif text-lg font-bold text-ink mb-1">
                No alerts. Everything is quiet.
              </h3>
              <p className="font-serif text-xs text-ink-secondary italic max-w-sm">
                No active breaking anomalies, quota limits, or wire errors matching the current filter.
              </p>
            </div>
          )}

          {!isLoading && filteredAlerts.length > 0 && (
            <div id="alerts-list" className="space-y-2.5">
              {filteredAlerts.map((alert) => {
                const badge = getAlertBadgeStyle(alert.type);
                const isUnread = !alert.acknowledged;

                return (
                  <div
                    key={alert.id}
                    id={`alert-row-${alert.id}`}
                    className={`p-3 sm:p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isUnread
                        ? 'border-ink bg-paper shadow-xs'
                        : 'border-paper-border bg-paper-alt opacity-80'
                    }`}
                  >
                    {/* Left: Indicator, Stamp, Time, Message */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Pulse Status Dot */}
                      <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1 sm:mt-0">
                        {isUnread && (
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dotColor}`}
                          />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badge.dotColor}`}
                        />
                      </span>

                      {/* Ink Stamp Badge */}
                      <span
                        className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 border shrink-0 ${badge.stampClass}`}
                      >
                        {badge.stampLabel}
                      </span>

                      {/* Timestamp with exact local hover */}
                      <span
                        className="font-mono text-xs text-ink-muted shrink-0 cursor-help"
                        title={formatExactLocal(alert.fired_at)}
                      >
                        {formatAlertTime(alert.fired_at)}
                      </span>

                      {/* Corroboration & Breaking Confirmation Stamp */}
                      {(alert.type === 'breaking' || alert.confirmation) && (
                        <ConfirmationBadge
                          confirmation={alert.confirmation}
                          variant="compact"
                          className="shrink-0"
                        />
                      )}

                      {/* Alert Message */}
                      <span
                        className={`font-serif text-sm leading-snug truncate ${
                          isUnread ? 'text-ink font-semibold' : 'text-ink-secondary'
                        }`}
                        title={alert.message}
                      >
                        {alert.message}
                      </span>
                    </div>

                    {/* Right: Actions (Read Lead & Acknowledge) */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-xs">
                      {alert.cluster_id && (
                        <button
                          id={`btn-read-alert-${alert.id}`}
                          onClick={() => handleOpenCluster(alert.cluster_id!)}
                          className="flex items-center gap-1 px-2.5 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper font-bold uppercase text-[11px] tracking-wider transition-colors"
                          title="Open associated story cluster in Compare Coverage Desk"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Read Lead</span>
                        </button>
                      )}

                      {isUnread ? (
                        <button
                          id={`btn-ack-alert-${alert.id}`}
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center gap-1 px-2.5 py-1 border border-paper-border hover:border-positive hover:bg-positive/10 text-positive font-bold text-[11px] uppercase tracking-wider transition-colors"
                          title="Acknowledge this dispatch"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      ) : (
                        <span className="font-mono text-[11px] text-ink-muted italic flex items-center gap-1 px-2 py-1">
                          <CheckCheck className="w-3.5 h-3.5 text-positive" />
                          <span>Acknowledged</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Broadsheet Footer */}
        <footer className="px-6 py-2.5 border-t-2 border-ink bg-paper-alt flex items-center justify-between text-[11px] font-mono text-ink-muted">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>DISPATCH LOG • Frequency 1420 kHz • Autonomous Wire Bureau</span>
          </div>
          <div>
            <span>ACTIVE INCIDENTS: {alerts.length}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AlertsCenter;


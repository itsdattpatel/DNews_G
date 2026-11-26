/**
 * frontend/src/App.tsx
 * Application Root: Initializes hooks, live SSE stream, and mounts the App Shell.
 */
import React, { useEffect, useState } from 'react';
import { Shell } from './components/layout/Shell';
import { DesignSystemShowcase } from './components/dev/DesignSystemShowcase';
import { useArticles } from './hooks/useArticles';
import { useSSE } from './hooks/useSSE';
import { useAppStore } from './store/useAppStore';
import { autonomousEngine } from './lib/autonomousEngine';
import { apiFetch, getApiBaseUrl, shouldAttemptRemote } from './lib/api';
import { LibraryRoot } from './library/LibraryRoot';

if (typeof window !== 'undefined') {
  (window as any).useAppStore = useAppStore;
}

export const App: React.FC = () => {
  const isShowcase = typeof window !== 'undefined' && window.location.search.includes('showcase');
  const isLibraryOpen = useAppStore((s) => s.isLibraryOpen);
  const [isLibraryPath, setIsLibraryPath] = useState(() => {
    return typeof window !== 'undefined' && (window.location.pathname.startsWith('/library') || window.location.hash.startsWith('#/library'));
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const active = window.location.pathname.startsWith('/library') || window.location.hash.startsWith('#/library');
      setIsLibraryPath(active);
      if (active && !useAppStore.getState().isLibraryOpen) {
        useAppStore.setState({ isLibraryOpen: true });
      } else if (!active && useAppStore.getState().isLibraryOpen) {
        useAppStore.setState({ isLibraryOpen: false });
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Activate automatic article fetching & active filters
  useArticles();

  // Activate real-time Server-Sent Events stream
  useSSE();

  const fetchSettings = useAppStore((s) => s.fetchSettings);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const checkStartupStatus = useAppStore((s) => s.checkStartupStatus);
  const fetchUnreadAlertsCount = useAppStore((s) => s.fetchUnreadAlertsCount);
  const fetchCategoryCounts = useAppStore((s) => s.fetchCategoryCounts);
  const fetchSystemHealth = useAppStore((s) => s.fetchSystemHealth);
  const reduceMotionOverride = useAppStore((s) => s.settings.reduce_motion_override ?? 'system');

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotionOverride);
  }, [reduceMotionOverride]);

  useEffect(() => {
    let stopPolling: (() => void) | null = null;
    let cancelled = false;

    const boot = async () => {
      // Cache assigned Electron backend port if operating in packaged desktop container
      if (typeof window !== 'undefined' && window.electronBridge?.getBackendPort) {
        try {
          const port = await window.electronBridge.getBackendPort();
          if (port) {
            sessionStorage.setItem('dnews_backend_port', String(port));
          }
        } catch {
          // ignore IPC errors
        }
      }

      fetchSettings();
      fetchQuota();
      checkStartupStatus();
      fetchUnreadAlertsCount();
      fetchCategoryCounts();
      fetchSystemHealth();

      // Only run continuous client-side RSS proxy polling when no live Express backend is reachable
      // (e.g. standalone Mobile APK or offline Electron/web fallback).
      const baseUrl = getApiBaseUrl();
      let backendReachable = false;
      if (shouldAttemptRemote(baseUrl)) {
        try {
          const res = await apiFetch('/api/health');
          backendReachable = res.ok;
        } catch {
          backendReachable = false;
        }
      }

      if (!cancelled && !backendReachable) {
        stopPolling = autonomousEngine.startAutoPolling(120000);
      }
    };

    void boot();
    return () => {
      cancelled = true;
      if (stopPolling) stopPolling();
    };
  }, [fetchSettings, fetchQuota, checkStartupStatus, fetchUnreadAlertsCount, fetchCategoryCounts, fetchSystemHealth]);

  // Native Electron System Tray & Notification IPC listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronBridge) return;

    const unsubs: Array<() => void> = [];

    if (window.electronBridge.onNotificationAction) {
      unsubs.push(
        window.electronBridge.onNotificationAction((action) => {
          if (action.type === 'article' && action.id) {
            void useAppStore.getState().selectArticleById(action.id);
          } else if (action.type === 'control_room') {
            useAppStore.getState().setCurrentView('control-room');
          } else if (action.type === 'settings') {
            useAppStore.getState().setSettingsOpen(true);
          }
        }),
      );
    }

    if (window.electronBridge.onNavigateFilter) {
      unsubs.push(
        window.electronBridge.onNavigateFilter((filter) => {
          if (filter.breaking) {
            const store = useAppStore.getState();
            if (!store.isBreakingOnly) {
              store.toggleBreakingOnly();
            }
          }
        }),
      );
    }

    if (window.electronBridge.onOpenSettings) {
      unsubs.push(
        window.electronBridge.onOpenSettings(() => {
          useAppStore.getState().setSettingsOpen(true);
        }),
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  if (isShowcase) {
    return <DesignSystemShowcase />;
  }

  if (isLibraryPath || isLibraryOpen) {
    return <LibraryRoot />;
  }

  return <Shell />;
};

export default App;

/**
 * frontend/src/App.tsx
 * Application Root: Initializes hooks, live SSE stream, and mounts the App Shell.
 */
import React, { useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { useArticles } from './hooks/useArticles';
import { useSSE } from './hooks/useSSE';
import { useAppStore } from './store/useAppStore';

export const App: React.FC = () => {
  // Activate automatic article fetching & active filters
  useArticles();

  // Activate real-time Server-Sent Events stream
  useSSE();

  const fetchSettings = useAppStore((s) => s.fetchSettings);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const checkStartupStatus = useAppStore((s) => s.checkStartupStatus);

  useEffect(() => {
    fetchSettings();
    fetchQuota();
    checkStartupStatus();
  }, [fetchSettings, fetchQuota, checkStartupStatus]);

  return <Shell />;
};

export default App;

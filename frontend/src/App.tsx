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

export const App: React.FC = () => {
  const [showShowcase, setShowShowcase] = useState(
    window.location.search.includes('showcase')
  );

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

  if (showShowcase) {
    return (
      <div>
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowShowcase(false)}
            className="bg-ink text-paper px-3 py-1.5 rounded-sm font-ui text-xs font-bold border border-paper-border shadow-md"
          >
            ← Back to App
          </button>
        </div>
        <DesignSystemShowcase />
      </div>
    );
  }

  return (
    <div>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowShowcase(true)}
          className="bg-ink text-paper px-3 py-1.5 rounded-sm font-ui text-xs font-bold border border-paper-border shadow-md"
        >
          Design System Kit →
        </button>
      </div>
      <Shell />
    </div>
  );
};

export default App;

/**
 * frontend/src/App.tsx
 * Application Root: Initializes hooks, live SSE stream, and mounts the App Shell.
 */
import React, { useEffect, useState, Suspense } from 'react';
import { Shell } from './components/layout/Shell';
import { DesignSystemShowcase } from './components/dev/DesignSystemShowcase';
import { useArticles } from './hooks/useArticles';
import { useSSE } from './hooks/useSSE';
import { useAppStore } from './store/useAppStore';

const LibraryRoot = React.lazy(() => import('./library/LibraryRoot'));

if (typeof window !== 'undefined') {
  (window as any).useAppStore = useAppStore;
}

export const App: React.FC = () => {
  const isShowcase = typeof window !== 'undefined' && window.location.search.includes('showcase');
  const [isLibrary, setIsLibrary] = useState(() => {
    return typeof window !== 'undefined' && (window.location.pathname.startsWith('/library') || window.location.hash.startsWith('#/library'));
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setIsLibrary(window.location.pathname.startsWith('/library') || window.location.hash.startsWith('#/library'));
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

  useEffect(() => {
    fetchSettings();
    fetchQuota();
    checkStartupStatus();
  }, [fetchSettings, fetchQuota, checkStartupStatus]);

  if (isShowcase) {
    return <DesignSystemShowcase />;
  }

  if (isLibrary) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F7F4EC] text-[#231E18] flex items-center justify-center font-serif text-lg">Opening The Reading Room...</div>}>
        <LibraryRoot />
      </Suspense>
    );
  }

  return <Shell />;
};

export default App;

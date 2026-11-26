/**
 * frontend/src/components/layout/AdaptiveNotchPill.tsx
 * Adaptive Notch & Broadsheet Island Status Capsule (PRD Master Expansion #6).
 *
 * Adapts to mobile punch-hole cameras, notches, and desktop status areas.
 * Displays real-time wire telemetry with an expandable broadside drop-down.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../../store/useAppStore';
import { autonomousEngine } from '../../lib/autonomousEngine';
import { shouldAttemptRemote } from '../../lib/api';
import { triggerHaptic } from '../../lib/haptics';
import { CURRENT_APP_VERSION } from '../../hooks/useAppUpdate';
import { Radio, RefreshCw, Zap, X, ChevronDown } from 'lucide-react';

import type { Article } from '../../types';

export interface AdaptiveNotchPillProps {
  forcedOpen?: boolean;
  forcedSourcesCount?: number;
  forcedArticles?: Article[];
}

export const AdaptiveNotchPill: React.FC<AdaptiveNotchPillProps> = ({
  forcedOpen,
  forcedSourcesCount,
  forcedArticles,
}) => {
  const [isOpen, setIsOpen] = useState(Boolean(forcedOpen));
  const [isPinging, setIsPinging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOnline = useAppStore((s) => s.isOnline);
  const storeArticles = useAppStore((s) => s.articles);
  const articles = forcedArticles ?? storeArticles;
  const storeSourcesCount = useAppStore((s) => s.sourcesCount);
  const sourcesCount = forcedSourcesCount ?? storeSourcesCount;
  const sseStatus = useAppStore((s) => s.sseStatus);
  const breakingArticle = articles.find((a) => {
    const score = a.breaking_score || 0;
    return score >= 75 || (score >= 0.75 && score <= 1.0);
  });

  // Close drop-down on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    triggerHaptic('selection');
    setIsOpen(!isOpen);
  };

  const handleTelegraphPing = async () => {
    if (isPinging) return;
    setIsPinging(true);
    triggerHaptic('refresh');
    try {
      if (shouldAttemptRemote()) {
        await useAppStore.getState().performFullResync('notch_ping');
      } else {
        await autonomousEngine.pollLiveFeeds();
        const s = useAppStore.getState();
        const local = autonomousEngine.getArticles({
          category: s.selectedCategory,
          country: s.selectedCountry,
          breaking: s.isBreakingOnly,
          q: s.searchQuery.trim(),
          limit: 60,
        });
        s.setArticles(local.items, local.total);
        s.fetchCategoryCounts();
      }
    } finally {
      setIsPinging(false);
    }
  };

  // Hide floating pill on native Capacitor APK & mobile screens
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id="adaptive-notch-container"
      className="hidden md:block fixed top-0 left-[31%] -translate-x-1/2 z-50 pointer-events-auto select-none pt-[env(safe-area-inset-top,0px)]"
    >
      {/* Pill Capsule */}
      <button
        id="btn-notch-capsule"
        type="button"
        onClick={handleToggle}
        className={`mt-1 px-3 py-0.5 rounded-full border shadow-sm transition-all flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider cursor-pointer ${
          breakingArticle
            ? 'bg-accent text-paper border-accent shadow-accent/20 animate-pulse'
            : isOnline
            ? 'bg-paper-alt/90 backdrop-blur-md text-ink border-ink/40 hover:border-ink'
            : 'bg-amber-100 text-amber-900 border-amber-400'
        }`}
        title="Telegraph Wire Network Status"
      >
        <span
          className={`w-2 h-2 rounded-full inline-block ${
            breakingArticle
              ? 'bg-paper animate-ping'
              : isOnline
              ? 'bg-positive animate-pulse'
              : 'bg-amber-600'
          }`}
        />
        <span className="uppercase">
          {breakingArticle
            ? '★ Breaking Alert'
            : isOnline
            ? 'Wire Live'
            : 'Offline'}
        </span>
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 opacity-70 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Broadsheet Telemetry Popover */}
      {isOpen && (
        <div
          id="notch-telemetry-popover"
          className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 bg-paper border-2 border-ink shadow-xl rounded-xs p-3.5 text-ink animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-paper-border mb-2.5">
            <div className="flex items-center gap-1.5 font-masthead text-xs font-bold uppercase tracking-wider text-ink">
              <Radio size={13} className="text-accent" />
              <span>Telegraph Wire Island</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-xs hover:bg-paper-alt text-ink-muted hover:text-ink cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mb-3">
            <div className="p-2 border border-paper-border bg-paper-alt/60 rounded-xs">
              <div className="text-ink-muted text-[10px] uppercase">Active Feeds</div>
              <div className="font-bold text-ink text-sm">
                {sourcesCount > 0 ? `${sourcesCount} Sources` : '8+ Feeds'}
              </div>
            </div>
            <div className="p-2 border border-paper-border bg-paper-alt/60 rounded-xs">
              <div className="text-ink-muted text-[10px] uppercase">Wire Link</div>
              <div className="font-bold text-positive text-sm capitalize">
                {sseStatus}
              </div>
            </div>
            <div className="p-2 border border-paper-border bg-paper-alt/60 rounded-xs">
              <div className="text-ink-muted text-[10px] uppercase">Cached Dispatches</div>
              <div className="font-bold text-ink text-sm">{articles.length} Stories</div>
            </div>
            <div className="p-2 border border-paper-border bg-paper-alt/60 rounded-xs">
              <div className="text-ink-muted text-[10px] uppercase">Syndicate Status</div>
              <div className="font-bold text-positive text-sm">{isOnline ? 'Synchronized' : 'Local Cache'}</div>
            </div>
          </div>

          {/* Latest Breaking Ticker Snippet */}
          {breakingArticle && (
            <div className="p-2 border-l-2 border-accent bg-accent/10 rounded-xs mb-3 text-xs">
              <div className="font-mono text-[10px] font-bold text-accent uppercase flex items-center gap-1 mb-0.5">
                <Zap size={11} />
                <span>Urgent Dispatch</span>
              </div>
              <p className="font-serif line-clamp-2 text-ink font-semibold">
                {breakingArticle.title_english}
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-paper-border text-[10px] font-mono text-ink-secondary">
            <span>Broadside Press v{CURRENT_APP_VERSION}</span>
            <button
              type="button"
              onClick={handleTelegraphPing}
              disabled={isPinging}
              className="inline-flex items-center gap-1 text-ink font-bold hover:text-accent underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={10} className={isPinging ? 'animate-spin' : ''} />
              <span>{isPinging ? 'Polling...' : 'Telegraph Ping'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

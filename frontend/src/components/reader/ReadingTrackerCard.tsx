/**
 * frontend/src/components/reader/ReadingTrackerCard.tsx
 * Broadsheet Reading Tracker & Streak Card (PRD Master Expansion #15).
 * Tracks articles read, daily reading streak, and category breadth.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Flame, Clock, BookOpen, Award } from 'lucide-react';

export const ReadingTrackerCard: React.FC = () => {
  const stats = useAppStore((s) => s.readingStats);

  const topCategories = Object.entries(stats.categoryCounts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div
      id="reading-tracker-card"
      className="p-4 bg-paper-alt border-2 border-ink rounded-xs shadow-xs my-4 text-ink select-none"
    >
      {/* Masthead Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-paper-border">
        <div className="flex items-center gap-2">
          <Award size={14} className="text-accent" />
          <h3 className="font-masthead text-xs font-bold uppercase tracking-wider text-ink">
            Daily Telegraph Reading Log
          </h3>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-xs border border-accent">
          <Flame size={12} className="animate-bounce" />
          <span>{stats.streakDays} Day Streak</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-[11px] mb-3">
        <div className="p-2.5 border border-paper-border bg-paper rounded-xs">
          <div className="text-ink-muted text-[10px] uppercase flex items-center gap-1">
            <BookOpen size={10} />
            <span>Dispatches Read</span>
          </div>
          <div className="font-bold text-ink text-base mt-0.5">{stats.totalArticlesRead}</div>
        </div>

        <div className="p-2.5 border border-paper-border bg-paper rounded-xs">
          <div className="text-ink-muted text-[10px] uppercase flex items-center gap-1">
            <Clock size={10} />
            <span>Reading Time</span>
          </div>
          <div className="font-bold text-ink text-base mt-0.5">{stats.totalMinutesRead} min</div>
        </div>

        <div className="p-2.5 border border-paper-border bg-paper rounded-xs col-span-2 sm:col-span-1">
          <div className="text-ink-muted text-[10px] uppercase">Editorial Diet</div>
          <div className="font-bold text-ink text-xs mt-1 truncate">
            {topCategories.length > 0
              ? topCategories.map(([cat]) => cat).join(' • ')
              : 'Global Overview'}
          </div>
        </div>
      </div>

      <div className="text-[10px] font-mono text-ink-muted text-right">
        Last logged dispatch: {stats.lastReadDate}
      </div>
    </div>
  );
};

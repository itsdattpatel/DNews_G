/**
 * frontend/src/library/mind/CategoryFilterBar.tsx
 * 9-category selector chips, duration filter, and helplines directory trigger.
 */
import React from 'react';
import type { MindCategory } from './HelpCard';
import { PhoneCall, Clock, ShieldAlert } from 'lucide-react';

export interface CategoryFilterBarProps {
  selectedCategory: MindCategory | 'all';
  onSelectCategory: (cat: MindCategory | 'all') => void;
  selectedTime: number | 'all';
  onSelectTime: (time: number | 'all') => void;
  onOpenHelplines: () => void;
}

const CATEGORIES: { id: MindCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Topics' },
  { id: 'stress', label: 'Stress' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'focus', label: 'Focus' },
  { id: 'habits', label: 'Habits' },
  { id: 'anger', label: 'Anger' },
  { id: 'grief', label: 'Grief' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'selftalk', label: 'Self-Talk' },
];

const TIME_OPTIONS = [
  { id: 'all', label: 'All Durations' },
  { id: 3, label: '≤ 3 min (Quick Relief)' },
  { id: 5, label: '≤ 5 min' },
  { id: 15, label: '≤ 15 min' },
  { id: 25, label: '≤ 25 min' },
];

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedTime,
  onSelectTime,
  onOpenHelplines,
}) => {
  return (
    <div className="space-y-4">
      {/* Non-Negotiable Safety Notice Banner */}
      <div className="p-3 rounded-md border border-[var(--lib-sage)] bg-[var(--lib-sage-soft)] flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-[var(--lib-sage)] shrink-0 mt-0.5" />
        <p className="font-serif text-xs text-[var(--lib-ink)] leading-snug">
          <strong>General Education Only:</strong> Not medical advice, diagnosis, or treatment. Sourced from open textbooks and public-domain psychological research.
        </p>
      </div>

      {/* Category Chips */}
      <div>
        <span className="lib-meta text-[var(--lib-sage)] text-[10px] block mb-2 font-mono uppercase tracking-wider">
          Psychological Domains (9 Categories):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-2.5 py-1 text-xs rounded-sm font-serif transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--lib-sage)] text-[#FFFDF9] font-medium border border-[var(--lib-sage)] shadow-2xs'
                    : 'bg-[var(--lib-surface)] text-[var(--lib-ink-secondary)] border border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Filter & Crisis Helplines Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--lib-border-soft)]">
        <div className="flex items-center gap-1.5 text-xs font-serif text-[var(--lib-ink)]">
          <Clock className="w-3.5 h-3.5 text-[var(--lib-sage)]" />
          <select
            value={selectedTime}
            onChange={(e) =>
              onSelectTime(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
            }
            className="px-2 py-1 text-xs font-serif bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] rounded text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-sage)] cursor-pointer"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenHelplines}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-accent-soft)] border border-[var(--lib-accent)] hover:opacity-90 transition-opacity cursor-pointer font-medium"
        >
          <PhoneCall className="w-3.5 h-3.5 text-[var(--lib-accent)]" />
          <span>Verified Crisis Helplines</span>
        </button>
      </div>
    </div>
  );
};

/**
 * frontend/src/library/history/TodayInHistoryFeed.tsx
 * Chronological timeline feed of historical events for the chosen date.
 */
import React from 'react';
import { Bookmark, Globe, ChevronRight } from 'lucide-react';

export interface HistoryFeedItem {
  id: number;
  source_slug: string;
  external_id: string;
  event_date: string;
  event_year: number;
  headline: string;
  snippet: string;
  original_url: string;
  country: string | null;
  media_url?: string | null;
  license: string;
  attribution: string;
  is_bookmarked?: boolean;
}

export interface TodayInHistoryFeedProps {
  items: HistoryFeedItem[];
  selectedId: number | null;
  onSelect: (item: HistoryFeedItem) => void;
}

export const TodayInHistoryFeed: React.FC<TodayInHistoryFeedProps> = ({
  items,
  selectedId,
  onSelect,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[var(--lib-ink-muted)] font-serif px-1">
        <span>Timeline ({items.length} records)</span>
        <span className="text-[10px] uppercase tracking-wider">Oldest to Newest</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          const countryBadge = item.country || 'International';

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(item);
                }
              }}
              className={`group relative text-left p-3.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[var(--lib-surface)] border-[var(--lib-accent)] shadow-sm'
                  : 'bg-[var(--lib-card-bg)] border-[var(--lib-border)] hover:border-[var(--lib-gold)] hover:bg-[var(--lib-surface)]'
              }`}
            >
              {/* Top row: Year & Country */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 text-xs font-mono font-bold tracking-tight rounded bg-[var(--lib-surface)] text-[var(--lib-accent)] border border-[var(--lib-border)]">
                  {item.event_year > 0 ? item.event_year : `${Math.abs(item.event_year)} BCE`}
                </span>

                <div className="flex items-center gap-1.5">
                  {item.is_bookmarked && (
                    <Bookmark
                      className="w-3.5 h-3.5 text-[var(--lib-terracotta)] fill-current"
                      aria-label="Bookmarked"
                    />
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-[var(--lib-ink-muted)] font-serif">
                    <Globe className="w-2.5 h-2.5 opacity-60" />
                    <span>{countryBadge}</span>
                  </span>
                </div>
              </div>

              {/* Headline */}
              <h4 className="lib-display text-sm leading-snug text-[var(--lib-ink)] line-clamp-2 group-hover:text-[var(--lib-accent)] transition-colors">
                {item.headline}
              </h4>

              {/* Snippet preview */}
              <p className="mt-1 text-xs text-[var(--lib-ink-muted)] font-serif line-clamp-2 leading-relaxed">
                {item.snippet}
              </p>

              {/* Active selection arrow */}
              {isSelected && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--lib-accent)] hidden md:block">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

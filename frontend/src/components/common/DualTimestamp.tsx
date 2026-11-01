/**
 * frontend/src/components/common/DualTimestamp.tsx
 * Broadsheet Dual Timestamp component adhering strictly to PRD A Category 1.
 * Shows "Published X ago" and "Arrived Y ago" with exact local timestamps on hover/focus.
 * Automatically displays "Date unverified" for missing, future, or >30d stale published dates.
 * Displays "arrived late" badge for catch-up articles.
 * Live-updates relative strings every 30 seconds without page reload.
 */
import { memo } from 'react';
import { Clock } from 'lucide-react';
import { formatDualTimestamps, useLiveRelativeTime } from '../../utils/dateFormatter';

export interface DualTimestampProps {
  publishedAt?: string | null;
  ingestedAt?: string | null;
  isCatchup?: boolean;
  layout?: 'inline' | 'stacked' | 'compact';
  showIcon?: boolean;
  className?: string;
}

export const DualTimestamp = memo<DualTimestampProps>(({
  publishedAt,
  ingestedAt,
  isCatchup = false,
  layout = 'inline',
  showIcon = true,
  className = '',
}) => {
  const currentNow = useLiveRelativeTime(30000);
  const info = formatDualTimestamps(publishedAt, ingestedAt, isCatchup, currentNow);

  if (layout === 'compact') {
    return (
      <span
        role="time"
        data-testid="dual-timestamp"
        tabIndex={0}
        title={info.tooltip}
        aria-label={info.tooltip}
        className={`inline-flex items-center gap-1 font-mono text-[0.625rem] text-ink-muted cursor-help focus:outline-none focus:ring-1 focus:ring-ink/40 rounded-xs ${className}`}
      >
        {showIcon && <Clock size={10} className="shrink-0 text-ink-muted" />}
        <span className={info.isUnverified ? 'italic text-ink-muted' : ''}>
          {info.publishedRelative}
        </span>
        <span>·</span>
        <span>{info.arrivedRelative}</span>
        {info.isCatchup && (
          <span className="font-ui text-[0.5625rem] font-bold uppercase tracking-wider px-1 py-0.2 bg-paper-border/60 text-ink-secondary border border-paper-border rounded-xs">
            arrived late
          </span>
        )}
      </span>
    );
  }

  if (layout === 'stacked') {
    return (
      <div
        role="time"
        data-testid="dual-timestamp"
        tabIndex={0}
        title={info.tooltip}
        aria-label={info.tooltip}
        className={`flex flex-col font-mono text-[0.6875rem] text-ink-muted cursor-help focus:outline-none focus:ring-1 focus:ring-ink/40 rounded-xs ${className}`}
      >
        <div className="flex items-center gap-1">
          {showIcon && <Clock size={11} className="shrink-0 text-ink-muted" />}
          <span className={info.isUnverified ? 'italic text-amber-700 dark:text-amber-500' : 'text-ink'}>
            {info.publishedRelative}
          </span>
        </div>
        <div className="flex items-center gap-1 pl-3.5 text-xs text-ink-secondary">
          <span>{info.arrivedRelative}</span>
          {info.isCatchup && (
            <span className="font-ui text-[0.5625rem] font-bold uppercase tracking-wider px-1 bg-paper-border/60 text-ink-secondary border border-paper-border rounded-xs">
              arrived late
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default 'inline' layout
  return (
    <span
      role="time"
      data-testid="dual-timestamp"
      tabIndex={0}
      title={info.tooltip}
      aria-label={info.tooltip}
      className={`inline-flex items-center flex-wrap gap-1.5 font-mono text-[0.6875rem] text-ink-muted cursor-help focus:outline-none focus:ring-1 focus:ring-ink/40 rounded-xs transition-colors hover:text-ink ${className}`}
    >
      {showIcon && <Clock size={11} className="shrink-0 text-ink-muted" />}
      <span className={info.isUnverified ? 'italic text-ink-secondary' : 'text-ink font-medium'}>
        {info.publishedRelative}
      </span>
      <span className="text-paper-border">·</span>
      <span className="text-ink-secondary">{info.arrivedRelative}</span>
      {info.isCatchup && (
        <span className="font-ui text-[0.5625rem] font-bold uppercase tracking-wider px-1 bg-paper-border/60 text-ink-secondary border border-paper-border rounded-xs">
          arrived late
        </span>
      )}
    </span>
  );
});

DualTimestamp.displayName = 'DualTimestamp';

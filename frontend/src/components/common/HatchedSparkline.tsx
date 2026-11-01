/**
 * frontend/src/components/common/HatchedSparkline.tsx
 * Broadsheet Sparkline component adhering strictly to PRD A Category 1B & 8.
 * Renders hourly arrival velocity / health bars.
 * Renders downtime gaps as hatched / diagonal-striped bars so gaps are obvious, not zero.
 */
import { memo } from 'react';

export interface SparklinePoint {
  label: string;                  // e.g. "14:00" or "Nov 1, 14:00"
  value: number;                  // e.g. 18 articles
  isDowntime?: boolean;           // true if desk was stopped / offline during this bucket
  downtimeMinutes?: number;       // e.g. 42 minutes of downtime
}

export interface HatchedSparklineProps {
  data: SparklinePoint[];
  height?: number;
  width?: number | string;
  barWidth?: number;
  gap?: number;
  className?: string;
}

export const HatchedSparkline = memo<HatchedSparklineProps>(({
  data,
  height = 28,
  width = '100%',
  barWidth = 4,
  gap = 2,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`h-[${height}px] flex items-center justify-center font-mono text-[0.625rem] text-ink-muted`}>
        No activity
      </div>
    );
  }

  const maxValue = Math.max(1, ...data.map((d) => (d.isDowntime ? 0 : d.value)));
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <svg
      role="img"
      aria-label="Activity Sparkline with downtime indicators"
      viewBox={`0 0 ${totalWidth} ${height}`}
      style={{ width, height }}
      className={`overflow-visible ${className}`}
    >
      <defs>
        {/* Diagonal striped / hatched pattern for downtime gaps */}
        <pattern
          id="sparkline-downtime-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="4"
            className="stroke-ink-muted/80"
            strokeWidth="1.2"
          />
        </pattern>
      </defs>

      {data.map((point, index) => {
        const x = index * (barWidth + gap);

        if (point.isDowntime) {
          // Downtime gap: Render as full-height or proportional hatched bar
          const downtimeMins = point.downtimeMinutes ?? 60;
          const barH = Math.max(8, Math.round((downtimeMins / 60) * height));
          const y = height - barH;
          const tooltip = `Downtime: ${downtimeMins}m gap (${point.label})`;

          return (
            <g key={`point-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill="url(#sparkline-downtime-hatch)"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-ink-muted cursor-help"
                rx={0.5}
              >
                <title>{tooltip}</title>
              </rect>
            </g>
          );
        }

        // Normal activity bar
        const barH = point.value > 0
          ? Math.max(2, Math.round((point.value / maxValue) * (height - 2)))
          : 1;
        const y = height - barH;
        const tooltip = `${point.value} articles at ${point.label}`;

        return (
          <g key={`point-${index}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              className="fill-ink hover:fill-accent transition-colors cursor-help"
              rx={0.5}
            >
              <title>{tooltip}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
});

HatchedSparkline.displayName = 'HatchedSparkline';

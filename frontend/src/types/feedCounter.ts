/**
 * frontend/src/types/feedCounter.ts
 * TypeScript contracts for Live Feed Counter & Telemetry (PRD A Category 8).
 */

export interface HourlySparklinePoint {
  hour_utc: string;
  label: string;
  count: number;
  catchup: number;
  is_app_off: boolean;
  downtime_minutes: number;
}

export interface FeedCounterMetrics {
  rolling24h: {
    total: number;
    catchup: number;
    duplicates_skipped: number;
    hourly: HourlySparklinePoint[];
  };
  seven_day_total: number;
  thirty_day_total: number;
  lifetime: {
    total: number;
    catchup: number;
    duplicates_skipped: number;
    tracking_since: string;
  };
  session_stats: {
    total_running_sec: number;
    total_away_sec: number;
  };
}

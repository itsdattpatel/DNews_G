/**
 * frontend/src/utils/autoAdvanceMachine.ts
 * Pure, clock-driven Auto-Advance state machine (PRD D Category 2).
 *
 * Driven by wall-clock timestamps (Date.now()) rather than tick counting so
 * background throttling or laptop sleep never causes bursts or stuck timers.
 */

export type AutoAdvanceMode = 'off' | 'running' | 'paused';

export interface AutoAdvanceFlags {
  enabled: boolean;
  intervalSec?: number;
  manualPaused: boolean;
  isTabHidden: boolean;
  isSettingsOpen: boolean;
  currentView: string;
  isTvViewOpen: boolean;
  isPdfOpen: boolean;
  isArchiveChatOpen: boolean;
  isAlertsOpen: boolean;
  isSourcesOpen: boolean;
  isControlRoomOpen: boolean;
  isGlobeOpen: boolean;
  isWatchlistOpen: boolean;
  isBriefingOpen: boolean;
  isCommandPaletteOpen: boolean;
  isMissedNewsModalOpen: boolean;
  isInputFocused: boolean;
  pauseOnHover: boolean;
  isArticlePanelHovered: boolean;
}

export interface AutoAdvanceMachineState {
  mode: AutoAdvanceMode;
  pauseReasons: string[];
  winningPauseReason: string | null;
  intervalMs: number;
  deadlineMs: number | null;
  lastTickMs: number;
  remainingMs: number;
  progressPercent: number;
  remainingSeconds: number;
}

export interface TickOptions {
  sleepOverdueGraceMs?: number;
  maxTickGapMs?: number;
}

export interface TickResult {
  state: AutoAdvanceMachineState;
  shouldAdvance: boolean;
  didWakeReset: boolean;
}

const MIN_INTERVAL_SEC = 3;
const MAX_INTERVAL_SEC = 60;
const DEFAULT_INTERVAL_SEC = 7;

export function clampIntervalSec(sec?: number): number {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) {
    return DEFAULT_INTERVAL_SEC;
  }
  return Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, Math.round(sec)));
}

/**
 * Collects all active pause reasons in strict priority order.
 * Returns an empty array when Auto-Advance can run freely.
 */
export function collectPauseReasons(
  flags: Omit<AutoAdvanceFlags, 'enabled' | 'intervalSec'> | AutoAdvanceFlags,
  formatViewReason: (view: string) => string = () => 'Directory view',
): string[] {
  const reasons: string[] = [];
  if (flags.manualPaused) reasons.push('Manual pause');
  if (flags.isTabHidden) reasons.push('Background tab');
  if (flags.isSettingsOpen) reasons.push('Settings open');
  if (flags.isTvViewOpen) reasons.push('TV desk open');
  if (flags.isPdfOpen) reasons.push('PDF desk open');
  if (flags.isArchiveChatOpen) reasons.push('Archive open');
  if (flags.isAlertsOpen) reasons.push('Alerts open');
  if (flags.isSourcesOpen) reasons.push('Sources open');
  if (flags.isControlRoomOpen) reasons.push('Control Room open');
  if (flags.isGlobeOpen) reasons.push('Globe open');
  if (flags.isWatchlistOpen) reasons.push('Watchlist open');
  if (flags.isBriefingOpen) reasons.push('Briefing open');
  if (flags.isCommandPaletteOpen) reasons.push('Command palette open');
  if (flags.currentView !== 'reader') reasons.push(formatViewReason(flags.currentView));
  if (flags.isMissedNewsModalOpen) reasons.push('Catch-up open');
  if (flags.isInputFocused) reasons.push('Input focused');
  if (flags.pauseOnHover && flags.isArticlePanelHovered) reasons.push('Reading (hover)');
  return reasons;
}

function buildFreshRunningState(intervalSec: number, intervalMs: number, nowMs: number): AutoAdvanceMachineState {
  return {
    mode: 'running',
    pauseReasons: [],
    winningPauseReason: null,
    intervalMs,
    deadlineMs: nowMs + intervalMs,
    lastTickMs: nowMs,
    remainingMs: intervalMs,
    progressPercent: 0,
    remainingSeconds: intervalSec,
  };
}

function buildNonRunningState(
  mode: 'off' | 'paused',
  pauseReasons: string[],
  intervalSec: number,
  intervalMs: number,
  nowMs: number,
): AutoAdvanceMachineState {
  return {
    mode,
    pauseReasons,
    winningPauseReason: pauseReasons[0] ?? null,
    intervalMs,
    deadlineMs: null,
    lastTickMs: nowMs,
    remainingMs: intervalMs,
    progressPercent: 0,
    remainingSeconds: intervalSec,
  };
}

export function createAutoAdvanceState(flags: AutoAdvanceFlags, nowMs: number): AutoAdvanceMachineState {
  const sec = clampIntervalSec(flags.intervalSec);
  const intervalMs = sec * 1000;

  if (!flags.enabled) {
    return buildNonRunningState('off', [], sec, intervalMs, nowMs);
  }

  const reasons = collectPauseReasons(flags);
  if (reasons.length > 0) {
    return buildNonRunningState('paused', reasons, sec, intervalMs, nowMs);
  }

  return buildFreshRunningState(sec, intervalMs, nowMs);
}

/**
 * Reconciles state with updated flags/visibility without disturbing an active
 * running deadline unless resuming from off/paused, changing interval, or waking
 * from a long freeze.
 */
export function reconcileAutoAdvanceState(
  prev: AutoAdvanceMachineState,
  flags: AutoAdvanceFlags,
  nowMs: number,
  maxTickGapMs = Number.POSITIVE_INFINITY,
): AutoAdvanceMachineState {
  const sec = clampIntervalSec(flags.intervalSec);
  const intervalMs = sec * 1000;

  if (!flags.enabled) {
    return buildNonRunningState('off', [], sec, intervalMs, nowMs);
  }

  const reasons = collectPauseReasons(flags);
  if (reasons.length > 0) {
    return buildNonRunningState('paused', reasons, sec, intervalMs, nowMs);
  }

  // Starting or resuming from paused/off ALWAYS starts a full fresh interval
  if (prev.mode !== 'running' || prev.deadlineMs === null || prev.intervalMs !== intervalMs) {
    return buildFreshRunningState(sec, intervalMs, nowMs);
  }

  // Wake recovery if clock went backwards or thread froze beyond threshold
  if (nowMs < prev.lastTickMs || nowMs - prev.lastTickMs > maxTickGapMs) {
    return buildFreshRunningState(sec, intervalMs, nowMs);
  }

  const remainingMs = Math.max(0, prev.deadlineMs - nowMs);
  const elapsedMs = Math.max(0, intervalMs - remainingMs);
  return {
    mode: 'running',
    pauseReasons: [],
    winningPauseReason: null,
    intervalMs,
    deadlineMs: prev.deadlineMs,
    lastTickMs: nowMs,
    remainingMs,
    progressPercent: Math.min(100, Math.max(0, (elapsedMs / intervalMs) * 100)),
    remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
  };
}

/**
 * Restarts the timer to a full interval (used for manual story navigation).
 */
export function resetAutoAdvanceInterval(
  prev: AutoAdvanceMachineState,
  flags: AutoAdvanceFlags,
  nowMs: number,
): AutoAdvanceMachineState {
  const sec = clampIntervalSec(flags.intervalSec);
  const intervalMs = sec * 1000;

  if (!flags.enabled) {
    return buildNonRunningState('off', [], sec, intervalMs, nowMs);
  }

  const reasons = collectPauseReasons(flags);
  if (reasons.length > 0 || prev.mode === 'paused') {
    return buildNonRunningState('paused', reasons, sec, intervalMs, nowMs);
  }

  return buildFreshRunningState(sec, intervalMs, nowMs);
}

/**
 * Evaluates wall-clock progress and signals at most ONE story advance per cycle.
 */
export function tickAutoAdvanceState(
  prev: AutoAdvanceMachineState,
  flags: AutoAdvanceFlags,
  nowMs: number,
  options: TickOptions = {},
): TickResult {
  const sec = clampIntervalSec(flags.intervalSec);
  const intervalMs = sec * 1000;
  const maxTickGapMs = options.maxTickGapMs ?? Number.POSITIVE_INFINITY;
  const sleepOverdueGraceMs = options.sleepOverdueGraceMs ?? 2500;

  if (!flags.enabled || collectPauseReasons(flags).length > 0 || prev.mode !== 'running' || prev.deadlineMs === null) {
    return {
      state: reconcileAutoAdvanceState(prev, flags, nowMs, maxTickGapMs),
      shouldAdvance: false,
      didWakeReset: false,
    };
  }

  if (prev.intervalMs !== intervalMs) {
    return {
      state: buildFreshRunningState(sec, intervalMs, nowMs),
      shouldAdvance: false,
      didWakeReset: false,
    };
  }

  const tickGapMs = nowMs - prev.lastTickMs;
  const overdueMs = nowMs - prev.deadlineMs;
  const isWakeFreeze =
    tickGapMs < 0 ||
    tickGapMs > maxTickGapMs ||
    (overdueMs >= sleepOverdueGraceMs && tickGapMs >= sleepOverdueGraceMs);

  if (isWakeFreeze) {
    return {
      state: buildFreshRunningState(sec, intervalMs, nowMs),
      shouldAdvance: false,
      didWakeReset: true,
    };
  }

  if (nowMs >= prev.deadlineMs) {
    return {
      state: buildFreshRunningState(sec, intervalMs, nowMs),
      shouldAdvance: true,
      didWakeReset: false,
    };
  }

  const remainingMs = Math.max(0, prev.deadlineMs - nowMs);
  const elapsedMs = Math.max(0, intervalMs - remainingMs);
  return {
    state: {
      mode: 'running',
      pauseReasons: [],
      winningPauseReason: null,
      intervalMs,
      deadlineMs: prev.deadlineMs,
      lastTickMs: nowMs,
      remainingMs,
      progressPercent: Math.min(100, Math.max(0, (elapsedMs / intervalMs) * 100)),
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    },
    shouldAdvance: false,
    didWakeReset: false,
  };
}

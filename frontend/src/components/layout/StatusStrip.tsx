/**
 * frontend/src/components/layout/StatusStrip.tsx
 * In-flow Broadsheet Status Strip directly under TopBar (PRD C Category 2).
 * Reserves its own height (28px) in normal layout flow so content is NEVER covered.
 * Contains:
 * 1. 2px hairline countdown progress bar.
 * 2. Play/Pause toggle button.
 * 3. Auto-advance state & "Paused: <reason>" label.
 * 4. Gap chip ("Gap: Xm").
 * 5. Plain-mode chip ("Plain: ON/OFF").
 * Nothing else.
 */
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play, Pause, Clock, ZapOff, Sparkles } from 'lucide-react';
import { SystemHealthIndicator } from './SystemHealthIndicator';
import { AutoAdvanceDebugHud, isAutoAdvanceDebugEnabled } from '../dev/AutoAdvanceDebugHud';
import {
  clampIntervalSec,
  createAutoAdvanceState,
  reconcileAutoAdvanceState,
  resetAutoAdvanceInterval,
  tickAutoAdvanceState,
  type AutoAdvanceFlags,
  type AutoAdvanceMachineState,
} from '../../utils/autoAdvanceMachine';

function isElementEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.getAttribute?.('contenteditable') === 'true') return true;
  return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement && el.isContentEditable;
}

export interface StatusStripProps {
  forcedPauseReason?: string | null;
  forcedAutoAdvanceEnabled?: boolean;
  forcedStartupStatus?: { detected: boolean; missed_minutes: number } | null;
  forcedPlainMode?: boolean;
  forcedSseStatus?: 'connecting' | 'connected' | 'reconnecting';
  forcedSseReconnectAttempts?: number;
}

export const StatusStrip: React.FC<StatusStripProps> = memo(({
  forcedPauseReason,
  forcedAutoAdvanceEnabled,
  forcedStartupStatus,
  forcedPlainMode,
  forcedSseStatus,
  forcedSseReconnectAttempts,
}) => {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const storeSseStatus = useAppStore((s) => s.sseStatus);
  const storeSseReconnectAttempts = useAppStore((s) => s.sseReconnectAttempts);
  const sseStatus = forcedSseStatus ?? storeSseStatus;
  const sseReconnectAttempts = forcedSseReconnectAttempts ?? storeSseReconnectAttempts;
  const isAutoAdvanceManualPaused = useAppStore((s) => s.isAutoAdvanceManualPaused);
  const toggleStatusStripPlayPause = useAppStore((s) => s.toggleStatusStripPlayPause);
  const isArticlePanelHovered = useAppStore((s) => s.isArticlePanelHovered);
  const autoAdvanceResetToken = useAppStore((s) => s.autoAdvanceResetToken);

  // Modals & view states from store
  const currentView = useAppStore((s) => s.currentView);
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const isTvViewOpen = useAppStore((s) => s.isTvViewOpen);
  const isPdfOpen = useAppStore((s) => s.isPdfOpen);
  const isArchiveChatOpen = useAppStore((s) => s.isArchiveChatOpen);
  const isAlertsOpen = useAppStore((s) => s.isAlertsOpen);
  const isSourcesOpen = useAppStore((s) => s.isSourcesOpen);
  const isControlRoomOpen = useAppStore((s) => s.isControlRoomOpen);
  const isGlobeOpen = useAppStore((s) => s.isGlobeOpen);
  const isWatchlistOpen = useAppStore((s) => s.isWatchlistOpen);
  const isBriefingOpen = useAppStore((s) => s.isBriefingOpen);
  const isCommandPaletteOpen = useAppStore((s) => s.isCommandPaletteOpen);
  const isMissedNewsModalOpen = useAppStore((s) => s.isMissedNewsModalOpen);
  const setMissedNewsModalOpen = useAppStore((s) => s.setMissedNewsModalOpen);
  const storeStartupStatus = useAppStore((s) => s.startupStatus);
  const startupStatus = forcedStartupStatus !== undefined ? forcedStartupStatus : storeStartupStatus;

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false,
  );

  // Monitor input focus globally without leaving stale flags when focused nodes unmount
  useEffect(() => {
    const syncFocusState = () => {
      setIsInputFocused(isElementEditable(document.activeElement));
    };

    const handleFocusOut = () => {
      queueMicrotask(syncFocusState);
    };

    window.addEventListener('focusin', syncFocusState);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', syncFocusState);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Re-verify document.activeElement whenever modals or views close/switch
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsInputFocused(isElementEditable(document.activeElement));
  }, [
    currentView,
    isSettingsOpen,
    isArchiveChatOpen,
    isAlertsOpen,
    isSourcesOpen,
    isWatchlistOpen,
    isControlRoomOpen,
    isGlobeOpen,
    isCommandPaletteOpen,
    isMissedNewsModalOpen,
  ]);

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const isEnabled =
    forcedAutoAdvanceEnabled !== undefined
      ? forcedAutoAdvanceEnabled
      : Boolean(settings.auto_advance_enabled);
  const intervalSec = clampIntervalSec(settings.auto_advance_interval_sec);
  const pauseOnHover = settings.auto_advance_pause_on_hover ?? true;
  const isPlainMode =
    forcedPlainMode !== undefined ? forcedPlainMode : Boolean(settings.plain_mode_enabled);

  const flags = useMemo<AutoAdvanceFlags>(
    () => ({
      enabled: isEnabled,
      intervalSec,
      manualPaused: isAutoAdvanceManualPaused,
      isTabHidden,
      isSettingsOpen,
      currentView,
      isTvViewOpen,
      isPdfOpen,
      isArchiveChatOpen,
      isAlertsOpen,
      isSourcesOpen,
      isControlRoomOpen,
      isGlobeOpen,
      isWatchlistOpen,
      isBriefingOpen,
      isCommandPaletteOpen,
      isMissedNewsModalOpen,
      isInputFocused,
      pauseOnHover,
      isArticlePanelHovered,
    }),
    [
      isEnabled,
      intervalSec,
      isAutoAdvanceManualPaused,
      isTabHidden,
      isSettingsOpen,
      currentView,
      isTvViewOpen,
      isPdfOpen,
      isArchiveChatOpen,
      isAlertsOpen,
      isSourcesOpen,
      isControlRoomOpen,
      isGlobeOpen,
      isWatchlistOpen,
      isBriefingOpen,
      isCommandPaletteOpen,
      isMissedNewsModalOpen,
      isInputFocused,
      pauseOnHover,
      isArticlePanelHovered,
    ],
  );

  const flagsRef = useRef<AutoAdvanceFlags>(flags);
  flagsRef.current = flags;

  const [machineState, setMachineState] = useState<AutoAdvanceMachineState>(() =>
    createAutoAdvanceState(flags, Date.now()),
  );
  const machineRef = useRef<AutoAdvanceMachineState>(machineState);
  const prevResetTokenRef = useRef<number>(autoAdvanceResetToken);

  // Reconcile state machine when flags/visibility/interval change
  useEffect(() => {
    const next = reconcileAutoAdvanceState(machineRef.current, flags, Date.now(), 4000);
    machineRef.current = next;
    setMachineState(next);
  }, [flags]);

  // Restart full interval on manual navigation (j / k / card click)
  useEffect(() => {
    if (autoAdvanceResetToken === prevResetTokenRef.current) return;
    prevResetTokenRef.current = autoAdvanceResetToken;
    const next = resetAutoAdvanceInterval(machineRef.current, flagsRef.current, Date.now());
    machineRef.current = next;
    setMachineState(next);
  }, [autoAdvanceResetToken]);

  // Real-clock ticker active only while state machine is running
  const isRunning = machineState.mode === 'running' && forcedPauseReason === undefined;
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      const result = tickAutoAdvanceState(machineRef.current, flagsRef.current, Date.now(), {
        maxTickGapMs: 4000,
        sleepOverdueGraceMs: 2500,
      });
      machineRef.current = result.state;
      setMachineState(result.state);

      if (result.shouldAdvance) {
        nextArticle({ isAutoAdvance: true });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isRunning, nextArticle]);

  const calculatedPauseReason = machineState.winningPauseReason;
  const pauseReason = forcedPauseReason !== undefined ? forcedPauseReason : calculatedPauseReason;
  const isPaused = isEnabled && Boolean(pauseReason);
  const progressPercent = isEnabled && !isPaused ? machineState.progressPercent : 0;
  const remainingSeconds = isEnabled ? machineState.remainingSeconds : intervalSec;

  return (
    <div
      id="status-strip"
      role="region"
      aria-label="Application Status Strip"
      className="w-full h-7 min-h-7 bg-paper-alt/80 border-b border-paper-border flex flex-col justify-between select-none z-30 transition-colors shrink-0"
    >
      {/* 2px Hairline Progress Bar */}
      <div className="w-full h-[2px] bg-paper-border/30 relative overflow-hidden shrink-0">
        <div
          id="status-strip-progress-bar"
          data-testid="status-strip-progress-bar"
          className="h-full bg-accent transition-[width] duration-100 ease-linear motion-reduce:transition-none"
          style={{ width: `${isEnabled ? progressPercent : 0}%` }}
        />
      </div>

      {/* Status Strip Content Row */}
      <div className="flex-1 flex items-center justify-between px-3 sm:px-4 font-mono text-[0.6875rem] text-ink-secondary gap-2 leading-none">
        {/* Left: Play/Pause + Auto-Advance State + Pause Reason */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Play/Pause Button */}
          <button
            type="button"
            id="btn-status-strip-play-pause"
            onClick={() => void toggleStatusStripPlayPause()}
            title={
              !isEnabled
                ? 'Start auto-advance'
                : isAutoAdvanceManualPaused
                  ? 'Resume auto-advance (Space)'
                  : 'Pause auto-advance (Space)'
            }
            aria-label={
              !isEnabled
                ? 'Start auto-advance'
                : isAutoAdvanceManualPaused
                  ? 'Resume auto-advance'
                  : 'Pause auto-advance'
            }
            className="p-1 rounded-2xs border border-paper-border hover:border-ink bg-paper text-ink hover:text-accent transition-colors shrink-0 cursor-pointer"
          >
            {!isEnabled || isAutoAdvanceManualPaused ? <Play size={10} /> : <Pause size={10} />}
          </button>

          {/* Auto-Advance State & Reason */}
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-ui text-[0.5625rem] font-bold uppercase tracking-wider text-ink shrink-0">
              Auto-Advance
            </span>

            {!isEnabled ? (
              <span id="status-strip-state-disabled" className="text-ink-muted truncate">
                Off
              </span>
            ) : isPaused ? (
              <span
                id="status-strip-state-paused"
                data-testid="auto-advance-pause-reason"
                className="text-accent font-semibold flex items-center gap-1 truncate"
              >
                <span>⏸ Paused:</span>
                <span className="underline decoration-accent/40 truncate">{pauseReason}</span>
              </span>
            ) : (
              <span id="status-strip-state-running" className="text-positive font-bold flex items-center gap-1 shrink-0">
                <span>▶ Advancing in</span>
                <span className="font-bold text-ink tabular-nums inline-block min-w-[2.6ch] text-right">{remainingSeconds}s</span>
              </span>
            )}

            <span className="hidden xl:inline text-ink-muted text-[0.5625rem] ml-1">
              (Space: pause · ←/→: jump)
            </span>
          </div>
        </div>

        {/* Right: Reconnecting, Gap & Plain-mode chips */}
        <div className="flex items-center gap-2 shrink-0 font-ui text-[0.625rem]">
          {/* Non-blocking SSE Reconnecting Chip (PRD D Cat 4) */}
          {sseStatus === 'reconnecting' && (
            <span
              id="status-strip-reconnecting-chip"
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-2xs border border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-mono text-[0.625rem] font-bold tabular-nums min-w-[106px] justify-center shrink-0"
              title="Live wire stream interrupted — automatically reconnecting with cursor replay"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                Reconnecting...{sseReconnectAttempts > 1 ? ` (#${sseReconnectAttempts})` : ''}
              </span>
            </span>
          )}

          {/* Gap Status Chip */}
          {startupStatus?.detected && startupStatus.missed_minutes > 0 && (
            <button
              id="status-strip-gap-chip"
              type="button"
              onClick={() => setMissedNewsModalOpen(true)}
              className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-2xs border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[0.625rem] font-bold tabular-nums min-w-[66px] hover:bg-amber-500/20 transition-colors cursor-pointer"
              title={`Offline for ${startupStatus.missed_minutes}m — Click to open Catch-Up Dispatches`}
            >
              <Clock size={10} />
              <span>Gap: {startupStatus.missed_minutes}m</span>
            </button>
          )}

          {/* Plain-mode Chip */}
          <button
            id="status-strip-plain-chip"
            type="button"
            onClick={() => updateSettings({ plain_mode_enabled: !isPlainMode })}
            className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-2xs border font-mono text-[0.625rem] font-bold tabular-nums min-w-[80px] transition-all shadow-2xs cursor-pointer ${
              isPlainMode
                ? 'border-ink bg-ink text-paper'
                : 'border-paper-border bg-paper hover:border-ink text-ink-secondary hover:text-ink'
            }`}
            title={
              isPlainMode
                ? 'Plain Mode is ON (Zero AI, Full-Width Reader). Click to switch to Standard Mode.'
                : 'Switch to Plain Mode (Zero AI, Zero Quota, Full-Width Reader).'
            }
          >
            {isPlainMode ? <ZapOff size={10} className="text-accent" /> : <Sparkles size={10} />}
            <span>Plain: {isPlainMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* S2: Operational System Health Indicator */}
          <SystemHealthIndicator />
        </div>
      </div>

      {/* TEMPORARY Category 1 Diagnostic HUD (dev flag ?debug_auto=1) */}
      {isAutoAdvanceDebugEnabled(settings.debug_logging) && (
        <AutoAdvanceDebugHud
          isEnabled={isEnabled}
          isPaused={isPaused}
          winningPauseReason={calculatedPauseReason}
          intervalSec={intervalSec}
          isInputFocused={isInputFocused}
          isTabHidden={isTabHidden}
          progressPercent={progressPercent}
          remainingSeconds={remainingSeconds}
        />
      )}
    </div>
  );
});

StatusStrip.displayName = 'StatusStrip';
export default StatusStrip;

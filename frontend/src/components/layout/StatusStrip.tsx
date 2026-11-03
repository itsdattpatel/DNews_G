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
import { useState, useEffect, useRef, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play, Pause, Clock, ZapOff, Sparkles } from 'lucide-react';

export interface StatusStripProps {
  forcedPauseReason?: string | null;
  forcedAutoAdvanceEnabled?: boolean;
  forcedStartupStatus?: { detected: boolean; missed_minutes: number } | null;
  forcedPlainMode?: boolean;
}

export const StatusStrip: React.FC<StatusStripProps> = memo(({
  forcedPauseReason,
  forcedAutoAdvanceEnabled,
  forcedStartupStatus,
  forcedPlainMode,
}) => {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const isAutoAdvanceManualPaused = useAppStore((s) => s.isAutoAdvanceManualPaused);
  const toggleAutoAdvanceManualPaused = useAppStore((s) => s.toggleAutoAdvanceManualPaused);
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
  const isMissedNewsModalOpen = useAppStore((s) => s.isMissedNewsModalOpen);
  const setMissedNewsModalOpen = useAppStore((s) => s.setMissedNewsModalOpen);
  const storeStartupStatus = useAppStore((s) => s.startupStatus);
  const startupStatus = forcedStartupStatus !== undefined ? forcedStartupStatus : storeStartupStatus;

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(settings.auto_advance_interval_sec ?? 7);

  // Monitor input focus globally
  useEffect(() => {
    const handleFocusIn = () => {
      const active = document.activeElement;
      if (
        active &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) ||
          active.getAttribute('contenteditable') === 'true')
      ) {
        setIsInputFocused(true);
      }
    };

    const handleFocusOut = () => {
      setIsInputFocused(false);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Determine current pause reason (if any) per PRD A 2.2
  const isEnabled =
    forcedAutoAdvanceEnabled !== undefined
      ? forcedAutoAdvanceEnabled
      : Boolean(settings.auto_advance_enabled);
  const intervalSec = settings.auto_advance_interval_sec ?? 7;
  const pauseOnHover = settings.auto_advance_pause_on_hover ?? true;
  const isPlainMode =
    forcedPlainMode !== undefined ? forcedPlainMode : Boolean(settings.plain_mode_enabled);

  let calculatedPauseReason: string | null = null;
  if (!isEnabled) {
    calculatedPauseReason = null;
  } else if (isAutoAdvanceManualPaused) {
    calculatedPauseReason = 'Manual pause';
  } else if (isTabHidden) {
    calculatedPauseReason = 'Background tab';
  } else if (isSettingsOpen) {
    calculatedPauseReason = 'Settings open';
  } else if (currentView !== 'reader') {
    calculatedPauseReason = 'Directory view';
  } else if (isTvViewOpen) {
    calculatedPauseReason = 'TV desk open';
  } else if (isPdfOpen) {
    calculatedPauseReason = 'PDF desk open';
  } else if (isArchiveChatOpen) {
    calculatedPauseReason = 'Archive open';
  } else if (isAlertsOpen) {
    calculatedPauseReason = 'Alerts open';
  } else if (isSourcesOpen) {
    calculatedPauseReason = 'Sources open';
  } else if (isControlRoomOpen) {
    calculatedPauseReason = 'Control Room open';
  } else if (isGlobeOpen) {
    calculatedPauseReason = 'Globe open';
  } else if (isWatchlistOpen) {
    calculatedPauseReason = 'Watchlist open';
  } else if (isBriefingOpen) {
    calculatedPauseReason = 'Briefing open';
  } else if (isMissedNewsModalOpen) {
    calculatedPauseReason = 'Catch-up open';
  } else if (isInputFocused) {
    calculatedPauseReason = 'Input focused';
  } else if (pauseOnHover && isArticlePanelHovered) {
    calculatedPauseReason = 'Reading (hover)';
  }

  const pauseReason = forcedPauseReason !== undefined ? forcedPauseReason : calculatedPauseReason;
  const isPaused = Boolean(pauseReason);

  // Timer loop with full restart on resume
  const elapsedMsRef = useRef(0);
  const wasPausedRef = useRef(isPaused);

  useEffect(() => {
    if (!isEnabled) {
      setProgressPercent(0);
      setRemainingSeconds(intervalSec);
      elapsedMsRef.current = 0;
      return;
    }

    // On resume from paused state, restart with a FULL interval per PRD A 2.2
    if (wasPausedRef.current && !isPaused) {
      elapsedMsRef.current = 0;
      setProgressPercent(0);
      setRemainingSeconds(intervalSec);
    }
    wasPausedRef.current = isPaused;

    if (isPaused) {
      return;
    }

    const totalMs = intervalSec * 1000;
    const tickMs = 50;

    const timer = setInterval(() => {
      elapsedMsRef.current += tickMs;
      const progress = Math.min(100, (elapsedMsRef.current / totalMs) * 100);
      setProgressPercent(progress);

      const remSec = Math.max(1, Math.ceil((totalMs - elapsedMsRef.current) / 1000));
      setRemainingSeconds(remSec);

      if (elapsedMsRef.current >= totalMs) {
        elapsedMsRef.current = 0;
        setProgressPercent(0);
        setRemainingSeconds(intervalSec);
        nextArticle();
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [isEnabled, isPaused, intervalSec, nextArticle]);

  // Reset countdown whenever an article is manually selected
  useEffect(() => {
    elapsedMsRef.current = 0;
    setProgressPercent(0);
    setRemainingSeconds(intervalSec);
  }, [autoAdvanceResetToken, intervalSec]);

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
            onClick={toggleAutoAdvanceManualPaused}
            title={isAutoAdvanceManualPaused ? 'Resume auto-advance (Space)' : 'Pause auto-advance (Space)'}
            aria-label={isAutoAdvanceManualPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
            className="p-1 rounded-2xs border border-paper-border hover:border-ink bg-paper text-ink hover:text-accent transition-colors shrink-0 cursor-pointer"
          >
            {isAutoAdvanceManualPaused || !isEnabled ? <Play size={10} /> : <Pause size={10} />}
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
                <span className="font-bold text-ink">{remainingSeconds}s</span>
              </span>
            )}

            <span className="hidden xl:inline text-ink-muted text-[0.5625rem] ml-1">
              (Space: pause · ←/→: jump)
            </span>
          </div>
        </div>

        {/* Right: Gap & Plain-mode chips */}
        <div className="flex items-center gap-2 shrink-0 font-ui text-[0.625rem]">
          {/* Gap Status Chip */}
          {startupStatus?.detected && startupStatus.missed_minutes > 0 && (
            <button
              id="status-strip-gap-chip"
              type="button"
              onClick={() => setMissedNewsModalOpen(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-2xs border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[0.625rem] font-bold hover:bg-amber-500/20 transition-colors cursor-pointer"
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
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-2xs border font-mono text-[0.625rem] font-bold transition-all shadow-2xs cursor-pointer ${
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
        </div>
      </div>
    </div>
  );
});

StatusStrip.displayName = 'StatusStrip';
export default StatusStrip;

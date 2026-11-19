/**
 * frontend/src/components/article/AutoAdvanceProgressBar.tsx
 * Broadsheet Auto-Advance Progress Bar and Controller per PRD A Category 2.
 * Automatically advances to next dispatch every 7 seconds (configurable 3-60s).
 * Displays a hairline countdown bar and "Paused: <reason>" label.
 * Pauses on hover, input focus, open modals/drawers, background tab, and manual pause.
 * On resume, restarts a full interval.
 */
import { useState, useEffect, useRef, memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play, Pause } from 'lucide-react';

export const AutoAdvanceProgressBar = memo(() => {
  const settings = useAppStore((s) => s.settings);
  const nextArticle = useAppStore((s) => s.nextArticle);
  const isAutoAdvanceManualPaused = useAppStore((s) => s.isAutoAdvanceManualPaused);
  const toggleAutoAdvanceManualPaused = useAppStore((s) => s.toggleAutoAdvanceManualPaused);
  const isArticlePanelHovered = useAppStore((s) => s.isArticlePanelHovered);
  const autoAdvanceResetToken = useAppStore((s) => s.autoAdvanceResetToken);
  const setAutoAdvanceProgressPercent = useAppStore((s) => s.setAutoAdvanceProgressPercent);

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

  // Determine current pause reason (if any)
  const isEnabled = Boolean(settings.auto_advance_enabled);
  const intervalSec = settings.auto_advance_interval_sec ?? 7;
  const pauseOnHover = settings.auto_advance_pause_on_hover ?? true;

  let pauseReason: string | null = null;
  if (!isEnabled) {
    pauseReason = null; // not active
  } else if (isAutoAdvanceManualPaused) {
    pauseReason = 'Manual pause';
  } else if (isTabHidden) {
    pauseReason = 'Background tab';
  } else if (isSettingsOpen) {
    pauseReason = 'Settings open';
  } else if (currentView !== 'reader') {
    pauseReason = 'Directory view';
  } else if (isTvViewOpen) {
    pauseReason = 'TV desk open';
  } else if (isPdfOpen) {
    pauseReason = 'PDF desk open';
  } else if (isArchiveChatOpen) {
    pauseReason = 'Archive open';
  } else if (isAlertsOpen) {
    pauseReason = 'Alerts open';
  } else if (isSourcesOpen) {
    pauseReason = 'Sources open';
  } else if (isControlRoomOpen) {
    pauseReason = 'Control Room open';
  } else if (isGlobeOpen) {
    pauseReason = 'Globe open';
  } else if (isWatchlistOpen) {
    pauseReason = 'Watchlist open';
  } else if (isBriefingOpen) {
    pauseReason = 'Briefing open';
  } else if (isMissedNewsModalOpen) {
    pauseReason = 'Catch-up open';
  } else if (isInputFocused) {
    pauseReason = 'Input focused';
  } else if (pauseOnHover && isArticlePanelHovered) {
    pauseReason = 'Reading (hover)';
  }

  const isPaused = Boolean(pauseReason);

  // Timer loop with full restart on resume
  const elapsedMsRef = useRef(0);
  const wasPausedRef = useRef(isPaused);

  useEffect(() => {
    if (!isEnabled) {
      setProgressPercent(0);
      setAutoAdvanceProgressPercent(0);
      setRemainingSeconds(intervalSec);
      elapsedMsRef.current = 0;
      return;
    }

    // On resume from paused state, restart with a FULL interval per PRD A 2.2
    if (wasPausedRef.current && !isPaused) {
      elapsedMsRef.current = 0;
      setProgressPercent(0);
      setAutoAdvanceProgressPercent(0);
      setRemainingSeconds(intervalSec);
    }
    wasPausedRef.current = isPaused;

    if (isPaused) {
      // Retain or freeze progress display
      return;
    }

    const totalMs = intervalSec * 1000;
    const tickMs = 50;

    const timer = setInterval(() => {
      elapsedMsRef.current += tickMs;
      const progress = Math.min(100, (elapsedMsRef.current / totalMs) * 100);
      setProgressPercent(progress);
      setAutoAdvanceProgressPercent(progress);

      const remSec = Math.max(1, Math.ceil((totalMs - elapsedMsRef.current) / 1000));
      setRemainingSeconds(remSec);

      if (elapsedMsRef.current >= totalMs) {
        elapsedMsRef.current = 0;
        setProgressPercent(0);
        setAutoAdvanceProgressPercent(0);
        setRemainingSeconds(intervalSec);
        nextArticle();
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [isEnabled, isPaused, intervalSec, nextArticle, setAutoAdvanceProgressPercent]);

  // Reset countdown whenever an article is manually selected (autoAdvanceResetToken changes)
  useEffect(() => {
    elapsedMsRef.current = 0;
    setProgressPercent(0);
    setAutoAdvanceProgressPercent(0);
    setRemainingSeconds(intervalSec);
  }, [autoAdvanceResetToken, intervalSec, setAutoAdvanceProgressPercent]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Auto-advance reader progress"
      data-testid="auto-advance-progress-container"
      className="w-full bg-paper border-b border-paper-border/80 sticky top-0 z-30 transition-colors"
    >
      {/* 2px Hairline Progress Bar */}
      <div className="w-full h-0.5 bg-paper-border/40 relative overflow-hidden">
        <div
          data-testid="auto-advance-progress-bar"
          className="h-full bg-accent transition-[width] duration-100 ease-linear motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Ambient Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 font-mono text-[0.625rem] text-ink-secondary bg-paper-alt/40 border-b border-paper-border/40 select-none">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={toggleAutoAdvanceManualPaused}
            title={isAutoAdvanceManualPaused ? 'Resume auto-advance (Space)' : 'Pause auto-advance (Space)'}
            aria-label={isAutoAdvanceManualPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
            className="p-1 rounded-xs border border-paper-border hover:border-ink bg-paper text-ink hover:text-accent transition-colors"
          >
            {isAutoAdvanceManualPaused ? <Play size={10} /> : <Pause size={10} />}
          </button>

          <span className="font-ui text-[0.5625rem] font-bold uppercase tracking-wider text-ink">
            Auto-Advance
          </span>

          {isPaused ? (
            <span
              data-testid="auto-advance-pause-reason"
              className="text-accent font-semibold flex items-center gap-1"
            >
              <span>⏸ Paused:</span>
              <span className="underline decoration-accent/40">{pauseReason}</span>
            </span>
          ) : (
            <span className="text-positive font-bold flex items-center gap-1">
              <span>▶ Advancing in</span>
              <span className="font-bold text-ink">{remainingSeconds}s</span>
            </span>
          )}
        </div>

        <span className="text-ink-muted text-[0.5625rem]">
          Space: pause · ←/→: jump
        </span>
      </div>
    </div>
  );
});

AutoAdvanceProgressBar.displayName = 'AutoAdvanceProgressBar';

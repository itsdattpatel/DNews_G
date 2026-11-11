/**
 * frontend/src/components/dev/AutoAdvanceDebugHud.tsx
 * TEMPORARY Category 1 Diagnostic Readout (PRD D).
 * Gated behind dev flag (?debug_auto=1, localStorage.dnews_debug_auto='1', or settings.debug_logging=true).
 * Read-only observer: does NOT alter Auto-Advance behavior.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';

export type AutoAdvanceStateLabel = 'OFF' | 'RUNNING' | 'PAUSED';

export interface AutoAdvanceDebugProps {
  isEnabled: boolean;
  isPaused: boolean;
  winningPauseReason: string | null;
  intervalSec: number;
  isInputFocused: boolean;
  isTabHidden: boolean;
  progressPercent: number;
  remainingSeconds: number;
  disablePortal?: boolean;
}

export interface PauseFlagSnapshot {
  isAutoAdvanceManualPaused: boolean;
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

export function collectActivePauseReasons(flags: PauseFlagSnapshot): string[] {
  const reasons: string[] = [];
  if (flags.isAutoAdvanceManualPaused) reasons.push('Manual pause');
  if (flags.isTabHidden) reasons.push('Background tab');
  if (flags.isSettingsOpen) reasons.push('Settings open');
  if (flags.currentView !== 'reader') reasons.push(`View: ${flags.currentView}`);
  if (flags.isTvViewOpen) reasons.push('TV desk open');
  if (flags.isPdfOpen) reasons.push('PDF desk open');
  if (flags.isArchiveChatOpen) reasons.push('Archive chat open');
  if (flags.isAlertsOpen) reasons.push('Alerts open');
  if (flags.isSourcesOpen) reasons.push('Sources open');
  if (flags.isControlRoomOpen) reasons.push('Control room open');
  if (flags.isGlobeOpen) reasons.push('Globe open');
  if (flags.isWatchlistOpen) reasons.push('Watchlist open');
  if (flags.isBriefingOpen) reasons.push('Briefing open');
  if (flags.isCommandPaletteOpen) reasons.push('Command palette open');
  if (flags.isMissedNewsModalOpen) reasons.push('Catch-up open');
  if (flags.isInputFocused) reasons.push('Input focused');
  if (flags.pauseOnHover && flags.isArticlePanelHovered) reasons.push('Reading (hover)');
  return reasons;
}

export function isAutoAdvanceDebugEnabled(debugLoggingSetting?: boolean): boolean {
  if (debugLoggingSetting) return true;
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug_auto') === '1' || params.get('debug_auto') === 'true') {
      return true;
    }
    if (window.localStorage.getItem('dnews_debug_auto') === '1') {
      return true;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  return false;
}

export const AutoAdvanceDebugHud: React.FC<AutoAdvanceDebugProps> = ({
  isEnabled,
  isPaused,
  winningPauseReason,
  intervalSec,
  isInputFocused,
  isTabHidden,
  progressPercent,
  remainingSeconds,
  disablePortal = false,
}) => {
  const settings = useAppStore((s) => s.settings);
  const theme = useAppStore((s) => s.theme);
  const currentView = useAppStore((s) => s.currentView);
  const articles = useAppStore((s) => s.articles);
  const selectedArticleId = useAppStore((s) => s.selectedArticleId);

  const isAutoAdvanceManualPaused = useAppStore((s) => s.isAutoAdvanceManualPaused);
  const isArticlePanelHovered = useAppStore((s) => s.isArticlePanelHovered);
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

  const [dismissed, setDismissed] = useState(false);

  const pauseOnHover = settings.auto_advance_pause_on_hover ?? true;
  const currentState: AutoAdvanceStateLabel = !isEnabled
    ? 'OFF'
    : isPaused
      ? 'PAUSED'
      : 'RUNNING';

  // Collect ALL active pause flags simultaneously (independent of else-if short-circuiting)
  const activePauseReasons = collectActivePauseReasons({
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
  });

  const remainingMs = Math.max(0, Math.round(intervalSec * 1000 * (1 - progressPercent / 100)));
  const currentIndex = articles.findIndex((a) => a.id === selectedArticleId);
  const nextArticle =
    articles.length === 0
      ? null
      : currentIndex !== -1 && currentIndex < articles.length - 1
        ? articles[currentIndex + 1]
        : articles[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as Record<string, unknown>).__AUTO_ADVANCE_DEBUG__ = {
      enabled: isEnabled,
      intervalSec,
      state: currentState,
      winningPauseReason,
      activePauseReasons,
      remainingMs,
      remainingSeconds,
      progressPercent,
      selectedArticleId,
      nextArticleId: nextArticle?.id ?? null,
      currentIndex,
      articlesCount: articles.length,
      pauseOnHover,
      rawHovered: isArticlePanelHovered,
      currentView,
    };
  });

  if (dismissed) return null;

  const panel = (
    <aside
      id="auto-advance-debug-hud"
      data-theme={theme}
      role="status"
      aria-label="Auto-Advance Temporary Diagnostic Readout"
      className="fixed bottom-[214px] left-3 z-[75] w-[360px] max-w-[92vw] bg-paper text-ink border-2 border-ink shadow-overlay p-2.5 font-mono text-[11px] leading-tight select-text pointer-events-auto"
    >
      <div className="flex items-center justify-between border-b border-paper-border pb-1 mb-1.5">
        <span className="font-bold uppercase tracking-wider text-accent">
          Auto-Advance Debug HUD
        </span>
        <button
          id="btn-close-auto-debug-hud"
          type="button"
          onClick={() => setDismissed(true)}
          className="px-1.5 py-0.5 text-[10px] border border-paper-border hover:border-ink bg-paper-alt text-ink cursor-pointer"
          title="Hide temporary debug readout"
        >
          Hide
        </button>
      </div>

      <dl className="grid grid-cols-[120px_1fr] gap-y-1 gap-x-2">
        <dt className="text-ink-muted uppercase">enabled:</dt>
        <dd id="debug-hud-enabled" className={isEnabled ? 'font-bold text-positive' : 'font-bold text-accent'}>
          {String(isEnabled)}
        </dd>

        <dt className="text-ink-muted uppercase">interval:</dt>
        <dd id="debug-hud-interval" className="font-bold">
          {intervalSec}s
        </dd>

        <dt className="text-ink-muted uppercase">current state:</dt>
        <dd
          id="debug-hud-state"
          className={
            currentState === 'RUNNING'
              ? 'font-bold text-positive'
              : currentState === 'PAUSED'
                ? 'font-bold text-accent'
                : 'font-bold text-ink-muted'
          }
        >
          {currentState}
          {winningPauseReason ? ` (${winningPauseReason})` : ''}
        </dd>

        <dt className="text-ink-muted uppercase">pause reasons:</dt>
        <dd id="debug-hud-pause-reasons" className="break-words">
          {activePauseReasons.length > 0 ? (
            <span className="text-accent font-semibold">
              [{activePauseReasons.join(', ')}]
            </span>
          ) : (
            <span className="text-ink-muted">[NONE]</span>
          )}
        </dd>

        <dt className="text-ink-muted uppercase">next advance:</dt>
        <dd id="debug-hud-time-left" className="tabular-nums font-semibold">
          {isEnabled
            ? `${(remainingMs / 1000).toFixed(1)}s / ${intervalSec}.0s (${Math.round(progressPercent)}%, int ${remainingSeconds}s)`
            : 'N/A (OFF)'}
        </dd>

        <dt className="text-ink-muted uppercase">queue:</dt>
        <dd id="debug-hud-queue" className="truncate">
          #{currentIndex >= 0 ? currentIndex + 1 : '-'}/{articles.length} (id {selectedArticleId ?? '—'} → {nextArticle?.id ?? '—'})
        </dd>

        <dt className="text-ink-muted uppercase">flags:</dt>
        <dd id="debug-hud-flags" className="text-[10px] text-ink-secondary">
          hoverPause={String(pauseOnHover)} hovered={String(isArticlePanelHovered)} plain={String(Boolean(settings.plain_mode_enabled))}
        </dd>
      </dl>
    </aside>
  );

  if (disablePortal || typeof document === 'undefined') return panel;
  return createPortal(panel, document.body);
};

export default AutoAdvanceDebugHud;

import { describe, it, expect } from 'vitest';
import {
  collectPauseReasons,
  createAutoAdvanceState,
  reconcileAutoAdvanceState,
  resetAutoAdvanceInterval,
  tickAutoAdvanceState,
  clampIntervalSec,
  type AutoAdvanceFlags,
} from '../../utils/autoAdvanceMachine';

function makeFlags(overrides: Partial<AutoAdvanceFlags> = {}): AutoAdvanceFlags {
  return {
    enabled: true,
    intervalSec: 7,
    manualPaused: false,
    isTabHidden: false,
    isSettingsOpen: false,
    currentView: 'reader',
    isTvViewOpen: false,
    isPdfOpen: false,
    isArchiveChatOpen: false,
    isAlertsOpen: false,
    isSourcesOpen: false,
    isControlRoomOpen: false,
    isGlobeOpen: false,
    isWatchlistOpen: false,
    isBriefingOpen: false,
    isCommandPaletteOpen: false,
    isMissedNewsModalOpen: false,
    isInputFocused: false,
    pauseOnHover: true,
    isArticlePanelHovered: false,
    ...overrides,
  };
}

describe('autoAdvanceMachine (PRD D Category 2 clock-driven state machine)', () => {
  it('clamps interval seconds strictly between 3 and 60 with default 7', () => {
    expect(clampIntervalSec(undefined)).toBe(7);
    expect(clampIntervalSec(NaN)).toBe(7);
    expect(clampIntervalSec(1)).toBe(3);
    expect(clampIntervalSec(7)).toBe(7);
    expect(clampIntervalSec(120)).toBe(60);
  });

  it('transitions cleanly between off, running, and paused(reasons[])', () => {
    const offState = createAutoAdvanceState(makeFlags({ enabled: false }), 1000);
    expect(offState.mode).toBe('off');
    expect(offState.pauseReasons).toEqual([]);
    expect(offState.winningPauseReason).toBeNull();
    expect(offState.deadlineMs).toBeNull();
    expect(offState.progressPercent).toBe(0);

    const runningState = reconcileAutoAdvanceState(offState, makeFlags({ enabled: true }), 2000);
    expect(runningState.mode).toBe('running');
    expect(runningState.deadlineMs).toBe(9000);
    expect(runningState.remainingSeconds).toBe(7);

    const pausedState = reconcileAutoAdvanceState(
      runningState,
      makeFlags({ enabled: true, manualPaused: true }),
      4500,
    );
    expect(pausedState.mode).toBe('paused');
    expect(pausedState.pauseReasons).toEqual(['Manual pause']);
    expect(pausedState.winningPauseReason).toBe('Manual pause');
    expect(pausedState.deadlineMs).toBeNull();
    expect(pausedState.progressPercent).toBe(0);

    // Clearing pause reason restarts a FULL interval from resume timestamp
    const resumedState = reconcileAutoAdvanceState(
      pausedState,
      makeFlags({ enabled: true, manualPaused: false }),
      10000,
    );
    expect(resumedState.mode).toBe('running');
    expect(resumedState.deadlineMs).toBe(17000);
    expect(resumedState.remainingSeconds).toBe(7);
    expect(resumedState.progressPercent).toBe(0);
  });

  it('tracks every pause reason accurately and clears only when ALL reasons end', () => {
    const cases: Array<[Partial<AutoAdvanceFlags>, string]> = [
      [{ manualPaused: true }, 'Manual pause'],
      [{ isTabHidden: true }, 'Background tab'],
      [{ isSettingsOpen: true }, 'Settings open'],
      [{ isTvViewOpen: true }, 'TV desk open'],
      [{ isPdfOpen: true }, 'PDF desk open'],
      [{ isArchiveChatOpen: true }, 'Archive open'],
      [{ isAlertsOpen: true }, 'Alerts open'],
      [{ isSourcesOpen: true }, 'Sources open'],
      [{ isControlRoomOpen: true }, 'Control Room open'],
      [{ isGlobeOpen: true }, 'Globe open'],
      [{ isWatchlistOpen: true }, 'Watchlist open'],
      [{ isBriefingOpen: true }, 'Briefing open'],
      [{ isCommandPaletteOpen: true }, 'Command palette open'],
      [{ isMissedNewsModalOpen: true }, 'Catch-up open'],
      [{ currentView: 'category' }, 'Directory view'],
      [{ isInputFocused: true }, 'Input focused'],
      [{ pauseOnHover: true, isArticlePanelHovered: true }, 'Reading (hover)'],
    ];

    for (const [override, expectedLabel] of cases) {
      const reasons = collectPauseReasons(makeFlags(override));
      expect(reasons).toContain(expectedLabel);
    }

    // Multiple simultaneous reasons: clearing one stays paused on remaining reason
    const dualPaused = createAutoAdvanceState(
      makeFlags({ isSettingsOpen: true, isArticlePanelHovered: true }),
      1000,
    );
    expect(dualPaused.pauseReasons).toEqual(['Settings open', 'Reading (hover)']);
    expect(dualPaused.winningPauseReason).toBe('Settings open');

    const stillHoverPaused = reconcileAutoAdvanceState(
      dualPaused,
      makeFlags({ isSettingsOpen: false, isArticlePanelHovered: true }),
      2000,
    );
    expect(stillHoverPaused.mode).toBe('paused');
    expect(stillHoverPaused.winningPauseReason).toBe('Reading (hover)');
    expect(stillHoverPaused.deadlineMs).toBeNull();

    const clearedAll = reconcileAutoAdvanceState(
      stillHoverPaused,
      makeFlags({ isSettingsOpen: false, isArticlePanelHovered: false }),
      5000,
    );
    expect(clearedAll.mode).toBe('running');
    expect(clearedAll.deadlineMs).toBe(12000);
  });

  it('obeys auto_advance_pause_on_hover switch both ON and OFF', () => {
    const hoverPaused = collectPauseReasons(
      makeFlags({ pauseOnHover: true, isArticlePanelHovered: true }),
    );
    expect(hoverPaused).toEqual(['Reading (hover)']);

    const hoverIgnored = collectPauseReasons(
      makeFlags({ pauseOnHover: false, isArticlePanelHovered: true }),
    );
    expect(hoverIgnored).toEqual([]);
  });

  it('runs off real wall-clock timestamps and restarts a FULL interval on laptop sleep/freeze', () => {
    const flags = makeFlags({ intervalSec: 7 });
    let state = createAutoAdvanceState(flags, 0);

    // Normal progress at t=3500ms -> 50%, remaining 4s
    const mid = tickAutoAdvanceState(state, flags, 3500);
    expect(mid.shouldAdvance).toBe(false);
    expect(mid.didWakeReset).toBe(false);
    expect(mid.state.progressPercent).toBe(50);
    expect(mid.state.remainingSeconds).toBe(4);
    state = mid.state;

    // Laptop sleeps for 2 hours right after t=3500 (now = 7_203_500ms)
    const wake = tickAutoAdvanceState(state, flags, 7_203_500, {
      sleepOverdueGraceMs: 2500,
      maxTickGapMs: 4000,
    });
    expect(wake.shouldAdvance).toBe(false);
    expect(wake.didWakeReset).toBe(true);
    expect(wake.state.mode).toBe('running');
    expect(wake.state.deadlineMs).toBe(7_203_500 + 7000);
    expect(wake.state.progressPercent).toBe(0);
    expect(wake.state.remainingSeconds).toBe(7);
  });

  it('restarts a FULL interval when tab goes hidden then visible without bursting', () => {
    const runningFlags = makeFlags({ intervalSec: 7 });
    let state = createAutoAdvanceState(runningFlags, 0);

    state = tickAutoAdvanceState(state, runningFlags, 6500).state;
    expect(state.remainingSeconds).toBe(1);

    // Tab hidden at t=6600
    state = reconcileAutoAdvanceState(
      state,
      makeFlags({ intervalSec: 7, isTabHidden: true }),
      6600,
    );
    expect(state.mode).toBe('paused');
    expect(state.winningPauseReason).toBe('Background tab');

    // Tab wakes 10 minutes later at t=606600
    const woke = reconcileAutoAdvanceState(state, runningFlags, 606_600);
    expect(woke.mode).toBe('running');
    expect(woke.deadlineMs).toBe(606_600 + 7000);
    expect(woke.progressPercent).toBe(0);
    expect(woke.remainingSeconds).toBe(7);
  });

  it('does NOT reset running deadline on unrelated state reconciles (SSE stability)', () => {
    const flags = makeFlags({ intervalSec: 7 });
    let state = createAutoAdvanceState(flags, 1000); // deadline 8000
    state = tickAutoAdvanceState(state, flags, 4000).state;

    // Reconcile with identical flags at t=4500 -> keeps exact deadline 8000!
    const afterSse = reconcileAutoAdvanceState(state, flags, 4500);
    expect(afterSse.deadlineMs).toBe(8000);
    expect(afterSse.remainingMs).toBe(3500);

    // Manual reset explicitly sets full fresh deadline from now
    const afterManual = resetAutoAdvanceInterval(afterSse, flags, 5000);
    expect(afterManual.deadlineMs).toBe(12000);
    expect(afterManual.progressPercent).toBe(0);
    expect(afterManual.remainingSeconds).toBe(7);
  });

  it('executes 20 consecutive exact advances cleanly without drift', () => {
    const flags = makeFlags({ intervalSec: 5 });
    let state = createAutoAdvanceState(flags, 0);
    let advances = 0;

    for (let step = 1; step <= 20; step++) {
      const targetNow = step * 5000;
      const mid = tickAutoAdvanceState(state, flags, targetNow - 1000, {
        sleepOverdueGraceMs: 2500,
        maxTickGapMs: 4500,
      });
      expect(mid.shouldAdvance).toBe(false);
      state = mid.state;

      const hit = tickAutoAdvanceState(state, flags, targetNow, {
        sleepOverdueGraceMs: 2500,
        maxTickGapMs: 4500,
      });
      expect(hit.shouldAdvance).toBe(true);
      advances++;
      state = hit.state;
      expect(state.deadlineMs).toBe(targetNow + 5000);
    }
    expect(advances).toBe(20);
  });
});


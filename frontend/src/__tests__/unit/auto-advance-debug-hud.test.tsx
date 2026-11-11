/**
 * frontend/src/__tests__/unit/auto-advance-debug-hud.test.tsx
 * Unit test suite for PRD D Category 1 Temporary Debug Readout (?debug_auto=1).
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AutoAdvanceDebugHud,
  collectActivePauseReasons,
  isAutoAdvanceDebugEnabled,
} from '../../components/dev/AutoAdvanceDebugHud';

describe('AutoAdvanceDebugHud (PRD D Category 1 Temporary Diagnostic Readout)', () => {
  it('is disabled by default without dev flags', () => {
    expect(isAutoAdvanceDebugEnabled(false)).toBe(false);
  });

  it('enables when settings.debug_logging is true', () => {
    expect(isAutoAdvanceDebugEnabled(true)).toBe(true);
  });

  it('collects ALL simultaneous active pause reasons without short-circuiting', () => {
    const reasons = collectActivePauseReasons({
      isAutoAdvanceManualPaused: true,
      isTabHidden: false,
      isSettingsOpen: false,
      currentView: 'tv',
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
      isMissedNewsModalOpen: true,
      isInputFocused: true,
      pauseOnHover: true,
      isArticlePanelHovered: true,
    });

    expect(reasons).toEqual([
      'Manual pause',
      'View: tv',
      'Catch-up open',
      'Input focused',
      'Reading (hover)',
    ]);
  });

  it('renders enabled, interval, current state, active pause reasons, and remaining time', () => {
    const html = renderToStaticMarkup(
      <AutoAdvanceDebugHud
        isEnabled={true}
        isPaused={true}
        winningPauseReason="Directory view"
        intervalSec={7}
        isInputFocused={true}
        isTabHidden={false}
        progressPercent={50}
        remainingSeconds={4}
        disablePortal={true}
      />
    );

    expect(html).toContain('id="auto-advance-debug-hud"');
    expect(html).toContain('id="debug-hud-enabled"');
    expect(html).toContain('true');
    expect(html).toContain('7s');
    expect(html).toContain('PAUSED (Directory view)');
    expect(html).toContain('[Input focused]');
    expect(html).toContain('3.5s / 7.0s');
    expect(html).toContain('id="debug-hud-pause-reasons"');
  });
});

/**
 * frontend/src/__tests__/unit/briefing.test.ts
 * Unit tests for Morning Radio Briefing and Audio Playback (Phase 10).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { FEATURES } from '../../config/features';

describe('Executive Morning Briefing & Audio Broadcast (Phase 10)', () => {
  beforeEach(() => {
    useAppStore.setState({
      isBriefingOpen: false,
    });
  });

  it('manages isBriefingOpen modal state in the store (P10-06)', () => {
    const store = useAppStore.getState();
    expect(store.isBriefingOpen).toBe(false);

    store.setBriefingOpen(true);
    expect(useAppStore.getState().isBriefingOpen).toBe(true);

    store.setBriefingOpen(false);
    expect(useAppStore.getState().isBriefingOpen).toBe(false);
  });

  it('verifies that feature flags enable morning briefing, pdf export, and read-aloud (P10-08)', () => {
    expect(FEATURES.morning_briefing).toBe(true);
    expect(FEATURES.pdf_export).toBe(true);
    expect(FEATURES.read_aloud).toBe(true);
  });
});


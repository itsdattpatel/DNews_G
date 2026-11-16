/**
 * frontend/src/__tests__/unit/connectivity-store.test.ts
 * Unit tests for Offline Resilience store & 15-second Watchdog state (PRD E Category 5).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../store/useAppStore';

describe('useAppStore Connectivity State (PRD E Category 5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppStore.setState({
      isOnline: true,
      reconnectedRecently: false,
      connectivityCheckedAt: null,
    });
  });

  it('transitions to offline and clears reconnected state when network drops', () => {
    useAppStore.getState().setConnectivityOnline(false, '2026-11-16T12:00:00Z');

    const state = useAppStore.getState();
    expect(state.isOnline).toBe(false);
    expect(state.reconnectedRecently).toBe(false);
    expect(state.connectivityCheckedAt).toBe('2026-11-16T12:00:00Z');
  });

  it('sets reconnectedRecently to true when coming back online, then clears it after 3 seconds', () => {
    // Drop offline first
    useAppStore.getState().setConnectivityOnline(false);
    expect(useAppStore.getState().isOnline).toBe(false);

    // Reconnect
    useAppStore.getState().setConnectivityOnline(true, '2026-11-16T12:01:00Z');

    let state = useAppStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.reconnectedRecently).toBe(true);
    expect(state.connectivityCheckedAt).toBe('2026-11-16T12:01:00Z');

    // Fast-forward 3000ms
    vi.advanceTimersByTime(3000);

    state = useAppStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.reconnectedRecently).toBe(false);
  });
});

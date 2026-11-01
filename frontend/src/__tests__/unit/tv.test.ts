/**
 * frontend/src/__tests__/unit/tv.test.ts
 * Unit tests for TV View and IPTV stream state (Phase 11).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { FEATURES } from '../../config/features';

describe('Live TV & IPTV Suite (Phase 11 — P11-06, P11-07, P11-08)', () => {
  beforeEach(() => {
    useAppStore.setState({
      isTvViewOpen: false,
      selectedTvChannelId: null,
    });
  });

  it('manages isTvViewOpen and selectedTvChannelId state in the store (P11-06)', () => {
    const store = useAppStore.getState();
    expect(store.isTvViewOpen).toBe(false);
    expect(store.selectedTvChannelId).toBeNull();

    store.setTvViewOpen(true);
    expect(useAppStore.getState().isTvViewOpen).toBe(true);

    store.setSelectedTvChannelId(101);
    expect(useAppStore.getState().selectedTvChannelId).toBe(101);

    store.setTvViewOpen(false);
    expect(useAppStore.getState().isTvViewOpen).toBe(false);
  });

  it('confirms tv_view feature flag is enabled (P11-06)', () => {
    expect(FEATURES.tv_view).toBe(true);
  });
});


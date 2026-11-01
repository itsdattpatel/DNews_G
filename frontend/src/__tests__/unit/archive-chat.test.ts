/**
 * frontend/src/__tests__/unit/archive-chat.test.ts
 * Unit tests for Archive Chat and Watchlist functionality (Phase 8).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';

describe('Historical Archive & Watchlist Suite (Phase 8)', () => {
  beforeEach(() => {
    useAppStore.setState({
      isArchiveChatOpen: false,
    });
  });

  it('manages isArchiveChatOpen modal state in store (P8-03)', () => {
    const store = useAppStore.getState();
    expect(store.isArchiveChatOpen).toBe(false);

    store.setArchiveChatOpen(true);
    expect(useAppStore.getState().isArchiveChatOpen).toBe(true);

    store.setArchiveChatOpen(false);
    expect(useAppStore.getState().isArchiveChatOpen).toBe(false);
  });
});

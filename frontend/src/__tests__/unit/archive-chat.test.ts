/**
 * frontend/src/__tests__/unit/archive-chat.test.ts
 * Unit tests for Archive Chat, Archive Spider, and Watchlist functionality (Phase 8).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { ArchiveSpider } from '../../spider/spiderTypes/Archive';

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

  it('ArchiveSpider initializes with brass amber carapace and follows citation targets (P8-05)', () => {
    const spider = new ArchiveSpider(100, 100);
    expect(spider.x).toBe(100);
    expect(spider.y).toBe(100);

    const targets = [
      { x: 200, y: 150 },
      { x: 300, y: 250 },
    ];

    spider.setScanTargets(targets);
    expect(spider.targetPoint).toEqual({ x: 200, y: 150 });

    // Simulate update step
    spider.update(0.1);
    expect(spider.x).toBeGreaterThan(100);
  });

  it('supports watchlist settings and data retention fields (P8-06, P8-07)', () => {
    const settings = useAppStore.getState().settings;
    expect(settings.retention_days).toBeGreaterThanOrEqual(7);
    expect(typeof settings.auto_cleanup_enabled).toBe('boolean');
  });
});

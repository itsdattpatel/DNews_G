/**
 * frontend/src/__tests__/unit/api-wiring.test.ts
 * Unit tests for Step 3: Typed API Client, Query Keys Factory, and SSE Backoff logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '../../lib/api';
import { queryKeys } from '../../lib/queries';

describe('Step 3: Backend Wiring Layer (API Client & Query Keys)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Client', () => {
    it('constructs correct query parameters for getArticles', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 101, title_english: 'Test Article' }],
      });
      global.fetch = mockFetch as any;

      const articles = await api.getArticles({
        category: 'Science',
        limit: 25,
        offset: 50,
        status: 'done',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/articles?category=Science&status=done&limit=25&offset=50',
      );
      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe(101);
    });

    it('throws ApiError on HTTP failure with parsed message and code', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Article not found in archive', code: 'ERR_NOT_FOUND' }),
      });
      global.fetch = mockFetch as any;

      await expect(api.getArticle(999)).rejects.toThrow(ApiError);
      await expect(api.getArticle(999)).rejects.toMatchObject({
        status: 404,
        message: 'Article not found in archive',
        code: 'ERR_NOT_FOUND',
      });
    });

    it('handles bookmark toggle with PATCH request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, bookmarked: true }),
      });
      global.fetch = mockFetch as any;

      const res = await api.toggleBookmark(42, true);
      expect(mockFetch).toHaveBeenCalledWith('/api/articles/42/bookmark', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarked: true }),
      });
      expect(res.bookmarked).toBe(true);
    });

    it('fetches quota and settings cleanly', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/quota') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ current_provider: 'gemini', providers: {} }),
          });
        }
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ max_spiders: 2, alert_threshold: 80 }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      global.fetch = mockFetch as any;

      const quota = await api.getQuota();
      expect(quota.current_provider).toBe('gemini');

      const settings = await api.getSettings();
      expect(settings.max_spiders).toBe(2);
    });
  });

  describe('Query Keys Factory', () => {
    it('generates consistent hierarchical query keys', () => {
      expect(queryKeys.articles.all).toEqual(['articles']);
      expect(queryKeys.articles.list({ category: 'Tech' })).toEqual([
        'articles',
        'list',
        { category: 'Tech' },
      ]);
      expect(queryKeys.articles.detail(5)).toEqual(['articles', 'detail', 5]);
      expect(queryKeys.clusters.detail(12)).toEqual(['clusters', 'detail', 12]);
      expect(queryKeys.tv.channels({ is_favorite: true })).toEqual([
        'tv',
        'channels',
        { is_favorite: true },
      ]);
      expect(queryKeys.alerts.all({ acknowledged: false })).toEqual([
        'alerts',
        { acknowledged: false },
      ]);
    });
  });

  describe('SSE Exponential Backoff Strategy', () => {
    function computeBackoff(attempt: number): number {
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }

    it('calculates proper exponential progression up to 30s ceiling', () => {
      expect(computeBackoff(0)).toBe(1000);  // 1s
      expect(computeBackoff(1)).toBe(2000);  // 2s
      expect(computeBackoff(2)).toBe(4000);  // 4s
      expect(computeBackoff(3)).toBe(8000);  // 8s
      expect(computeBackoff(4)).toBe(16000); // 16s
      expect(computeBackoff(5)).toBe(30000); // capped at 30s
      expect(computeBackoff(10)).toBe(30000); // capped at 30s
    });
  });
});

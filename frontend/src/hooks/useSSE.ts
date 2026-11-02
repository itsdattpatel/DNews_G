/**
 * frontend/src/hooks/useSSE.ts
 * Resilient Server-Sent Events subscriber with exponential backoff,
 * toast notifications, Zustand store synchronization, and TanStack Query cache invalidation.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queries';
import { useAppStore } from '../store/useAppStore';
import type { Article, QuotaData, SSEEvent } from '../types';
import { showDesktopNotification } from '../utils/notifications';

interface UseSSEOptions {
  onNewArticle?: (article: Article) => void;
  onAlert?: (alert: any) => void;
}

export function useSSE(options?: UseSSEOptions): {
  connected: boolean;
  reconnectAttempts: number;
  lastEvent: SSEEvent | null;
} {
  const addOrPrependArticle = useAppStore((s) => s.addOrPrependArticle);
  const setCurrentProvider = useAppStore((s) => s.setCurrentProvider);
  const addAlert = useAppStore((s) => s.addAlert);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const alertThreshold = useAppStore((s) => s.settings.alert_threshold);

  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const hasShownDisconnectToastRef = useRef(false);

  const getBackoffDelay = useCallback((attempt: number): number => {
    // 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    return delay;
  }, []);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      console.log('[SSE] Connecting to /api/sse...');
      const es = new EventSource('/api/sse');
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        if (!isMounted) return;
        setConnected(true);
        if (attemptsRef.current > 0 && hasShownDisconnectToastRef.current) {
          toast.success('Live wire connection restored');
          hasShownDisconnectToastRef.current = false;
        }
        attemptsRef.current = 0;
        setReconnectAttempts(0);
      });

      es.addEventListener('heartbeat', () => {
        if (!isMounted) return;
        setConnected(true);
        attemptsRef.current = 0;
        setReconnectAttempts(0);
        setLastEvent({ type: 'heartbeat' });
      });

      es.addEventListener('new_article', async (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as { article_id?: number };
          if (payload.article_id) {
            setLastEvent({ type: 'new_article', article_id: payload.article_id });

            // Invalidate TanStack query cache for articles
            queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });

            const res = await fetch(`/api/articles/${payload.article_id}`);
            if (res.ok) {
              const article = (await res.json()) as Article;
              addOrPrependArticle(article);
              options?.onNewArticle?.(article);

              if (article.breaking_score >= alertThreshold) {
                addAlert({
                  type: 'breaking',
                  message: `BREAKING (${article.breaking_score}%): ${article.title_english}`,
                  cluster_id: article.cluster_id ?? undefined,
                });
              }
            }
          }
        } catch (err) {
          console.warn('[SSE] Error handling new_article event:', err);
        }
      });

      es.addEventListener('cluster_update', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as { cluster_id: number; outlet_count: number };
          setLastEvent({ type: 'cluster_update', ...payload });
          queryClient.invalidateQueries({ queryKey: queryKeys.clusters.all });
          if (payload.cluster_id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.clusters.detail(payload.cluster_id) });
          }
        } catch (err) {
          console.warn('[SSE] Error handling cluster_update event:', err);
        }
      });

      es.addEventListener('article_enriched_pass2', async (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as { article_id: number };
          if (payload.article_id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.articles.all });
            const selected = useAppStore.getState().selectedArticle;
            if (selected?.id === payload.article_id) {
              const res = await fetch(`/api/articles/${payload.article_id}`);
              if (res.ok) {
                const updated = (await res.json()) as Article;
                useAppStore.setState((state) => ({
                  selectedArticle: updated,
                  articles: state.articles.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
                }));
              }
            }
          }
        } catch (err) {
          console.warn('[SSE] Error handling article_enriched_pass2 event:', err);
        }
      });

      es.addEventListener('alert', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as {
            id?: number;
            type: 'breaking';
            message: string;
            article_id?: number;
            cluster_id?: number | null;
            breaking_score?: number;
          };

          setLastEvent({
            type: 'alert',
            alert: {
              id: payload.id ?? Date.now(),
              type: 'breaking',
              message: payload.message,
              cluster_id: payload.cluster_id ?? null,
              fired_at: new Date().toISOString(),
              acknowledged: false,
            },
          });

          // Invalidate alerts query
          queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all() });

          addAlert({
            type: 'breaking',
            message: payload.message,
            article_id: payload.article_id,
            cluster_id: payload.cluster_id ?? undefined,
            breaking_score: payload.breaking_score,
          });

          options?.onAlert?.(payload);

          // Desktop Notification
          showDesktopNotification({
            title: '🚨 AI World News Desk — Breaking Dispatch',
            body: payload.message,
            tag: `alert-${payload.id || Date.now()}`,
            onClick: () => {
              if (payload.article_id) {
                useAppStore.getState().selectArticleById(payload.article_id);
              }
            },
          });
        } catch (err) {
          console.warn('[SSE] Error handling alert event:', err);
        }
      });

      es.addEventListener('provider_switch', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as { from: string; to: string; reason: string };
          setLastEvent({ type: 'provider_switch', ...data });

          if (data.to && data.to !== 'next') {
            setCurrentProvider(data.to);
          }
          const switchMsg = `switched from ${data.from.toUpperCase()} to ${data.to.toUpperCase()} (${data.reason})`;
          addAlert({
            type: 'provider_switch',
            message: switchMsg,
            fromProvider: data.from,
            toProvider: data.to,
          });

          showDesktopNotification({
            title: '⚠️ AI Provider Fallback',
            body: switchMsg,
            tag: `provider-switch-${Date.now()}`,
          });

          fetchQuota();
          queryClient.invalidateQueries({ queryKey: queryKeys.quota.all });
        } catch (err) {
          console.warn('[SSE] Error handling provider_switch event:', err);
        }
      });

      es.addEventListener('feed_counter_update', () => {
        try {
          useAppStore.getState().fetchFeedCounter();
        } catch (err) {
          console.warn('[SSE] Error handling feed_counter_update:', err);
        }
      });

      es.addEventListener('quota_update', (e: MessageEvent) => {
        try {
          if (e.data) {
            const data = JSON.parse(e.data) as QuotaData;
            if (data && data.providers) {
              setLastEvent({ type: 'quota_update', data });
              useAppStore.setState({ quota: data, currentProvider: data.current_provider });
              queryClient.setQueryData(queryKeys.quota.all, data);
              return;
            }
          }
          fetchQuota();
          queryClient.invalidateQueries({ queryKey: queryKeys.quota.all });
        } catch {
          fetchQuota();
        }
      });

      es.onerror = () => {
        setConnected(false);
        attemptsRef.current += 1;
        setReconnectAttempts(attemptsRef.current);

        const delay = getBackoffDelay(attemptsRef.current);

        if (attemptsRef.current >= 2 && !hasShownDisconnectToastRef.current) {
          hasShownDisconnectToastRef.current = true;
          toast.warning('Live dispatch stream disconnected. Reconnecting in background...', {
            id: 'sse-disconnect-toast',
            duration: 8000,
          });
        }

        console.warn(`[SSE] Connection error. Retry attempt #${attemptsRef.current} in ${delay}ms...`);
        es.close();
        eventSourceRef.current = null;

        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [
    addOrPrependArticle,
    setCurrentProvider,
    addAlert,
    fetchQuota,
    alertThreshold,
    getBackoffDelay,
    options,
  ]);

  return { connected, reconnectAttempts, lastEvent };
}

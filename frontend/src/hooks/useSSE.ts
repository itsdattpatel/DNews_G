/**
 * frontend/src/hooks/useSSE.ts
 * Server-Sent Events subscriber with auto-reconnection and event dispatching.
 */
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Article, QuotaData } from '../types';
import { showDesktopNotification } from '../utils/notifications';

export function useSSE(): void {
  const addOrPrependArticle = useAppStore((s) => s.addOrPrependArticle);
  const setCurrentProvider = useAppStore((s) => s.setCurrentProvider);
  const addAlert = useAppStore((s) => s.addAlert);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const alertThreshold = useAppStore((s) => s.settings.alert_threshold);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log('[SSE] Connecting to /api/sse...');
      const es = new EventSource('/api/sse');
      eventSourceRef.current = es;

      es.addEventListener('connected', (e: MessageEvent) => {
        console.log('[SSE] Connected:', e.data);
      });

      es.addEventListener('heartbeat', () => {
        // Active heartbeat received
      });

      es.addEventListener('new_article', async (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as { article_id?: number };
          if (payload.article_id) {
            const res = await fetch(`/api/articles/${payload.article_id}`);
            if (res.ok) {
              const article = (await res.json()) as Article;
              addOrPrependArticle(article);

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

      // Real-time breaking dispatches and cluster alerts (Phase 6: P6-03, P6-04, P6-06)
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

          addAlert({
            type: 'breaking',
            message: payload.message,
            article_id: payload.article_id,
            cluster_id: payload.cluster_id ?? undefined,
            breaking_score: payload.breaking_score,
          });

          // Trigger Desktop Notification (P6-04)
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
        } catch (err) {
          console.warn('[SSE] Error handling provider_switch event:', err);
        }
      });

      // Live Quota Meter updates (P6-07)
      es.addEventListener('quota_update', (e: MessageEvent) => {
        try {
          if (e.data) {
            const data = JSON.parse(e.data) as QuotaData;
            if (data && data.providers) {
              useAppStore.setState({ quota: data, currentProvider: data.current_provider });
              return;
            }
          }
          fetchQuota();
        } catch {
          fetchQuota();
        }
      });

      es.onerror = () => {
        console.warn('[SSE] Connection lost. Reconnecting in 3s...');
        es.close();
        eventSourceRef.current = null;
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [addOrPrependArticle, setCurrentProvider, addAlert, fetchQuota, alertThreshold]);
}

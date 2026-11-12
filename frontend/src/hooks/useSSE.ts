/**
 * frontend/src/hooks/useSSE.ts
 * Single resilient Server-Sent Events connection feeding a typed event bus (`sseBus`),
 * bounded ID deduplication, `Last-Event-ID` / `?since=` cursor replay across reconnects,
 * sleep/wake resync, cross-tab BroadcastChannel sync, and configurable batched UI flushing.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '../store/useAppStore';
import type { Article, QuotaData, SSEEvent } from '../types';
import { showDesktopNotification } from '../utils/notifications';
import {
  CappedIdSet,
  sseBus,
  subscribeCrossTabSync,
  type SseBusEventMap,
} from '../lib/sseBus';

interface UseSSEOptions {
  onNewArticle?: (article: Article) => void;
  onAlert?: (alert: SseBusEventMap['alert']) => void;
}

const DEFAULT_BATCH_INTERVAL_SEC = 5;
const MIN_BATCH_INTERVAL_SEC = 2;
const MAX_BATCH_INTERVAL_SEC = 30;
const EXTENDED_GAP_RESYNC_MS = 15_000;
const MAX_ARTICLE_FETCHES_PER_BATCH = 25;

export function clampLiveRefreshMs(seconds?: number): number {
  const num = typeof seconds === 'number' && !Number.isNaN(seconds) ? seconds : DEFAULT_BATCH_INTERVAL_SEC;
  return Math.min(MAX_BATCH_INTERVAL_SEC, Math.max(MIN_BATCH_INTERVAL_SEC, num)) * 1000;
}

interface PendingBatchQueue {
  articles: Map<number, 'new' | 'update'>;
  clusters: Map<number, SseBusEventMap['cluster_update']>;
  alerts: SseBusEventMap['alert'][];
  providerSwitches: SseBusEventMap['provider_switch'][];
  quotaUpdate: SseBusEventMap['quota_update'] | null;
  controlRoomEvents: SseBusEventMap['control_room_update'][];
  systemErrors: SseBusEventMap['system_error'][];
  tvUpdates: SseBusEventMap['tv_health_update'][];
  watchlistUpdates: SseBusEventMap['watchlist_update'][];
}

function createEmptyBatchQueue(): PendingBatchQueue {
  return {
    articles: new Map(),
    clusters: new Map(),
    alerts: [],
    providerSwitches: [],
    quotaUpdate: null,
    controlRoomEvents: [],
    systemErrors: [],
    tvUpdates: [],
    watchlistUpdates: [],
  };
}

export function useSSE(options?: UseSSEOptions): {
  connected: boolean;
  reconnectAttempts: number;
  lastEvent: SSEEvent | null;
} {
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const optionsRef = useRef<UseSSEOptions | undefined>(options);
  optionsRef.current = options;

  const liveRefreshSec = useAppStore((s) => s.settings.live_refresh_interval_sec ?? DEFAULT_BATCH_INTERVAL_SEC);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchIntervalMsRef = useRef<number>(clampLiveRefreshMs(liveRefreshSec));
  const attemptsRef = useRef(0);
  const lastEventIdRef = useRef(0);
  const disconnectedAtRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const hasShownDisconnectToastRef = useRef(false);
  const seenFrameIdsRef = useRef<CappedIdSet>(new CappedIdSet(2000));
  const batchQueueRef = useRef<PendingBatchQueue>(createEmptyBatchQueue());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    batchIntervalMsRef.current = clampLiveRefreshMs(liveRefreshSec);
  }, [liveRefreshSec]);

  useEffect(() => {
    let isMounted = true;
    let isFlushing = false;

    const getBackoffDelay = (attempt: number): number => {
      return Math.min(1000 * Math.pow(2, Math.max(0, attempt - 1)), 30_000);
    };

    const recordFrameId = (eventType: string, e: MessageEvent): boolean => {
      if (e.lastEventId) {
        const numericId = parseInt(e.lastEventId, 10);
        if (!Number.isNaN(numericId) && numericId > 0) {
          if (numericId > lastEventIdRef.current) {
            lastEventIdRef.current = numericId;
            useAppStore.getState().setSseConnectionState({ lastEventId: numericId });
          }
          const dedupeKey = `${eventType}:${numericId}`;
          if (seenFrameIdsRef.current.has(dedupeKey)) {
            return false; // duplicate replayed frame
          }
          seenFrameIdsRef.current.add(dedupeKey);
        }
      }
      return true;
    };

    async function flushBatch() {
      if (!isMounted || isFlushing) return;
      const q = batchQueueRef.current;
      const hasWork =
        q.articles.size > 0 ||
        q.clusters.size > 0 ||
        q.alerts.length > 0 ||
        q.providerSwitches.length > 0 ||
        q.quotaUpdate !== null ||
        q.controlRoomEvents.length > 0 ||
        q.systemErrors.length > 0 ||
        q.tvUpdates.length > 0 ||
        q.watchlistUpdates.length > 0;

      if (!hasWork) return;

      isFlushing = true;
      // Swap out queue atomically before async work
      batchQueueRef.current = createEmptyBatchQueue();

      try {
        const store = useAppStore.getState();

        // 1. Batch-fetch new/updated articles & apply in ONE Zustand commit
        if (q.articles.size > 0) {
          const entries = Array.from(q.articles.entries());
          if (entries.length > MAX_ARTICLE_FETCHES_PER_BATCH) {
            await store.performFullResync('article_burst');
          } else {
            const fetched = await Promise.all(
              entries.map(async ([articleId, kind]) => {
                try {
                  const res = await fetch(`/api/articles/${articleId}`);
                  if (!res.ok) return null;
                  const article = (await res.json()) as Article;
                  return { article, kind };
                } catch {
                  return null;
                }
              }),
            );

            const validArticles: Article[] = [];
            for (const item of fetched) {
              if (!item) continue;
              validArticles.push(item.article);
              if (item.kind === 'new') {
                optionsRef.current?.onNewArticle?.(item.article);
                sseBus.emit('new_article', { article_id: item.article.id, article: item.article });
              } else {
                sseBus.emit('article_updated', { article_id: item.article.id, article: item.article });
              }
            }

            if (validArticles.length > 0 && isMounted) {
              useAppStore.getState().applyLiveArticlesBatch(validArticles);
              useAppStore.getState().fetchCategoryCounts();
            }
          }
        }

        // 2. Clusters
        for (const clusterPayload of q.clusters.values()) {
          sseBus.emit('cluster_update', clusterPayload);
        }

        // 3. Alerts (toast, bell count & event bus)
        if (q.alerts.length > 0) {
          for (const alertPayload of q.alerts) {
            store.addAlert({
              type: alertPayload.type ?? 'breaking',
              message: alertPayload.message,
              article_id: alertPayload.article_id,
              cluster_id: alertPayload.cluster_id ?? undefined,
              breaking_score: alertPayload.breaking_score,
            });
            optionsRef.current?.onAlert?.(alertPayload);
            sseBus.emit('alert', alertPayload);

            showDesktopNotification({
              title: 'AI World News Desk — Breaking Dispatch',
              body: alertPayload.message,
              tag: `alert-${alertPayload.id || Date.now()}`,
              onClick: () => {
                if (alertPayload.article_id) {
                  useAppStore.getState().selectArticleById(alertPayload.article_id);
                }
              },
            });
          }
          useAppStore.getState().fetchUnreadAlertsCount();
        }

        // 4. Provider switches
        for (const sw of q.providerSwitches) {
          if (sw.to && sw.to !== 'next') {
            store.setCurrentProvider(sw.to);
          }
          const switchMsg = `switched from ${sw.from.toUpperCase()} to ${sw.to.toUpperCase()} (${sw.reason})`;
          store.addAlert({
            type: 'provider_switch',
            message: switchMsg,
            fromProvider: sw.from,
            toProvider: sw.to,
          });
          sseBus.emit('provider_switch', sw);
          store.fetchQuota();
        }

        // 5. Quota update (apply directly if full providers present, else fetch)
        if (q.quotaUpdate) {
          if (q.quotaUpdate.providers) {
            const existingQuota = useAppStore.getState().quota;
            const nextQuota: QuotaData = {
              current_provider:
                (q.quotaUpdate as any).current_provider ??
                existingQuota?.current_provider ??
                useAppStore.getState().currentProvider,
              providers: q.quotaUpdate.providers as QuotaData['providers'],
            };
            useAppStore.setState({ quota: nextQuota, currentProvider: nextQuota.current_provider });
          } else {
            store.fetchQuota();
          }
          sseBus.emit('quota_update', q.quotaUpdate);
        }

        // 6. Control room & system errors
        for (const cr of q.controlRoomEvents) {
          sseBus.emit('control_room_update', cr);
        }
        for (const sysErr of q.systemErrors) {
          sseBus.emit('system_error', sysErr);
          useAppStore.getState().fetchSystemHealth();
        }
        if (q.controlRoomEvents.length > 0 && q.systemErrors.length === 0) {
          useAppStore.getState().fetchSystemHealth();
        }

        // 7. TV Health & Watchlist updates
        for (const tvEvt of q.tvUpdates) {
          sseBus.emit('tv_health_update', tvEvt);
        }
        for (const wlEvt of q.watchlistUpdates) {
          sseBus.emit('watchlist_update', wlEvt);
        }
      } finally {
        isFlushing = false;
      }
    }

    function scheduleNextFlush() {
      if (!isMounted) return;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(async () => {
        await flushBatch();
        scheduleNextFlush();
      }, batchIntervalMsRef.current);
    }

    function connect() {
      if (!isMounted) return;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const cursor = lastEventIdRef.current;
      const url = cursor > 0 ? `/api/sse?since=${cursor}` : '/api/sse';
      const es = new EventSource(url);
      eventSourceRef.current = es;
      useAppStore.getState().setSseConnectionState({
        status: attemptsRef.current > 0 ? 'reconnecting' : 'connecting',
      });

      es.addEventListener('connected', (e: MessageEvent) => {
        if (!isMounted) return;
        const wasReconnecting = attemptsRef.current > 0;
        const gapMs = disconnectedAtRef.current ? Date.now() - disconnectedAtRef.current : 0;

        setConnected(true);
        attemptsRef.current = 0;
        setReconnectAttempts(0);
        disconnectedAtRef.current = null;
        useAppStore.getState().setSseConnectionState({
          status: 'connected',
          reconnectAttempts: 0,
        });

        try {
          const payload = e.data ? (JSON.parse(e.data) as { clientId?: string; latestEventId?: number }) : {};
          if (typeof payload.latestEventId === 'number' && lastEventIdRef.current === 0) {
            lastEventIdRef.current = payload.latestEventId;
            useAppStore.getState().setSseConnectionState({ lastEventId: payload.latestEventId });
          }
          sseBus.emit('connected', payload);
        } catch {
          sseBus.emit('connected', {});
        }

        if (wasReconnecting && hasShownDisconnectToastRef.current) {
          toast.success('Live wire connection restored');
          hasShownDisconnectToastRef.current = false;
        }

        if (wasReconnecting && gapMs >= EXTENDED_GAP_RESYNC_MS) {
          useAppStore.getState().performFullResync('reconnect_gap');
        }
      });

      es.addEventListener('heartbeat', () => {
        if (!isMounted) return;
        setConnected(true);
        attemptsRef.current = 0;
        setReconnectAttempts(0);
        disconnectedAtRef.current = null;
        useAppStore.getState().setSseConnectionState({
          status: 'connected',
          reconnectAttempts: 0,
        });
        setLastEvent({ type: 'heartbeat' });
        sseBus.emit('heartbeat', {});
      });

      es.addEventListener('resync_required', (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : { reason: 'cursor_expired' };
          setLastEvent({ type: 'resync_required', data: payload });
          if (typeof payload.latestId === 'number') {
            lastEventIdRef.current = payload.latestId;
            useAppStore.getState().setSseConnectionState({ lastEventId: payload.latestId });
          }
          sseBus.emit('resync_required', payload);
          useAppStore.getState().performFullResync(payload.reason || 'resync_required');
        } catch (err) {
          console.warn('[SSE] Error handling resync_required:', err);
        }
      });

      // Immediate non-layout-shifting telemetry & sync events
      es.addEventListener('feed_counter_update', (e: MessageEvent) => {
        if (!recordFrameId('feed_counter_update', e)) return;
        useAppStore.getState().fetchFeedCounter();
        sseBus.emit('feed_counter_update', {});
      });

      es.addEventListener('session_gap_update', (e: MessageEvent) => {
        if (!recordFrameId('session_gap_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          useAppStore.getState().applySessionGapUpdate(payload);
          sseBus.emit('session_gap_update', payload);
        } catch (err) {
          console.warn('[SSE] Error handling session_gap_update:', err);
        }
      });

      es.addEventListener('settings_update', (e: MessageEvent) => {
        if (!recordFrameId('settings_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          if (payload.settings) {
            useAppStore.getState().applySettingsFromRemote(payload.settings);
            sseBus.emit('settings_update', payload);
          }
        } catch (err) {
          console.warn('[SSE] Error handling settings_update:', err);
        }
      });

      es.addEventListener('bookmark_update', (e: MessageEvent) => {
        if (!recordFrameId('bookmark_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          if (typeof payload.article_id === 'number' && typeof payload.bookmarked === 'boolean') {
            useAppStore.getState().applyBookmarkUpdate(payload.article_id, payload.bookmarked);
            sseBus.emit('bookmark_update', payload);
          }
        } catch (err) {
          console.warn('[SSE] Error handling bookmark_update:', err);
        }
      });

      es.addEventListener('alert_acknowledged', (e: MessageEvent) => {
        if (!recordFrameId('alert_acknowledged', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          useAppStore.getState().fetchUnreadAlertsCount();
          sseBus.emit('alert_acknowledged', payload);
        } catch (err) {
          console.warn('[SSE] Error handling alert_acknowledged:', err);
        }
      });

      // Batched domain events
      es.addEventListener('new_article', (e: MessageEvent) => {
        if (!recordFrameId('new_article', e)) return;
        try {
          const payload = JSON.parse(e.data) as { article_id?: number };
          if (payload.article_id) {
            setLastEvent({ type: 'new_article', article_id: payload.article_id });
            batchQueueRef.current.articles.set(payload.article_id, 'new');
          }
        } catch (err) {
          console.warn('[SSE] Error queueing new_article:', err);
        }
      });

      es.addEventListener('article_updated', (e: MessageEvent) => {
        if (!recordFrameId('article_updated', e)) return;
        try {
          const payload = JSON.parse(e.data) as { article_id?: number };
          if (payload.article_id) {
            setLastEvent({ type: 'article_updated', data: payload });
            if (!batchQueueRef.current.articles.has(payload.article_id)) {
              batchQueueRef.current.articles.set(payload.article_id, 'update');
            }
          }
        } catch (err) {
          console.warn('[SSE] Error queueing article_updated:', err);
        }
      });

      es.addEventListener('article_enriched_pass2', (e: MessageEvent) => {
        if (!recordFrameId('article_enriched_pass2', e)) return;
        try {
          const payload = JSON.parse(e.data) as { article_id?: number };
          if (payload.article_id) {
            setLastEvent({ type: 'article_enriched_pass2', data: payload });
            if (!batchQueueRef.current.articles.has(payload.article_id)) {
              batchQueueRef.current.articles.set(payload.article_id, 'update');
            }
          }
        } catch (err) {
          console.warn('[SSE] Error queueing article_enriched_pass2:', err);
        }
      });

      es.addEventListener('cluster_update', (e: MessageEvent) => {
        if (!recordFrameId('cluster_update', e)) return;
        try {
          const payload = JSON.parse(e.data) as SseBusEventMap['cluster_update'];
          setLastEvent({
            type: 'cluster_update',
            cluster_id: payload.cluster_id,
            outlet_count: payload.outlet_count ?? 1,
          });
          if (payload.cluster_id) {
            batchQueueRef.current.clusters.set(payload.cluster_id, payload);
          }
          if (payload.article_id && !batchQueueRef.current.articles.has(payload.article_id)) {
            batchQueueRef.current.articles.set(payload.article_id, 'update');
          }
        } catch (err) {
          console.warn('[SSE] Error queueing cluster_update:', err);
        }
      });

      es.addEventListener('alert', (e: MessageEvent) => {
        if (!recordFrameId('alert', e)) return;
        try {
          const payload = JSON.parse(e.data) as SseBusEventMap['alert'];
          setLastEvent({
            type: 'alert',
            alert: {
              id: payload.id ?? Date.now(),
              type: payload.type ?? 'breaking',
              message: payload.message,
              cluster_id: payload.cluster_id ?? null,
              fired_at: new Date().toISOString(),
              acknowledged: false,
            },
          });
          batchQueueRef.current.alerts.push(payload);
        } catch (err) {
          console.warn('[SSE] Error queueing alert:', err);
        }
      });

      es.addEventListener('provider_switch', (e: MessageEvent) => {
        if (!recordFrameId('provider_switch', e)) return;
        try {
          const payload = JSON.parse(e.data) as SseBusEventMap['provider_switch'];
          setLastEvent({ type: 'provider_switch', ...payload });
          batchQueueRef.current.providerSwitches.push(payload);
        } catch (err) {
          console.warn('[SSE] Error queueing provider_switch:', err);
        }
      });

      es.addEventListener('quota_update', (e: MessageEvent) => {
        if (!recordFrameId('quota_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          batchQueueRef.current.quotaUpdate = payload;
        } catch {
          batchQueueRef.current.quotaUpdate = {};
        }
      });

      es.addEventListener('control_room_update', (e: MessageEvent) => {
        if (!recordFrameId('control_room_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          setLastEvent({ type: 'control_room_update', data: payload });
          batchQueueRef.current.controlRoomEvents.push(payload);
        } catch (err) {
          console.warn('[SSE] Error queueing control_room_update:', err);
        }
      });

      es.addEventListener('system_error', (e: MessageEvent) => {
        if (!recordFrameId('system_error', e)) return;
        try {
          const payload = JSON.parse(e.data);
          setLastEvent({ type: 'system_error', data: payload });
          batchQueueRef.current.systemErrors.push(payload);
        } catch (err) {
          console.warn('[SSE] Error queueing system_error:', err);
        }
      });

      es.addEventListener('tv_health_update', (e: MessageEvent) => {
        if (!recordFrameId('tv_health_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          setLastEvent({ type: 'tv_health_update', data: payload });
          batchQueueRef.current.tvUpdates.push(payload);
        } catch (err) {
          console.warn('[SSE] Error queueing tv_health_update:', err);
        }
      });

      es.addEventListener('watchlist_update', (e: MessageEvent) => {
        if (!recordFrameId('watchlist_update', e)) return;
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          setLastEvent({ type: 'watchlist_update', data: payload });
          batchQueueRef.current.watchlistUpdates.push(payload);
        } catch (err) {
          console.warn('[SSE] Error queueing watchlist_update:', err);
        }
      });

      es.onerror = () => {
        if (!isMounted) return;
        setConnected(false);
        if (!disconnectedAtRef.current) {
          disconnectedAtRef.current = Date.now();
        }
        attemptsRef.current += 1;
        setReconnectAttempts(attemptsRef.current);
        useAppStore.getState().setSseConnectionState({
          status: 'reconnecting',
          reconnectAttempts: attemptsRef.current,
        });

        const delay = getBackoffDelay(attemptsRef.current);

        if (attemptsRef.current >= 2 && !hasShownDisconnectToastRef.current) {
          hasShownDisconnectToastRef.current = true;
          toast.warning('Live dispatch stream disconnected. Reconnecting in background...', {
            id: 'sse-disconnect-toast',
            duration: 8000,
          });
        }

        es.close();
        eventSourceRef.current = null;

        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    }

    connect();
    scheduleNextFlush();

    // Sleep / wake & network online recovery
    const handleVisibilityChange = () => {
      if (!isMounted) return;
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenDurationMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;

      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        connect();
      }
      if (hiddenDurationMs >= EXTENDED_GAP_RESYNC_MS) {
        useAppStore.getState().performFullResync('visibility_wake');
      }
    };

    const handleOnline = () => {
      if (!isMounted) return;
      connect();
      useAppStore.getState().performFullResync('online');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Cross-tab BroadcastChannel listener
    const unsubscribeCrossTab = subscribeCrossTabSync((msg) => {
      if (!isMounted) return;
      const store = useAppStore.getState();
      switch (msg.type) {
        case 'settings_update':
          store.applySettingsFromRemote(msg.settings);
          sseBus.emit('settings_update', {
            settings: msg.settings,
            ...(msg.updatedKeys ? { updatedKeys: msg.updatedKeys } : {}),
          });
          break;
        case 'bookmark_update':
          store.applyBookmarkUpdate(msg.article_id, msg.bookmarked);
          sseBus.emit('bookmark_update', {
            article_id: msg.article_id,
            bookmarked: msg.bookmarked,
          });
          break;
        case 'alert_acknowledged':
          store.fetchUnreadAlertsCount();
          sseBus.emit('alert_acknowledged', {
            ...(msg.id !== undefined ? { id: msg.id } : {}),
            ...(msg.all !== undefined ? { all: msg.all } : {}),
          });
          break;
        case 'watchlist_update':
          sseBus.emit('watchlist_update', {
            action: msg.action,
            item: msg.item,
            ...(msg.deleted_id !== undefined ? { deleted_id: msg.deleted_id } : {}),
          });
          break;
        case 'session_gap_update':
          store.applySessionGapUpdate(msg.status);
          sseBus.emit('session_gap_update', msg.status);
          break;
      }
    });

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      unsubscribeCrossTab();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      batchQueueRef.current = createEmptyBatchQueue();
    };
  }, []);

  return { connected, reconnectAttempts, lastEvent };
}

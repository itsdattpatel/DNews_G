/**
 * frontend/src/lib/sseBus.ts
 * Typed singleton pub/sub event bus, bounded event-ID deduper,
 * and cross-tab BroadcastChannel bridge for real-time Main Desk coordination.
 */
import type {
  AppSettings,
  AlertItem,
  QuotaData,
  StartupStatus,
  SystemErrorRecord,
} from '../types';

export interface SseResyncPayload {
  reason: 'cursor_expired' | 'server_restarted' | 'reconnect_gap' | 'manual' | 'visibility_wake' | 'online';
  earliestAvailableId?: number;
  latestId?: number;
}

export interface SseBusEventMap {
  connected: { clientId?: string; latestEventId?: number };
  heartbeat: { ts?: string };
  resync_required: SseResyncPayload;
  resync: { reason: string; timestamp: string };
  new_article: { article_id: number; article?: any };
  article_updated: { article_id: number; article?: any };
  article_enriched_pass2: { article_id: number; article?: any };
  cluster_update: {
    cluster_id: number;
    outlet_count?: number;
    country_count?: number;
    is_breaking?: boolean;
    headline?: string;
    article_id?: number;
  };
  alert: {
    id?: number;
    type?: AlertItem['type'];
    message: string;
    article_id?: number;
    cluster_id?: number | null;
    breaking_score?: number;
  };
  alert_acknowledged: { id?: number; all?: boolean };
  provider_switch: { from: string; to: string; reason: string };
  quota_update: Partial<QuotaData> & { provider?: string };
  control_room_update: Record<string, unknown>;
  system_error: SystemErrorRecord;
  feed_counter_update: Record<string, unknown>;
  tv_health_update: {
    action?: string;
    channel_id?: number;
    is_alive?: boolean;
    latency_ms?: number;
    method?: string;
    channel?: any;
  };
  watchlist_update: { action: string; item?: any; deleted_id?: number };
  settings_update: { updatedKeys?: string[]; settings: Partial<AppSettings> };
  bookmark_update: { article_id: number; bookmarked: boolean };
  session_gap_update: Partial<StartupStatus>;
  library_history_update: { action: 'created' | 'updated'; record: any };
  library_wisdom_update: { kind: 'verse' | 'quote'; action: 'created' | 'updated'; record: any };
  library_mind_update: { action: 'created' | 'updated'; record: any };
  library_bookmark_update: {
    action: 'created' | 'deleted';
    bookmark_id?: number;
    item_type: 'history' | 'verse' | 'quote' | 'mind';
    item_id: number;
    bookmark?: any;
  };
  library_refresh_status: {
    status: 'idle' | 'running' | 'completed' | 'error';
    last_run_at: string | null;
    next_run_at: string | null;
    added: number;
    total_cached: number;
    month_day: string;
    error: string | null;
  };
  library_resync: { reason: string; timestamp: string };
  library_theme_update: { theme: 'day' | 'night' };
  connectivity_change: { online: boolean; checkedAt: string };
}

export type SseBusEventName = keyof SseBusEventMap;
export type SseBusHandler<K extends SseBusEventName> = (payload: SseBusEventMap[K]) => void;

export class CappedIdSet {
  private readonly maxSize: number;
  private readonly items: Map<string, number> = new Map();

  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  add(id: string): boolean {
    if (this.items.has(id)) return false;
    this.items.set(id, Date.now());
    if (this.items.size > this.maxSize) {
      const oldestKey = this.items.keys().next().value;
      if (oldestKey !== undefined) {
        this.items.delete(oldestKey);
      }
    }
    return true;
  }

  get size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }
}

class TypedSseBus {
  private listeners = new Map<SseBusEventName, Set<(payload: any) => void>>();

  subscribe<K extends SseBusEventName>(event: K, handler: SseBusHandler<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  subscribeMany(events: SseBusEventName[], handler: (event: SseBusEventName, payload: any) => void): () => void {
    const unsubs = events.map((ev) => this.subscribe(ev, (payload) => handler(ev, payload)));
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }

  emit<K extends SseBusEventName>(event: K, payload: SseBusEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    // Iterate snapshot in case a handler unsubscribes during dispatch
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.warn(`[sseBus] Subscriber error for "${String(event)}":`, err);
      }
    }
  }

  getListenerCount(event?: SseBusEventName): number {
    if (event) return this.listeners.get(event)?.size ?? 0;
    let total = 0;
    for (const set of this.listeners.values()) {
      total += set.size;
    }
    return total;
  }

  clearAllListeners(): void {
    this.listeners.clear();
  }
}

export const sseBus = new TypedSseBus();

// ─── Cross-Tab Sync (BroadcastChannel + localStorage fallback) ─────────────────
const SYNC_CHANNEL_NAME = 'ai-world-news-desk-sync';
const STORAGE_FALLBACK_KEY = 'ai_world_news_desk_crosstab_evt';
export const CURRENT_TAB_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type CrossTabMessage =
  | { type: 'settings_update'; settings: Partial<AppSettings>; updatedKeys?: string[]; tabId: string }
  | { type: 'bookmark_update'; article_id: number; bookmarked: boolean; tabId: string }
  | { type: 'alert_acknowledged'; id?: number; all?: boolean; tabId: string }
  | { type: 'watchlist_update'; action: string; item?: any; deleted_id?: number; tabId: string }
  | { type: 'session_gap_update'; status: Partial<StartupStatus>; tabId: string }
  | {
      type: 'library_bookmark_update';
      action: 'created' | 'deleted';
      bookmark_id?: number;
      item_type: 'history' | 'verse' | 'quote' | 'mind';
      item_id: number;
      bookmark?: any;
      tabId: string;
    }
  | { type: 'library_wisdom_update'; kind: 'verse' | 'quote'; action: 'created' | 'updated'; record: any; tabId: string }
  | { type: 'library_history_update'; action: 'created' | 'updated'; record: any; tabId: string }
  | { type: 'library_mind_update'; action: 'created' | 'updated'; record: any; tabId: string }
  | { type: 'library_theme_update'; theme: 'day' | 'night'; tabId: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

let sharedBroadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!sharedBroadcastChannel) {
    try {
      sharedBroadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return sharedBroadcastChannel;
}

export function postCrossTabSync(msg: DistributiveOmit<CrossTabMessage, 'tabId'>): void {
  if (typeof window === 'undefined') return;
  const fullMsg = { ...msg, tabId: CURRENT_TAB_ID } as CrossTabMessage;
  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage(fullMsg);
    } catch {
      // Ignore closed channel errors
    }
  }
  try {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify({ ...fullMsg, _ts: Date.now() }));
  } catch {
    // Ignore storage quota / disabled storage errors
  }
}

export function subscribeCrossTabSync(handler: (msg: CrossTabMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const bc = getBroadcastChannel();

  const onMessage = (ev: MessageEvent<CrossTabMessage>) => {
    const data = ev.data;
    if (!data || data.tabId === CURRENT_TAB_ID) return;
    handler(data);
  };

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== STORAGE_FALLBACK_KEY || !ev.newValue) return;
    try {
      const parsed = JSON.parse(ev.newValue) as CrossTabMessage;
      if (!parsed || parsed.tabId === CURRENT_TAB_ID) return;
      handler(parsed);
    } catch {
      // ignore malformed storage event
    }
  };

  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);

  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}

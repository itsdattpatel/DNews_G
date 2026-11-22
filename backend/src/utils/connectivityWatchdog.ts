/**
 * backend/src/utils/connectivityWatchdog.ts
 * Offline Resilience & 15-Second Connectivity Watchdog (PRD E Category 5).
 *
 * Monitors internet reachability. When disconnected:
 * - Suspends outbound scraping jobs in scheduler.ts.
 * - Re-checks connectivity every 15 seconds with a 3-second timeout.
 * - Broadcasts connectivity_change SSE events to the frontend.
 * - Automatically resumes scraping and initiates a catch-up cycle upon reconnection.
 */
import net from 'net';
import dns from 'dns';
import http from 'http';
import { emitSseEvent } from '../routes/sse';

export interface WatchdogConfig {
  offlineCheckIntervalMs?: number;
  onlineCheckIntervalMs?: number;
  checkTimeoutMs?: number;
  probeHost?: string;
  probePort?: number;
}

export class ConnectivityWatchdog {
  private isOnline: boolean = true;
  private offlineCheckIntervalMs: number = 15_000; // 15 seconds when offline
  private onlineCheckIntervalMs: number = 60_000;  // 60 seconds baseline when online
  private checkTimeoutMs: number = 3_000;         // 3 seconds timeout
  private probeHost: string = '1.1.1.1';          // Cloudflare public DNS
  private probePort: number = 53;                 // DNS port (TCP)
  private timer: NodeJS.Timeout | null = null;
  private listeners: Set<(online: boolean) => void> = new Set();
  private lastCheckedAt: string | null = null;
  private isChecking: boolean = false;
  private isMocked: boolean = false;
  private mockedState: boolean = true;

  constructor(config?: WatchdogConfig) {
    if (config?.offlineCheckIntervalMs) this.offlineCheckIntervalMs = config.offlineCheckIntervalMs;
    if (config?.onlineCheckIntervalMs) this.onlineCheckIntervalMs = config.onlineCheckIntervalMs;
    if (config?.checkTimeoutMs) this.checkTimeoutMs = config.checkTimeoutMs;
    if (config?.probeHost) this.probeHost = config.probeHost;
    if (config?.probePort) this.probePort = config.probePort;
  }

  /**
   * Starts periodic connectivity watchdog monitoring.
   */
  public start(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Schedule periodic check
    const interval = this.isOnline ? this.onlineCheckIntervalMs : this.offlineCheckIntervalMs;
    this.timer = setInterval(() => {
      void this.checkConnectivity();
    }, interval);

    // Initial immediate probe
    void this.checkConnectivity();
    console.log(`[ConnectivityWatchdog] Started (checking every ${this.offlineCheckIntervalMs / 1000}s when offline)`);
  }

  /**
   * Stops the periodic timer.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[ConnectivityWatchdog] Stopped');
  }

  /**
   * Returns current online status.
   */
  public isCurrentlyOnline(): boolean {
    if (this.isMocked) {
      return this.mockedState;
    }
    return this.isOnline;
  }

  /**
   * Subscribes a listener to connectivity status changes.
   * Returns an unsubscribe function.
   */
  public onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Probes network reachability using low-overhead TCP socket connection,
   * falling back to DNS resolution.
   */
  private async probeNetwork(): Promise<boolean> {
    if (this.isMocked) {
      return this.mockedState;
    }

    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const finish = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(result);
        }
      };

      const socket = new net.Socket();
      socket.setTimeout(this.checkTimeoutMs);

      socket.on('connect', () => {
        finish(true);
      });

      const tryHttpFallback = () => {
        try {
          const req = http.get('http://www.google.com/generate_204', { timeout: 2000 }, (res) => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
              finish(true);
            } else {
              finish(false);
            }
          });
          req.on('error', () => finish(false));
          req.on('timeout', () => {
            req.destroy();
            finish(false);
          });
        } catch {
          finish(false);
        }
      };

      socket.on('timeout', () => {
        // Fallback to DNS resolve attempt before declaring offline
        dns.resolve('cloudflare.com', (err) => {
          if (!err) {
            finish(true);
          } else {
            tryHttpFallback();
          }
        });
      });

      socket.on('error', () => {
        dns.resolve('cloudflare.com', (err) => {
          if (!err) {
            finish(true);
          } else {
            tryHttpFallback();
          }
        });
      });

      try {
        socket.connect(this.probePort, this.probeHost);
      } catch {
        finish(false);
      }
    });
  }

  /**
   * Checks network connectivity, updates state, emits SSE, and notifies listeners.
   */
  public async checkConnectivity(): Promise<boolean> {
    if (this.isChecking) {
      return this.isOnline;
    }

    this.isChecking = true;
    try {
      const probeResult = await this.probeNetwork();
      const previousState = this.isOnline;
      this.isOnline = probeResult;
      this.lastCheckedAt = new Date().toISOString();

      if (previousState !== probeResult) {
        console.log(`[ConnectivityWatchdog] Connectivity changed: ${previousState ? 'ONLINE' : 'OFFLINE'} -> ${probeResult ? 'ONLINE' : 'OFFLINE'}`);

        // Notify in-process listeners
        for (const listener of this.listeners) {
          try {
            listener(probeResult);
          } catch (err) {
            console.error('[ConnectivityWatchdog] Error in listener callback:', err);
          }
        }

        // Broadcast to frontend via SSE
        try {
          emitSseEvent('connectivity_change', {
            online: probeResult,
            checkedAt: this.lastCheckedAt,
          });
        } catch (err) {
          console.warn('[ConnectivityWatchdog] Error emitting SSE event:', err);
        }

        // Reschedule watchdog with appropriate interval
        if (this.timer) {
          clearInterval(this.timer);
          const interval = probeResult ? this.onlineCheckIntervalMs : this.offlineCheckIntervalMs;
          this.timer = setInterval(() => {
            void this.checkConnectivity();
          }, interval);
        }

        // If newly back online, trigger catchup fetch cycle immediately
        if (!previousState && probeResult) {
          console.log('[ConnectivityWatchdog] Connection restored! Triggering immediate catch-up sync...');
          import('../fetch/scheduler')
            .then((scheduler) => scheduler.triggerManualFetchCycle())
            .catch((err) => console.error('[ConnectivityWatchdog] Error triggering catch-up cycle:', err));
        }
      }

      return this.isOnline;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Forces an immediate connectivity check.
   */
  public async forceCheck(): Promise<boolean> {
    return this.checkConnectivity();
  }

  /**
   * Allows unit tests to mock online/offline states without network calls.
   */
  public setMockedState(online: boolean | null): void {
    if (online === null) {
      this.isMocked = false;
    } else {
      this.isMocked = true;
      this.mockedState = online;
      const prev = this.isOnline;
      this.isOnline = online;
      this.lastCheckedAt = new Date().toISOString();
      if (prev !== online) {
        for (const listener of this.listeners) {
          listener(online);
        }
        try {
          emitSseEvent('connectivity_change', {
            online,
            checkedAt: this.lastCheckedAt,
          });
        } catch {
          // ignore in tests
        }
      }
    }
  }

  /**
   * Returns current watchdog telemetry metrics.
   */
  public getMetrics() {
    return {
      isOnline: this.isCurrentlyOnline(),
      lastCheckedAt: this.lastCheckedAt,
      offlineCheckIntervalMs: this.offlineCheckIntervalMs,
      onlineCheckIntervalMs: this.onlineCheckIntervalMs,
      checkTimeoutMs: this.checkTimeoutMs,
      probeTarget: `${this.probeHost}:${this.probePort}`,
    };
  }
}

// Singleton instance
let _instance: ConnectivityWatchdog | null = null;

export function getConnectivityWatchdog(config?: WatchdogConfig): ConnectivityWatchdog {
  if (!_instance) {
    _instance = new ConnectivityWatchdog(config);
  }
  return _instance;
}

export function resetConnectivityWatchdogForTest(): void {
  if (_instance) {
    _instance.stop();
    _instance = null;
  }
}

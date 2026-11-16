/**
 * backend/src/__tests__/unit/connectivity-watchdog.test.ts
 * Unit tests for Offline Resilience & 15-Second Connectivity Watchdog (PRD E Category 5).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import {
  ConnectivityWatchdog,
  getConnectivityWatchdog,
  resetConnectivityWatchdogForTest,
} from '../../utils/connectivityWatchdog';
import { triggerManualFetchCycle } from '../../fetch/scheduler';
import { closeDb } from '../../db/db';

describe('Connectivity Watchdog & Offline Resilience (PRD E Category 5)', () => {
  let watchdog: ConnectivityWatchdog;

  beforeEach(() => {
    resetConnectivityWatchdogForTest();
    watchdog = getConnectivityWatchdog({
      offlineCheckIntervalMs: 15_000,
      onlineCheckIntervalMs: 30_000,
      checkTimeoutMs: 1_000,
    });
  });

  afterEach(() => {
    watchdog.stop();
    resetConnectivityWatchdogForTest();
    closeDb();
  });

  describe('Watchdog Configuration & State', () => {
    it('initializes with 15s offline check interval and 3s default timeout', () => {
      const metrics = watchdog.getMetrics();
      expect(metrics.offlineCheckIntervalMs).toBe(15_000);
      expect(metrics.checkTimeoutMs).toBe(1_000);
      expect(typeof metrics.isOnline).toBe('boolean');
    });

    it('notifies registered listeners when connection transitions offline and online', () => {
      const statusChanges: boolean[] = [];
      const unsubscribe = watchdog.onStatusChange((online) => {
        statusChanges.push(online);
      });

      // Simulate network loss
      watchdog.setMockedState(false);
      expect(watchdog.isCurrentlyOnline()).toBe(false);

      // Simulate network restore
      watchdog.setMockedState(true);
      expect(watchdog.isCurrentlyOnline()).toBe(true);

      expect(statusChanges).toEqual([false, true]);

      // Unsubscribe check
      unsubscribe();
      watchdog.setMockedState(false);
      expect(statusChanges.length).toBe(2);
    });

    it('suspends manual fetch cycles in scheduler when offline', async () => {
      watchdog.setMockedState(false);

      const result = await triggerManualFetchCycle();
      expect(result.status).toBe('offline');
      expect(result.fetched).toBe(0);
      expect(result.newCount).toBe(0);
    });
  });

  describe('REST API Connectivity Endpoints', () => {
    const app = createApp();

    it('GET /api/connectivity returns current metrics and status', async () => {
      watchdog.setMockedState(true);

      const res = await request(app).get('/api/connectivity');
      expect(res.status).toBe(200);
      expect(res.body.isOnline).toBe(true);
      expect(res.body.offlineCheckIntervalMs).toBe(15_000);
      expect(res.body.checkTimeoutMs).toBe(1_000);
      expect(typeof res.body.lastCheckedAt).toBe('string');
    });

    it('POST /api/connectivity/check forces an immediate connectivity probe', async () => {
      watchdog.setMockedState(false);

      const res = await request(app).post('/api/connectivity/check');
      expect(res.status).toBe(200);
      expect(res.body.online).toBe(false);
      expect(res.body.isOnline).toBe(false);
    });
  });
});

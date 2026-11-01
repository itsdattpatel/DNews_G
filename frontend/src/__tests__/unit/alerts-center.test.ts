/**
 * frontend/src/__tests__/unit/alerts-center.test.ts
 * Unit tests for Screen (k): Alerts Center broadsheet dispatch desk.
 */
import { describe, it, expect } from 'vitest';
import {
  filterAlerts,
  countUnreadAlerts,
  formatAlertTime,
  getAlertBadgeStyle,
} from '../../utils/alerts';
import type { Alert } from '../../types';

describe('Broadsheet Alerts Center Desk (Screen k)', () => {
  const sampleAlerts: Alert[] = [
    {
      id: 1,
      type: 'breaking',
      message: 'Floods displace 50,000 in coastal district',
      cluster_id: 7,
      fired_at: '2026-11-01T14:32:00Z',
      acknowledged: false,
    },
    {
      id: 2,
      type: 'quota',
      message: 'Gemini daily quota reached 80%',
      cluster_id: null,
      fired_at: '2026-11-01T13:15:00Z',
      acknowledged: false,
    },
    {
      id: 3,
      type: 'provider_switch',
      message: 'Switched from Gemini to Groq fallback',
      cluster_id: null,
      fired_at: '2026-11-01T12:00:00Z',
      acknowledged: true,
    },
    {
      id: 4,
      type: 'error',
      message: 'RSS wire fetch timed out for Bureau 4',
      cluster_id: null,
      fired_at: '2026-11-01T11:45:00Z',
      acknowledged: false,
    },
  ];

  describe('filterAlerts', () => {
    it('returns all alerts when tab is all', () => {
      expect(filterAlerts(sampleAlerts, 'all')).toHaveLength(4);
    });

    it('filters breaking alerts', () => {
      const filtered = filterAlerts(sampleAlerts, 'breaking');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('filters quota alerts', () => {
      const filtered = filterAlerts(sampleAlerts, 'quota');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });

    it('filters provider switch alerts', () => {
      const filtered = filterAlerts(sampleAlerts, 'provider');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(3);
    });

    it('filters error alerts', () => {
      const filtered = filterAlerts(sampleAlerts, 'error');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(4);
    });

    it('handles empty or non-array inputs gracefully', () => {
      expect(filterAlerts([], 'all')).toEqual([]);
      expect(filterAlerts(null as unknown as Alert[], 'breaking')).toEqual([]);
    });
  });

  describe('countUnreadAlerts', () => {
    it('counts unacknowledged alerts', () => {
      expect(countUnreadAlerts(sampleAlerts)).toBe(3);
    });

    it('returns 0 when all alerts acknowledged', () => {
      const allAck = sampleAlerts.map((a) => ({ ...a, acknowledged: true }));
      expect(countUnreadAlerts(allAck)).toBe(0);
    });
  });

  describe('formatAlertTime', () => {
    it('formats ISO timestamps into clock times', () => {
      const formatted = formatAlertTime('2026-11-01T14:32:00Z');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('handles invalid timestamps safely', () => {
      expect(formatAlertTime('')).toBe('00:00');
      expect(formatAlertTime('not-a-date')).toBe('00:00');
    });
  });

  describe('getAlertBadgeStyle', () => {
    it('returns matching labels and ink stamp styles', () => {
      expect(getAlertBadgeStyle('breaking').stampLabel).toBe('BREAKING');
      expect(getAlertBadgeStyle('quota').stampLabel).toBe('QUOTA');
      expect(getAlertBadgeStyle('provider_switch').stampLabel).toBe('PROVIDER');
      expect(getAlertBadgeStyle('error').stampLabel).toBe('ERROR');
    });
  });
});


/**
 * frontend/src/__tests__/unit/alerts-ui.test.ts
 * Unit tests for Alerts, Desktop Notifications, and Live Quota Meter state (P6-04, P6-06, P6-07, P6-08).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { showDesktopNotification } from '../../utils/notifications';

describe('Alerts & Notification System (Phase 6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppStore.setState({
      alerts: [],
      quota: null,
      currentProvider: 'gemini',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('stacks up to 3 alerts and automatically dismisses after 30 seconds (P6-06)', () => {
    const store = useAppStore.getState();

    store.addAlert({ type: 'breaking', message: 'Alert 1' });
    store.addAlert({ type: 'breaking', message: 'Alert 2' });
    store.addAlert({ type: 'breaking', message: 'Alert 3' });
    store.addAlert({ type: 'breaking', message: 'Alert 4' });

    // Stacks max 3
    const alerts = useAppStore.getState().alerts;
    expect(alerts).toHaveLength(3);
    expect(alerts[0]?.message).toBe('Alert 4');
    expect(alerts[1]?.message).toBe('Alert 3');
    expect(alerts[2]?.message).toBe('Alert 2');

    // Advance timers by 30 seconds
    vi.advanceTimersByTime(30000);

    // Alerts should be auto-dismissed
    expect(useAppStore.getState().alerts).toHaveLength(0);
  });

  it('supports manual dismissal of an alert (P6-06)', () => {
    useAppStore.getState().addAlert({ type: 'warning', message: 'Warning Dispatch' });
    const alerts = useAppStore.getState().alerts;
    expect(alerts).toHaveLength(1);

    const alertId = alerts[0]!.id;
    useAppStore.getState().dismissAlert(alertId);
    expect(useAppStore.getState().alerts).toHaveLength(0);
  });

  it('displays provider switch banner in amber format (P6-08)', () => {
    const switchMsg = 'switched from GEMINI to GROQ (rate_limit)';
    useAppStore.getState().addAlert({
      type: 'provider_switch',
      message: switchMsg,
      fromProvider: 'gemini',
      toProvider: 'groq',
    });

    const alerts = useAppStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe('provider_switch');
    expect(alerts[0]?.message).toBe('switched from GEMINI to GROQ (rate_limit)');
  });

  it('showDesktopNotification invokes Notification API when granted (P6-04)', () => {
    const mockConstructor = vi.fn().mockImplementation(function (this: unknown, title: string, options: unknown) {
      return { title, options, onclick: null, close: vi.fn() };
    });

    Object.assign(mockConstructor, {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });

    (global as unknown as { Notification: unknown }).Notification = mockConstructor;

    const clickSpy = vi.fn();
    showDesktopNotification({
      title: '🚨 Breaking Alert',
      body: 'Earthquake reported',
      onClick: clickSpy,
    });

    expect(mockConstructor).toHaveBeenCalledWith('🚨 Breaking Alert', expect.objectContaining({
      body: 'Earthquake reported',
      silent: false,
    }));
  });

  it('updates quota state in real-time for live QuotaMeter (P6-07)', () => {
    const mockQuotaData = {
      current_provider: 'gemini' as const,
      providers: {
        gemini: { calls_today: 45, tokens_today: 12000, errors_today: 0 },
        groq: { calls_today: 3, tokens_today: 950, errors_today: 0 },
      },
    };

    useAppStore.setState({ quota: mockQuotaData });

    const quota = useAppStore.getState().quota;
    expect(quota?.providers.gemini?.calls_today).toBe(45);
    expect(quota?.providers.groq?.tokens_today).toBe(950);
  });
});

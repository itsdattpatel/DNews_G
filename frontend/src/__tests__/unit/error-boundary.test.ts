/**
 * frontend/src/__tests__/unit/error-boundary.test.ts
 * Unit test verifying React Error Boundary teletype fallback and isolation (P12-06).
 */
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

describe('P12-06: Editorial Error Boundary', () => {
  it('updates state to hasError: true on getDerivedStateFromError', () => {
    const error = new Error('Simulated teletype wire fault');
    const state = ErrorBoundary.getDerivedStateFromError(error);

    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('captures error info in componentDidCatch and logs to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const boundary = new ErrorBoundary({
      panelName: 'Intelligence Wire Desk',
      children: null,
    });

    const error = new Error('Database connection reset');
    const info = { componentStack: '\n    in TestComponent' };

    boundary.componentDidCatch(error, info);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[ErrorBoundary:Intelligence Wire Desk]'),
      error,
      info
    );

    spy.mockRestore();
  });

  it('renders editorial fallback tree when hasError is true', () => {
    const boundary = new ErrorBoundary({
      panelName: 'Live IPTV View',
      children: 'Live Content',
    });

    boundary.state = {
      hasError: true,
      error: new Error('Stream parser exception'),
      errorInfo: null,
    };

    const rendered = boundary.render();
    expect(rendered).toBeDefined();
    // Verify fallback element structure
    expect((rendered as any).type).toBe('div');
    expect((rendered as any).props.role).toBe('alert');
  });
});


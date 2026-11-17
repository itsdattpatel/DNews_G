/**
 * frontend/src/__tests__/unit/pinch-zoom.test.ts
 * Unit tests for trackpad pinch zoom, store state, and font scaling clamping.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';

describe('Pinch-to-Zoom & Desktop Proportional Font Scaling', () => {
  beforeEach(() => {
    useAppStore.getState().resetZoom();
  });

  it('initializes at default 1.0 zoom factor (100%)', () => {
    expect(useAppStore.getState().zoomFactor).toBe(1.0);
  });

  it('clamps zoom factor to maximum 1.75 (175%)', () => {
    useAppStore.getState().setZoomFactor(2.5);
    expect(useAppStore.getState().zoomFactor).toBe(1.75);
  });

  it('clamps zoom factor to minimum 0.75 (75%)', () => {
    useAppStore.getState().setZoomFactor(0.4);
    expect(useAppStore.getState().zoomFactor).toBe(0.75);
  });

  it('resets to 1.0 via resetZoom()', () => {
    useAppStore.getState().setZoomFactor(1.4);
    expect(useAppStore.getState().zoomFactor).toBe(1.4);

    useAppStore.getState().resetZoom();
    expect(useAppStore.getState().zoomFactor).toBe(1.0);
  });

  it('sets and persists custom background colors and activates custom theme', () => {
    useAppStore.getState().setCustomBgColor('#1A2B3C');
    const state = useAppStore.getState();
    expect(state.activeThemeId).toBe('custom');
    expect(state.customBgColor).toBe('#1A2B3C');
  });

  it('switches between presets from the 50-theme catalog cleanly', () => {
    useAppStore.getState().setThemeId('kyoto-moss');
    const state = useAppStore.getState();
    expect(state.activeThemeId).toBe('kyoto-moss');
    expect(state.customBgColor).toBeNull();
  });
});

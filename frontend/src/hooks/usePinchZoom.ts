/**
 * frontend/src/hooks/usePinchZoom.ts
 * Global Touchpad Pinch-to-Zoom & Desktop Proportional Font/Layout Scaling.
 *
 * Handles:
 * 1. Trackpad pinch gestures (wheel with e.ctrlKey).
 * 2. Keyboard shortcuts: Ctrl + +, Ctrl + -, Ctrl + 0.
 * 3. Proportional scaling from 75% (0.75x) to 175% (1.75x).
 * 4. Synchronization with Electron webFrame and root rem font-size.
 * 5. HUD indicator visibility toggle.
 */

import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.75;
const STEP_KEYBOARD = 0.05;

export function usePinchZoom(): void {
  const zoomFactor = useAppStore((s) => s.zoomFactor);
  const setZoomFactor = useAppStore((s) => s.setZoomFactor);
  const resetZoom = useAppStore((s) => s.resetZoom);
  const setIsZoomHUDVisible = useAppStore((s) => s.setIsZoomHUDVisible);

  const zoomRef = useRef(zoomFactor);
  zoomRef.current = zoomFactor;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHUD = () => {
    setIsZoomHUDVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsZoomHUDVisible(false);
    }, 1400);
  };

  // 1. Synchronize zoom with DOM & Electron webFrame
  useEffect(() => {
    // A. Native Electron webFrame zoom if available
    try {
      if (typeof window !== 'undefined' && window.electronBridge?.setZoomFactor) {
        window.electronBridge.setZoomFactor(zoomFactor);
      }
    } catch {
      // ignore
    }

    // B. Proportional root font-size scaling for standard CSS rem units
    if (typeof document !== 'undefined') {
      const basePx = 16;
      document.documentElement.style.fontSize = `${basePx * zoomFactor}px`;
      document.documentElement.style.setProperty('--root-zoom', zoomFactor.toString());
    }
  }, [zoomFactor]);

  // 2. Trackpad / Touchpad Pinch & Ctrl+Wheel listener
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      // Normalize delta across high-DPI touchpads and discrete mouse wheels
      const delta = -e.deltaY * 0.004;
      const next = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, Math.round((zoomRef.current + delta) * 100) / 100),
      );

      if (Math.abs(next - zoomRef.current) >= 0.01) {
        setZoomFactor(next);
        triggerHUD();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        const next = Math.min(MAX_ZOOM, Math.round((zoomRef.current + STEP_KEYBOARD) * 100) / 100);
        setZoomFactor(next);
        triggerHUD();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const next = Math.max(MIN_ZOOM, Math.round((zoomRef.current - STEP_KEYBOARD) * 100) / 100);
        setZoomFactor(next);
        triggerHUD();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
        triggerHUD();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setZoomFactor, resetZoom, setIsZoomHUDVisible]);
}

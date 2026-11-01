/**
 * frontend/src/components/spider/useSpiderFPS.ts
 * Real-time frame-rate monitor hook tracking rolling 10-frame average.
 * Automatically throttles rendering and alerts parent if performance drops (SPIDER_SPEC §2.6).
 */
import { useState, useRef, useCallback } from 'react';

export function useSpiderFPS(threshold: number = 45): {
  fps: number;
  below: boolean;
  critical: boolean;
  updateFPS: (now: number) => void;
} {
  const [fps, setFps] = useState(60);
  const [below, setBelow] = useState(false);
  const [critical, setCritical] = useState(false);

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const lastStateUpdateRef = useRef<number>(0);

  const updateFPS = useCallback((now: number) => {
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    if (dt > 0) {
      const times = frameTimesRef.current;
      times.push(dt);
      if (times.length > 10) {
        times.shift();
      }

      // Update state every 500ms to avoid excessive re-renders
      if (now - lastStateUpdateRef.current > 500 && times.length >= 5) {
        lastStateUpdateRef.current = now;
        const avgDt = times.reduce((a, b) => a + b, 0) / times.length;
        const currentFps = Math.round(1000 / avgDt);

        setFps(currentFps);
        setBelow(currentFps < threshold);
        setCritical(currentFps < 30);
      }
    }
  }, [threshold]);

  return { fps, below, critical, updateFPS };
}


/**
 * frontend/src/hooks/useLenisScroll.ts
 * Integrates Lenis smooth scrolling for the newspaper broadsheet layout.
 * Respects prefers-reduced-motion media query.
 */
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export function useLenisScroll(targetRef?: React.RefObject<HTMLElement | null>) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Check reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const wrapper = targetRef?.current || undefined;

    const lenis = new Lenis({
      wrapper: wrapper,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [targetRef]);

  return lenisRef;
}

export default useLenisScroll;


/**
 * frontend/src/library/ui/RoughHighlight.tsx
 * Hand-drawn SVG notation component powered by rough-notation.
 * Echoes marginalia, handwritten scholarly underlines, and illuminated manuscript accents.
 */
import React, { useEffect, useRef } from 'react';
import { annotate } from 'rough-notation';
import type { RoughAnnotationType } from 'rough-notation/lib/model';

export interface RoughHighlightProps {
  children: React.ReactNode;
  type?: RoughAnnotationType;
  color?: string; // Default: illumination gold or terracotta
  strokeWidth?: number;
  padding?: number | [number, number] | [number, number, number, number];
  iterations?: number;
  multiline?: boolean;
  show?: boolean;
  animate?: boolean;
  className?: string;
}

export const RoughHighlight: React.FC<RoughHighlightProps> = ({
  children,
  type = 'underline',
  color,
  strokeWidth = 1.5,
  padding = 3,
  iterations = 2,
  multiline = true,
  show = true,
  animate = true,
  className = '',
}) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<ReturnType<typeof annotate> | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    // Detect reduced-motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Default color resolution using CSS variables or fallbacks
    const resolvedColor = color || (type === 'highlight' ? 'rgba(214, 171, 78, 0.25)' : 'var(--lib-gold, #9E7B36)');

    const annotation = annotate(elementRef.current, {
      type,
      color: resolvedColor,
      strokeWidth,
      padding,
      iterations,
      multiline,
      animate: !prefersReducedMotion && animate,
    });

    annotationRef.current = annotation;

    if (show) {
      annotation.show();
    } else {
      annotation.hide();
    }

    return () => {
      annotation.remove();
    };
  }, [type, color, strokeWidth, padding, iterations, multiline, show, animate]);

  return (
    <span ref={elementRef} className={`inline-block relative ${className}`}>
      {children}
    </span>
  );
};


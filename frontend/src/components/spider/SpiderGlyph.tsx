/**
 * frontend/src/components/spider/SpiderGlyph.tsx
 * Custom anti-slop SVG drawing of the biomechanical news spider.
 * Used for badges, chips, and card footers across the desk.
 */
import React from 'react';

interface SpiderGlyphProps {
  size?: number;
  color?: string;
  className?: string;
}

export const SpiderGlyph: React.FC<SpiderGlyphProps> = ({
  size = 14,
  color = 'currentColor',
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Abdomen / Cephalothorax */}
      <ellipse cx="12" cy="14" rx="4" ry="5.5" fill={color} fillOpacity="0.25" />
      <circle cx="12" cy="7" r="3" fill={color} fillOpacity="0.4" />

      {/* Optical Sensor Eyes */}
      <circle cx="10.8" cy="6" r="0.8" fill="#ffffff" stroke="none" />
      <circle cx="13.2" cy="6" r="0.8" fill="#ffffff" stroke="none" />

      {/* Left 4 Legs */}
      <path d="M9 7 L4 4 L2 8" />
      <path d="M8.5 11 L3 11 L1 15" />
      <path d="M8.5 14 L3 17 L2 21" />
      <path d="M9.5 17 L5 21 L4 23" />

      {/* Right 4 Legs */}
      <path d="M15 7 L20 4 L22 8" />
      <path d="M15.5 11 L21 11 L23 15" />
      <path d="M15.5 14 L21 17 L22 21" />
      <path d="M14.5 17 L19 21 L20 23" />
    </svg>
  );
};


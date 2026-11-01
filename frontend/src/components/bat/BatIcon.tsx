/**
 * frontend/src/components/bat/BatIcon.tsx
 * Interactive SVG bat with flapping wings animation on hover.
 * Clicking toggles the settings drawer.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

interface BatIconProps {
  size?: number;
  className?: string;
}

export const BatIcon: React.FC<BatIconProps> = ({ size = 36, className = '' }) => {
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  return (
    <button
      type="button"
      id="bat-menu-button"
      onClick={() => setSettingsOpen(!isSettingsOpen)}
      className={`bat-hover relative flex items-center justify-center p-2 rounded-xl transition-all duration-200 hover:bg-slate-800/60 focus:outline-none ${className}`}
      title="Settings & System Control (Bat Menu)"
      aria-label="Toggle Settings Menu"
      style={{
        background: isSettingsOpen ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        border: isSettingsOpen ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
        cursor: 'pointer',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-200"
      >
        {/* Glow backdrop */}
        <filter id="bat-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <g filter="url(#bat-glow)">
          {/* Left Wing */}
          <path
            className="bat-wing-left"
            d="M24 24 C20 12, 6 10, 2 18 C0 24, 8 36, 16 32 C18 30, 20 28, 24 28 Z"
            fill="#818cf8"
            opacity="0.9"
          />

          {/* Right Wing */}
          <path
            className="bat-wing-right"
            d="M24 24 C28 12, 42 10, 46 18 C48 24, 40 36, 32 32 C30 30, 28 28, 24 28 Z"
            fill="#818cf8"
            opacity="0.9"
          />

          {/* Bat Body */}
          <ellipse cx="24" cy="27" rx="5.5" ry="8" fill="#4338ca" />

          {/* Bat Head & Ears */}
          <circle cx="24" cy="18" r="4.5" fill="#3730a3" />
          <polygon points="21,16 19,10 23,14" fill="#4338ca" />
          <polygon points="27,16 29,10 25,14" fill="#4338ca" />

          {/* Glowing Eyes */}
          <circle cx="22.2" cy="17.5" r="1.1" fill="#f87171" />
          <circle cx="25.8" cy="17.5" r="1.1" fill="#f87171" />
        </g>
      </svg>
    </button>
  );
};

/**
 * frontend/src/components/bat/BatIcon.tsx
 * Custom hand-crafted anatomical ink-drawn broadsheet bat in SVG.
 * Features procedural wing flapping on click/hover and toggle for the Bat Menu.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';

interface BatIconProps {
  size?: number;
  className?: string;
}

export const BatIcon: React.FC<BatIconProps> = ({ size = 36, className = '' }) => {
  const isBatMenuOpen = useAppStore((s) => s.isBatMenuOpen);
  const setBatMenuOpen = useAppStore((s) => s.setBatMenuOpen);
  const [isHovered, setIsHovered] = useState(false);

  const toggleMenu = () => {
    setBatMenuOpen(!isBatMenuOpen);
  };

  return (
    <button
      type="button"
      id="bat-menu-button"
      onClick={toggleMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex items-center justify-center p-1.5 rounded-sm transition-colors border border-transparent hover:border-paper-border hover:bg-paper-alt focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
      title="The World Desk Masthead Menu (Press 'b' to toggle)"
      aria-label="Toggle Masthead Navigation Menu"
      aria-expanded={isBatMenuOpen}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-200"
      >
        {/* Left Wing (Procedural Flapping via Motion) */}
        <motion.g
          style={{ originX: '26px', originY: '26px' }}
          animate={
            isBatMenuOpen
              ? { rotate: [-12, 10, -6, 0], scaleY: [0.8, 1.1, 0.95, 1] }
              : isHovered
              ? { rotate: [-6, 6, -3, 0], scaleY: [0.9, 1.05, 1] }
              : { rotate: 0, scaleY: 1 }
          }
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          {/* Outer wing membrane */}
          <path
            d="M26 26 C22 14, 11 10, 4 17 C1 21, 5 32, 12 33 C16 33, 19 30, 21 29 C23 31, 25 30, 26 26 Z"
            className="fill-ink opacity-90 transition-colors"
          />
          {/* Wing rib detail lines */}
          <path
            d="M26 26 Q17 18 6 18 M26 26 Q19 25 12 32 M26 26 Q23 28 21 29"
            stroke="var(--color-paper)"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="opacity-70"
          />
        </motion.g>

        {/* Right Wing (Mirrored Flapping via Motion) */}
        <motion.g
          style={{ originX: '26px', originY: '26px' }}
          animate={
            isBatMenuOpen
              ? { rotate: [12, -10, 6, 0], scaleY: [0.8, 1.1, 0.95, 1] }
              : isHovered
              ? { rotate: [6, -6, 3, 0], scaleY: [0.9, 1.05, 1] }
              : { rotate: 0, scaleY: 1 }
          }
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          {/* Outer wing membrane */}
          <path
            d="M26 26 C30 14, 41 10, 48 17 C51 21, 47 32, 40 33 C36 33, 33 30, 31 29 C29 31, 27 30, 26 26 Z"
            className="fill-ink opacity-90 transition-colors"
          />
          {/* Wing rib detail lines */}
          <path
            d="M26 26 Q35 18 46 18 M26 26 Q33 25 40 32 M26 26 Q29 28 31 29"
            stroke="var(--color-paper)"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="opacity-70"
          />
        </motion.g>

        {/* Bat Body & Tail */}
        <path
          d="M26 37 C23 35, 22 28, 22 24 C22 20, 24 17, 26 17 C28 17, 30 20, 30 24 C30 28, 29 35, 26 37 Z"
          className="fill-ink transition-colors"
        />

        {/* Bat Head & Pointed Ears */}
        <circle cx="26" cy="18" r="4.2" className="fill-ink" />
        <polygon points="23,16 20,9 25,14" className="fill-ink" />
        <polygon points="29,16 32,9 27,14" className="fill-ink" />

        {/* Ear inner highlights */}
        <polygon points="22.5,15 21,11 24,14" fill="var(--color-paper)" opacity="0.6" />
        <polygon points="29.5,15 31,11 28,14" fill="var(--color-paper)" opacity="0.6" />

        {/* Keen Alert Eyes (Accented Crimson) */}
        <circle cx="24.2" cy="17.6" r="1.1" className="fill-accent" />
        <circle cx="27.8" cy="17.6" r="1.1" className="fill-accent" />
      </svg>
    </button>
  );
};

export default BatIcon;

/**
 * frontend/src/components/ui/ScrambledText.tsx
 * Telegraphic character scrambling & decrypting animation (based on React Bits DecryptedText / ScrambledText).
 * Decodes characters into the final text with customizable speeds, iteration passes, and character sets.
 * 100% font preservation — respects typography tokens, reduced-motion preferences, and theme styling.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

export const PRESET_CHARSETS: Record<string, string> = {
  broadsheet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789—·/[]',
  cipher: '!@#$%^&*()_+~|}{[]:;?><',
  matrix: '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ',
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
};

export interface ScrambledTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  characters?: string;
  charsetPreset?: 'broadsheet' | 'cipher' | 'matrix' | 'alphanumeric' | string;
  enabled?: boolean;
  revealOnHover?: boolean;
  className?: string;
  scrambledClassName?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
}

export const ScrambledText: React.FC<ScrambledTextProps> = ({
  text,
  speed = 35,
  maxIterations = 12,
  sequential = false,
  characters,
  charsetPreset = 'broadsheet',
  enabled = true,
  revealOnHover = false,
  className = '',
  scrambledClassName = 'opacity-70 font-mono text-accent',
  as: Component = 'span',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const prevTextRef = useRef(text);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeCharset = characters || PRESET_CHARSETS[charsetPreset] || PRESET_CHARSETS.broadsheet;

  const runScramble = useCallback(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !text) {
      setDisplayText(text);
      setIsScrambling(false);
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsScrambling(true);

    let iteration = 0;
    const textLen = text.length;
    const totalSteps = maxIterations;

    intervalRef.current = setInterval(() => {
      iteration++;

      if (iteration >= totalSteps) {
        setDisplayText(text);
        setIsScrambling(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      // Generate frame
      const progress = iteration / totalSteps;
      const revealedCount = sequential ? Math.floor(progress * textLen) : 0;

      const scrambled = text
        .split('')
        .map((char, index) => {
          if (char === ' ' || char === '\n' || char === '\t') return char;
          if (sequential && index < revealedCount) return char;

          // With probability related to progress, resolve character
          if (!sequential && Math.random() < progress * 0.8) {
            return char;
          }

          const randIdx = Math.floor(Math.random() * activeCharset.length);
          return activeCharset[randIdx];
        })
        .join('');

      setDisplayText(scrambled);
    }, speed);
  }, [text, speed, maxIterations, sequential, activeCharset]);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText(text);
      setIsScrambling(false);
      prevTextRef.current = text;
      return;
    }

    runScramble();
    prevTextRef.current = text;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, enabled, runScramble]);

  const handleMouseEnter = () => {
    if (revealOnHover && !isScrambling) {
      runScramble();
    }
  };

  return (
    <Component
      className={`inline-block select-text transition-colors ${className} ${
        isScrambling ? scrambledClassName : ''
      }`}
      onMouseEnter={handleMouseEnter}
    >
      {displayText}
    </Component>
  );
};

export default ScrambledText;

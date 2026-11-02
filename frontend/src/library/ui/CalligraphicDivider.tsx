/**
 * frontend/src/library/ui/CalligraphicDivider.tsx
 * Classical manuscript hairline rule with ornamental center glyph and gentle gradient fade.
 */
import React from 'react';

export interface CalligraphicDividerProps {
  glyph?: 'lotus' | 'star' | 'fleuron' | 'diamond' | 'none';
  className?: string;
}

export const CalligraphicDivider: React.FC<CalligraphicDividerProps> = ({
  glyph = 'lotus',
  className = '',
}) => {
  const getGlyphSymbol = () => {
    switch (glyph) {
      case 'lotus':
        return '🪷';
      case 'star':
        return '✦';
      case 'fleuron':
        return '❧';
      case 'diamond':
        return '❖';
      case 'none':
      default:
        return null;
    }
  };

  const symbol = getGlyphSymbol();

  return (
    <div className={`flex items-center justify-center my-6 py-2 select-none ${className}`}>
      <div
        className="flex-1 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--lib-border))',
        }}
      />
      {symbol && (
        <span className="px-3 text-sm text-[var(--lib-gold)] font-serif opacity-80">
          {symbol}
        </span>
      )}
      <div
        className="flex-1 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, var(--lib-border), transparent)',
        }}
      />
    </div>
  );
};

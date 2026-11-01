/**
 * frontend/src/components/spider/ScoutBadge.tsx
 * Visual Scout Spider indicator with dashed radar pulse for the upcoming card in CardStrip.
 * Pre-marks the next story in queue until Reader arrives.
 */
import React from 'react';
import { SpiderGlyph } from './SpiderGlyph';

export const ScoutBadge: React.FC = () => {
  return (
    <div
      className="scout-indicator"
      style={{
        position: 'absolute',
        top: '-10px',
        right: '12px',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px dashed #94a3b8',
        boxShadow: '0 0 10px rgba(148, 163, 184, 0.3)',
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#cbd5e1',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
      title="Scout Spider pre-marking next incoming intelligence story"
    >
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#94a3b8',
          boxShadow: '0 0 6px #94a3b8',
          animation: 'pulse 1.5s infinite',
        }}
      />
      <span>Scout</span>
      <SpiderGlyph size={12} color="#94a3b8" />
    </div>
  );
};

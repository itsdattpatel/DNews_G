/**
 * frontend/src/components/article/GlossaryTooltip.tsx
 * Interactive Broadsheet In-Line Glossary Tooltip (PRD Master Expansion #12).
 */
import React, { useState, useRef } from 'react';
import type { GlossaryEntry } from '../../lib/glossary';
import { BookOpen } from 'lucide-react';

interface GlossaryTooltipProps {
  entry: GlossaryEntry;
  children: React.ReactNode;
}

export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({ entry, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsVisible(!isVisible)}
    >
      <span className="border-b-2 border-dotted border-accent/80 cursor-help font-semibold text-ink hover:text-accent transition-colors">
        {children}
      </span>

      {isVisible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-paper border-2 border-ink shadow-xl rounded-xs z-50 text-left pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150 block"
        >
          {/* Header */}
          <span className="flex items-center justify-between pb-1.5 border-b border-paper-border mb-2 block">
            <span className="font-masthead text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1">
              <BookOpen size={11} className="text-accent" />
              <span>{entry.term}</span>
            </span>
            <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-xs border border-ink/30 bg-paper-alt text-ink-secondary">
              {entry.category}
            </span>
          </span>

          {/* Full Name */}
          <span className="font-ui text-xs font-bold text-ink block mb-1">
            {entry.fullName}
          </span>

          {/* Definition */}
          <span className="font-serif text-[11px] text-ink-secondary leading-snug block mb-2">
            {entry.definition}
          </span>

          {/* Metadata Footer */}
          {(entry.established || entry.headquarters) && (
            <span className="grid grid-cols-2 gap-1 pt-1.5 border-t border-paper-border font-mono text-[9px] text-ink-muted block">
              {entry.established && <span>EST: {entry.established}</span>}
              {entry.headquarters && <span className="text-right truncate">{entry.headquarters}</span>}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

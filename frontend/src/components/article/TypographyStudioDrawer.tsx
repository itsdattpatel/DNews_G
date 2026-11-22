/**
 * frontend/src/components/article/TypographyStudioDrawer.tsx
 * Broadsheet Typography Studio (PRD Master Expansion #14).
 * Allows readers to customize typeface, column width, and line height.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { Type, X } from 'lucide-react';

interface FontOption {
  id: 'source-serif' | 'playfair' | 'garamond' | 'lora' | 'cormorant';
  name: string;
  cssFamily: string;
  era: string;
}

const FONTS: FontOption[] = [
  { id: 'source-serif', name: 'Source Serif 4', cssFamily: 'var(--font-body)', era: 'Modern Editorial' },
  { id: 'playfair', name: 'Playfair Display', cssFamily: 'var(--font-headline)', era: 'Classic Broadsheet' },
  { id: 'garamond', name: 'EB Garamond', cssFamily: 'serif', era: '16th C. Renaissance' },
  { id: 'lora', name: 'Lora', cssFamily: 'serif', era: 'Contemporary Literary' },
  { id: 'cormorant', name: 'Cormorant Garamond', cssFamily: 'serif', era: 'Traditional Press' },
];

export const TypographyStudioDrawer: React.FC = () => {
  const isOpen = useAppStore((s) => s.isTypographyStudioOpen);
  const setIsOpen = useAppStore((s) => s.setIsTypographyStudioOpen);
  const readerFontFamily = useAppStore((s) => s.readerFontFamily);
  const setReaderFontFamily = useAppStore((s) => s.setReaderFontFamily);
  const readerColumnWidth = useAppStore((s) => s.readerColumnWidth);
  const setReaderColumnWidth = useAppStore((s) => s.setReaderColumnWidth);
  const readerLineHeight = useAppStore((s) => s.readerLineHeight);
  const setReaderLineHeight = useAppStore((s) => s.setReaderLineHeight);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="typography-studio-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        id="typography-studio-modal"
        className="w-full max-w-md bg-paper border-2 border-ink shadow-2xl rounded-xs p-5 text-ink animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-paper-border mb-4">
          <div className="flex items-center gap-2">
            <Type size={18} className="text-accent" />
            <h2 className="font-masthead text-base font-bold uppercase tracking-wider text-ink">
              Broadsheet Typography Studio
            </h2>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsOpen(false);
            }}
            className="p-1 rounded-xs hover:bg-paper-alt text-ink-secondary hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. Typeface Selection */}
        <div className="mb-4">
          <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
            Editorial Typeface
          </label>
          <div className="space-y-1.5">
            {FONTS.map((font) => {
              const isSelected = readerFontFamily === font.id;
              return (
                <button
                  key={font.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setReaderFontFamily(font.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 border rounded-xs transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'border-ink bg-ink text-paper font-bold shadow-xs'
                      : 'border-paper-border bg-paper-alt/50 text-ink hover:border-ink hover:bg-paper-alt'
                  }`}
                >
                  <span className="font-serif text-sm">{font.name}</span>
                  <span className="font-mono text-[10px] opacity-70 uppercase tracking-widest">{font.era}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Column Width */}
        <div className="mb-4">
          <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
            Column Measure
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'standard', label: 'Classic (65ch)' },
              { id: 'wide', label: 'Broad (85ch)' },
              { id: 'full', label: 'Full Bleed' },
            ].map((col) => {
              const isSelected = readerColumnWidth === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setReaderColumnWidth(col.id as any);
                  }}
                  className={`py-1.5 px-2 border rounded-xs font-mono text-[11px] font-bold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-ink bg-ink text-paper shadow-xs'
                      : 'border-paper-border bg-paper-alt/50 text-ink hover:border-ink'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Line Height */}
        <div className="mb-5">
          <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
            Leading &amp; Line Height
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'Compact 1.6' },
              { id: 'broadsheet', label: 'Broadsheet 1.85' },
              { id: 'spacious', label: 'Spacious 2.1' },
            ].map((lh) => {
              const isSelected = readerLineHeight === lh.id;
              return (
                <button
                  key={lh.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setReaderLineHeight(lh.id as any);
                  }}
                  className={`py-1.5 px-2 border rounded-xs font-mono text-[11px] font-bold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-ink bg-ink text-paper shadow-xs'
                      : 'border-paper-border bg-paper-alt/50 text-ink hover:border-ink'
                  }`}
                >
                  {lh.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Typography Preview Box */}
        <div className="p-3 border border-dashed border-ink/40 bg-paper-alt/40 rounded-xs mb-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1 font-bold">
            Live Preview
          </div>
          <p
            style={{
              fontFamily: FONTS.find((f) => f.id === readerFontFamily)?.cssFamily || 'serif',
              lineHeight: readerLineHeight === 'compact' ? 1.6 : readerLineHeight === 'spacious' ? 2.1 : 1.85,
            }}
            className="text-xs text-ink leading-relaxed"
          >
            “The press is the greatest agency for informing public opinion the world has ever known.”
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsOpen(false);
          }}
          className="w-full py-2 border-2 border-ink bg-ink text-paper rounded-xs font-mono text-xs font-bold uppercase tracking-wider hover:bg-paper hover:text-ink transition-all cursor-pointer"
        >
          Apply Typography Settings
        </button>
      </div>
    </div>
  );
};

/**
 * frontend/src/components/article/ReaderLayoutSwitcher.tsx
 * Pillar 4: Multi-Layout Reader Mode Switcher
 * Allows 1-click toggling between:
 * 1. Classic Broadsheet (1920s newspaper typography, drop cap, multi-column, verbatim box)
 * 2. Wire Terminal (High-density Reuters/Bloomberg dark tabular layout, monospaced metadata, compact telemetry)
 * 3. Photojournalism Magazine (High-contrast full-bleed editorial imagery, large pull quotes, elegant modern serif)
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Newspaper, Terminal, Image as ImageIcon } from 'lucide-react';
import { broadsheetAudio } from '../../utils/broadsheetAudio';

export const ReaderLayoutSwitcher: React.FC = () => {
  const readerLayout = useAppStore((s) => s.readerLayout);
  const setReaderLayout = useAppStore((s) => s.setReaderLayout);

  const handleSelect = (layout: 'broadsheet' | 'wire' | 'photojournalism') => {
    broadsheetAudio.playTeletypeClick();
    setReaderLayout(layout);
  };

  return (
    <div
      id="reader-layout-switcher"
      className="inline-flex items-center gap-0.5 p-0.5 border border-paper-border bg-paper-alt rounded-xs font-mono text-[10px]"
      role="group"
      aria-label="Reader Layout Switcher"
    >
      <button
        type="button"
        id="btn-layout-broadsheet"
        onClick={() => handleSelect('broadsheet')}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-2xs uppercase tracking-wider transition-all cursor-pointer ${
          readerLayout === 'broadsheet'
            ? 'bg-ink text-paper font-bold shadow-2xs'
            : 'text-ink-muted hover:text-ink hover:bg-paper'
        }`}
        title="Classic Broadsheet Newspaper Layout"
      >
        <Newspaper className="w-3 h-3" />
        <span>Broadsheet</span>
      </button>

      <button
        type="button"
        id="btn-layout-wire"
        onClick={() => handleSelect('wire')}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-2xs uppercase tracking-wider transition-all cursor-pointer ${
          readerLayout === 'wire'
            ? 'bg-ink text-paper font-bold shadow-2xs'
            : 'text-ink-muted hover:text-ink hover:bg-paper'
        }`}
        title="Reuters/Bloomberg Wire Terminal Layout"
      >
        <Terminal className="w-3 h-3" />
        <span>Wire</span>
      </button>

      <button
        type="button"
        id="btn-layout-photojournalism"
        onClick={() => handleSelect('photojournalism')}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-2xs uppercase tracking-wider transition-all cursor-pointer ${
          readerLayout === 'photojournalism'
            ? 'bg-ink text-paper font-bold shadow-2xs'
            : 'text-ink-muted hover:text-ink hover:bg-paper'
        }`}
        title="Photojournalism Editorial Magazine Layout"
      >
        <ImageIcon className="w-3 h-3" />
        <span>Magazine</span>
      </button>
    </div>
  );
};

export default ReaderLayoutSwitcher;

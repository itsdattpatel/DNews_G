/**
 * frontend/src/library/components/LibraryShellLayout.tsx
 * Accessible, resizable, two-finger scrollable panel layout for The Library.
 * Powered by react-resizable-panels with persistent sizes and tactile parchment styling.
 */
import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';

export interface LibraryShellLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number; // e.g. 38%
  minLeftSize?: number;
  maxLeftSize?: number;
  className?: string;
}

export const LibraryShellLayout: React.FC<LibraryShellLayoutProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftSize = 38,
  minLeftSize = 25,
  maxLeftSize = 55,
  className = '',
}) => {
  return (
    <div className={`w-full flex-1 h-[calc(100vh-112px)] overflow-hidden ${className}`}>
      {/* Desktop / Tablet Resizable Panels */}
      <div className="hidden lg:block w-full h-full">
        <PanelGroup direction="horizontal" autoSaveId="library-reading-room-layout">
          {/* Left Panel: Catalog / Timeline / Index */}
          <Panel
            defaultSize={defaultLeftSize}
            minSize={minLeftSize}
            maxSize={maxLeftSize}
            className="h-full overflow-hidden"
          >
            <div className="h-full overflow-y-auto p-5 lib-scrollbar touch-pan-y border-r border-[var(--lib-border-soft)]">
              {leftPanel}
            </div>
          </Panel>

          {/* Resizable Divider Handle */}
          <PanelResizeHandle className="relative w-2.5 bg-[var(--lib-bg)] hover:bg-[var(--lib-surface-hover)] transition-colors flex items-center justify-center cursor-col-resize group select-none">
            <div className="w-[1px] h-full bg-[var(--lib-border)] group-hover:bg-[var(--lib-gold)] transition-colors" />
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded-sm bg-[var(--lib-surface)] border border-[var(--lib-border)] flex items-center justify-center text-[var(--lib-ink-muted)] group-hover:text-[var(--lib-gold)] group-hover:border-[var(--lib-gold)] shadow-2xs">
              <GripVertical className="w-3 h-3" />
            </div>
          </PanelResizeHandle>

          {/* Right Panel: Reading Desk / Primary Folio */}
          <Panel defaultSize={100 - defaultLeftSize} minSize={45} className="h-full overflow-hidden">
            <div className="h-full overflow-y-auto p-6 md:p-8 lib-scrollbar touch-pan-y bg-[var(--lib-surface-elevated)]">
              {rightPanel}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile / Narrow Stack Fallback */}
      <div className="lg:hidden w-full h-full overflow-y-auto p-4 space-y-6 lib-scrollbar">
        <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)]">
          {leftPanel}
        </div>
        <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)]">
          {rightPanel}
        </div>
      </div>
    </div>
  );
};

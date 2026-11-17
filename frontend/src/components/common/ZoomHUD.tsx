/**
 * frontend/src/components/common/ZoomHUD.tsx
 * Heads-Up Display (HUD) showing active desktop font/layout scale percentage.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const ZoomHUD: React.FC = () => {
  const isZoomHUDVisible = useAppStore((s) => s.isZoomHUDVisible);
  const zoomFactor = useAppStore((s) => s.zoomFactor);
  const setZoomFactor = useAppStore((s) => s.setZoomFactor);
  const resetZoom = useAppStore((s) => s.resetZoom);

  const percent = Math.round(zoomFactor * 100);

  return (
    <AnimatePresence>
      {isZoomHUDVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-sm bg-[var(--color-paper-alt)] border-2 border-[var(--color-ink)] shadow-2xl font-serif text-[var(--color-ink)] select-none">
            <button
              onClick={() => setZoomFactor(Math.max(0.75, zoomFactor - 0.05))}
              className="p-1 hover:bg-[var(--color-paper-border)] rounded-2xs transition-colors"
              title="Zoom Out (Ctrl -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-baseline gap-1.5 px-1.5 min-w-[70px] justify-center">
              <span className="font-mono text-sm font-bold tracking-tight">{percent}%</span>
              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono uppercase tracking-widest">
                Scale
              </span>
            </div>

            <button
              onClick={() => setZoomFactor(Math.min(1.75, zoomFactor + 0.05))}
              className="p-1 hover:bg-[var(--color-paper-border)] rounded-2xs transition-colors"
              title="Zoom In (Ctrl +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-[var(--color-paper-border)]" />

            <button
              onClick={resetZoom}
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-2xs bg-[var(--color-paper)] border border-[var(--color-paper-border)] hover:border-[var(--color-ink)] transition-colors"
              title="Reset Zoom (Ctrl 0)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

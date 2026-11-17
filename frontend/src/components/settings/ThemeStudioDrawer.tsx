/**
 * frontend/src/components/settings/ThemeStudioDrawer.tsx
 * Theme Studio Drawer: 50 Curated Broadsheet Themes + Custom RGB Color Studio + Desktop Font Scaling.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import {
  THEME_CATALOG,
  ThemeGroup,
  hexToRgb,
  rgbToHex,
  deriveThemePalette,
  getContrastRatio,
} from '../../styles/themes';
import {
  X,
  Palette,
  Sliders,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ShieldCheck,
  Check,
} from 'lucide-react';

const THEME_GROUPS: ThemeGroup[] = [
  'Royal & Imperial',
  'Vintage Broadsheet',
  'Aesthetic & Earth',
  'Nocturne & Contrast',
  'Modern Editorial',
];

export const ThemeStudioDrawer: React.FC = () => {
  const isThemeStudioOpen = useAppStore((s) => s.isThemeStudioOpen);
  const setThemeStudioOpen = useAppStore((s) => s.setThemeStudioOpen);
  const activeThemeId = useAppStore((s) => s.activeThemeId);
  const setThemeId = useAppStore((s) => s.setThemeId);
  const customBgColor = useAppStore((s) => s.customBgColor);
  const setCustomBgColor = useAppStore((s) => s.setCustomBgColor);

  const zoomFactor = useAppStore((s) => s.zoomFactor);
  const setZoomFactor = useAppStore((s) => s.setZoomFactor);
  const resetZoom = useAppStore((s) => s.resetZoom);

  const [activeGroup, setActiveGroup] = useState<ThemeGroup>('Royal & Imperial');

  // Custom RGB State
  const initialHex = customBgColor || '#FAF7F0';
  const initialRgb = hexToRgb(initialHex);
  const [r, setR] = useState(initialRgb.r);
  const [g, setG] = useState(initialRgb.g);
  const [b, setB] = useState(initialRgb.b);
  const [hexInput, setHexInput] = useState(initialHex);

  useEffect(() => {
    if (customBgColor) {
      const rgb = hexToRgb(customBgColor);
      setR(rgb.r);
      setG(rgb.g);
      setB(rgb.b);
      setHexInput(customBgColor);
    } else {
      const preset = THEME_CATALOG.find((t) => t.id === activeThemeId);
      if (preset) {
        const rgb = hexToRgb(preset.bg);
        setR(rgb.r);
        setG(rgb.g);
        setB(rgb.b);
        setHexInput(preset.bg);
      }
    }
  }, [customBgColor, activeThemeId]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeStudioOpen(false);
      }
    };
    if (isThemeStudioOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isThemeStudioOpen, setThemeStudioOpen]);

  // Handle RGB slider change
  const handleRgbChange = (newR: number, newG: number, newB: number) => {
    setR(newR);
    setG(newG);
    setB(newB);
    const hex = rgbToHex(newR, newG, newB);
    setHexInput(hex);
    setCustomBgColor(hex);
  };

  // Handle Hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      const rgb = hexToRgb(val);
      setR(rgb.r);
      setG(rgb.g);
      setB(rgb.b);
      setCustomBgColor(val);
    }
  };

  // Preview contrast for custom color
  const customPalette = deriveThemePalette(hexInput);
  const customContrast = getContrastRatio(customPalette.colorPaper, customPalette.colorInk).toFixed(1);

  if (!isThemeStudioOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setThemeStudioOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          id="theme-studio-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-xl h-full bg-[var(--color-paper)] text-[var(--color-ink)] border-l-2 border-[var(--color-ink)] shadow-2xl flex flex-col z-10 overflow-hidden font-serif"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-[var(--color-accent)]" />
              <div>
                <h2 className="text-xl font-bold tracking-tight font-display">Theme & Scale Studio</h2>
                <p className="text-xs text-[var(--color-ink-muted)] font-mono">
                  50 Curated Palettes · Custom RGB Studio · Proportional Pinch-Zoom
                </p>
              </div>
            </div>
            <button
              id="btn-close-theme-studio"
              onClick={() => setThemeStudioOpen(false)}
              className="p-1.5 hover:bg-[var(--color-paper-border)] rounded-sm transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* ─── SECTION 1: Desktop Font & Layout Scaling ────────────────────── */}
            <div className="p-4 rounded-sm bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-bold text-sm">Desktop Font & Layout Scale</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold bg-[var(--color-paper)] px-2 py-0.5 rounded-2xs border border-[var(--color-paper-border)]">
                    {Math.round(zoomFactor * 100)}%
                  </span>
                  <button
                    onClick={resetZoom}
                    className="p-1 hover:bg-[var(--color-paper)] rounded-2xs text-xs font-mono flex items-center gap-1 border border-transparent hover:border-[var(--color-paper-border)] transition-colors"
                    title="Reset to 100% (Ctrl 0)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="75"
                max="175"
                step="5"
                value={Math.round(zoomFactor * 100)}
                onChange={(e) => setZoomFactor(Number(e.target.value) / 100)}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />

              <div className="flex justify-between text-[11px] font-mono text-[var(--color-ink-muted)]">
                <span>75% (Compact)</span>
                <span>Pinch trackpad or Ctrl +/-</span>
                <span>175% (Large Broadsheet)</span>
              </div>
            </div>

            {/* ─── SECTION 2: Custom RGB / Hex Color Studio ────────────────────── */}
            <div className="p-4 rounded-sm bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-bold text-sm">Custom RGB Studio & Auto-Contrast</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-2xs bg-emerald-950/20 text-emerald-600 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  {customContrast}:1 WCAG {Number(customContrast) >= 7 ? 'AAA' : 'AA'}
                </span>
              </div>

              {/* Live Preview Card */}
              <div
                style={{
                  backgroundColor: customPalette.colorPaper,
                  color: customPalette.colorInk,
                  borderColor: customPalette.colorPaperBorder,
                }}
                className="p-4 rounded-sm border-2 shadow-sm space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      backgroundColor: customPalette.colorAccent,
                      color: '#ffffff',
                    }}
                    className="text-[10px] font-mono uppercase font-bold tracking-widest px-2 py-0.5 rounded-2xs"
                  >
                    LIVE PREVIEW
                  </span>
                  <span
                    style={{ color: customPalette.colorInkSecondary }}
                    className="text-xs font-mono"
                  >
                    Contrast: {customContrast}:1
                  </span>
                </div>
                <h4
                  style={{ color: customPalette.colorInk }}
                  className="font-display text-lg font-bold leading-tight"
                >
                  The Global Broadsheet Dispatch
                </h4>
                <p
                  style={{ color: customPalette.colorInkSecondary }}
                  className="text-xs line-clamp-2"
                >
                  Text contrast automatically recalculates relative luminance, ensuring crystal-clear readability across any background tint.
                </p>
              </div>

              {/* Sliders & Color Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-red-500 font-bold">R (Red)</span>
                    <span>{r}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={r}
                    onChange={(e) => handleRgbChange(Number(e.target.value), g, b)}
                    className="w-full accent-red-600 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-500 font-bold">G (Green)</span>
                    <span>{g}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={g}
                    onChange={(e) => handleRgbChange(r, Number(e.target.value), b)}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-blue-500 font-bold">B (Blue)</span>
                    <span>{b}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={b}
                    onChange={(e) => handleRgbChange(r, g, Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <div>
                    <label className="block text-xs font-mono text-[var(--color-ink-muted)] mb-1">
                      HEX CODE
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="theme-custom-hex"
                        type="text"
                        value={hexInput}
                        onChange={handleHexChange}
                        placeholder="#FAF7F0"
                        className="w-full px-3 py-1.5 font-mono text-sm bg-[var(--color-paper)] border border-[var(--color-paper-border)] rounded-2xs focus:border-[var(--color-ink)] focus:outline-hidden"
                      />
                      <input
                        type="color"
                        value={hexInput.length === 7 ? hexInput : '#FAF7F0'}
                        onChange={(e) => {
                          const hex = e.target.value.toUpperCase();
                          setHexInput(hex);
                          const rgb = hexToRgb(hex);
                          setR(rgb.r);
                          setG(rgb.g);
                          setB(rgb.b);
                          setCustomBgColor(hex);
                        }}
                        className="w-10 h-9 p-0.5 rounded-2xs border border-[var(--color-paper-border)] cursor-pointer bg-[var(--color-paper)]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setThemeId('london-broadsheet-1920')}
                    className="w-full py-2 px-3 text-xs font-mono border border-[var(--color-paper-border)] rounded-2xs bg-[var(--color-paper)] hover:border-[var(--color-ink)] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to 1920 Classic
                  </button>
                </div>
              </div>
            </div>

            {/* ─── SECTION 3: 50 Curated Theme Catalog ─────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-bold text-sm">50 Curated Broadsheet Themes</span>
                </div>
                <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                  10 per category
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lib-scrollbar">
                {THEME_GROUPS.map((group) => {
                  const isActive = activeGroup === group;
                  return (
                    <button
                      key={group}
                      onClick={() => setActiveGroup(group)}
                      className={`px-3 py-1 rounded-2xs text-xs font-mono whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)] font-bold'
                          : 'bg-[var(--color-paper-alt)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] border border-[var(--color-paper-border)]'
                      }`}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {THEME_CATALOG.filter((t) => t.group === activeGroup).map((preset) => {
                  const isSelected = activeThemeId === preset.id && !customBgColor;
                  const palette = deriveThemePalette(preset.bg, preset.accent);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setThemeId(preset.id)}
                      style={{
                        backgroundColor: palette.colorPaper,
                        borderColor: isSelected ? palette.colorAccent : palette.colorPaperBorder,
                      }}
                      className={`p-3 rounded-sm border-2 text-left relative transition-all group hover:shadow-md cursor-pointer ${
                        isSelected ? 'ring-2 ring-[var(--color-accent)] shadow-md' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: preset.bg }}
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs shrink-0"
                          />
                          <span
                            style={{ color: palette.colorInk }}
                            className="font-bold text-xs tracking-tight truncate max-w-[150px]"
                          >
                            {preset.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span
                            style={{ backgroundColor: palette.colorAccent, color: '#fff' }}
                            className="p-0.5 rounded-full"
                          >
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <p
                        style={{ color: palette.colorInkSecondary }}
                        className="text-[11px] leading-tight line-clamp-2"
                      >
                        {preset.description}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                        <span style={{ color: palette.colorInkMuted }}>
                          {palette.isDark ? 'Dark Edition' : 'Light Broadsheet'}
                        </span>
                        <span
                          style={{
                            color: palette.colorAccent,
                            borderColor: palette.colorPaperBorder,
                          }}
                          className="px-1.5 py-0.2 rounded-2xs border bg-black/5"
                        >
                          {getContrastRatio(palette.colorPaper, palette.colorInk).toFixed(1)}:1
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--color-ink-muted)]">
              Press Escape to close
            </span>
            <button
              onClick={() => setThemeStudioOpen(false)}
              className="px-5 py-2 rounded-sm bg-[var(--color-ink)] text-[var(--color-paper)] font-serif text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

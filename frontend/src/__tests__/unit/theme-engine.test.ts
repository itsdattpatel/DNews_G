/**
 * frontend/src/__tests__/unit/theme-engine.test.ts
 * Unit tests for the 50-Theme Broadsheet Catalog & Mathematical Contrast Derivation Engine.
 */
import { describe, it, expect } from 'vitest';
import {
  THEME_CATALOG,
  getRelativeLuminance,
  getContrastRatio,
  deriveThemePalette,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  normalizeHex,
} from '../../styles/themes';

describe('Broadsheet 50-Theme Catalog & Contrast Engine', () => {
  it('contains exactly 50 distinct curated themes across 5 groups', () => {
    expect(THEME_CATALOG).toHaveLength(50);

    const ids = new Set(THEME_CATALOG.map((t) => t.id));
    expect(ids.size).toBe(50); // No duplicate IDs

    const groups = new Set(THEME_CATALOG.map((t) => t.group));
    expect(groups.size).toBe(5);

    expect(THEME_CATALOG.filter((t) => t.group === 'Royal & Imperial')).toHaveLength(10);
    expect(THEME_CATALOG.filter((t) => t.group === 'Vintage Broadsheet')).toHaveLength(10);
    expect(THEME_CATALOG.filter((t) => t.group === 'Aesthetic & Earth')).toHaveLength(10);
    expect(THEME_CATALOG.filter((t) => t.group === 'Nocturne & Contrast')).toHaveLength(10);
    expect(THEME_CATALOG.filter((t) => t.group === 'Modern Editorial')).toHaveLength(10);
  });

  it('normalizes hex strings accurately', () => {
    expect(normalizeHex('#fff')).toBe('#FFFFFF');
    expect(normalizeHex('000')).toBe('#000000');
    expect(normalizeHex('#faf7f0')).toBe('#FAF7F0');
    expect(normalizeHex('#12345678')).toBe('#123456');
  });

  it('correctly converts between RGB and Hex', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(rgbToHex(250, 247, 240)).toBe('#FAF7F0');
    expect(rgbToHex(14, 12, 9)).toBe('#0E0C09');
  });

  it('correctly converts between RGB and HSL', () => {
    const hsl = rgbToHsl(255, 0, 0); // Pure Red
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);

    const rgb = hslToRgb(0, 100, 50);
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('calculates WCAG 2.1 relative luminance according to sRGB specification', () => {
    expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1.0, 2);
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0.0, 2);
    // Gray middle luminance
    const grayLum = getRelativeLuminance('#808080');
    expect(grayLum).toBeGreaterThan(0.2);
    expect(grayLum).toBeLessThan(0.3);
  });

  it('calculates WCAG 2.1 contrast ratio correctly', () => {
    // Black and white contrast ratio is exactly 21:1
    const maxRatio = getContrastRatio('#FFFFFF', '#000000');
    expect(maxRatio).toBeCloseTo(21.0, 1);

    // Identical colors have contrast 1:1
    const minRatio = getContrastRatio('#FAF7F0', '#FAF7F0');
    expect(minRatio).toBeCloseTo(1.0, 1);
  });

  it('derives high-contrast palette exceeding 7:1 (WCAG AAA) for every curated theme in catalog', () => {
    THEME_CATALOG.forEach((theme) => {
      const palette = deriveThemePalette(theme.bg, theme.accent);

      expect(palette.colorPaper).toBe(normalizeHex(theme.bg));
      expect(palette.colorInk).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.colorPaperAlt).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.colorPaperBorder).toMatch(/^#[0-9A-F]{6}$/);

      // Contrast between ink and paper must exceed 7:1 (WCAG AAA normal text)
      const ratio = getContrastRatio(palette.colorPaper, palette.colorInk);
      expect(ratio).toBeGreaterThanOrEqual(7.0);

      // Contrast for secondary text must exceed 4.5:1 (WCAG AA)
      const secRatio = getContrastRatio(palette.colorPaper, palette.colorInkSecondary);
      expect(secRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('dynamically handles arbitrary custom RGB backgrounds with guaranteed readability', () => {
    const customColors = [
      '#FFFAF0', // Floral White
      '#050505', // Pitch Black
      '#3D2314', // Deep Mahogany
      '#0F2D3C', // Deep Teal
      '#E8D8A0', // Warm Sand
      '#784212', // Rust Brown
      '#5B2C6F', // Deep Amethyst
      '#117A65', // Dark Jade
      '#FADBD8', // Soft Rose
      '#1B2631', // Deep Charcoal
    ];

    customColors.forEach((color) => {
      const palette = deriveThemePalette(color);
      const ratio = getContrastRatio(palette.colorPaper, palette.colorInk);
      expect(ratio).toBeGreaterThanOrEqual(4.5); // Guaranteed WCAG AA across arbitrary user colors
    });
  });
});

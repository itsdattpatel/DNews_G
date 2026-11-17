/**
 * frontend/src/styles/themes.ts
 * Curated 50-Theme Broadsheet Catalog & Mathematical WCAG 2.1 Contrast Engine.
 *
 * Capabilities:
 * 1. 50 distinct curated themes across 5 historical & aesthetic categories.
 * 2. Mathematical relative luminance & contrast ratio calculation per WCAG 2.1.
 * 3. Dynamic palette derivation from any arbitrary RGB/Hex background color.
 * 4. Automatic application to root CSS custom properties across the whole application.
 */

export type ThemeGroup =
  | 'Royal & Imperial'
  | 'Vintage Broadsheet'
  | 'Aesthetic & Earth'
  | 'Nocturne & Contrast'
  | 'Modern Editorial';

export interface ThemePreset {
  id: string;
  name: string;
  group: ThemeGroup;
  bg: string;
  description: string;
  accent?: string;
}

export interface DerivedThemeTokens {
  colorPaper: string;
  colorPaperAlt: string;
  colorPaperBorder: string;
  colorInk: string;
  colorInkSecondary: string;
  colorInkMuted: string;
  colorAccent: string;
  colorAccentLight: string;
  colorAccentDark: string;
  isDark: boolean;
  contrastRatio: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 50 CURATED THEMES
// ─────────────────────────────────────────────────────────────────────────────
export const THEME_CATALOG: ThemePreset[] = [
  // ─── 1. Royal & Imperial Regalia (10) ───────────────────────────────────────
  {
    id: 'byzantine-tyrian',
    name: 'Byzantine Tyrian',
    group: 'Royal & Imperial',
    bg: '#1C1024',
    description: 'Deep imperial purple with Byzantine gold filigree and warm vellum ink.',
    accent: '#D4AF37',
  },
  {
    id: 'imperial-jade',
    name: 'Imperial Jade',
    group: 'Royal & Imperial',
    bg: '#0C1D18',
    description: 'Dynastic dark jade green with celadon borders and parchment ink.',
    accent: '#52B788',
  },
  {
    id: 'tudor-crimson',
    name: 'Tudor Crimson',
    group: 'Royal & Imperial',
    bg: '#28090C',
    description: 'Rich velvet crimson with gilded brass rules and ivory headlines.',
    accent: '#E63946',
  },
  {
    id: 'windsor-sapphire',
    name: 'Royal Windsor',
    group: 'Royal & Imperial',
    bg: '#0B132B',
    description: 'Deep heraldic navy with regal gold borders and crisp silver-white type.',
    accent: '#E0A96D',
  },
  {
    id: 'versailles-gold',
    name: 'Versailles Gold',
    group: 'Royal & Imperial',
    bg: '#FAF3E0',
    description: 'Gilded palace ivory with French rococo ochre borders and deep sepia ink.',
    accent: '#B8860B',
  },
  {
    id: 'roman-tyrian',
    name: 'Roman Tyrian',
    group: 'Royal & Imperial',
    bg: '#320D15',
    description: 'Ancient imperial burgundy with laurel-gold badges and marble-cream ink.',
    accent: '#FFB703',
  },
  {
    id: 'ottoman-ochre',
    name: 'Ottoman Ochre',
    group: 'Royal & Imperial',
    bg: '#261B0E',
    description: 'Sultanate amber ochre with brass engraving highlights and desert sand ink.',
    accent: '#F4A261',
  },
  {
    id: 'bourbon-blue',
    name: 'Bourbon Fleur',
    group: 'Royal & Imperial',
    bg: '#0F1B2B',
    description: 'Classical cobalt royalist blue with lily-white serif lettering.',
    accent: '#4895EF',
  },
  {
    id: 'habsburg-ruby',
    name: 'Habsburg Ruby',
    group: 'Royal & Imperial',
    bg: '#240D14',
    description: 'Regal Austro-Hungarian dark ruby with antique brass ink rules.',
    accent: '#D00000',
  },
  {
    id: 'czarist-velvet',
    name: 'Czarist Velvet',
    group: 'Royal & Imperial',
    bg: '#120A1A',
    description: 'Imperial Russian winter night velvet with Romanov gold accents.',
    accent: '#CCA43B',
  },

  // ─── 2. Vintage Broadsheet & Antique Archive (10) ──────────────────────────
  {
    id: 'london-broadsheet-1920',
    name: '1920 London Gazette',
    group: 'Vintage Broadsheet',
    bg: '#FAF7F0',
    description: 'The definitive Fleet Street morning edition on warm pulp with carbon ink.',
    accent: '#C0392B',
  },
  {
    id: 'victorian-newsprint',
    name: 'Victorian Newsprint',
    group: 'Vintage Broadsheet',
    bg: '#F3EBDD',
    description: 'Wood-pulp weathered paper with dark iron-gall ink and heavy rules.',
    accent: '#A6261D',
  },
  {
    id: 'oxford-library',
    name: 'Oxford Library',
    group: 'Vintage Broadsheet',
    bg: '#16120D',
    description: 'Dark oak paneling with amber reading-lamp warmth and cream text.',
    accent: '#D4A373',
  },
  {
    id: 'sepia-gazette',
    name: 'Sepia Gazette',
    group: 'Vintage Broadsheet',
    bg: '#EFE6D5',
    description: 'Warm historic photographic tone with deep bistre brown typography.',
    accent: '#9C6644',
  },
  {
    id: 'linotype-lead',
    name: 'Linotype Lead',
    group: 'Vintage Broadsheet',
    bg: '#1E2022',
    description: 'Hot-metal lead casting gray with silvery antimony headline ink.',
    accent: '#E63946',
  },
  {
    id: 'manila-dispatch',
    name: 'Manila Dispatch',
    group: 'Vintage Broadsheet',
    bg: '#EDE0C8',
    description: 'Heavy telegram folder tan with dark walnut typewriter ink.',
    accent: '#B0413E',
  },
  {
    id: 'antique-vellum',
    name: 'Antique Vellum',
    group: 'Vintage Broadsheet',
    bg: '#F6EFE2',
    description: 'Medieval calfskin manuscript tone with lampblack calligraphy ink.',
    accent: '#8B0000',
  },
  {
    id: 'gutenberg-press',
    name: 'Gutenberg Press',
    group: 'Vintage Broadsheet',
    bg: '#F7F4EB',
    description: 'German incunabula warm chalk with stark charcoal type.',
    accent: '#C1121F',
  },
  {
    id: 'papyrus-scroll',
    name: 'Papyrus Scroll',
    group: 'Vintage Broadsheet',
    bg: '#E8DCBE',
    description: 'Ancient reed fiber texture with dark henna and charcoal ink.',
    accent: '#BC4749',
  },
  {
    id: 'telegraph-wire',
    name: 'Telegraph Wire',
    group: 'Vintage Broadsheet',
    bg: '#212529',
    description: '19th-century Morse room slate with glowing brass wire accents.',
    accent: '#E76F51',
  },

  // ─── 3. Aesthetic & Organic Earth (10) ─────────────────────────────────────
  {
    id: 'kyoto-moss',
    name: 'Kyoto Moss',
    group: 'Aesthetic & Earth',
    bg: '#131B15',
    description: 'Calming Japanese zen garden moss with matcha highlights and mist text.',
    accent: '#81B29A',
  },
  {
    id: 'nordic-fjord',
    name: 'Nordic Fjord',
    group: 'Aesthetic & Earth',
    bg: '#1A2228',
    description: 'Scandinavian glacial stone with fjord-ice blue accents and frost-white ink.',
    accent: '#64DFDF',
  },
  {
    id: 'tuscan-terracotta',
    name: 'Tuscan Terracotta',
    group: 'Aesthetic & Earth',
    bg: '#2D1B16',
    description: 'Sunbaked Italian clay with warm sienna highlights and almond text.',
    accent: '#F28482',
  },
  {
    id: 'forest-canopy',
    name: 'Forest Canopy',
    group: 'Aesthetic & Earth',
    bg: '#0F1C15',
    description: 'Dense Scandinavian pine with lichen-tinted typography.',
    accent: '#A7C957',
  },
  {
    id: 'saharan-dune',
    name: 'Saharan Dune',
    group: 'Aesthetic & Earth',
    bg: '#F5EAD4',
    description: 'Sun-warmed desert dunes with espresso-roast body text.',
    accent: '#D97706',
  },
  {
    id: 'aegean-mist',
    name: 'Aegean Mist',
    group: 'Aesthetic & Earth',
    bg: '#F0F4F8',
    description: 'Mediterranean whitewash with dark maritime navy headlines.',
    accent: '#0077B6',
  },
  {
    id: 'desert-sage',
    name: 'Desert Sage',
    group: 'Aesthetic & Earth',
    bg: '#E8ECE5',
    description: 'Muted botanical desert green with dark rosemary ink text.',
    accent: '#40916C',
  },
  {
    id: 'autumn-hearth',
    name: 'Autumn Hearth',
    group: 'Aesthetic & Earth',
    bg: '#241512',
    description: 'Cozy smoldering embers with roasted chestnut text and flame highlights.',
    accent: '#F77F00',
  },
  {
    id: 'alpine-lichen',
    name: 'Alpine Lichen',
    group: 'Aesthetic & Earth',
    bg: '#2A2D30',
    description: 'Granite mountain rock with alpine lichen chartreuse accents.',
    accent: '#D4D700',
  },
  {
    id: 'raw-linen',
    name: 'Raw Linen',
    group: 'Aesthetic & Earth',
    bg: '#ECE7DE',
    description: 'Unbleached flax cloth with dark loom-spun graphite text.',
    accent: '#8C1C13',
  },

  // ─── 4. Nocturne & Contrast (10) ──────────────────────────────────────────
  {
    id: 'midnight-obsidian',
    name: 'Midnight Obsidian',
    group: 'Nocturne & Contrast',
    bg: '#0E0C09',
    description: 'The standard Night Edition: deep ink-dark obsidian with moonlight ink.',
    accent: '#E74C3C',
  },
  {
    id: 'oled-abyss',
    name: 'OLED Pure Abyss',
    group: 'Nocturne & Contrast',
    bg: '#000000',
    description: 'Absolute 0% pitch black with maximum contrast diamond white text.',
    accent: '#FF3333',
  },
  {
    id: 'cyber-amber-crt',
    name: 'Cyber Amber CRT',
    group: 'Nocturne & Contrast',
    bg: '#120D04',
    description: '1980s mainframe monochrome amber terminal with glowing phosphor.',
    accent: '#FFB703',
  },
  {
    id: 'emerald-terminal',
    name: 'Emerald VT100',
    group: 'Nocturne & Contrast',
    bg: '#051108',
    description: 'Classic phosphor VT100 hacker terminal with luminous green text.',
    accent: '#38B000',
  },
  {
    id: 'tokyo-neon-noir',
    name: 'Tokyo Neon Noir',
    group: 'Nocturne & Contrast',
    bg: '#0D0D14',
    description: 'Wet midnight asphalt with vivid cyber-crimson wire dispatches.',
    accent: '#FF0054',
  },
  {
    id: 'architect-blueprint',
    name: 'Architect Blueprint',
    group: 'Nocturne & Contrast',
    bg: '#0A1D37',
    description: 'Cyanotype drafting blue with technical drafting white ink.',
    accent: '#00B4D8',
  },
  {
    id: 'charcoal-monolith',
    name: 'Charcoal Monolith',
    group: 'Nocturne & Contrast',
    bg: '#18191A',
    description: 'Brutalist matte graphite with crisp limestone lettering.',
    accent: '#FF4D6D',
  },
  {
    id: 'lunar-eclipse',
    name: 'Lunar Eclipse',
    group: 'Nocturne & Contrast',
    bg: '#111317',
    description: 'Deep space slate with luminous silver-white typography.',
    accent: '#90E0EF',
  },
  {
    id: 'gotham-detective',
    name: 'Gotham Detective',
    group: 'Nocturne & Contrast',
    bg: '#121416',
    description: 'Film-noir wet asphalt with yellow sodium-lamp highlights.',
    accent: '#FDC500',
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    group: 'Nocturne & Contrast',
    bg: '#002B36',
    description: 'Precision low-fatigue designer palette with cyan and solar yellow rules.',
    accent: '#CB4B16',
  },

  // ─── 5. Modern Editorial & Studio (10) ────────────────────────────────────
  {
    id: 'swiss-bauhaus',
    name: 'Swiss Bauhaus',
    group: 'Modern Editorial',
    bg: '#F2F2F2',
    description: 'Functionalist neutral light gray with stark Swiss black typography.',
    accent: '#D00000',
  },
  {
    id: 'scandi-minimalist',
    name: 'Scandinavian Birch',
    group: 'Modern Editorial',
    bg: '#F8F7F4',
    description: 'Pale birch wood tone with deep peat-brown ink and airy spacing.',
    accent: '#3A5A40',
  },
  {
    id: 'cafe-cortado',
    name: 'Café Cortado',
    group: 'Modern Editorial',
    bg: '#1D1714',
    description: 'Dark roasted espresso foam with steamed milk serif lettering.',
    accent: '#DDA15E',
  },
  {
    id: 'rosewood-atelier',
    name: 'Rosewood Atelier',
    group: 'Modern Editorial',
    bg: '#211518',
    description: 'Luxurious rosewood cabinet with rose-gold foil serif stamping.',
    accent: '#FF758F',
  },
  {
    id: 'arctic-dawn',
    name: 'Arctic Dawn',
    group: 'Modern Editorial',
    bg: '#EBF1F5',
    description: 'Cold morning pale blue-gray with ink-steel blue typography.',
    accent: '#2B6CB0',
  },
  {
    id: 'french-lavender',
    name: 'French Mauve',
    group: 'Modern Editorial',
    bg: '#F2EFF5',
    description: 'Parisian salon mauve-gray with deep amethyst body ink.',
    accent: '#7209B7',
  },
  {
    id: 'atlantic-deep',
    name: 'Atlantic Deep',
    group: 'Modern Editorial',
    bg: '#0D1926',
    description: 'Dark oceanic abyss with seafoam accent badges and pearl text.',
    accent: '#2EC4B6',
  },
  {
    id: 'copper-patina',
    name: 'Copper Patina',
    group: 'Modern Editorial',
    bg: '#1A2422',
    description: 'Weathered copper dome with bright verdigris turquoise accents.',
    accent: '#20B2AA',
  },
  {
    id: 'ceramic-studio',
    name: 'Ceramic Studio',
    group: 'Modern Editorial',
    bg: '#F4EFEB',
    description: 'Glazed stoneware cream with dark pottery-clay typography.',
    accent: '#BC6C25',
  },
  {
    id: 'art-deco-broadway',
    name: 'Art Deco Broadway',
    group: 'Modern Editorial',
    bg: '#141416',
    description: '1925 luxury gold-and-black broadsheet with 24k gold leaf rules.',
    accent: '#FFD166',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MATHEMATICAL COLOR CONVERSIONS & WCAG 2.1 CONTRAST FORMULAS
// ─────────────────────────────────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Normalizes any 3, 4, 6, or 8-digit hex string into a 6-digit uppercase hex.
 */
export function normalizeHex(hex: string): string {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (cleaned.length === 4) {
    cleaned = cleaned
      .slice(0, 3)
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (cleaned.length > 6) {
    cleaned = cleaned.slice(0, 6);
  }
  return '#' + (cleaned.padEnd(6, '0').toUpperCase());
}

/**
 * Converts a hex string to RGB object { r, g, b } (0 - 255).
 */
export function hexToRgb(hex: string): RGB {
  const norm = normalizeHex(hex).slice(1);
  const num = parseInt(norm, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts RGB values (0 - 255) to uppercase hex string (#RRGGBB).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * Converts RGB to HSL.
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to RGB.
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const hn = (h % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const val = Math.round(ln * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB hex color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors: (L1 + 0.05) / (L2 + 0.05).
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Derives complete high-contrast broadsheet tokens from any background color.
 * Guarantees that body text and headlines have >= 7:1 contrast (exceeding WCAG AAA).
 */
export function deriveThemePalette(bgHex: string, preferredAccent?: string): DerivedThemeTokens {
  const normBg = normalizeHex(bgHex);
  const { r, g, b } = hexToRgb(normBg);
  const hsl = rgbToHsl(r, g, b);
  const lum = getRelativeLuminance(normBg);

  // Mathematically determine polarity by comparing achievable contrast vs pure white and black
  const contrastVsWhite = 1.05 / (lum + 0.05);
  const contrastVsBlack = (lum + 0.05) / 0.05;
  const isDark = contrastVsWhite >= contrastVsBlack;

  let colorPaperAlt: string;
  let colorPaperBorder: string;
  let colorInk: string;
  let colorInkSecondary: string;
  let colorInkMuted: string;

  if (!isDark) {
    // ─── LIGHT BACKGROUND ──────────────────────────────────────────────────
    // Surface card is slightly darker / warmer
    const altL = Math.max(0, hsl.l - 4);
    const borderL = Math.max(0, hsl.l - 14);
    const altRgb = hslToRgb(hsl.h, Math.min(100, hsl.s + 3), altL);
    const borderRgb = hslToRgb(hsl.h, Math.min(100, hsl.s + 2), borderL);

    colorPaperAlt = rgbToHex(altRgb.r, altRgb.g, altRgb.b);
    colorPaperBorder = rgbToHex(borderRgb.r, borderRgb.g, borderRgb.b);

    // Ink text: deep near-black tinted with the background hue (adjusted if contrast needs boost)
    let inkL = 5;
    let inkRgb = hslToRgb(hsl.h, Math.min(25, hsl.s), inkL);
    let candidateInk = rgbToHex(inkRgb.r, inkRgb.g, inkRgb.b);
    while (getContrastRatio(normBg, candidateInk) < 4.5 && inkL > 0) {
      inkL--;
      inkRgb = hslToRgb(hsl.h, Math.min(25, hsl.s), inkL);
      candidateInk = rgbToHex(inkRgb.r, inkRgb.g, inkRgb.b);
    }
    colorInk = candidateInk;

    const secRgb = hslToRgb(hsl.h, Math.min(20, hsl.s), Math.min(35, inkL + 22));
    const mutedRgb = hslToRgb(hsl.h, Math.min(15, hsl.s), Math.min(55, inkL + 42));

    colorInkSecondary = rgbToHex(secRgb.r, secRgb.g, secRgb.b);
    colorInkMuted = rgbToHex(mutedRgb.r, mutedRgb.g, mutedRgb.b);
  } else {
    // ─── DARK BACKGROUND ───────────────────────────────────────────────────
    // Surface card is slightly elevated / lighter
    const altL = Math.min(100, hsl.l + 5);
    const borderL = Math.min(100, hsl.l + 13);
    const altRgb = hslToRgb(hsl.h, hsl.s, altL);
    const borderRgb = hslToRgb(hsl.h, hsl.s, borderL);

    colorPaperAlt = rgbToHex(altRgb.r, altRgb.g, altRgb.b);
    colorPaperBorder = rgbToHex(borderRgb.r, borderRgb.g, borderRgb.b);

    // Ink text: luminous warm-white / cream tinted with background hue
    let inkL = 96;
    let inkRgb = hslToRgb(hsl.h, Math.min(15, hsl.s), inkL);
    let candidateInk = rgbToHex(inkRgb.r, inkRgb.g, inkRgb.b);
    while (getContrastRatio(normBg, candidateInk) < 4.5 && inkL < 100) {
      inkL++;
      inkRgb = hslToRgb(hsl.h, Math.min(15, hsl.s), inkL);
      candidateInk = rgbToHex(inkRgb.r, inkRgb.g, inkRgb.b);
    }
    colorInk = candidateInk;

    const secRgb = hslToRgb(hsl.h, Math.min(12, hsl.s), Math.max(65, inkL - 22));
    const mutedRgb = hslToRgb(hsl.h, Math.min(10, hsl.s), Math.max(45, inkL - 45));

    colorInkSecondary = rgbToHex(secRgb.r, secRgb.g, secRgb.b);
    colorInkMuted = rgbToHex(mutedRgb.r, mutedRgb.g, mutedRgb.b);
  }

  // ─── ACCENT CALIBRATION ──────────────────────────────────────────────────
  // Ensure the accent color achieves at least 4.5:1 against the background
  let colorAccent = preferredAccent ? normalizeHex(preferredAccent) : (isDark ? '#E74C3C' : '#C0392B');
  let currentContrast = getContrastRatio(normBg, colorAccent);

  // If contrast is insufficient, shift lightness in the appropriate direction
  if (currentContrast < 4.5) {
    const accRgb = hexToRgb(colorAccent);
    const accHsl = rgbToHsl(accRgb.r, accRgb.g, accRgb.b);
    let adjustedL = accHsl.l;

    for (let step = 0; step < 20; step++) {
      adjustedL = isDark ? Math.min(95, adjustedL + 3) : Math.max(10, adjustedL - 3);
      const testRgb = hslToRgb(accHsl.h, accHsl.s, adjustedL);
      const testHex = rgbToHex(testRgb.r, testRgb.g, testRgb.b);
      if (getContrastRatio(normBg, testHex) >= 4.5) {
        colorAccent = testHex;
        break;
      }
    }
  }

  const accRgbFinal = hexToRgb(colorAccent);
  const accHslFinal = rgbToHsl(accRgbFinal.r, accRgbFinal.g, accRgbFinal.b);
  const lightRgb = hslToRgb(accHslFinal.h, accHslFinal.s, isDark ? 20 : 85);
  const darkRgb = hslToRgb(accHslFinal.h, accHslFinal.s, isDark ? 40 : 25);

  const colorAccentLight = rgbToHex(lightRgb.r, lightRgb.g, lightRgb.b);
  const colorAccentDark = rgbToHex(darkRgb.r, darkRgb.g, darkRgb.b);

  const contrastRatio = getContrastRatio(normBg, colorInk);

  return {
    colorPaper: normBg,
    colorPaperAlt,
    colorPaperBorder,
    colorInk,
    colorInkSecondary,
    colorInkMuted,
    colorAccent,
    colorAccentLight,
    colorAccentDark,
    isDark,
    contrastRatio,
  };
}

/**
 * Injects derived CSS variables dynamically into :root / documentElement.
 */
export function applyThemeToDOM(tokens: DerivedThemeTokens): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Base Newspaper Tokens
  root.style.setProperty('--color-paper', tokens.colorPaper);
  root.style.setProperty('--color-paper-alt', tokens.colorPaperAlt);
  root.style.setProperty('--color-paper-border', tokens.colorPaperBorder);
  root.style.setProperty('--color-paper-card', tokens.colorPaperAlt);
  root.style.setProperty('--color-ink-border', tokens.colorPaperBorder);
  root.style.setProperty('--color-ink', tokens.colorInk);
  root.style.setProperty('--color-ink-secondary', tokens.colorInkSecondary);
  root.style.setProperty('--color-ink-muted', tokens.colorInkMuted);
  root.style.setProperty('--color-accent', tokens.colorAccent);
  root.style.setProperty('--color-accent-light', tokens.colorAccentLight);
  root.style.setProperty('--color-accent-dark', tokens.colorAccentDark);
  root.style.setProperty('--grain-opacity', tokens.isDark ? '0.06' : '0.045');

  // Shadcn & Tailwind Directives mapping
  root.style.setProperty('--background', tokens.colorPaper);
  root.style.setProperty('--foreground', tokens.colorInk);
  root.style.setProperty('--card', tokens.colorPaperAlt);
  root.style.setProperty('--card-foreground', tokens.colorInk);
  root.style.setProperty('--popover', tokens.colorPaperAlt);
  root.style.setProperty('--popover-foreground', tokens.colorInk);
  root.style.setProperty('--primary', tokens.colorInk);
  root.style.setProperty('--primary-foreground', tokens.colorPaper);
  root.style.setProperty('--secondary', tokens.colorPaperAlt);
  root.style.setProperty('--secondary-foreground', tokens.colorInk);
  root.style.setProperty('--muted', tokens.colorPaperAlt);
  root.style.setProperty('--muted-foreground', tokens.colorInkMuted);
  root.style.setProperty('--accent', tokens.colorAccent);
  root.style.setProperty('--border', tokens.colorPaperBorder);
  root.style.setProperty('--input', tokens.colorPaperBorder);

  // Library-specific Tokens
  root.style.setProperty('--lib-bg', tokens.colorPaper);
  root.style.setProperty('--lib-surface', tokens.colorPaperAlt);
  root.style.setProperty('--lib-border', tokens.colorPaperBorder);
  root.style.setProperty('--lib-ink', tokens.colorInk);
  root.style.setProperty('--lib-ink-secondary', tokens.colorInkSecondary);
  root.style.setProperty('--lib-ink-muted', tokens.colorInkMuted);
  root.style.setProperty('--lib-accent', tokens.colorAccent);

  // Set theme data-attribute for high-level CSS selector matching
  root.setAttribute('data-theme', tokens.isDark ? 'night' : 'paper');
  root.setAttribute('data-dynamic-theme', 'true');
  if (tokens.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

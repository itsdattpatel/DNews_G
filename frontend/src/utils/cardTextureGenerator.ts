/**
 * frontend/src/utils/cardTextureGenerator.ts
 * Generates crisp 2D canvas textures of rectangular broadsheet news cards
 * for the React Bits <CircularGallery /> WebGL shader pipeline.
 */
import type { Article } from '../types';

interface CardStyleOptions {
  isDark?: boolean;
  paperColor?: string;
  inkColor?: string;
  borderColor?: string;
  accentColor?: string;
}

// In-memory cache for rendered card data URLs
const textureCache = new Map<string, string>();

export function generateArticleCardTexture(
  article: Article,
  isSelected: boolean = false,
  options: CardStyleOptions = {}
): string {
  const isDark = options.isDark ?? false;
  const paper = options.paperColor || (isDark ? '#1C1914' : '#FDFCFA');
  const ink = options.inkColor || (isDark ? '#E8E4DA' : '#1A1208');
  const inkSecondary = isDark ? '#A89880' : '#5C4E3A';
  const border = isSelected
    ? (isDark ? '#C0392B' : '#1A1208')
    : (options.borderColor || (isDark ? '#3D362A' : '#D9D0BE'));
  const accent = options.accentColor || '#C0392B';

  const cacheKey = `${article.id}-${isSelected ? 'sel' : 'std'}-${isDark ? 'dark' : 'light'}-${article.title_english?.slice(0, 20)}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  // Safe SSR / Vitest Node environment fallback
  if (typeof document === 'undefined') {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="560" height="280"><rect width="100%" height="100%" fill="%23FAF7F0"/></svg>';
  }

  // 2x Retina resolution: 560 x 280 (aspect ratio 2.0)
  const width = 560;
  const height = 280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // 1. Card Background & Outer Border
  const radius = 12;
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, radius);
  ctx.fillStyle = paper;
  ctx.fill();

  ctx.lineWidth = isSelected ? 4 : 2;
  ctx.strokeStyle = border;
  ctx.stroke();

  // Highlight bar for selected card
  if (isSelected) {
    ctx.beginPath();
    ctx.roundRect(4, 4, width - 8, 8, [radius, radius, 0, 0]);
    ctx.fillStyle = isDark ? '#E8E4DA' : '#1A1208';
    ctx.fill();
  }

  // 2. Outlet & Country Header
  const outletName = (article.source?.name || 'GLOBAL WIRE').toUpperCase();
  const country = (article.source?.country || '').toUpperCase();
  const isBreaking = (article.breaking_score ?? 0) >= 75;

  ctx.font = 'bold 16px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = ink;
  ctx.fillText(outletName, 24, 42);

  const outletWidth = ctx.measureText(outletName).width;
  if (country) {
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillStyle = inkSecondary;
    ctx.fillText(`· ${country}`, 24 + outletWidth + 8, 42);
  }

  // Breaking score badge
  if (isBreaking) {
    const badgeText = `★ BREAKING ${article.breaking_score}%`;
    ctx.font = 'bold 13px "Courier New", monospace';
    const badgeWidth = ctx.measureText(badgeText).width + 16;
    ctx.fillStyle = 'rgba(192, 57, 43, 0.15)';
    ctx.fillRect(width - 24 - badgeWidth, 26, badgeWidth, 24);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(width - 24 - badgeWidth, 26, badgeWidth, 24);
    ctx.fillStyle = accent;
    ctx.fillText(badgeText, width - 24 - badgeWidth + 8, 42);
  }

  // 3. Thin separator rule
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 58);
  ctx.lineTo(width - 24, 58);
  ctx.stroke();

  // 4. Headline (Multi-line bold broadsheet serif)
  const title = article.title_english || article.title_original || 'Untitled Dispatch';
  ctx.font = 'bold 25px "Playfair Display", "Source Serif 4", "Georgia", serif';
  ctx.fillStyle = ink;

  const maxWidth = width - 48;
  const words = title.split(' ');
  let line = '';
  let y = 92;
  const lineHeight = 34;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), 24, y);
      line = words[n] + ' ';
      y += lineHeight;
      linesCount++;
      if (linesCount >= 3) {
        // truncate with ellipsis
        if (n < words.length - 1) {
          line = line.trim() + '…';
        }
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (linesCount < 3 && line) {
    ctx.fillText(line.trim(), 24, y);
  }

  // 5. Footer: Category Ink-Stamp & Timestamp
  const category = (article.categories && article.categories[0]) || 'WORLD';
  ctx.font = 'bold 12px "Inter", sans-serif';
  const catWidth = ctx.measureText(category.toUpperCase()).width + 16;

  // Category Stamp Box
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(24, height - 44, catWidth, 22);
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
  ctx.strokeRect(24, height - 44, catWidth, 22);

  ctx.fillStyle = inkSecondary;
  ctx.fillText(category.toUpperCase(), 32, height - 28);

  // Focus Indicator on Footer for Selected Card
  if (isSelected) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(catWidth + 40, height - 33, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = accent;
    ctx.fillText('READING FOCUS', catWidth + 50, height - 29);
  }

  // Dual/Relative Timestamp
  let timeStr = 'RECENT';
  if (article.published_at) {
    try {
      const d = new Date(article.published_at);
      const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMin < 60) timeStr = `${Math.max(1, diffMin)}m ago`;
      else if (diffMin < 1440) timeStr = `${Math.floor(diffMin / 60)}h ago`;
      else timeStr = `${Math.floor(diffMin / 1440)}d ago`;
    } catch {
      timeStr = 'WIRE';
    }
  }

  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = inkSecondary;
  const timeWidth = ctx.measureText(timeStr).width;
  ctx.fillText(timeStr, width - 24 - timeWidth, height - 28);

  const dataUrl = canvas.toDataURL('image/png');
  textureCache.set(cacheKey, dataUrl);
  return dataUrl;
}

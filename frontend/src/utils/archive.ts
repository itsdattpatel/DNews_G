/**
 * frontend/src/utils/archive.ts
 * Utility helpers and citation parser for Broadsheet Archive Morgue Desk (Screen f).
 */

export interface ParsedCitationPart {
  type: 'text' | 'citation';
  content: string;
  citationIndex?: number;
}

/**
 * Splits synthesized AI answer into text segments and bracket citations e.g. [1], [2]
 */
export function parseCitations(text: string): ParsedCitationPart[] {
  if (!text) return [];
  const parts: ParsedCitationPart[] = [];
  const regex = /(\[\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    const citationIndex = parseInt(match[1]!.replace(/\[|\]/g, ''), 10);
    parts.push({
      type: 'citation',
      content: match[1]!,
      citationIndex,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return parts;
}

/**
 * Normalizes score to 1-5 broadsheet star/rating value
 */
export function formatRelevanceScore(rawScore: number): string {
  if (rawScore <= 0) return '1.0';
  const clamped = Math.min(Math.max(rawScore, 1), 5);
  return clamped.toFixed(1);
}

export const ARCHIVE_SUGGESTION_CHIPS = [
  'Tiger population in Asia',
  'Global clean energy investment',
  'Optical quantum computing',
  'Transboundary wildlife corridors',
  'Endangered species conservation',
  'Central banking interest rates',
];


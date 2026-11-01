/**
 * frontend/src/utils/briefing-pdf.ts
 * Utility functions for Morning Radio Briefing audio synthesis and Daily Newspaper PDF generation.
 */

/**
 * Splits briefing text into clean sentence units for karaoke-style read-aloud highlighting.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  // Match sentences ending in ., !, ?, or newlines
  const regex = /[^.!?\n]+[.!?]+|[^.!?\n]+$/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Valid speed rates supported by the broadsheet telegraph console.
 */
export const ALLOWED_SPEECH_RATES = [0.75, 1.0, 1.25, 1.5] as const;
export type SpeechRate = (typeof ALLOWED_SPEECH_RATES)[number];

/**
 * Clamps speech rate between 0.75 and 1.5.
 */
export function clampSpeechRate(rate: number): SpeechRate {
  if (typeof rate !== 'number' || isNaN(rate)) return 1.0;
  if (rate <= 0.75) return 0.75;
  if (rate <= 1.0) return 1.0;
  if (rate <= 1.25) return 1.25;
  return 1.5;
}

/**
 * Formats a Date or ISO date string into traditional broadsheet masthead date.
 * Example: "Saturday, November 1, 2026"
 */
export function formatBriefingDate(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats audio duration into digital clock representation: "1:12 / 2:00".
 */
export function formatAudioTime(currentSec: number, totalSec: number): string {
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const mins = Math.floor(s / 60);
    const remainingSecs = s % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return `${formatTime(currentSec)} / ${formatTime(totalSec)}`;
}

/**
 * Estimates reading duration in seconds for text given a speech rate.
 * Assumes a standard radio announcer pace of 150 words per minute at 1.0x.
 */
export function calculateReadingTimeSeconds(text: string, rate: number = 1.0): number {
  if (!text || typeof text !== 'string') return 0;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 0;
  const clampedRate = clampSpeechRate(rate);
  const wordsPerMinute = 150 * clampedRate;
  const minutes = wordCount / wordsPerMinute;
  return Math.max(1, Math.round(minutes * 60));
}

/**
 * Standard PDF download filename for daily edition.
 */
export function getPdfDownloadFilename(dateStr?: string): string {
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : new Date().toISOString().slice(0, 10);
  return `The_World_Desk_${date}.pdf`;
}


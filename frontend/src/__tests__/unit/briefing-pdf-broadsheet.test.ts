/**
 * frontend/src/__tests__/unit/briefing-pdf-broadsheet.test.ts
 * Unit tests for broadsheet briefing audio utilities and daily PDF generation.
 */
import { describe, it, expect } from 'vitest';
import {
  splitIntoSentences,
  clampSpeechRate,
  formatBriefingDate,
  formatAudioTime,
  calculateReadingTimeSeconds,
  getPdfDownloadFilename,
} from '../../utils/briefing-pdf';

describe('Broadsheet Morning Briefing & Daily PDF Utilities', () => {
  describe('splitIntoSentences', () => {
    it('splits a multi-sentence briefing text into distinct sentence items', () => {
      const text =
        'Good morning world. Here are the top dispatches from our global telegraph bureaus! A major storm has made landfall? We will keep you apprised.';
      const sentences = splitIntoSentences(text);
      expect(sentences).toHaveLength(4);
      expect(sentences[0]).toBe('Good morning world.');
      expect(sentences[1]).toBe('Here are the top dispatches from our global telegraph bureaus!');
      expect(sentences[2]).toBe('A major storm has made landfall?');
      expect(sentences[3]).toBe('We will keep you apprised.');
    });

    it('handles empty, null, or whitespace-only strings gracefully', () => {
      expect(splitIntoSentences('')).toEqual([]);
      expect(splitIntoSentences('   \n\t  ')).toEqual([]);
      expect(splitIntoSentences(null as unknown as string)).toEqual([]);
    });

    it('handles text without explicit terminal punctuation', () => {
      const text = 'Headline wire dispatch without period';
      const sentences = splitIntoSentences(text);
      expect(sentences).toEqual(['Headline wire dispatch without period']);
    });
  });

  describe('clampSpeechRate', () => {
    it('clamps values to supported broadsheet radio rates (0.75, 1.0, 1.25, 1.5)', () => {
      expect(clampSpeechRate(0.5)).toBe(0.75);
      expect(clampSpeechRate(0.75)).toBe(0.75);
      expect(clampSpeechRate(0.9)).toBe(1.0);
      expect(clampSpeechRate(1.0)).toBe(1.0);
      expect(clampSpeechRate(1.2)).toBe(1.25);
      expect(clampSpeechRate(1.25)).toBe(1.25);
      expect(clampSpeechRate(1.5)).toBe(1.5);
      expect(clampSpeechRate(2.0)).toBe(1.5);
      expect(clampSpeechRate(NaN)).toBe(1.0);
    });
  });

  describe('formatBriefingDate', () => {
    it('formats ISO dates into broadsheet masthead date string', () => {
      const formatted = formatBriefingDate('2026-11-01T10:00:00Z');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('November');
    });

    it('falls back to today if date string is invalid', () => {
      const formatted = formatBriefingDate('invalid-date');
      expect(formatted).toBeTruthy();
    });
  });

  describe('formatAudioTime', () => {
    it('formats current and total seconds into m:ss format', () => {
      expect(formatAudioTime(72, 120)).toBe('1:12 / 2:00');
      expect(formatAudioTime(0, 65)).toBe('0:00 / 1:05');
      expect(formatAudioTime(185, 200)).toBe('3:05 / 3:20');
    });
  });

  describe('calculateReadingTimeSeconds', () => {
    it('calculates duration in seconds based on word count and speech rate', () => {
      // 150 words at 1.0x rate = 60 seconds
      const sampleText = new Array(150).fill('dispatch').join(' ');
      const duration1x = calculateReadingTimeSeconds(sampleText, 1.0);
      expect(duration1x).toBe(60);

      // At 1.5x rate = 40 seconds
      const duration15x = calculateReadingTimeSeconds(sampleText, 1.5);
      expect(duration15x).toBe(40);
    });

    it('returns 0 for empty or null strings', () => {
      expect(calculateReadingTimeSeconds('')).toBe(0);
      expect(calculateReadingTimeSeconds(null as unknown as string)).toBe(0);
    });
  });

  describe('getPdfDownloadFilename', () => {
    it('generates broadsheet standard filename with date', () => {
      expect(getPdfDownloadFilename('2026-11-01')).toBe('The_World_Desk_2026-11-01.pdf');
    });

    it('falls back to current date if missing or invalid', () => {
      const filename = getPdfDownloadFilename();
      expect(filename).toMatch(/^The_World_Desk_\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });
});

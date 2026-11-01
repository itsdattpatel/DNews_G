/**
 * frontend/src/__tests__/unit/archive-chat-broadsheet.test.ts
 * Unit tests for Broadsheet Archive Morgue & Historical FTS5 Search Desk (Screen f).
 */
import { describe, it, expect } from 'vitest';
import {
  parseCitations,
  formatRelevanceScore,
  ARCHIVE_SUGGESTION_CHIPS,
} from '../../utils/archive';

export interface ArchivalSearchResult {
  id: number;
  title_english: string;
  summary: string;
  source_name: string;
  source_country: string;
  score: number;
  published_at: string;
}

describe('Broadsheet Archive Morgue & Search Desk (Screen f)', () => {
  it('parses synthesized AI answer into text segments and interactive bracket citations', () => {
    const rawAnswer =
      'According to initial reports [1], tiger populations rose across transboundary zones [2] before stabilizing.';
    const parsed = parseCitations(rawAnswer);

    expect(parsed.length).toBe(5);
    expect(parsed[0]).toEqual({
      type: 'text',
      content: 'According to initial reports ',
    });
    expect(parsed[1]).toEqual({
      type: 'citation',
      content: '[1]',
      citationIndex: 1,
    });
    expect(parsed[2]).toEqual({
      type: 'text',
      content: ', tiger populations rose across transboundary zones ',
    });
    expect(parsed[3]).toEqual({
      type: 'citation',
      content: '[2]',
      citationIndex: 2,
    });
    expect(parsed[4]).toEqual({
      type: 'text',
      content: ' before stabilizing.',
    });
  });

  it('correctly handles synthesized responses without any citation brackets', () => {
    const rawAnswer = 'General editorial synthesis across the whole archive.';
    const parsed = parseCitations(rawAnswer);

    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual({
      type: 'text',
      content: 'General editorial synthesis across the whole archive.',
    });
  });

  it('formats relevance scores into standard broadsheet metric', () => {
    expect(formatRelevanceScore(4.25)).toBe('4.3');
    expect(formatRelevanceScore(0.5)).toBe('1.0');
    expect(formatRelevanceScore(6.8)).toBe('5.0');
    expect(formatRelevanceScore(3)).toBe('3.0');
  });

  it('provides verified query suggestion chips', () => {
    expect(ARCHIVE_SUGGESTION_CHIPS.length).toBeGreaterThanOrEqual(4);
    expect(ARCHIVE_SUGGESTION_CHIPS).toContain('Tiger population in Asia');
    expect(ARCHIVE_SUGGESTION_CHIPS).toContain('Global clean energy investment');
  });
});

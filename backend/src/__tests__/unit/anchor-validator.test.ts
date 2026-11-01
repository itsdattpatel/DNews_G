/**
 * backend/src/__tests__/unit/anchor-validator.test.ts
 * Unit tests for Step 5: Anchor-phrase verbatim validator (SPIDER_SPEC §3.3)
 */
import { describe, it, expect } from 'vitest';
import { validateAnchorPhrases } from '../../ai/schema';

describe('Step 5: Anchor Phrase Verbatim Validator', () => {
  const sampleBody = `
    Diplomats from 190 nations reached a landmark accord on carbon emission caps late Friday evening.
    The agreement mandates a 45 percent reduction in industrial greenhouse gases by 2035.
    Developing economies will receive climate financing from an international transition fund.
  `.trim();

  it('keeps verbatim phrases present in body_english within sentence bounds', () => {
    const rawAnchors = [
      { phrase: 'landmark accord on carbon emission caps', sentence_index: 0 },
      { phrase: '45 percent reduction in industrial greenhouse gases', sentence_index: 1 },
      { phrase: 'international transition fund', sentence_index: 2 },
    ];

    const valid = validateAnchorPhrases(rawAnchors, sampleBody, 3);
    expect(valid).toHaveLength(3);
    expect(valid[0].phrase).toBe('landmark accord on carbon emission caps');
    expect(valid[0].sentence_index).toBe(0);
    expect(valid[1].sentence_index).toBe(1);
    expect(valid[2].sentence_index).toBe(2);
  });

  it('drops phrases that are paraphrased or not found verbatim in body_english', () => {
    const rawAnchors = [
      { phrase: 'landmark accord on carbon emission caps', sentence_index: 0 },
      { phrase: 'countries signed a deal to stop pollution', sentence_index: 0 }, // Paraphrased, not in body
      { phrase: 'random hallucinated sentence', sentence_index: 1 },             // Hallucinated
    ];

    const valid = validateAnchorPhrases(rawAnchors, sampleBody, 3);
    expect(valid).toHaveLength(1);
    expect(valid[0].phrase).toBe('landmark accord on carbon emission caps');
  });

  it('drops phrases shorter than 4 characters or longer than 80 characters', () => {
    const rawAnchors = [
      { phrase: 'The', sentence_index: 0 }, // < 4 chars
      {
        phrase: 'Diplomats from 190 nations reached a landmark accord on carbon emission caps late Friday evening and agreed to continue talks next year',
        sentence_index: 0,
      }, // > 80 chars
      { phrase: 'climate financing', sentence_index: 2 }, // valid (17 chars)
    ];

    const valid = validateAnchorPhrases(rawAnchors, sampleBody, 3);
    expect(valid).toHaveLength(1);
    expect(valid[0].phrase).toBe('climate financing');
  });

  it('drops phrases with negative or out-of-range sentence_index', () => {
    const rawAnchors = [
      { phrase: 'climate financing', sentence_index: -1 }, // negative
      { phrase: 'climate financing', sentence_index: 3 },  // summary has 3 sentences (indices 0, 1, 2)
      { phrase: 'climate financing', sentence_index: 2 },  // valid
    ];

    const valid = validateAnchorPhrases(rawAnchors, sampleBody, 3);
    expect(valid).toHaveLength(1);
    expect(valid[0].sentence_index).toBe(2);
  });

  it('handles empty input gracefully', () => {
    expect(validateAnchorPhrases([], sampleBody)).toEqual([]);
    expect(validateAnchorPhrases(null as any, sampleBody)).toEqual([]);
    expect(validateAnchorPhrases([{ phrase: 'test', sentence_index: 0 }], '')).toEqual([]);
  });
});


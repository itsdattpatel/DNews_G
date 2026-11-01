import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEditorialFallback, type ArticleRow } from '../../pipeline/enricher';
import { validateAnchorPhrases } from '../../ai/schema';

describe('Editorial Fallback Enricher', () => {
  const sampleArticle: ArticleRow = {
    id: 999,
    source_id: 1,
    url: 'https://www.reuters.com/world/india/delhi-unveils-air-quality-action-plan',
    title_original: 'Delhi Unveils Comprehensive Air Quality Action Plan Amid Winter Season',
    title_english: null,
    body_original:
      'Delhi authorities announced a series of strict environmental regulations on Tuesday to curb hazardous air pollution levels across the National Capital Region. The initiative introduces electric transit corridors, round-the-clock monitoring of industrial emissions, and enhanced dust suppression across major arterial roads. Environmental ministers emphasized that neighboring states must coordinate enforcement to achieve measurable reductions in particulate matter.',
    body_english: null,
    summary: null,
    language_detected: 'en',
    published_at: '2026-11-01T10:00:00Z',
    fetched_at: '2026-11-01T10:05:00Z',
    ai_processed_at: null,
    status: 'pending',
    breaking_score: 0,
    spider_type: 'Reader',
    cluster_id: null,
    bookmarked: 0,
    anchor_phrases: null,
    created_at: '2026-11-01T10:05:00Z',
    source_country: 'India',
    source_name: 'Reuters',
  };

  it('generates a clean title, summary, and categories from original text', () => {
    const result = createEditorialFallback(sampleArticle, 0);

    expect(result.article_index).toBe(0);
    expect(result.title_english).toBe(sampleArticle.title_original);
    expect(result.body_english).toContain('Delhi authorities announced a series of strict environmental regulations');
    expect(result.summary.length).toBeGreaterThan(50);
    expect(result.categories).toContain('Environment');
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.location_tags).toEqual(['India']);
  });

  it('generates verbatim anchor phrases that strictly pass validateAnchorPhrases', () => {
    const result = createEditorialFallback(sampleArticle, 0);

    expect(result.anchor_phrases.length).toBeGreaterThan(0);

    const summarySentences = (result.summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length;
    const validated = validateAnchorPhrases(result.anchor_phrases, result.body_english, summarySentences);

    expect(validated.length).toBe(result.anchor_phrases.length);
    for (const ap of validated) {
      expect(result.body_english).toContain(ap.phrase);
      expect(ap.phrase.length).toBeGreaterThanOrEqual(4);
      expect(ap.phrase.length).toBeLessThanOrEqual(80);
      expect(ap.sentence_index).toBeLessThan(summarySentences);
    }
  });

  it('handles empty body gracefully by falling back to headline', () => {
    const shortArticle: ArticleRow = {
      ...sampleArticle,
      body_original: '',
      title_original: 'Global Financial Markets Rally Following Central Bank Interest Rate Cut Announcement',
    };

    const result = createEditorialFallback(shortArticle, 1);
    expect(result.title_english).toBe(shortArticle.title_original);
    expect(result.summary).toBe(shortArticle.title_original);
    expect(result.categories).toContain('Business');
  });
});


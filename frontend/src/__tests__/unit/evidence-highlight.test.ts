/**
 * frontend/src/__tests__/unit/evidence-highlight.test.ts
 * Unit tests for Evidence Highlight and Synchronized Reading Mode (Step C).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import type { Article, AnchorPhrase } from '../../types';

const sampleArticle: Article = {
  id: 101,
  url: 'https://example.com/test-article',
  title_english: 'Diplomats Reach Historic Climate Accord',
  body_english:
    'Diplomats from 190 nations reached a landmark agreement today in Geneva. The pact establishes binding emissions limits over the next decade.',
  summary:
    'Diplomats from 190 nations reach milestone pact. The agreement establishes binding limits for ten years.',
  breaking_score: 85,
  cluster_id: null,
  bookmarked: false,
  published_at: '2026-11-01T12:00:00Z',
  fetched_at: '2026-11-01T12:05:00Z',
  source: {
    id: 1,
    slug: 'reuters',
    name: 'Reuters',
    country: 'USA',
    url: 'https://reuters.com',
    fetch_type: 'rss',
    enabled: true,
    last_fetched_at: null,
  },
  categories: ['World', 'Environment'],
  keywords: ['climate', 'accord', 'geneva'],
  anchor_phrases: [
    { phrase: 'landmark agreement today in Geneva', sentence_index: 0 },
    { phrase: 'binding emissions limits over the next decade', sentence_index: 1 },
  ],
};

describe('Evidence Highlight & Reading Mode Logic (Step C)', () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedArticle: sampleArticle,
      selectedArticleId: 101,
      activeSentenceIndex: null,
      isReadingModeActive: false,
      settings: {
        refresh_interval_minutes: 5,
        alert_threshold: 75,
        auto_cleanup_enabled: false,
        retention_days: 30,
        sound_enabled: false,
        evidence_highlight_enabled: true,
        reading_mode_enabled: true,
      },
    });
  });

  describe('Store State Management', () => {
    it('initializes with evidence highlight and reading mode enabled by default', () => {
      const { settings } = useAppStore.getState();
      expect(settings.evidence_highlight_enabled).toBe(true);
      expect(settings.reading_mode_enabled).toBe(true);
    });

    it('sets and clears activeSentenceIndex on user hover or click', () => {
      const store = useAppStore.getState();
      store.setActiveSentenceIndex(1);
      expect(useAppStore.getState().activeSentenceIndex).toBe(1);

      store.setActiveSentenceIndex(null);
      expect(useAppStore.getState().activeSentenceIndex).toBeNull();
    });

    it('toggles reading mode state', () => {
      const store = useAppStore.getState();
      expect(store.isReadingModeActive).toBe(false);

      store.toggleReadingMode();
      expect(useAppStore.getState().isReadingModeActive).toBe(true);

      store.toggleReadingMode();
      expect(useAppStore.getState().isReadingModeActive).toBe(false);
    });

    it('resets activeSentenceIndex and isReadingModeActive when selecting a different article', () => {
      const store = useAppStore.getState();
      store.setActiveSentenceIndex(2);
      store.setReadingModeActive(true);

      store.setSelectedArticle({ ...sampleArticle, id: 102 });
      expect(useAppStore.getState().activeSentenceIndex).toBeNull();
      expect(useAppStore.getState().isReadingModeActive).toBe(false);
      expect(useAppStore.getState().selectedArticleId).toBe(102);
    });
  });

  describe('Verbatim Anchor Phrase Matching Algorithm', () => {
    it('verifies anchor phrases exist verbatim in body_english', () => {
      const body = sampleArticle.body_english!;
      const anchors = sampleArticle.anchor_phrases!;

      anchors.forEach((a) => {
        expect(body).toContain(a.phrase);
        const pos = body.indexOf(a.phrase);
        expect(pos).toBeGreaterThanOrEqual(0);
      });
    });

    it('correctly splits summary into discrete sentences by sentence boundary', () => {
      const summary = sampleArticle.summary;
      const raw = summary.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [summary];
      const sentences = raw.map((s) => s.trim()).filter((s) => s.length > 0);

      expect(sentences).toHaveLength(2);
      expect(sentences[0]).toBe('Diplomats from 190 nations reach milestone pact.');
      expect(sentences[1]).toBe(
        'The agreement establishes binding limits for ten years.'
      );
    });

    it('detects multiple non-overlapping matches across article text', () => {
      const text =
        'Leading scientists in Geneva confirmed the report. Another team in Paris published findings.';
      const anchors: AnchorPhrase[] = [
        { phrase: 'scientists in Geneva', sentence_index: 0 },
        { phrase: 'team in Paris', sentence_index: 1 },
      ];

      type Match = { start: number; end: number; phrase: string; sentence_index: number };
      const matches: Match[] = [];

      for (const a of anchors) {
        let pos = 0;
        while ((pos = text.indexOf(a.phrase, pos)) !== -1) {
          matches.push({
            start: pos,
            end: pos + a.phrase.length,
            phrase: a.phrase,
            sentence_index: a.sentence_index,
          });
          pos += a.phrase.length;
        }
      }

      matches.sort((a, b) => a.start - b.start);
      expect(matches).toHaveLength(2);
      expect(matches[0]!.sentence_index).toBe(0);
      expect(matches[1]!.sentence_index).toBe(1);
      expect(matches[0]!.start).toBeLessThan(matches[1]!.start);
    });
  });
});

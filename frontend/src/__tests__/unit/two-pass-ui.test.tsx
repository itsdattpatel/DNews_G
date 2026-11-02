/**
 * frontend/src/__tests__/unit/two-pass-ui.test.tsx
 * Unit tests for Two-Pass AI UI surfaces & Quota Telemetry (PRD A Category 10).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArticlePanel } from '../../components/article/ArticlePanel';
import { SummaryPanel } from '../../components/article/SummaryPanel';
import { SettingsMenu } from '../../components/bat/SettingsMenu';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

describe('Category 10: Two-Pass AI UI & Quota Telemetry', () => {
  const baseArticle: Article = {
    id: 101,
    url: 'https://example.com/dispatch',
    title_original: 'Rare astronomical conjunction photographed over Andes observatory',
    title_english: 'Rare Astronomical Conjunction Photographed Over Andes Observatory',
    body_original: 'Astronomers captured crisp exposures of the planetary alignment during clear mountain skies.',
    body_english: 'Astronomers captured crisp exposures of the planetary alignment during clear mountain skies.',
    summary: '',
    breaking_score: 42,
    cluster_id: null,
    bookmarked: false,
    published_at: '2026-11-02T10:00:00Z',
    ingested_at: '2026-11-02T10:00:00Z',
    is_catchup: false,
    fetched_at: '2026-11-02T10:00:00Z',
    pass1_completed_at: '2026-11-02T10:00:00Z',
    pass2_completed_at: null,
    source: {
      id: 1,
      name: 'Observatory Wire',
      country: 'Chile',
    },
    categories: ['Science'],
    keywords: ['astronomy', 'andes', 'telescope'],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/settings/two-pass-telemetry') {
        return {
          ok: true,
          json: async () => ({
            two_pass_ai_enabled: true,
            pass2_threshold: 75,
            pass1_count: 240,
            pass2_count: 80,
            pass2_skipped_count: 160,
            estimated_tokens_saved: 118400,
            last_updated_at: '2026-11-02T12:00:00Z',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({}),
      };
    }));

    useAppStore.setState({
      selectedArticle: baseArticle,
      selectedArticleId: 101,
      articles: [baseArticle],
      isLoading: false,
      settings: {
        refresh_interval_minutes: 5,
        alert_threshold: 75,
        auto_cleanup_enabled: true,
        retention_days: 30,
        sound_enabled: true,
        evidence_highlight_enabled: true,
        reading_mode_enabled: true,
        plain_mode_enabled: false,
        two_pass_ai_enabled: true,
        pass2_threshold: 75,
      },
    });
  });

  describe('ArticlePanel (Main Reader Column)', () => {
    it('renders broadsheet Pass 1 triage banner with Summarize Story button when unsummarized', () => {
      const html = renderToStaticMarkup(<ArticlePanel article={baseArticle} />);
      expect(html).toContain('id="pass1-triage-callout"');
      expect(html).toContain('✦ Triaged via Pass 1');
      expect(html).toContain('Urgency Score: 42%');
      expect(html).toContain('id="btn-summarize-story-pass2"');
      expect(html).toContain('Summarize Story');
    });

    it('does not render Pass 1 triage banner when article already has executive summary', () => {
      const summarizedArticle = {
        ...baseArticle,
        summary: 'A rare celestial conjunction was observed over high-altitude Andes telescopes today.',
        pass2_completed_at: '2026-11-02T10:05:00Z',
      };

      const html = renderToStaticMarkup(<ArticlePanel article={summarizedArticle} />);
      expect(html).not.toContain('id="pass1-triage-callout"');
      expect(html).not.toContain('✦ Triaged via Pass 1');
    });

    it('does not render Pass 1 triage banner when Plain Mode is active', () => {
      const html = renderToStaticMarkup(<ArticlePanel article={baseArticle} plainMode={true} />);
      expect(html).not.toContain('id="pass1-triage-callout"');
      expect(html).toContain('Highlights offline (Plain Mode)');
    });
  });

  describe('SummaryPanel (Right Briefing Column)', () => {
    it('renders Pass 1 triage card with threshold and Summarize Story action when unsummarized', () => {
      const html = renderToStaticMarkup(<SummaryPanel article={baseArticle} />);
      expect(html).toContain('id="summary-pass1-card"');
      expect(html).toContain('✦ Quick-Scored Dispatch (Pass 1)');
      expect(html).toContain('Pass 2 Synthesis Deferred');
      expect(html).toContain('Urgency score is');
      expect(html).toContain('42%');
      expect(html).toContain('Threshold: 75%');
      expect(html).toContain('id="btn-summary-enrich-pass2"');
      expect(html).toContain('Summarize Story (Pass 2)');
    });

    it('renders discrete sentence intelligence points when article has summary', () => {
      const summarizedArticle = {
        ...baseArticle,
        summary: 'High-altitude telescopes captured rare conjunction. Planetary scientists released observational data.',
        pass2_completed_at: '2026-11-02T10:05:00Z',
      };

      const html = renderToStaticMarkup(<SummaryPanel article={summarizedArticle} />);
      expect(html).not.toContain('id="summary-pass1-card"');
      expect(html).toContain('Key Intelligence Takeaways');
      expect(html).toContain('High-altitude telescopes captured rare conjunction');
    });
  });

  describe('SettingsMenu Section 9', () => {
    it('renders Two-Pass AI Ingestion switch, threshold slider, and quota telemetry counters', () => {
      useAppStore.setState({ isSettingsOpen: true });
      const html = renderToStaticMarkup(<SettingsMenu forceOpen={true} />);

      expect(html).toContain('§ 9');
      expect(html).toContain('Two-Pass AI Ingestion &amp; Quota Telemetry');
      expect(html).toContain('id="two_pass_ai_enabled"');
      expect(html).toContain('id="pass2_threshold"');
      expect(html).toContain('Quota Telemetry &amp; Savings');
      expect(html).toContain('id="telemetry-pass1-count"');
      expect(html).toContain('id="telemetry-pass2-count"');
      expect(html).toContain('id="telemetry-skipped-count"');
      expect(html).toContain('id="telemetry-tokens-saved"');
    });
  });
});

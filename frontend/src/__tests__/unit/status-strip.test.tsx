/**
 * frontend/src/__tests__/unit/status-strip.test.tsx
 * Unit test suite for PRD C Category 2: Status Strip.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusStrip } from '../../components/layout/StatusStrip';
import { ArticlePanel } from '../../components/article/ArticlePanel';
import type { Article } from '../../types';

describe('PRD C Category 2: Status Strip (Issue 4)', () => {
  const dummyArticle: Article = {
    id: 1,
    source: { id: 1, slug: 'hindu', name: 'The Hindu', country: 'India', url: '', fetch_type: 'rss' },
    url: 'http://test.com/1',
    title_english: 'Major Global Summit Concludes',
    title_original: null,
    body_english: 'Paragraph 1\n\nParagraph 2',
    body_original: null,
    summary: 'Summary text.',
    language_detected: 'en',
    published_at: '2026-11-03T10:00:00Z',
    fetched_at: '2026-11-03T10:05:00Z',
    breaking_score: 50,
    bookmarked: false,
    cluster_id: null,
    categories: ['World'],
    keywords: ['summit'],
  };

  describe('StatusStrip Structural & Content Invariants', () => {
    it('renders the 5 required elements: progress bar, play/pause, auto-advance state, gap chip, and plain chip', () => {
      const html = renderToStaticMarkup(
        <StatusStrip
          forcedAutoAdvanceEnabled={true}
          forcedStartupStatus={{ detected: true, missed_minutes: 42 }}
          forcedPlainMode={false}
        />
      );

      // 1. In-flow region with 28px height class
      expect(html).toContain('id="status-strip"');
      expect(html).toContain('h-7');

      // 2. 2px Hairline progress bar
      expect(html).toContain('id="status-strip-progress-bar"');

      // 3. Play/Pause button
      expect(html).toContain('id="btn-status-strip-play-pause"');

      // 4. Auto-Advance state label
      expect(html).toContain('Auto-Advance');

      // 5. Gap chip
      expect(html).toContain('id="status-strip-gap-chip"');
      expect(html).toContain('Gap: 42m');

      // 6. Plain-mode chip
      expect(html).toContain('id="status-strip-plain-chip"');
      expect(html).toContain('Plain: OFF');
    });

    it('renders Auto-Advance: Off when auto-advance is disabled', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={false} />
      );
      expect(html).toContain('id="status-strip-state-disabled"');
      expect(html).toContain('Off');
    });

    it('renders Plain: ON when plain mode is active', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedPlainMode={true} />
      );
      expect(html).toContain('id="status-strip-plain-chip"');
      expect(html).toContain('Plain: ON');
    });

    it('renders Offline 15s watchdog chip when disconnected from internet (PRD E Category 5)', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedIsOnline={false} />
      );
      expect(html).toContain('id="status-strip-offline-chip"');
      expect(html).toContain('⊘ No Internet — checking every 15s');
    });

    it('renders Reconnected chip when connectivity returns (PRD E Category 5)', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedIsOnline={true} forcedReconnectedRecently={true} />
      );
      expect(html).toContain('id="status-strip-reconnected-chip"');
      expect(html).toContain('↺ Back online — syncing…');
      expect(html).not.toContain('id="status-strip-offline-chip"');
    });

    it('hides both offline and reconnected chips during steady online operation', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedIsOnline={true} forcedReconnectedRecently={false} />
      );
      expect(html).not.toContain('id="status-strip-offline-chip"');
      expect(html).not.toContain('id="status-strip-reconnected-chip"');
    });
  });

  describe('Pause Reasons Preservation (PRD A 2.2)', () => {
    it('displays "Reading (hover)" when article panel is hovered', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Reading (hover)" />
      );
      expect(html).toContain('Paused:');
      expect(html).toContain('Reading (hover)');
    });

    it('displays "Manual pause" when user pauses auto-advance', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Manual pause" />
      );
      expect(html).toContain('Paused:');
      expect(html).toContain('Manual pause');
    });

    it('displays "Settings open" when settings drawer is active', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Settings open" />
      );
      expect(html).toContain('Settings open');
    });

    it('displays "TV desk open" when TV view is active', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="TV desk open" />
      );
      expect(html).toContain('TV desk open');
    });

    it('displays "Directory view" when in directory view', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Directory view" />
      );
      expect(html).toContain('Directory view');
    });

    it('displays "Control Room open" when control room is open', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Control Room open" />
      );
      expect(html).toContain('Control Room open');
    });

    it('displays "Globe open" when 3D globe is active', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Globe open" />
      );
      expect(html).toContain('Globe open');
    });

    it('displays "Alerts open" when alerts center is open', () => {
      const html = renderToStaticMarkup(
        <StatusStrip forcedAutoAdvanceEnabled={true} forcedPauseReason="Alerts open" />
      );
      expect(html).toContain('Alerts open');
    });
  });

  describe('ArticlePanel Header Clearance (Issue 4 Proof)', () => {
    it('verifies that ArticlePanel does NOT render a floating AutoAdvanceProgressBar', () => {
      const html = renderToStaticMarkup(<ArticlePanel article={dummyArticle} />);
      // Floating container was completely removed from ArticlePanel
      expect(html).not.toContain('id="auto-advance-progress-container"');
      expect(html).not.toContain('id="auto-advance-progress-bar"');

      // The article header immediately renders without occlusion
      expect(html).toContain('Major Global Summit Concludes');
      expect(html).toContain('The Hindu');
      expect(html).toContain('World');
    });
  });
});

/**
 * frontend/src/__tests__/unit/library-mind-ui.test.tsx
 * Unit tests for Mind Helps UI components (Category B5: Psychology Techniques & Helplines).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelpCard, type MindCardData } from '../../library/mind/HelpCard';
import { CategoryFilterBar } from '../../library/mind/CategoryFilterBar';
import { HelplinesModal } from '../../library/mind/HelplinesModal';
import { MindHelpsSubpage } from '../../library/mind/MindHelpsSubpage';

const SAMPLE_MIND_CARD: MindCardData = {
  id: 1,
  slug: 'physiological-sigh',
  title: 'The Physiological Sigh',
  category: 'stress',
  what_it_is: 'A rapid respiratory reflex consisting of two sequential nasal inhales and a long exhale.',
  when_it_helps: 'During acute stress spikes and autonomic overwhelm.',
  steps: [
    'Take a deep nasal inhale to 80% capacity.',
    'Take a sharp second top-off inhale.',
    'Release a long, smooth mouth exhale.',
  ],
  time_needed_minutes: 2,
  source_book: 'OpenStax Psychology 2e',
  source_chapter: 'Chapter 14: Stress, Lifestyle, and Health',
  source_url: 'https://openstax.org/details/books/psychology-2e',
  source_license: 'CC BY 4.0',
  attribution: 'OpenStax Psychology 2e (CC BY 4.0)',
  created_at: '2026-11-02 12:00:00',
};

describe('Mind Helps UI Components (Category B5)', () => {
  it('renders HelpCard with physiological mechanism, trigger situations, and numbered steps', () => {
    const html = renderToStaticMarkup(
      <HelpCard
        card={SAMPLE_MIND_CARD}
        isBookmarked={true}
        onToggleBookmark={vi.fn()}
      />
    );

    // Technique title present
    expect(html).toContain('The Physiological Sigh');
    // Category ink stamp
    expect(html).toContain('STRESS');
    // Duration badge
    expect(html).toContain('2 min practice');
    // Mechanism rationale
    expect(html).toContain('Physiological Mechanism');
    expect(html).toContain('rapid respiratory reflex');
    // When it helps
    expect(html).toContain('When It Helps');
    expect(html).toContain('acute stress spikes');
    // Numbered steps
    expect(html).toContain('Take a deep nasal inhale');
    expect(html).toContain('Take a sharp second top-off');
    // Provenance byline & license
    expect(html).toContain('OpenStax Psychology 2e');
    expect(html).toContain('CC BY 4.0');
    // Bookmarked ribbon state
    expect(html).toContain('Bookmarked');
  });

  it('renders CategoryFilterBar with all 9 psychological domains and helplines trigger', () => {
    const html = renderToStaticMarkup(
      <CategoryFilterBar
        selectedCategory="anxiety"
        onSelectCategory={vi.fn()}
        selectedTime={5}
        onSelectTime={vi.fn()}
        onOpenHelplines={vi.fn()}
      />
    );

    // All 9 categories present
    expect(html).toContain('Stress');
    expect(html).toContain('Anxiety');
    expect(html).toContain('Sleep');
    expect(html).toContain('Focus');
    expect(html).toContain('Habits');
    expect(html).toContain('Anger');
    expect(html).toContain('Grief');
    expect(html).toContain('Relationships');
    expect(html).toContain('Self-Talk');

    // Safety notice banner
    expect(html).toContain('General Education Only');
    expect(html).toContain('Not medical advice');

    // Helplines button
    expect(html).toContain('Verified Crisis Helplines');
  });

  it('renders HelplinesModal with safety mandate and regional directory tabs', () => {
    const html = renderToStaticMarkup(
      <HelplinesModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Safety notice mandate
    expect(html).toContain('Verified Crisis Support &amp; Helplines');
    expect(html).toContain('General Education &amp; Safety Notice');
    expect(html).toContain('personal reflection and stress-reduction education only');

    // Regional tabs
    expect(html).toContain('India');
    expect(html).toContain('United States');
    expect(html).toContain('China');
    expect(html).toContain('Japan');
    expect(html).toContain('Australia');
  });

  it('renders MindHelpsSubpage with dual-pane layout', () => {
    const html = renderToStaticMarkup(<MindHelpsSubpage />);

    expect(html).toContain('General Education Only');
    expect(html).toContain('Psychological Domains');
    expect(html).toContain('Verified Crisis Helplines');
  });
});


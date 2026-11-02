/**
 * frontend/src/__tests__/unit/library-uikit.test.tsx
 * Unit test suite for The Reading Room UI Kit (PRD B Category B1).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DeckleCard,
  RoughHighlight,
  BookRibbon,
  CalligraphicDivider,
  InkStampBadge,
  ParchmentButton,
  ParchmentAccordion,
  LibraryLoadingState,
  LibraryEmptyState,
  LibraryErrorState,
} from '../../library/ui';

// Mock rough-notation for server-side testing
vi.mock('rough-notation', () => ({
  annotate: () => ({
    show: vi.fn(),
    hide: vi.fn(),
    remove: vi.fn(),
  }),
}));

describe('The Reading Room UI Kit (Category B1 Isolation)', () => {
  it('renders DeckleCard with default and sacred variants', () => {
    const htmlDefault = renderToStaticMarkup(
      <DeckleCard variant="default">
        <div>Folio Content</div>
      </DeckleCard>
    );
    expect(htmlDefault).toContain('Folio Content');
    expect(htmlDefault).toContain('lib-deckle');

    const htmlSacred = renderToStaticMarkup(
      <DeckleCard variant="sacred">
        <div>Sacred Sloka</div>
      </DeckleCard>
    );
    expect(htmlSacred).toContain('Sacred Sloka');
    expect(htmlSacred).toContain('border-l-[var(--lib-gold)]');
  });

  it('renders RoughHighlight without crashing', () => {
    const html = renderToStaticMarkup(
      <RoughHighlight type="underline" color="#9E7B36">
        <span>Underlined Verse</span>
      </RoughHighlight>
    );
    expect(html).toContain('Underlined Verse');
  });

  it('renders BookRibbon bookmark marker in active and inactive states', () => {
    const htmlInactive = renderToStaticMarkup(<BookRibbon active={false} color="gold" />);
    expect(htmlInactive).toContain('Bookmark this item');

    const htmlActive = renderToStaticMarkup(<BookRibbon active={true} color="gold" />);
    expect(htmlActive).toContain('Remove bookmark');
  });

  it('renders ParchmentButton variants and sizes', () => {
    const htmlPrimary = renderToStaticMarkup(
      <ParchmentButton variant="primary" size="md">
        Read Folio
      </ParchmentButton>
    );
    expect(htmlPrimary).toContain('Read Folio');
    expect(htmlPrimary).toContain('bg-[var(--lib-accent)]');

    const htmlGold = renderToStaticMarkup(
      <ParchmentButton variant="gold" size="sm">
        Gold Action
      </ParchmentButton>
    );
    expect(htmlGold).toContain('Gold Action');
    expect(htmlGold).toContain('bg-[var(--lib-gold)]');
  });

  it('renders CalligraphicDivider with ornamental glyphs', () => {
    const html = renderToStaticMarkup(<CalligraphicDivider glyph="lotus" />);
    expect(html).toContain('🪷');
  });

  it('renders InkStampBadge with correct styling tokens', () => {
    const html = renderToStaticMarkup(<InkStampBadge variant="gold">BHAGAVAD GITA</InkStampBadge>);
    expect(html).toContain('BHAGAVAD GITA');
    expect(html).toContain('text-[var(--lib-gold)]');
  });

  it('renders ParchmentAccordion with initial open item', () => {
    const items = [
      { id: '1', title: 'Box Breathing', badge: '3 Min', content: 'Step 1: Inhale' },
      { id: '2', title: 'Grounding Scan', badge: '5 Min', content: 'Step 2: Feel' },
    ];
    const html = renderToStaticMarkup(<ParchmentAccordion items={items} defaultOpenId="1" />);
    expect(html).toContain('Box Breathing');
    expect(html).toContain('3 Min');
    expect(html).toContain('Step 1: Inhale');
  });

  it('renders LibraryStates (Loading, Empty, Error) with required anti-slop contracts', () => {
    const htmlLoading = renderToStaticMarkup(<LibraryLoadingState rows={3} />);
    expect(htmlLoading).toContain('animate-pulse');

    const htmlEmpty = renderToStaticMarkup(
      <LibraryEmptyState
        title="Empty Stacks"
        message="No items found."
        actionLabel="Explore All"
        onAction={() => {}}
      />
    );
    expect(htmlEmpty).toContain('Empty Stacks');
    expect(htmlEmpty).toContain('Explore All');

    const htmlError = renderToStaticMarkup(
      <LibraryErrorState
        title="Stack Error"
        error="Connection failed"
      />
    );
    expect(htmlError).toContain('Stack Error');
    expect(htmlError).toContain('Connection failed');
  });
});

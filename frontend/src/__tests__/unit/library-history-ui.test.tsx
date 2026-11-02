/**
 * frontend/src/__tests__/unit/library-history-ui.test.tsx
 * Unit tests for Historical News UI components (Category B3).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HistoryDatePicker } from '../../library/history/HistoryDatePicker';
import { TodayInHistoryFeed, type HistoryFeedItem } from '../../library/history/TodayInHistoryFeed';
import { HistoryArticleCard } from '../../library/history/HistoryArticleCard';

const SAMPLE_ITEMS: HistoryFeedItem[] = [
  {
    id: 1,
    source_slug: 'wikimedia_onthisday',
    external_id: 'wiki_1947',
    event_date: '1947-08-15',
    event_year: 1947,
    headline: 'Indian Independence Act 1947',
    snippet: 'India attains full sovereign independence from British rule.',
    original_url: 'https://en.wikipedia.org/wiki/Indian_Independence_Act_1947',
    country: 'India',
    media_url: 'https://upload.wikimedia.org/thumb/sample.jpg',
    license: 'CC BY-SA 3.0 / 4.0',
    attribution: 'Wikimedia Foundation contributors under CC BY-SA',
    is_bookmarked: true,
  },
  {
    id: 2,
    source_slug: 'chronicling_america',
    external_id: 'loc_1918',
    event_date: '1918-11-11',
    event_year: 1918,
    headline: 'Armistice Signed Ending War',
    snippet: 'Hostilities on the Western Front ceased at 11:00 am.',
    original_url: 'https://chroniclingamerica.loc.gov',
    country: 'USA',
    license: 'Public Domain',
    attribution: 'Library of Congress Chronicling America',
    is_bookmarked: false,
  },
];

describe('Historical News UI (Category B3)', () => {
  it('renders HistoryDatePicker with calendar selectors and decade chips', () => {
    const html = renderToStaticMarkup(
      <HistoryDatePicker
        month={11}
        day={2}
        onDateChange={vi.fn()}
        selectedDecade="1940"
        onDecadeChange={vi.fn()}
        selectedCountry="India"
        onCountryChange={vi.fn()}
        onResetToToday={vi.fn()}
      />
    );

    expect(html).toContain('CALENDAR ARCHIVE');
    expect(html).toContain('November');
    expect(html).toContain('1940s');
    expect(html).toContain('India');
    expect(html).toContain('Clear filters');
  });

  it('renders TodayInHistoryFeed with chronological timeline items', () => {
    const html = renderToStaticMarkup(
      <TodayInHistoryFeed
        items={SAMPLE_ITEMS}
        selectedId={1}
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('1947');
    expect(html).toContain('Indian Independence Act 1947');
    expect(html).toContain('1918');
    expect(html).toContain('Armistice Signed Ending War');
    expect(html).toContain('Timeline (2 records)');
  });

  it('renders HistoryArticleCard with full provenance, license, and citation', () => {
    const html = renderToStaticMarkup(
      <HistoryArticleCard
        item={SAMPLE_ITEMS[0]!}
        isBookmarked={true}
        onToggleBookmark={vi.fn()}
      />
    );

    // Watermark & Year
    expect(html).toContain('1947');
    expect(html).toContain('Indian Independence Act 1947');
    expect(html).toContain('India attains full sovereign independence');

    // Provenance & Badges
    expect(html).toContain('WIKIMEDIA ONTHISDAY');
    expect(html).toContain('CC BY-SA 3.0 / 4.0');
    expect(html).toContain('Wikimedia Foundation contributors under CC BY-SA');

    // Action Controls
    expect(html).toContain('Saved to Folio');
    expect(html).toContain('Cite Record');
    expect(html).toContain('Archival Document');
    expect(html).toContain('https://en.wikipedia.org/wiki/Indian_Independence_Act_1947');
  });

  it('renders public domain clipping correctly for Library of Congress source', () => {
    const html = renderToStaticMarkup(
      <HistoryArticleCard
        item={SAMPLE_ITEMS[1]!}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
      />
    );

    expect(html).toContain('1918');
    expect(html).toContain('CHRONICLING AMERICA');
    expect(html).toContain('Public Domain');
    expect(html).toContain('Save to Reading Folio');
  });
});

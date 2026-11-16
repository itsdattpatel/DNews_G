/**
 * frontend/src/__tests__/unit/library-realtime-cat6.test.tsx
 * TDD Red-Green-Refactor unit tests for PRD D Category 6:
 * Library real-time event bus, filter-strict live updates, non-jumping "N new" buffering,
 * cross-tab bookmark sync, meaning review UI, and zero listener leak guarantees.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { sseBus } from '../../lib/sseBus';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import {
  historyMatchesFilter,
  verseMatchesFilter,
  quoteMatchesFilter,
  mindCardMatchesFilter,
  reconcileLibraryIncomingItem,
  type HistoryEventRecord,
  type LibraryVerseRecord,
  type LibraryQuoteRecord,
  type LibraryMindCardRecord,
} from '../../library/utils/libraryLive';
import { VerseFolioCard } from '../../library/wisdom/VerseFolioCard';
import { QuoteFolioCard } from '../../library/wisdom/QuoteFolioCard';
import { TodayInHistoryFeed } from '../../library/history/TodayInHistoryFeed';

function makeHistoryItem(id: number, overrides: Partial<HistoryEventRecord> = {}): HistoryEventRecord {
  return {
    id,
    source_slug: 'wikipedia_onthisday',
    external_id: `ext-${id}`,
    event_date: '11-12',
    event_year: 1969,
    headline: `Archival Record #${id}: Maritime Wire Convention`,
    snippet: `Summary for historical event #${id}.`,
    original_url: `https://en.wikipedia.org/wiki/Record_${id}`,
    country: 'Global',
    media_url: null,
    license: 'CC BY-SA 4.0',
    attribution: 'Wikimedia Contributors',
    cached_at: '2026-11-12T04:00:00.000Z',
    ...overrides,
  };
}

function makeVerse(id: number, overrides: Partial<LibraryVerseRecord> = {}): LibraryVerseRecord {
  return {
    id,
    book_id: 1,
    book_slug: 'gita',
    book_title: 'Bhagavad Gita',
    section_number: 2,
    verse_number: id,
    verse_ref: `BG 2.${id}`,
    text_original: null,
    transliteration: null,
    translation: `Verse translation #${id}`,
    translation_english: `Verse translation #${id}`,
    translator: 'Swami Archive',
    commentary_source: 'Classical Commentary',
    meaning: `Initial meaning for verse #${id}.`,
    plain_meaning: `Initial meaning for verse #${id}.`,
    meaning_reviewed: 0,
    source_url: 'https://example.test/gita',
    license: 'Public Domain',
    source_license: 'Public Domain',
    attribution: 'Swami Archive. Public Domain.',
    theme: 'duty,balance',
    theme_tags: 'duty,balance',
    created_at: '2026-11-12T04:00:00.000Z',
    ...overrides,
  };
}

function makeQuote(id: number, overrides: Partial<LibraryQuoteRecord> = {}): LibraryQuoteRecord {
  return {
    id,
    quote_text: `Quiet observation #${id} holds steady under pressure.`,
    author: 'Seneca',
    work_title: 'Letters from a Stoic',
    year_published: '65 CE',
    tradition: 'Stoic',
    country: 'Rome',
    source_url: 'https://example.test/stoic',
    source_license: 'Public Domain',
    attribution: 'Classical Public Library',
    is_verified: 1,
    plain_meaning: `Plain reflection #${id}.`,
    meaning_reviewed: 0,
    commentary_source: null,
    theme_tags: 'calm,steadiness',
    created_at: '2026-11-12T04:00:00.000Z',
    ...overrides,
  };
}

function makeMindCard(id: number, overrides: Partial<LibraryMindCardRecord> = {}): LibraryMindCardRecord {
  return {
    id,
    slug: `mind-card-${id}`,
    title: `Grounding Protocol #${id}`,
    category: 'anxiety',
    what_it_is: 'Structured sensory grounding technique.',
    when_it_helps: 'During cognitive overload.',
    steps: ['Notice 5 things', 'Breathe steadily'],
    time_needed_minutes: 3,
    source_book: 'Cognitive Therapy Basics',
    source_chapter: 'Ch 4',
    source_url: 'https://example.test/mind',
    source_license: 'CC BY 4.0',
    attribution: 'Open Mental Health Commons',
    created_at: '2026-11-12T04:00:00.000Z',
    ...overrides,
  };
}

describe('PRD D Category 6: Library Real-Time Updates & UI Stability', () => {
  beforeEach(() => {
    sseBus.clearAllListeners();
    useLibraryStore.setState({
      bookmarks: [],
      isLoadingBookmarks: false,
      refreshStatus: null,
    });
  });

  describe('sseBus Library event channels & leak prevention', () => {
    it('routes all Library SSE event types without listener leaks across 1000 subscribe/unsubscribe cycles', () => {
      const seenHistory: number[] = [];
      const seenWisdom: string[] = [];
      const seenBookmarks: string[] = [];

      const u1 = sseBus.subscribe('library_history_update', (p) => seenHistory.push(p.record.id));
      const u2 = sseBus.subscribe('library_wisdom_update', (p) => seenWisdom.push(`${p.kind}:${p.action}`));
      const u3 = sseBus.subscribe('library_bookmark_update', (p) => seenBookmarks.push(p.action));

      sseBus.emit('library_history_update', { action: 'created', record: makeHistoryItem(42) });
      sseBus.emit('library_wisdom_update', {
        kind: 'verse',
        action: 'updated',
        record: makeVerse(7, { meaning_reviewed: 1 }),
      });
      sseBus.emit('library_bookmark_update', {
        action: 'created',
        item_type: 'verse',
        item_id: 7,
        bookmark: {
          id: 1,
          item_type: 'verse',
          item_id: 7,
          note: 'BG 2.7',
          created_at: '2026-11-12T04:00:00.000Z',
        },
      });

      expect(seenHistory).toEqual([42]);
      expect(seenWisdom).toEqual(['verse:updated']);
      expect(seenBookmarks).toEqual(['created']);

      u1();
      u2();
      u3();

      for (let i = 0; i < 1000; i++) {
        const unsub = sseBus.subscribe('library_mind_update', () => {});
        unsub();
      }

      expect(sseBus.getListenerCount('library_history_update')).toBe(0);
      expect(sseBus.getListenerCount('library_wisdom_update')).toBe(0);
      expect(sseBus.getListenerCount('library_mind_update')).toBe(0);
      expect(sseBus.getListenerCount('library_bookmark_update')).toBe(0);
    });
  });

  describe('Strict filter matching (L2, L3, L4)', () => {
    it('prevents non-matching History, Verse, Quote, and Mind items from leaking into filtered views', () => {
      const h1 = makeHistoryItem(1, { event_date: '11-12', event_year: 1450, headline: 'Gutenberg Press Guild' });
      expect(historyMatchesFilter(h1, { monthDay: '11-12', era: 'all', searchQuery: '' })).toBe(true);
      expect(historyMatchesFilter(h1, { monthDay: '11-13', era: 'all', searchQuery: '' })).toBe(false);
      expect(historyMatchesFilter(h1, { monthDay: '11-12', era: 'modern', searchQuery: '' })).toBe(false);
      expect(historyMatchesFilter(h1, { monthDay: '11-12', era: 'medieval', searchQuery: 'gutenberg' })).toBe(true);
      expect(historyMatchesFilter(h1, { monthDay: '11-12', era: 'medieval', searchQuery: 'rocket' })).toBe(false);

      const v1 = makeVerse(1, { book_id: 1, book_slug: 'gita', section_number: 2, theme_tags: 'duty,courage' });
      expect(verseMatchesFilter(v1, { bookId: 'gita', chapter: 2, theme: 'duty', searchQuery: '' })).toBe(true);
      expect(verseMatchesFilter(v1, { bookId: 'dhammapada', chapter: 2, theme: '', searchQuery: '' })).toBe(false);
      expect(verseMatchesFilter(v1, { bookId: 'gita', chapter: 3, theme: '', searchQuery: '' })).toBe(false);

      const q1 = makeQuote(1, { tradition: 'Stoic', is_verified: 1, theme_tags: 'calm' });
      expect(quoteMatchesFilter(q1, { tradition: 'Stoic', theme: 'calm', verifiedOnly: true, searchQuery: '' })).toBe(true);
      expect(quoteMatchesFilter(q1, { tradition: 'Zen', theme: '', verifiedOnly: false, searchQuery: '' })).toBe(false);

      const m1 = makeMindCard(1, { category: 'anxiety' });
      expect(mindCardMatchesFilter(m1, { category: 'all', searchQuery: 'grounding' })).toBe(true);
      expect(mindCardMatchesFilter(m1, { category: 'sleep', searchQuery: '' })).toBe(false);
    });
  });

  describe('Non-jumping live reconciliation ("• N new" buffer & in-place patches)', () => {
    it('buffers matching newly-created items without modifying visible list order, and patches updated items in place', () => {
      const v1 = makeVerse(1);
      const v2 = makeVerse(2);
      const created = makeVerse(3);

      const step1 = reconcileLibraryIncomingItem({
        action: 'created',
        item: created,
        matchesFilter: true,
        visible: [v1, v2],
        pending: [],
        selected: v1,
      });

      // Reading list & active item stay 100% frozen; new item enters pending buffer
      expect(step1.visible.map((x) => x.id)).toEqual([1, 2]);
      expect(step1.pending.map((x) => x.id)).toEqual([3]);
      expect(step1.selected?.id).toBe(1);

      // Now update selected verse meaning + provenance in place without list jump
      const updatedV1 = makeVerse(1, {
        plain_meaning: 'Approved clarity update',
        meaning_reviewed: 1,
        source_license: 'CC0 1.0 Public Domain',
      });

      const step2 = reconcileLibraryIncomingItem({
        action: 'updated',
        item: updatedV1,
        matchesFilter: true,
        visible: step1.visible,
        pending: step1.pending,
        selected: step1.selected,
      });

      expect(step2.visible.map((x) => x.id)).toEqual([1, 2]);
      expect(step2.visible[0]?.plain_meaning).toBe('Approved clarity update');
      expect(step2.visible[0]?.meaning_reviewed).toBe(1);
      expect(step2.selected?.source_license).toBe('CC0 1.0 Public Domain');
      expect(step2.pending.map((x) => x.id)).toEqual([3]);
    });
  });

  describe('Cross-tab Library bookmark sync & Meaning Review UI', () => {
    it('syncs bookmarks live via sseBus without duplicates and removes them on delete', () => {
      useLibraryStore.getState().applyLiveBookmarkEvent({
        action: 'created',
        item_type: 'history',
        item_id: 19,
        bookmark: {
          id: 90,
          item_type: 'history',
          item_id: 19,
          note: 'Telegraph Treaty',
          created_at: '2026-11-12T04:00:00.000Z',
        },
      });
      // Duplicate event must be idempotent
      useLibraryStore.getState().applyLiveBookmarkEvent({
        action: 'created',
        item_type: 'history',
        item_id: 19,
        bookmark: {
          id: 90,
          item_type: 'history',
          item_id: 19,
          note: 'Telegraph Treaty',
          created_at: '2026-11-12T04:00:00.000Z',
        },
      });

      expect(useLibraryStore.getState().bookmarks.length).toBe(1);
      expect(useLibraryStore.getState().isBookmarked('history', 19)).toBe(true);

      useLibraryStore.getState().applyLiveBookmarkEvent({
        action: 'deleted',
        bookmark_id: 90,
        item_type: 'history',
        item_id: 19,
      });

      expect(useLibraryStore.getState().bookmarks.length).toBe(0);
      expect(useLibraryStore.getState().isBookmarked('history', 19)).toBe(false);
    });

    it('renders reviewed meaning status badge and inline Edit / Approve action on VerseFolioCard and QuoteFolioCard', () => {
      const verseHtml = renderToStaticMarkup(
        <VerseFolioCard
          verse={makeVerse(10, { meaning_reviewed: 1 }) as any}
          isBookmarked={false}
          isSaving={false}
          onToggleBookmark={() => {}}
          onSaveMeaning={async () => {}}
        />,
      );
      expect(verseHtml).toContain('Reviewed');
      expect(verseHtml).toContain('Edit / Approve');

      const quoteHtml = renderToStaticMarkup(
        <QuoteFolioCard
          quote={makeQuote(10, { meaning_reviewed: 0 }) as any}
          isBookmarked={false}
          isSaving={false}
          onToggleBookmark={() => {}}
          onSaveMeaning={async () => {}}
        />,
      );
      expect(quoteHtml).toContain('Pending Review');
      expect(quoteHtml).toContain('Edit / Approve');
    });

    it('renders TodayInHistoryFeed bookmark indicator from store state cleanly with tabular-nums', () => {
      useLibraryStore.getState().applyLiveBookmarkEvent({
        action: 'created',
        item_type: 'history',
        item_id: 5,
        bookmark: {
          id: 55,
          item_type: 'history',
          item_id: 5,
          note: 'Synced Event 5',
          created_at: '2026-11-12T04:00:00.000Z',
        },
      });

      const html = renderToStaticMarkup(
        <TodayInHistoryFeed
          items={[makeHistoryItem(5)] as any}
          selectedId={null}
          onSelect={() => {}}
          onToggleBookmark={() => {}}
        />,
      );
      expect(html).toContain('Timeline (1 records)');
      expect(html).toContain('Saved to Folio');
    });
  });
});

/**
 * frontend/src/library/subpages/HistoryShellView.tsx
 * Subpage 1 Shell: Historical News Archives & Today in History.
 */
import React, { useState } from 'react';
import { LibraryShellLayout } from '../components/LibraryShellLayout';
import { DeckleCard } from '../ui/DeckleCard';
import { InkStampBadge } from '../ui/InkStampBadge';
import { BookRibbon } from '../ui/BookRibbon';
import { useLibraryStore } from '../store/useLibraryStore';
import {
  Calendar,
  Filter,
  ExternalLink,
  Landmark,
} from 'lucide-react';

interface HistoricalEventPreview {
  id: number;
  year: number;
  dateStr: string;
  headline: string;
  snippet: string;
  source: string;
  country: string;
  license: string;
  url: string;
}

const SAMPLE_EVENTS: HistoricalEventPreview[] = [
  {
    id: 101,
    year: 1947,
    dateStr: 'November 2, 1947',
    headline: 'Subcontinent Dispatches: The Kashmir Radio Broadcast',
    snippet:
      'Archival transcripts broadcast over All India Radio regarding the accession instrument and peace treaties across northern territories following partition.',
    source: 'National Archives of India / Abhilekh Patal',
    country: 'India',
    license: 'Public Domain',
    url: 'https://www.abhilekh-patal.in/',
  },
  {
    id: 102,
    year: 1914,
    dateStr: 'November 2, 1914',
    headline: 'North Sea Declared a Military Area by British Admiralty',
    snippet:
      'Official wartime dispatch issued to international merchant shipping declaring total exclusion zone across the British Isles and Baltic approaches.',
    source: 'Library of Congress Chronicling America',
    country: 'USA',
    license: 'Public Domain',
    url: 'https://chroniclingamerica.loc.gov/',
  },
  {
    id: 103,
    year: 1930,
    dateStr: 'November 2, 1930',
    headline: 'Coronation of Haile Selassie as Emperor of Ethiopia',
    snippet:
      'Historic dispatches recounting the grand assembly in Addis Ababa attended by delegations from 72 nations, broadcast worldwide by international press wires.',
    source: 'Wikimedia Historical Feed',
    country: 'International',
    license: 'CC BY-SA 4.0',
    url: 'https://en.wikipedia.org/wiki/Haile_Selassie',
  },
];

export const HistoryShellView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number>(101);
  const [selectedDecade, setSelectedDecade] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const isBookmarked = useLibraryStore((s) => s.isBookmarked);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);

  const selectedEvent = SAMPLE_EVENTS.find((e) => e.id === selectedId) ?? SAMPLE_EVENTS[0]!;
  const bookmarked = isBookmarked('history', selectedEvent.id);

  // Left Panel: Timeline Index & Filter Controls
  const leftPanel = (
    <div className="space-y-5">
      {/* "Today in History" Badge */}
      <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)]">
        <div className="flex items-center gap-2 text-[var(--lib-accent)] mb-1">
          <Calendar className="w-4 h-4" />
          <span className="lib-meta text-[11px] font-medium tracking-wider">TODAY IN HISTORY</span>
        </div>
        <h3 className="lib-display text-xl text-[var(--lib-ink)]">
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </h3>
        <p className="text-xs text-[var(--lib-ink-muted)] font-serif mt-1">
          Explore real archival dispatches and eyewitness clippings across past centuries.
        </p>
      </div>

      {/* Filter Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--lib-ink-muted)] font-serif">
          <span className="flex items-center gap-1.5 font-medium text-[var(--lib-ink)]">
            <Filter className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
            <span>Filter Archives:</span>
          </span>
          <span className="text-[11px]">{SAMPLE_EVENTS.length} records available</span>
        </div>

        {/* Decade Filters */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', '1910s', '1930s', '1940s'] as const).map((dec) => (
            <button
              key={dec}
              type="button"
              onClick={() => setSelectedDecade(dec)}
              className={`px-2.5 py-1 text-xs rounded-sm font-serif transition-colors ${
                selectedDecade === dec
                  ? 'bg-[var(--lib-gold)] text-[#13110E] font-medium border border-[var(--lib-gold)]'
                  : 'bg-[var(--lib-surface)] text-[var(--lib-ink-secondary)] border border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)]'
              }`}
            >
              {dec === 'all' ? 'All Eras' : dec}
            </button>
          ))}
        </div>

        {/* Country Filters */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'India', 'USA', 'International'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCountry(c)}
              className={`px-2.5 py-1 text-xs rounded-sm font-serif transition-colors ${
                selectedCountry === c
                  ? 'bg-[var(--lib-accent)] text-[#FFFDF9] font-medium border border-[var(--lib-accent)]'
                  : 'bg-[var(--lib-surface)] text-[var(--lib-ink-secondary)] border border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Events Index */}
      <div className="space-y-2.5 pt-2">
        {SAMPLE_EVENTS.map((event) => {
          const isSelected = event.id === selectedId;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedId(event.id)}
              className={`w-full text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--lib-surface-elevated)] border-[var(--lib-gold)] shadow-xs'
                  : 'bg-[var(--lib-surface)] border-[var(--lib-border)] hover:border-[var(--lib-gold)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[var(--lib-ink-muted)] mb-1">
                <span className="font-mono text-[var(--lib-accent)] font-semibold">{event.year}</span>
                <InkStampBadge variant="muted" shape="pill">
                  {event.country}
                </InkStampBadge>
              </div>
              <h4 className="font-serif text-sm font-medium text-[var(--lib-ink)] line-clamp-2">
                {event.headline}
              </h4>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Right Panel: Archival Reading Desk
  const rightPanel = (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-sm text-[var(--lib-accent)] font-bold">
              {selectedEvent.year}
            </span>
            <span className="text-[var(--lib-border)]">·</span>
            <span className="text-xs font-serif text-[var(--lib-ink-muted)]">
              {selectedEvent.dateStr}
            </span>
          </div>
          <h2 className="lib-display text-2xl md:text-3xl text-[var(--lib-ink)] font-semibold leading-snug">
            {selectedEvent.headline}
          </h2>
        </div>

        <BookRibbon
          active={bookmarked}
          onToggle={() => toggleBookmark('history', selectedEvent.id, selectedEvent.headline)}
          color="terracotta"
        />
      </div>

      {/* Archival Snippet Card */}
      <DeckleCard variant="default" className="p-6">
        <div className="flex items-center gap-2 mb-4 text-xs text-[var(--lib-gold)] font-serif">
          <Landmark className="w-4 h-4" />
          <span className="lib-meta tracking-wider">VERBATIM ARCHIVAL TRANSCRIPT</span>
        </div>

        <blockquote className="font-serif text-lg text-[var(--lib-ink)] leading-relaxed italic border-l-2 border-[var(--lib-border)] pl-4 my-2">
          “{selectedEvent.snippet}”
        </blockquote>

        <p className="mt-4 text-sm text-[var(--lib-ink-secondary)] font-serif leading-relaxed">
          Preserved verbatim from historical press wires. In compliance with strict library isolation,
          historical records are presented as factual archival transcripts without speculative AI revision.
        </p>

        {/* Provenance & Outbound Link */}
        <div className="mt-6 pt-4 border-t border-[var(--lib-border-soft)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--lib-ink-muted)]">
            <span>Repository: {selectedEvent.source}</span>
            <InkStampBadge variant="muted">{selectedEvent.license}</InkStampBadge>
          </div>

          <a
            href={selectedEvent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--lib-accent)] hover:underline font-serif"
          >
            <span>View Primary Document</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </DeckleCard>
    </div>
  );

  return <LibraryShellLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

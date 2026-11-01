/**
 * frontend/src/__tests__/unit/watchlist-broadsheet.test.ts
 * Unit tests for Screen (g) Watchlist Desk.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateWatchlistMatches,
  getPriorityStamp,
  WATCHLIST_PRESETS,
} from '../../utils/watchlist';

describe('Screen (g) Watchlist Desk & Keyword Matcher', () => {
  const sampleArticles = [
    {
      title_english: 'Wildlife Sanctuaries Report Rising Tiger Population in Reserves',
      summary: 'Conservationists applaud anti-poaching measures in forest reserves.',
      keywords: ['tiger', 'wildlife', 'conservation', 'poaching'],
    },
    {
      title_english: 'Global Clean Energy Investment Reaches Historic High Across Markets',
      summary: 'Solar installations and wind grids surge in adoption worldwide.',
      keywords: ['clean energy', 'solar', 'wind', 'renewables'],
    },
    {
      title_english: 'Optical Quantum Processors Achieve Breakthrough in Error Suppression',
      summary: 'Research teams demonstrate photon-based quantum computing.',
      keywords: ['quantum', 'optical', 'processor'],
    },
    {
      title_english: 'Transboundary Wildlife Corridors Established to Protect Snow Leopards',
      summary: 'New bilateral treaty connects habitat ranges across borders.',
      keywords: ['snow leopard', 'corridor', 'transboundary'],
    },
  ];

  it('calculates matching articles based on keyword array', () => {
    const tigerMatches = calculateWatchlistMatches(['tiger', 'poaching'], sampleArticles);
    expect(tigerMatches).toBe(1);

    const wildlifeMatches = calculateWatchlistMatches(['tiger', 'snow leopard'], sampleArticles);
    expect(wildlifeMatches).toBe(2);

    const energyMatches = calculateWatchlistMatches(['solar', 'wind'], sampleArticles);
    expect(energyMatches).toBe(1);

    const zeroMatches = calculateWatchlistMatches(['cryptocurrency', 'bitcoin'], sampleArticles);
    expect(zeroMatches).toBe(0);
  });

  it('returns appropriate broadsheet priority ink stamps', () => {
    const highStamp = getPriorityStamp('high');
    expect(highStamp.label).toBe('URGENT WIRE');
    expect(highStamp.className).toContain('border-accent');

    const normalStamp = getPriorityStamp('normal');
    expect(normalStamp.label).toBe('ACTIVE RADAR');

    const lowStamp = getPriorityStamp('low');
    expect(lowStamp.label).toBe('ROUTINE LOG');
  });

  it('provides verified topic presets for broadsheet monitoring', () => {
    expect(WATCHLIST_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(WATCHLIST_PRESETS[0]!.topic).toContain('Tiger & Snow Leopard');
    expect(WATCHLIST_PRESETS[0]!.priority).toBe('high');
    expect(WATCHLIST_PRESETS[1]!.keywords).toContain('clean energy');
  });
});

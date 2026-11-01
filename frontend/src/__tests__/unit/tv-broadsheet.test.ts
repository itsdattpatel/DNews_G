/**
 * frontend/src/__tests__/unit/tv-broadsheet.test.ts
 * Unit tests for Screen (h) TV View & Broadsheet Broadcast Desk.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateHealthRating,
  renderHealthDots,
  getVlcUrl,
  filterChannels,
} from '../../utils/tv';
import type { TvChannel } from '../../types';

describe('Screen (h) TV View & Broadcast Desk', () => {
  const sampleChannels: TvChannel[] = [
    {
      id: 1,
      name: 'Animal Planet Wild',
      country: 'USA',
      category: 'animals',
      stream_url: 'https://example.com/hls/animal.m3u8',
      logo_url: null,
      is_alive: true,
      is_favorite: true,
      last_checked_at: '2026-11-01T10:00:00Z',
    },
    {
      id: 2,
      name: 'BBC News International',
      country: 'UK',
      category: 'news',
      stream_url: 'https://example.com/hls/bbc.m3u8',
      logo_url: null,
      is_alive: true,
      is_favorite: false,
      last_checked_at: '2026-11-01T10:00:00Z',
    },
    {
      id: 3,
      name: 'Nat Geo Wild Safari',
      country: 'International',
      category: 'nature',
      stream_url: 'https://example.com/hls/natgeo.m3u8',
      logo_url: null,
      is_alive: false,
      is_favorite: true,
      last_checked_at: '2026-11-01T10:00:00Z',
    },
  ];

  it('calculates health ratings and formats into 5-dot broadsheet indicator string', () => {
    // Alive with fast ping
    expect(calculateHealthRating(true, 120)).toBe(5);
    expect(renderHealthDots(5)).toBe('[●●●●●]');

    // Alive with moderate ping
    expect(calculateHealthRating(true, 350)).toBe(4);
    expect(renderHealthDots(4)).toBe('[●●●●○]');

    // Alive with slow ping
    expect(calculateHealthRating(true, 750)).toBe(3);
    expect(renderHealthDots(3)).toBe('[●●●○○]');

    // Offline stream
    expect(calculateHealthRating(false)).toBe(0);
    expect(renderHealthDots(0)).toBe('[○○○○○]');
  });

  it('constructs external desktop VLC protocol links', () => {
    expect(getVlcUrl('https://example.com/hls/live.m3u8')).toBe('vlc://https://example.com/hls/live.m3u8');
    expect(getVlcUrl('')).toBe('');
  });

  it('filters channels by shelf (all, animals, favorites)', () => {
    // Animals shelf (excluding dead streams)
    const animalChannels = filterChannels(sampleChannels, 'animals', '', false);
    expect(animalChannels.length).toBe(1);
    expect(animalChannels[0]!.name).toBe('Animal Planet Wild');

    // Animals shelf (including dead streams)
    const animalWithDead = filterChannels(sampleChannels, 'animals', '', true);
    expect(animalWithDead.length).toBe(2);

    // Favorites shelf
    const favorites = filterChannels(sampleChannels, 'favorites', '', false);
    expect(favorites.length).toBe(1);
    expect(favorites[0]!.name).toBe('Animal Planet Wild');

    // All channels (excluding dead)
    const allAlive = filterChannels(sampleChannels, 'all', '', false);
    expect(allAlive.length).toBe(2);
  });
});


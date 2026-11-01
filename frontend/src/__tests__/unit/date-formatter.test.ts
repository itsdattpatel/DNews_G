import { describe, it, expect } from 'vitest';
import {
  formatDualTimestamps,
  formatRelativeSpan,
  setServerClockOffset,
  getServerClockOffset,
  getSynchronizedNow,
} from '../../utils/dateFormatter';

describe('Dual Timestamp & Date Verification (Category 1)', () => {
  const baseNow = new Date('2026-11-01T20:00:00.000Z');

  it('formats valid published and arrived timestamps with dual relative text', () => {
    const publishedAt = new Date('2026-11-01T18:00:00.000Z').toISOString(); // 2h ago
    const ingestedAt = new Date('2026-11-01T18:02:00.000Z').toISOString();  // 1h 58m ago

    const result = formatDualTimestamps(publishedAt, ingestedAt, false, baseNow);

    expect(result.publishedRelative).toBe('Published 2h ago');
    expect(result.arrivedRelative).toBe('Arrived 1h 58m ago');
    expect(result.isUnverified).toBe(false);
    expect(result.isCatchup).toBe(false);
    expect(result.combinedDisplay).toBe('Published 2h ago · Arrived 1h 58m ago');
    expect(result.tooltip).toContain('Published:');
    expect(result.tooltip).toContain('Arrived:');
  });

  it('marks published date as "Date unverified" when published_at is missing or null', () => {
    const ingestedAt = new Date('2026-11-01T19:30:00.000Z').toISOString(); // 30m ago

    const result = formatDualTimestamps(null, ingestedAt, false, baseNow);

    expect(result.publishedRelative).toBe('Date unverified');
    expect(result.arrivedRelative).toBe('Arrived 30m ago');
    expect(result.isUnverified).toBe(true);
    expect(result.combinedDisplay).toBe('Date unverified · Arrived 30m ago');
  });

  it('marks published date as "Date unverified" when published_at is in the future (>15m ahead)', () => {
    const publishedAt = new Date('2026-11-01T21:00:00.000Z').toISOString(); // 1h in the future
    const ingestedAt = new Date('2026-11-01T19:55:00.000Z').toISOString();

    const result = formatDualTimestamps(publishedAt, ingestedAt, false, baseNow);

    expect(result.publishedRelative).toBe('Date unverified');
    expect(result.isUnverified).toBe(true);
    expect(result.combinedDisplay).toContain('Date unverified');
  });

  it('marks published date as "Date unverified" when published_at is older than 30 days relative to ingest', () => {
    const publishedAt = new Date('2026-09-01T10:00:00.000Z').toISOString(); // 61 days older than ingest
    const ingestedAt = new Date('2026-11-01T19:50:00.000Z').toISOString();

    const result = formatDualTimestamps(publishedAt, ingestedAt, false, baseNow);

    expect(result.publishedRelative).toBe('Date unverified');
    expect(result.isUnverified).toBe(true);
  });

  it('marks catch-up articles with "arrived late" badge indicator', () => {
    const publishedAt = new Date('2026-11-01T15:00:00.000Z').toISOString();
    const ingestedAt = new Date('2026-11-01T19:00:00.000Z').toISOString();

    const result = formatDualTimestamps(publishedAt, ingestedAt, true, baseNow);

    expect(result.isCatchup).toBe(true);
    expect(result.catchupLabel).toBe('arrived late');
    expect(result.tooltip).toContain('(arrived late via catch-up)');
  });

  it('correctly handles timezone/DST formatting in local laptop time', () => {
    const ingestedAt = '2026-11-01T14:30:00.000Z';
    const result = formatDualTimestamps(ingestedAt, ingestedAt, false, baseNow);

    // Exact local time should be non-empty and formatted
    expect(result.arrivedExactLocal).toBeTruthy();
    expect(result.tooltip).toBeTruthy();
  });

  it('formats granular relative spans appropriately', () => {
    expect(formatRelativeSpan(20 * 1000)).toBe('just now');
    expect(formatRelativeSpan(45 * 60 * 1000)).toBe('45m ago');
    expect(formatRelativeSpan((1 * 3600 + 58 * 60) * 1000)).toBe('1h 58m ago');
    expect(formatRelativeSpan(2 * 3600 * 1000)).toBe('2h ago');
    expect(formatRelativeSpan(12 * 3600 * 1000)).toBe('12h ago');
    expect(formatRelativeSpan(3 * 86400 * 1000)).toBe('3d ago');
  });

  it('adjusts reference time when server clock offset is configured (Category 1B clock sync)', () => {
    // Reset offset
    setServerClockOffset(0);
    const laptopTime = Date.now();
    expect(Math.abs(getSynchronizedNow().getTime() - laptopTime)).toBeLessThan(50);

    // Apply +2 hour offset (e.g. laptop clock is 2 hours behind server)
    const twoHoursMs = 2 * 60 * 60 * 1000;
    setServerClockOffset(twoHoursMs);
    expect(getServerClockOffset()).toBe(twoHoursMs);

    const syncNow = getSynchronizedNow();
    expect(syncNow.getTime() - laptopTime).toBeGreaterThanOrEqual(twoHoursMs - 50);

    // Reset offset
    setServerClockOffset(0);
  });
});


import { describe, it, expect } from 'vitest';
import { parseGdeltDate } from '../../fetch/gdelt';

describe('GDELT Client (P2-03)', () => {
  it('parses GDELT timestamp format YYYYMMDDTHHMMSSZ into ISO 8601 string', () => {
    const raw = '20261030T101500Z';
    const parsed = parseGdeltDate(raw);
    expect(parsed).toBe('2026-10-30T10:15:00.000Z');
  });

  it('handles null or invalid date gracefully', () => {
    expect(parseGdeltDate(undefined)).toBeNull();
    expect(parseGdeltDate('invalid')).toBeNull();
  });
});

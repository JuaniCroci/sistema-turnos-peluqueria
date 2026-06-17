import { describe, it, expect } from 'vitest';
import { parseTime, getMonday } from './datetime';

describe('parseTime', () => {
  it('parses valid time', () => {
    expect(parseTime('08:20')).toEqual({ h: 8, m: 20 });
    expect(parseTime('16:00')).toEqual({ h: 16, m: 0 });
    expect(parseTime('00:00')).toEqual({ h: 0, m: 0 });
  });

  it('handles malformed input gracefully', () => {
    expect(parseTime('abc')).toEqual({ h: NaN, m: 0 });
    expect(parseTime('')).toEqual({ h: 0, m: 0 });
  });
});

describe('getMonday', () => {
  it('returns same date for Monday input', () => {
    expect(getMonday('2026-06-15')).toBe('2026-06-15');
  });

  it('returns previous Monday for Wednesday', () => {
    expect(getMonday('2026-06-17')).toBe('2026-06-15');
  });

  it('returns next Monday for Sunday', () => {
    expect(getMonday('2026-06-21')).toBe('2026-06-15');
  });
});

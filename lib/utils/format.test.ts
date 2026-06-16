import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDuration,
  formatLongDate,
  formatTime,
} from './format';

describe('formatPrice', () => {
  it('formats 300000 cents as $3.000', () => {
    const result = formatPrice(300000);
    expect(result).toContain('3.000');
    expect(result).toContain('$');
  });

  it('formats 0 cents as $0', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
  });

  it('formats large values', () => {
    const result = formatPrice(1800000);
    expect(result).toContain('18.000');
  });
});

describe('formatDuration', () => {
  it('returns minutes for < 60', () => {
    expect(formatDuration(20)).toBe('20 min');
    expect(formatDuration(40)).toBe('40 min');
    expect(formatDuration(45)).toBe('45 min');
  });

  it('returns hours for exactly 60', () => {
    expect(formatDuration(60)).toBe('1 h');
  });

  it('returns hours and minutes for > 60 with remainder', () => {
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(150)).toBe('2 h 30 min');
  });
});

describe('formatLongDate', () => {
  it('returns a Spanish date string', () => {
    const result = formatLongDate('2026-06-15T12:00:00.000Z');
    expect(result).toContain('junio');
  });
});

describe('formatTime', () => {
  it('returns a time string', () => {
    const result = formatTime('2026-06-15T09:00:00.000Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

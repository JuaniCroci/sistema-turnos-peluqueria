import { describe, it, expect } from 'vitest';
import {
  isWithinBusinessHours,
  isValidSlot,
  generateTimeSlots,
  getBlocksForDay,
} from './business';

describe('getBlocksForDay', () => {
  it('returns Saturday blocks for day 6', () => {
    const blocks = getBlocksForDay(6);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ apertura: '08:20', cierre: '13:00' });
  });

  it('returns weekday blocks for Mon-Fri', () => {
    for (let d = 1; d <= 5; d++) {
      const blocks = getBlocksForDay(d);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({ apertura: '08:20', cierre: '13:00' });
      expect(blocks[1]).toEqual({ apertura: '16:00', cierre: '20:00' });
    }
  });

  it('returns empty array for Sunday (day 0)', () => {
    expect(getBlocksForDay(0)).toEqual([]);
  });
});

describe('generateTimeSlots', () => {
  it('generates 40-min slots from default blocks', () => {
    const slots = generateTimeSlots();
    const morning = slots.filter((s) => s < '13:00');
    const afternoon = slots.filter((s) => s >= '16:00');

    expect(morning).toContain('08:20');
    expect(morning).toContain('09:00');
    expect(morning).toContain('12:20');
    expect(morning).not.toContain('13:00');

    expect(afternoon).toContain('16:00');
    expect(afternoon).toContain('19:20');
    expect(afternoon).not.toContain('20:00');

    expect(slots).toHaveLength(13); // 7 morning + 6 afternoon (16:00-20:00)
  });

  it('generates no slots when aperture equals cierre', () => {
    const slots = generateTimeSlots([{ apertura: '10:00', cierre: '10:00' }]);
    expect(slots).toHaveLength(0);
  });

  it('generates slots for custom block', () => {
    const slots = generateTimeSlots([{ apertura: '09:00', cierre: '11:00' }]);
    expect(slots).toEqual(['09:00', '09:40', '10:20']);
  });
});

describe('isWithinBusinessHours', () => {
  it('accepts valid morning slot', () => {
    expect(isWithinBusinessHours(8, 20, 1)).toBe(true);
    expect(isWithinBusinessHours(12, 20, 3)).toBe(true);
  });

  it('rejects midday break', () => {
    expect(isWithinBusinessHours(14, 0, 1)).toBe(false);
    expect(isWithinBusinessHours(15, 0, 2)).toBe(false);
  });

  it('rejects before opening', () => {
    expect(isWithinBusinessHours(7, 0, 1)).toBe(false);
  });

  it('rejects after closing', () => {
    expect(isWithinBusinessHours(20, 0, 1)).toBe(false);
  });

  it('rejects Sunday', () => {
    expect(isWithinBusinessHours(10, 0, 0)).toBe(false);
  });

  it('accepts Saturday slot when using sabado blocks', () => {
    expect(isWithinBusinessHours(8, 20, 6)).toBe(true);
  });
});

describe('isValidSlot', () => {
  it('accepts exact slot start', () => {
    expect(isValidSlot(8, 20, 1)).toBe(true);
    expect(isValidSlot(9, 0, 1)).toBe(true);
    expect(isValidSlot(16, 0, 1)).toBe(true);
  });

  it('rejects non-slot time', () => {
    expect(isValidSlot(8, 37, 1)).toBe(false);
    expect(isValidSlot(9, 15, 1)).toBe(false);
  });

  it('rejects midday break times', () => {
    expect(isValidSlot(14, 0, 1)).toBe(false);
    expect(isValidSlot(15, 0, 1)).toBe(false);
  });
});

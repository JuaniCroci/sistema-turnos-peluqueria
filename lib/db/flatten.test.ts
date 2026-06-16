import { describe, it, expect } from 'vitest';
import { flattenRow } from './flatten';

describe('flattenRow', () => {
  it('flattens nested objects with underscore prefix', () => {
    const row = {
      id: 1,
      service: {
        name: 'Corte caballero',
        duration_minutes: 30,
        category: { name: 'Cabello' },
      },
    };
    const result = flattenRow<Record<string, unknown>>(row);
    expect(result).toEqual({
      id: 1,
      service_name: 'Corte caballero',
      service_duration_minutes: 30,
      service_category_name: 'Cabello',
    });
  });

  it('preserves null nested values', () => {
    const row = {
      id: 2,
      service: { name: 'Corte dama', category: null },
    };
    const result = flattenRow<Record<string, unknown>>(row);
    expect(result.service_category).toBeNull();
  });

  it('does not recurse into arrays', () => {
    const row = {
      items: [1, 2, 3],
    };
    const result = flattenRow<Record<string, unknown>>(row);
    expect(result.items).toEqual([1, 2, 3]);
  });

  it('preserves primitive values', () => {
    const row = {
      id: 10,
      name: 'test',
      active: true,
      price_cents: 300000,
    };
    const result = flattenRow<Record<string, unknown>>(row);
    expect(result).toEqual(row);
  });

  it('handles deeply nested objects', () => {
    const row = {
      a: { b: { c: { d: 'deep' } } },
    };
    const result = flattenRow<Record<string, unknown>>(row);
    expect(result.a_b_c_d).toBe('deep');
  });
});

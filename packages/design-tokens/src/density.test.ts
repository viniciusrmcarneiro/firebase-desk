import { describe, expect, it } from 'vitest';
import { density } from './density.ts';

describe('density', () => {
  it('uses finite positive numeric values', () => {
    for (const values of Object.values(density)) {
      for (const value of Object.values(values)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('keeps compact rows smaller than comfortable rows', () => {
    expect(density.compact.rowHeight).toBeLessThan(density.comfortable.rowHeight);
    expect(density.compact.controlHeight).toBeLessThan(density.comfortable.controlHeight);
  });
});

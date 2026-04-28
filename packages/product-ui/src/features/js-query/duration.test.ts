import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration.ts';

describe('formatDuration', () => {
  it('keeps millisecond precision across ranges', () => {
    expect(formatDuration(42)).toBe('42ms');
    expect(formatDuration(1_234)).toBe('1.234s');
    expect(formatDuration(62_345)).toBe('1m 02.345s');
    expect(formatDuration(3_723_456)).toBe('1h 02m 03.456s');
  });

  it('clamps negative and fractional values to whole milliseconds', () => {
    expect(formatDuration(-1)).toBe('0ms');
    expect(formatDuration(12.8)).toBe('12ms');
  });
});

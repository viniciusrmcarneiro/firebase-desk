import { describe, expect, it } from 'vitest';
import { elapsedMs } from './time.ts';

describe('app-core time helpers', () => {
  it('clamps elapsed durations to zero', () => {
    expect(elapsedMs(100, 125)).toBe(25);
    expect(elapsedMs(125, 100)).toBe(0);
  });
});

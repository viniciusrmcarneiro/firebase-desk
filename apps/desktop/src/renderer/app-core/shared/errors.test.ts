import { describe, expect, it } from 'vitest';
import { messageFromError, toError } from './errors.ts';

describe('app-core error helpers', () => {
  it('normalizes unknown caught values', () => {
    const error = new Error('denied');
    expect(messageFromError(error, 'fallback')).toBe('denied');
    expect(messageFromError('nope', 'fallback')).toBe('fallback');
    expect(toError(error, 'fallback')).toBe(error);
    expect(toError('nope', 'fallback').message).toBe('fallback');
  });
});

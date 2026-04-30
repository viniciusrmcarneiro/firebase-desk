import { describe, expect, it } from 'vitest';
import { messageFromError } from './errors.ts';

describe('product UI error helpers', () => {
  it('uses caught Error messages and fallback messages', () => {
    expect(messageFromError(new Error('failed'), 'fallback')).toBe('failed');
    expect(messageFromError('failed', 'fallback')).toBe('fallback');
  });
});

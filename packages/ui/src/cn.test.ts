import { describe, expect, it } from 'vitest';
import { cn } from './cn.ts';

describe('cn', () => {
  it('merges conditional classes and resolves tailwind conflicts', () => {
    const hidden = false;
    expect(cn('px-2', hidden && 'hidden', 'px-3')).toBe('px-3');
  });
});

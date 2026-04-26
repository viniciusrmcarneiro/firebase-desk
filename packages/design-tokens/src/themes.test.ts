import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme, themes } from './themes.ts';

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    return collectKeys(child, childPrefix);
  });
}

describe('themes', () => {
  it('keeps light and dark theme shape in parity', () => {
    expect(collectKeys(darkTheme)).toEqual(collectKeys(lightTheme));
  });

  it('exports the theme registry', () => {
    expect(Object.keys(themes)).toEqual(['light', 'dark']);
  });
});

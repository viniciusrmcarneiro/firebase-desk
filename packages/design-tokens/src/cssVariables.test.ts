import { describe, expect, it } from 'vitest';
import { generateThemesCss } from './cssVariables.ts';

describe('generateThemesCss', () => {
  it('generates the CSS variable contract', () => {
    expect(generateThemesCss()).toMatchSnapshot();
  });
});

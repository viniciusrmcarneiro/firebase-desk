import { describe, expect, it } from 'vitest';
import { generateThemesCss } from './cssVariables.ts';

describe('generateThemesCss', () => {
  it('generates the CSS variable contract', () => {
    expect(generateThemesCss()).toMatchSnapshot();
  });

  it('generates active density aliases for document density changes', () => {
    const css = generateThemesCss();

    expect(css).toContain(':root[data-density="comfortable"]');
    expect(css).toContain(
      '--density-control-height: var(--density-comfortable-control-height);',
    );
  });
});

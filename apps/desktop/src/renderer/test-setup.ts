import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (!document.queryCommandSupported) {
  Object.defineProperty(document, 'queryCommandSupported', {
    configurable: true,
    value: () => false,
  });
}

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
  editor: {},
  languages: {},
}));
vi.mock('monaco-editor/esm/vs/language/json/monaco.contribution', () => ({}));
vi.mock('monaco-editor/esm/vs/language/typescript/monaco.contribution', () => ({}));

afterEach(() => {
  cleanup();
});

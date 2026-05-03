import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (!globalThis.CSS) {
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: {},
  });
}

if (!globalThis.CSS.escape) {
  Object.defineProperty(globalThis.CSS, 'escape', {
    configurable: true,
    value: (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'),
  });
}

if (!globalThis.Worker) {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    value: class Worker {
      postMessage() {}
      terminate() {}
      addEventListener() {}
      removeEventListener() {}
    },
  });
}

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
vi.mock('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution', () => ({}));
vi.mock('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution', () => ({}));
vi.mock('monaco-editor/esm/vs/language/json/monaco.contribution', () => ({}));
vi.mock('monaco-editor/esm/vs/language/typescript/monaco.contribution', () => ({
  javascriptDefaults: { addExtraLib: () => ({ dispose: () => {} }) },
  typescriptDefaults: { addExtraLib: () => ({ dispose: () => {} }) },
}));

afterEach(() => {
  cleanup();
});

import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { render, screen } from '@testing-library/react';
import type { editor as MonacoEditorTypes } from 'monaco-editor';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider.tsx';
import { CodeEditor, DiffCodeEditor } from './CodeEditor.tsx';

const monacoMock = vi.hoisted(() => ({
  diffContentListener: null as (() => void) | null,
  javascriptContribution: vi.fn(),
  javascriptAddExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
  loaderConfig: vi.fn(),
  modifiedValue: '',
  typescriptAddExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
  typescriptContribution: vi.fn(),
}));
const monacoApiMock = vi.hoisted(() => ({
  editor: {},
  languages: {
    typescript: {
      javascriptDefaults: { addExtraLib: monacoMock.javascriptAddExtraLib },
      typescriptDefaults: { addExtraLib: monacoMock.typescriptAddExtraLib },
    },
  },
}));

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => monacoApiMock);
vi.mock('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution', () => {
  monacoMock.javascriptContribution();
  return {};
});
vi.mock('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution', () => {
  monacoMock.typescriptContribution();
  return {};
});
vi.mock('monaco-editor/esm/vs/language/typescript/monaco.contribution', () => ({
  javascriptDefaults: { addExtraLib: monacoMock.javascriptAddExtraLib },
  typescriptDefaults: { addExtraLib: monacoMock.typescriptAddExtraLib },
}));

vi.mock('@monaco-editor/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: (
      {
        beforeMount,
        options,
        theme,
        value,
      }: {
        readonly beforeMount?: (monaco: typeof monacoApiMock) => void;
        readonly options?: { readonly ariaLabel?: string; };
        readonly theme: string;
        readonly value: string;
      },
    ) => {
      React.useEffect(() => {
        beforeMount?.(monacoApiMock);
      }, [beforeMount]);
      return (
        <textarea
          aria-label={options?.ariaLabel}
          data-testid='monaco'
          data-theme={theme}
          readOnly
          value={value}
        />
      );
    },
    DiffEditor: (
      {
        modified,
        beforeMount,
        onMount,
        theme,
      }: {
        readonly beforeMount?: (monaco: typeof monacoApiMock) => void;
        readonly modified: string;
        readonly onMount?: (editor: MonacoEditorTypes.IStandaloneDiffEditor) => void;
        readonly theme: string;
      },
    ) => {
      const mounted = React.useRef(false);
      monacoMock.modifiedValue = modified;
      React.useEffect(() => {
        if (mounted.current) return;
        mounted.current = true;
        beforeMount?.(monacoApiMock);
        onMount?.({
          getModifiedEditor: () => ({
            getValue: () => monacoMock.modifiedValue,
            onDidChangeModelContent: (listener: () => void) => {
              monacoMock.diffContentListener = listener;
              return {
                dispose: () => {
                  if (monacoMock.diffContentListener === listener) {
                    monacoMock.diffContentListener = null;
                  }
                },
              };
            },
          }),
        } as MonacoEditorTypes.IStandaloneDiffEditor);
      }, []);
      return <textarea data-testid='monaco-diff' data-theme={theme} readOnly value={modified} />;
    },
    loader: { config: monacoMock.loaderConfig },
  };
});

describe('CodeEditor', () => {
  it('configures Monaco to use the bundled editor package', async () => {
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor language='json' value='{}' />
      </AppearanceProvider>,
    );
    await screen.findByTestId('monaco');

    expect(monacoMock.loaderConfig).toHaveBeenCalledWith({
      monaco: monacoApiMock,
    });
  });

  it('registers JavaScript and TypeScript tokenization contributions', async () => {
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor language='javascript' value='yield 1;' />
      </AppearanceProvider>,
    );
    await screen.findByTestId('monaco');

    expect(monacoMock.javascriptContribution).toHaveBeenCalledTimes(1);
    expect(monacoMock.typescriptContribution).toHaveBeenCalledTimes(1);
  });

  it('registers editor extra libs with Monaco language defaults', async () => {
    const extraLib = {
      content: 'declare const admin: { firestore(): unknown };',
      filePath: 'file:///test/firebase-desk-js-query.d.ts',
    };
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor extraLibs={[extraLib]} language='javascript' value='admin.' />
      </AppearanceProvider>,
    );
    await screen.findByTestId('monaco');

    expect(monacoMock.javascriptAddExtraLib).toHaveBeenCalledWith(
      extraLib.content,
      extraLib.filePath,
    );
    expect(monacoMock.typescriptAddExtraLib).toHaveBeenCalledWith(
      extraLib.content,
      extraLib.filePath,
    );
  });

  it('exposes Monaco when mounted for integration diagnostics', async () => {
    delete (globalThis as typeof globalThis & { monaco?: unknown; }).monaco;
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor language='json' value='{}' />
      </AppearanceProvider>,
    );
    await screen.findByTestId('monaco');

    expect((globalThis as typeof globalThis & { monaco?: unknown; }).monaco).toBe(
      monacoApiMock,
    );
    delete (globalThis as typeof globalThis & { monaco?: unknown; }).monaco;
  });

  it('passes resolved appearance to Monaco', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor language='json' value='{}' />
      </AppearanceProvider>,
    );
    expect((await screen.findByTestId('monaco')).getAttribute('data-theme')).toBe('vs-dark');
  });

  it('passes an accessible label to Monaco', async () => {
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <CodeEditor ariaLabel='Document JSON' language='json' value='{}' />
      </AppearanceProvider>,
    );
    expect(await screen.findByLabelText('Document JSON')).toBeTruthy();
  });

  it('calls the latest diff change handler after rerender', async () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const settings = new MockSettingsRepository();
    const { rerender } = render(
      <AppearanceProvider settings={settings}>
        <DiffCodeEditor
          language='json'
          modified='{"draft":1}'
          original='{"remote":1}'
          onModifiedChange={firstHandler}
        />
      </AppearanceProvider>,
    );
    await screen.findByTestId('monaco-diff');

    rerender(
      <AppearanceProvider settings={settings}>
        <DiffCodeEditor
          language='json'
          modified='{"draft":2}'
          original='{"remote":1}'
          onModifiedChange={secondHandler}
        />
      </AppearanceProvider>,
    );
    monacoMock.modifiedValue = '{"draft":3}';
    monacoMock.diffContentListener?.();

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith('{"draft":3}');
  });
});

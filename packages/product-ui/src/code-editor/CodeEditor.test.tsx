import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { render, screen } from '@testing-library/react';
import type { editor as MonacoEditorTypes } from 'monaco-editor';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider.tsx';
import { CodeEditor, DiffCodeEditor } from './CodeEditor.tsx';

const monacoMock = vi.hoisted(() => ({
  diffContentListener: null as (() => void) | null,
  modifiedValue: '',
}));

vi.mock('@monaco-editor/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: (
      {
        options,
        theme,
        value,
      }: {
        readonly options?: { readonly ariaLabel?: string; };
        readonly theme: string;
        readonly value: string;
      },
    ) => (
      <textarea
        aria-label={options?.ariaLabel}
        data-testid='monaco'
        data-theme={theme}
        readOnly
        value={value}
      />
    ),
    DiffEditor: (
      {
        modified,
        onMount,
        theme,
      }: {
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
  };
});

describe('CodeEditor', () => {
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

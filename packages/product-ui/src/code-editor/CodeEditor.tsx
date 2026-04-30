import type { editor as MonacoEditorTypes } from 'monaco-editor';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { useAppearance } from '../appearance/AppearanceProvider.tsx';

type MonacoEditorApiModule = typeof import('monaco-editor');

const MonacoEditor = lazy(async () => {
  const module = await loadMonacoReact();
  return { default: module.default };
});

const MonacoDiffEditor = lazy(async () => {
  const module = await loadMonacoReact();
  return { default: module.DiffEditor };
});

export interface CodeEditorProps {
  readonly ariaLabel?: string;
  readonly height?: string;
  readonly language: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly value: string;
}

export function CodeEditor(
  { ariaLabel, height = '100%', language, onChange, readOnly = false, value }: CodeEditorProps,
) {
  const { resolvedTheme } = useAppearance();
  const options: MonacoEditorTypes.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    readOnly,
  };
  if (ariaLabel) options.ariaLabel = ariaLabel;

  return (
    <Suspense fallback={<div role='status'>Loading editor</div>}>
      <MonacoEditor
        beforeMount={exposeMonacoForDiagnostics}
        height={height}
        language={language}
        options={options}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
        value={value}
        onChange={(nextValue) => onChange?.(nextValue ?? '')}
      />
    </Suspense>
  );
}

export interface DiffCodeEditorProps {
  readonly height?: string;
  readonly language: string;
  readonly modified: string;
  readonly onModifiedChange?: (value: string) => void;
  readonly original: string;
}

export function DiffCodeEditor(
  {
    height = '100%',
    language,
    modified,
    onModifiedChange,
    original,
  }: DiffCodeEditorProps,
) {
  const { resolvedTheme } = useAppearance();
  const contentSubscription = useRef<{ dispose(): void; } | null>(null);
  const onModifiedChangeRef = useRef(onModifiedChange);

  useEffect(() => () => contentSubscription.current?.dispose(), []);
  useEffect(() => {
    onModifiedChangeRef.current = onModifiedChange;
  }, [onModifiedChange]);

  return (
    <Suspense fallback={<div role='status'>Loading editor</div>}>
      <MonacoDiffEditor
        beforeMount={exposeMonacoForDiagnostics}
        height={height}
        language={language}
        modified={modified}
        original={original}
        options={{
          minimap: { enabled: false },
          originalEditable: false,
          readOnly: false,
          renderSideBySide: true,
        }}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
        onMount={(editor: MonacoEditorTypes.IStandaloneDiffEditor) => {
          contentSubscription.current?.dispose();
          const modifiedEditor = editor.getModifiedEditor();
          contentSubscription.current = modifiedEditor.onDidChangeModelContent(() => {
            onModifiedChangeRef.current?.(modifiedEditor.getValue());
          });
        }}
      />
    </Suspense>
  );
}

async function loadMonacoReact(): Promise<typeof import('@monaco-editor/react')> {
  const [module, monaco] = await Promise.all([
    import('@monaco-editor/react'),
    // @ts-expect-error Monaco does not publish declarations for this ESM entry.
    import('monaco-editor/esm/vs/editor/editor.api'),
    // @ts-expect-error Monaco does not publish declarations for this ESM entry.
    import('monaco-editor/esm/vs/language/json/monaco.contribution'),
    // @ts-expect-error Monaco does not publish declarations for this ESM entry.
    import('monaco-editor/esm/vs/language/typescript/monaco.contribution'),
  ]);
  module.loader.config({ monaco });
  return module;
}

function exposeMonacoForDiagnostics(monaco: MonacoEditorApiModule): void {
  (globalThis as typeof globalThis & { monaco?: MonacoEditorApiModule; }).monaco = monaco;
}

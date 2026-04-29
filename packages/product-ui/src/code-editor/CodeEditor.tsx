import type { editor as MonacoEditorTypes } from 'monaco-editor';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { useAppearance } from '../appearance/AppearanceProvider.tsx';

const MonacoEditor = lazy(async () => {
  const module = await import('@monaco-editor/react');
  return { default: module.default };
});

const MonacoDiffEditor = lazy(async () => {
  const module = await import('@monaco-editor/react');
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

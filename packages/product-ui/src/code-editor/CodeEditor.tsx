import { lazy, Suspense } from 'react';
import { useAppearance } from '../appearance/AppearanceProvider.tsx';

const MonacoEditor = lazy(async () => {
  const module = await import('@monaco-editor/react');
  return { default: module.default };
});

export interface CodeEditorProps {
  readonly height?: string;
  readonly language: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly value: string;
}

export function CodeEditor(
  { height = '100%', language, onChange, readOnly = false, value }: CodeEditorProps,
) {
  const { resolvedTheme } = useAppearance();

  return (
    <Suspense fallback={<div role='status'>Loading editor</div>}>
      <MonacoEditor
        height={height}
        language={language}
        options={{ minimap: { enabled: false }, readOnly }}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
        value={value}
        onChange={(nextValue) => onChange?.(nextValue ?? '')}
      />
    </Suspense>
  );
}

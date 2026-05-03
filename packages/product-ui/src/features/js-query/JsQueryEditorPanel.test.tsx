import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JsQueryEditorPanel } from './JsQueryEditorPanel.tsx';

vi.mock('../../code-editor/CodeEditor.tsx', () => ({
  CodeEditor: (
    {
      extraLibs,
      onChange,
      readOnly,
      value,
    }: {
      readonly extraLibs?: ReadonlyArray<unknown> | undefined;
      readonly onChange?: (value: string) => void;
      readonly readOnly?: boolean;
      readonly value: string;
    },
  ) => (
    <textarea
      data-extra-lib-count={extraLibs?.length ?? 0}
      data-testid='editor'
      readOnly={readOnly}
      value={value}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

describe('JsQueryEditorPanel', () => {
  it('runs and edits while idle', () => {
    const onRun = vi.fn();
    const onSourceChange = vi.fn();

    render(
      <JsQueryEditorPanel
        isRunning={false}
        source='return 1;'
        onCancel={() => {}}
        onRun={onRun}
        onSourceChange={onSourceChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    fireEvent.change(screen.getByTestId('editor'), { target: { value: 'return 2;' } });

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onSourceChange).toHaveBeenCalledWith('return 2;');
    expect(screen.getByTestId('editor')).toHaveProperty('readOnly', false);
    expect(screen.getByTestId('editor').getAttribute('data-extra-lib-count')).toBe('1');
  });

  it('cancels and locks editor while running', () => {
    const onCancel = vi.fn();

    render(
      <JsQueryEditorPanel
        isRunning
        source='await work();'
        onCancel={onCancel}
        onRun={() => {}}
        onSourceChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('editor')).toHaveProperty('readOnly', true);
  });
});

import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../../appearance/AppearanceProvider.tsx';
import { ConflictMergeModal } from './ConflictMergeModal.tsx';

vi.mock('../../code-editor/CodeEditor.tsx', () => ({
  DiffCodeEditor: (
    {
      modified,
      onModifiedChange,
      original,
    }: {
      readonly modified: string;
      readonly onModifiedChange?: (value: string) => void;
      readonly original: string;
    },
  ) => (
    <div>
      <pre>{original}</pre>
      <textarea
        aria-label='Merge draft'
        value={modified}
        onChange={(event) => onModifiedChange?.(event.currentTarget.value)}
      />
    </div>
  ),
}));

const remoteDocument: FirestoreDocumentResult = {
  id: 'ord_1',
  path: 'orders/ord_1',
  data: {
    status: 'remote',
  },
  hasSubcollections: false,
  updateTime: '2026-04-29T00:01:00.000Z',
};

describe('ConflictMergeModal', () => {
  it('explains the conflict and labels both diff panes', () => {
    const onSaveMerged = vi.fn<SaveMerged>();
    renderModal({ onSaveMerged });

    expect(screen.getByText('Remote document changed.')).toBeTruthy();
    expect(screen.getByText('conflict')).toBeTruthy();
    expect(
      screen.getByText(
        'Review the current remote document and edit the merge draft before saving.',
      ),
    )
      .toBeTruthy();
    expect(screen.getByText('Current remote')).toBeTruthy();
    expect(screen.getByText('read-only')).toBeTruthy();
    expect(screen.getByText('Merge draft')).toBeTruthy();
    expect(screen.getByText('editable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Discard my changes' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
  });

  it('shows remote JSON and saves edited merge draft', async () => {
    const onSaveMerged = vi.fn<SaveMerged>();
    renderModal({ onSaveMerged });

    expect(screen.getByText(/"status": "remote"/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Merge draft'), {
      target: { value: '{"status":"merged"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save merged' }));

    await waitFor(() => expect(onSaveMerged).toHaveBeenCalledWith({ status: 'merged' }));
  });

  it('recursively sorts property names on both diff sides', () => {
    const onSaveMerged = vi.fn<SaveMerged>();
    render(
      <AppearanceProvider settings={new MockSettingsRepository()}>
        <ConflictMergeModal
          documentPath='orders/ord_1'
          localData={{
            z: true,
            a: {
              z: 2,
              a: 1,
            },
          }}
          open
          remoteDocument={{
            ...remoteDocument,
            data: {
              z: true,
              a: {
                z: 2,
                a: 1,
              },
            },
          }}
          onCancel={() => {}}
          onRefresh={() => {}}
          onSaveMerged={onSaveMerged}
        />
      </AppearanceProvider>,
    );

    const remote = screen.getByText((_content, element) =>
      element?.tagName === 'PRE' && textContainsSortedNestedObject(element.textContent ?? '')
    );
    const local = screen.getByLabelText('Merge draft');

    expect(remote).toBeTruthy();
    expect(textContainsSortedNestedObject((local as HTMLTextAreaElement).value)).toBe(true);
  });

  it('validates merge JSON and preserves draft', async () => {
    const onSaveMerged = vi.fn<SaveMerged>();
    renderModal({ onSaveMerged });

    fireEvent.change(screen.getByLabelText('Merge draft'), { target: { value: '[]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save merged' }));

    expect(await screen.findByText('Document JSON must be an object.')).toBeTruthy();
    expect(screen.getByLabelText('Merge draft')).toHaveProperty('value', '[]');
    expect(onSaveMerged).not.toHaveBeenCalled();
  });
});

function renderModal(
  { onSaveMerged }: { readonly onSaveMerged: SaveMerged; },
) {
  render(
    <AppearanceProvider settings={new MockSettingsRepository()}>
      <ConflictMergeModal
        documentPath='orders/ord_1'
        localData={{ status: 'local' }}
        open
        remoteDocument={remoteDocument}
        onCancel={() => {}}
        onRefresh={() => {}}
        onSaveMerged={onSaveMerged}
      />
    </AppearanceProvider>,
  );
}

type SaveMerged = (data: Record<string, unknown>) => void | Promise<void>;

function textContainsSortedNestedObject(value: string): boolean {
  return value.indexOf('"a": {') < value.indexOf('"z": true')
    && value.indexOf('"a": 1') < value.indexOf('"z": 2');
}

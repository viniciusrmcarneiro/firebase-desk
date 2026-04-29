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
  data: { status: 'remote' },
  hasSubcollections: false,
  updateTime: '2026-04-29T00:01:00.000Z',
};

describe('ConflictMergeModal', () => {
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

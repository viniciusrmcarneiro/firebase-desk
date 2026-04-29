import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteDocumentDialog } from './DeleteDocumentDialog.tsx';
import type { DeleteDocumentOptions } from './deleteDocumentModel.ts';

const document: FirestoreDocumentResult = {
  id: 'ord_1',
  path: 'orders/ord_1',
  data: {},
  hasSubcollections: true,
  subcollections: [{
    id: 'events',
    path: 'orders/ord_1/events',
    documents: [{
      id: 'evt_1',
      path: 'orders/ord_1/events/evt_1',
      data: {},
      hasSubcollections: false,
    }],
  } as CollectionWithDocuments],
};

describe('DeleteDocumentDialog', () => {
  it('toggles subcollection deletion and confirms descendant paths', async () => {
    const onConfirm = vi.fn<ConfirmDelete>();
    render(
      <DeleteDocumentDialog
        document={document}
        open
        onConfirm={onConfirm}
        onOpenChange={() => {}}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /Delete subcollection events/ });
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('orders/ord_1', {
        deleteSubcollectionPaths: ['orders/ord_1/events'],
        deleteDescendantDocumentPaths: ['orders/ord_1/events/evt_1'],
      })
    );
  });

  it('shows delete errors and keeps the dialog open', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn<ConfirmDelete>(async () => {
      throw new Error('recursive delete failed');
    });
    render(
      <DeleteDocumentDialog
        document={document}
        open
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('recursive delete failed')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Delete document' })).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('clears delete errors on retry', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn<ConfirmDelete>()
      .mockRejectedValueOnce(new Error('first delete failed'))
      .mockResolvedValueOnce(undefined);
    render(
      <DeleteDocumentDialog
        document={document}
        open
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('first delete failed')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.queryByText('first delete failed')).toBeNull();
  });
});

type ConfirmDelete = (
  documentPath: string,
  options: DeleteDocumentOptions,
) => Promise<void> | void;
type CollectionWithDocuments = NonNullable<FirestoreDocumentResult['subcollections']>[number] & {
  readonly documents: ReadonlyArray<FirestoreDocumentResult>;
};

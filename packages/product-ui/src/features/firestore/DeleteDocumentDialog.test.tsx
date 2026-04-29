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
});

type ConfirmDelete = (documentPath: string, options: DeleteDocumentOptions) => void;
type CollectionWithDocuments = NonNullable<FirestoreDocumentResult['subcollections']>[number] & {
  readonly documents: ReadonlyArray<FirestoreDocumentResult>;
};

import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentEditorModal } from './DocumentEditorModal.tsx';

vi.mock('../../code-editor/CodeEditor.tsx', () => ({
  CodeEditor: (
    { onChange, value }: {
      readonly onChange?: (value: string) => void;
      readonly value: string;
    },
  ) => (
    <textarea
      aria-label='Document JSON'
      value={value}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

const document: FirestoreDocumentResult = {
  id: 'ord_1024',
  path: 'orders/ord_1024',
  data: { status: 'paid' },
  hasSubcollections: false,
};

describe('DocumentEditorModal', () => {
  it('adds parsed fields and saves document JSON', async () => {
    const onOpenChange = vi.fn();
    const onSaveDocument = vi.fn();
    render(
      <DocumentEditorModal
        document={document}
        open
        onOpenChange={onOpenChange}
        onSaveDocument={onSaveDocument}
      />,
    );

    fireEvent.change(screen.getByLabelText('New field name'), { target: { value: 'count' } });
    fireEvent.change(screen.getByLabelText('New field value'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSaveDocument).toHaveBeenCalledWith('orders/ord_1024', {
        status: 'paid',
        count: 2,
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows validation errors for non-object document JSON', async () => {
    const onSaveDocument = vi.fn();
    render(
      <DocumentEditorModal
        document={document}
        open
        onOpenChange={() => {}}
        onSaveDocument={onSaveDocument}
      />,
    );

    fireEvent.change(screen.getByLabelText('Document JSON'), { target: { value: '[]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Document JSON must be an object.')).toBeTruthy();
    expect(onSaveDocument).not.toHaveBeenCalled();
  });
});

import type {
  FirestoreDocumentResult,
  FirestoreSaveDocumentResult,
} from '@firebase-desk/repo-contracts';
import { MockSettingsRepository } from '@firebase-desk/repo-mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../../appearance/AppearanceProvider.tsx';
import type { DeleteDocumentOptions } from './deleteDocumentModel.ts';
import { FirestoreQuerySurface } from './FirestoreQuerySurface.tsx';
import type { FirestoreQueryDraft } from './types.ts';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (
    { count, estimateSize }: {
      readonly count: number;
      readonly estimateSize: (index: number) => number;
    },
  ) => {
    const size = count > 0 ? estimateSize(0) : 0;
    return {
      getTotalSize: () => count * size,
      getVirtualItems: () =>
        Array.from({ length: count }, (_, index) => ({
          index,
          key: index,
          start: index * size,
          size,
        })),
    };
  },
}));

vi.mock('../../hooks/useMediaQuery.ts', () => ({
  useMediaQuery: () => true,
}));

vi.mock('../../code-editor/CodeEditor.tsx', () => ({
  CodeEditor: (
    { onChange, value }: {
      readonly onChange?: (value: string) => void;
      readonly value: string;
    },
  ) => (
    <textarea
      aria-label='JSON value'
      value={value}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
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

vi.mock('./FieldContextMenu.tsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./FieldContextMenu.tsx')>();
  return {
    ...actual,
    FieldContextMenu: (
      {
        children,
        document,
        fieldPath,
        onDeleteField,
        onEditField,
        onSetFieldNull,
        value,
      }: {
        readonly children: ReactNode;
        readonly document: FirestoreDocumentResult;
        readonly fieldPath: ReadonlyArray<string>;
        readonly onDeleteField?:
          | ((target: {
            readonly documentPath: string;
            readonly fieldPath: ReadonlyArray<string>;
            readonly value: unknown;
          }) => void)
          | undefined;
        readonly onEditField?:
          | ((target: {
            readonly documentPath: string;
            readonly fieldPath: ReadonlyArray<string>;
            readonly value: unknown;
          }, jsonMode: boolean) => void)
          | undefined;
        readonly onSetFieldNull?:
          | ((target: {
            readonly documentPath: string;
            readonly fieldPath: ReadonlyArray<string>;
            readonly value: unknown;
          }) => void)
          | undefined;
        readonly value: unknown;
      },
    ) => (
      <span>
        {children}
        <button
          type='button'
          onClick={() => onSetFieldNull?.({ documentPath: document.path, fieldPath, value })}
        >
          set null {fieldPath.join('.')}
        </button>
        <button
          type='button'
          onClick={() => onDeleteField?.({ documentPath: document.path, fieldPath, value })}
        >
          delete {fieldPath.join('.')}
        </button>
        <button
          type='button'
          onClick={() => onEditField?.({ documentPath: document.path, fieldPath, value }, false)}
        >
          edit {fieldPath.join('.')}
        </button>
      </span>
    ),
  };
});

const draft: FirestoreQueryDraft = {
  path: 'orders',
  filters: [],
  filterField: '',
  filterOp: '==',
  filterValue: '',
  limit: 25,
  sortDirection: 'desc',
  sortField: '',
};

const document: FirestoreDocumentResult = {
  id: 'ord_1',
  path: 'orders/ord_1',
  data: { active: true, meta: { count: 2 }, 'a.b': 'literal' },
  hasSubcollections: false,
  updateTime: '2026-04-29T00:00:00.000Z',
};

const documentWithSubcollections: FirestoreDocumentResult = {
  ...document,
  hasSubcollections: true,
  subcollections: [{
    id: 'events',
    path: 'orders/ord_1/events',
    documentCount: 1,
    documents: [{
      id: 'evt_1',
      path: 'orders/ord_1/events/evt_1',
      data: { type: 'created' },
      hasSubcollections: false,
    }],
  } as CollectionWithDocuments],
};

describe('FirestoreQuerySurface editing UX', () => {
  it('quick toggles a boolean field from the selection preview', async () => {
    const onSaveDocument = vi.fn<SaveDocument>();
    renderSurface({ onSaveDocument });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle active' }));

    await waitFor(() =>
      expect(onSaveDocument).toHaveBeenCalledWith('orders/ord_1', {
        active: false,
        meta: { count: 2 },
        'a.b': 'literal',
      }, { lastUpdateTime: document.updateTime })
    );
  });

  it('sets a field to null and shows manual refresh banner', async () => {
    const onSaveDocument = vi.fn<SaveDocument>();
    renderSurface({ onSaveDocument });

    fireEvent.click(screen.getAllByRole('button', { name: 'set null active' })[0]!);

    await waitFor(() =>
      expect(onSaveDocument).toHaveBeenCalledWith('orders/ord_1', {
        active: null,
        meta: { count: 2 },
        'a.b': 'literal',
      }, { lastUpdateTime: document.updateTime })
    );
    expect(await screen.findByText('Results changed.')).toBeTruthy();
  });

  it('confirms before deleting a field', async () => {
    const onSaveDocument = vi.fn<SaveDocument>();
    renderSurface({ onSaveDocument });

    fireEvent.click(screen.getAllByRole('button', { name: 'delete active' })[0]!);
    expect(screen.getByRole('dialog', { name: 'Delete field' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(onSaveDocument).toHaveBeenCalledWith('orders/ord_1', {
        meta: { count: 2 },
        'a.b': 'literal',
      }, { lastUpdateTime: document.updateTime })
    );
  });

  it('edits a literal dotted field name without treating it as nested', async () => {
    const onSaveDocument = vi.fn<SaveDocument>();
    renderSurface({ onSaveDocument });

    fireEvent.click(screen.getAllByRole('button', { name: 'edit a.b' })[0]!);
    fireEvent.change(screen.getByLabelText('Field string value'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSaveDocument).toHaveBeenCalledWith('orders/ord_1', {
        active: true,
        meta: { count: 2 },
        'a.b': 'changed',
      }, { lastUpdateTime: document.updateTime })
    );
  });

  it('creates a document with a generated ID that can be overwritten', async () => {
    const onCreateDocument = vi.fn<CreateDocument>();
    const onGenerateDocumentId = vi.fn(async () => 'generated_id');
    renderSurface({
      onCreateDocument,
      onGenerateDocumentId,
      onSaveDocument: vi.fn<SaveDocument>(),
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'New document' })[0]!);
    expect(await screen.findByDisplayValue('generated_id')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Document ID'), { target: { value: 'manual_id' } });
    fireEvent.change(screen.getByLabelText('JSON value'), {
      target: { value: '{"status":"draft"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(onCreateDocument).toHaveBeenCalledWith('orders', 'manual_id', { status: 'draft' })
    );
    expect(await screen.findByText('Results changed.')).toBeTruthy();
  });

  it('opens editable conflict merge and saves merged JSON with remote update time', async () => {
    const remoteDocument: FirestoreDocumentResult = {
      ...document,
      data: { active: false, meta: { count: 3 }, 'a.b': 'remote' },
      updateTime: '2026-04-29T00:01:00.000Z',
    };
    const onSaveDocument = vi.fn<SaveDocument>()
      .mockResolvedValueOnce({ status: 'conflict', remoteDocument })
      .mockResolvedValueOnce({ status: 'saved', document: remoteDocument });
    renderSurface({ onSaveDocument });

    fireEvent.click(screen.getAllByRole('button', { name: 'set null active' })[0]!);
    expect(await screen.findByRole('dialog', { name: 'Resolve save conflict' })).toBeTruthy();
    expect(screen.getByText(/"a.b": "remote"/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Merge draft'), {
      target: { value: '{"active":"merged"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save merged' }));

    await waitFor(() =>
      expect(onSaveDocument).toHaveBeenLastCalledWith(
        'orders/ord_1',
        { active: 'merged' },
        { lastUpdateTime: remoteDocument.updateTime },
      )
    );
  });
  it('confirms document delete and includes selected subcollections', async () => {
    const onSaveDocument = vi.fn<SaveDocument>();
    const onDeleteDocument = vi.fn<DeleteDocument>();
    renderSurface({
      document: documentWithSubcollections,
      onDeleteDocument,
      onSaveDocument,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete document' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete document' });
    expect(dialog).toBeTruthy();
    const checkbox = screen.getByRole('checkbox', { name: /Delete subcollection events/ });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(within(dialog).queryByText('1 docs')).toBeNull();

    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(onDeleteDocument).toHaveBeenCalledWith('orders/ord_1', {
        deleteSubcollectionPaths: ['orders/ord_1/events'],
        deleteDescendantDocumentPaths: ['orders/ord_1/events/evt_1'],
      })
    );
  });

  it('shows delete document errors once', async () => {
    const onSaveDocument = vi.fn<SaveDocument>();
    const onDeleteDocument = vi.fn<DeleteDocument>(() => {
      throw new Error('delete failed');
    });
    renderSurface({ onDeleteDocument, onSaveDocument });

    fireEvent.click(screen.getByRole('button', { name: 'Delete document' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.getAllByText('delete failed')).toHaveLength(1));
  });
});

function renderSurface(
  {
    document: inputDocument = document,
    onDeleteDocument,
    onCreateDocument,
    onGenerateDocumentId,
    onSaveDocument,
  }: {
    readonly document?: FirestoreDocumentResult;
    readonly onCreateDocument?: CreateDocument;
    readonly onDeleteDocument?: DeleteDocument;
    readonly onGenerateDocumentId?: (collectionPath: string) => Promise<string> | string;
    readonly onSaveDocument: SaveDocument;
  },
) {
  render(
    <AppearanceProvider settings={new MockSettingsRepository()}>
      <FirestoreQuerySurface
        draft={draft}
        hasMore={false}
        rows={[inputDocument]}
        selectedDocument={inputDocument}
        selectedDocumentPath={inputDocument.path}
        {...(onCreateDocument ? { onCreateDocument } : {})}
        {...(onDeleteDocument ? { onDeleteDocument } : {})}
        {...(onGenerateDocumentId ? { onGenerateDocumentId } : {})}
        onDraftChange={() => {}}
        onLoadMore={() => {}}
        onOpenDocumentInNewTab={() => {}}
        onReset={() => {}}
        onRun={() => {}}
        onSaveDocument={onSaveDocument}
        onSelectDocument={() => {}}
      />
    </AppearanceProvider>,
  );
}

type SaveDocument = (
  documentPath: string,
  data: Record<string, unknown>,
  options?: { readonly lastUpdateTime?: string; },
) => FirestoreSaveDocumentResult | void | Promise<FirestoreSaveDocumentResult | void>;
type CreateDocument = (
  collectionPath: string,
  documentId: string,
  data: Record<string, unknown>,
) => void;
type DeleteDocument = (documentPath: string, options: DeleteDocumentOptions) => void;
type CollectionWithDocuments = NonNullable<FirestoreDocumentResult['subcollections']>[number] & {
  readonly documents: ReadonlyArray<FirestoreDocumentResult>;
};

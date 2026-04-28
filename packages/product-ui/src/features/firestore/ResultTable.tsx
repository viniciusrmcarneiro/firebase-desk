import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import {
  Button,
  ContextMenuContent,
  ContextMenuItem,
  DataTable,
  type DataTableColumn,
  EmptyState,
  IconButton,
} from '@firebase-desk/ui';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { FirestoreValueCell } from './FirestoreValueCell.tsx';
import { fieldCatalogForRows, type SubcollectionLoadState } from './resultModel.tsx';
import { renderSubcollectionButtons } from './SubcollectionControls.tsx';

export interface ResultTableProps {
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly onEditDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly onSelectDocument?: ((documentPath: string) => void) | undefined;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocumentPath: string | null;
  readonly subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>;
}

type ResultTableRow = { readonly kind: 'document'; readonly document: FirestoreDocumentResult; };

export function ResultTable(
  {
    hasMore,
    isFetchingMore,
    onEditDocument,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onSelectDocument,
    rows,
    selectedDocumentPath,
    subcollectionStates,
  }: ResultTableProps,
) {
  const fieldColumns = useMemo(
    () => fieldCatalogForRows(rows).map((field) => field.field),
    [rows],
  );
  const tableRows: ReadonlyArray<ResultTableRow> = rows.map((document) => ({
    kind: 'document',
    document,
  }));
  const columns = useMemo<ReadonlyArray<DataTableColumn<ResultTableRow>>>(
    () => [
      {
        id: 'id',
        header: 'Document ID',
        width: 180,
        cell: ({ row }) => <code>{row.original.document.id}</code>,
      },
      ...fieldColumns.map((field) => ({
        id: field,
        header: () => <code>{field}</code>,
        width: 160,
        cell: ({ row }) => {
          const value = row.original.document.data[field];
          return field in row.original.document.data ? <FirestoreValueCell value={value} /> : '';
        },
      } satisfies DataTableColumn<ResultTableRow>)),
      {
        id: 'subcollections',
        header: 'Subcollections',
        width: 420,
        cell: ({ row }) =>
          renderSubcollectionButtons(
            row.original.document,
            onOpenDocumentInNewTab,
            subcollectionStates[row.original.document.path],
            onLoadSubcollections,
          ),
      },
      ...(onOpenDocumentInNewTab
        ? [
          {
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            width: 56,
            cell: ({ row }) => {
              const tableRow = row.original;
              return (
                <IconButton
                  icon={<ExternalLink size={13} aria-hidden='true' />}
                  label={`Open ${tableRow.document.id} in new tab`}
                  size='xs'
                  variant='ghost'
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDocumentInNewTab(tableRow.document.path);
                  }}
                />
              );
            },
          } satisfies DataTableColumn<ResultTableRow>,
        ]
        : []),
    ],
    [fieldColumns, onLoadSubcollections, onOpenDocumentInNewTab, subcollectionStates],
  );

  return (
    <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]'>
      <DataTable
        columns={columns}
        data={tableRows}
        emptyState={<EmptyState title='No documents' />}
        getRowId={(row) => row.document.path}
        rowClassName={(row) =>
          selectedDocumentPath === row.document.path ? 'bg-action-selected' : undefined}
        {...(onOpenDocumentInNewTab
          ? {
            rowContextMenu: (row: ResultTableRow) => (
              <ContextMenuContent>
                <ContextMenuItem
                  className='gap-2'
                  onSelect={() => onOpenDocumentInNewTab(row.document.path)}
                >
                  <ExternalLink size={13} aria-hidden='true' /> Open in new tab
                </ContextMenuItem>
              </ContextMenuContent>
            ),
          }
          : {})}
        selectedRowId={selectedDocumentPath}
        {...(onSelectDocument
          ? { onRowClick: (row: ResultTableRow) => onSelectDocument(row.document.path) }
          : {})}
        {...(onEditDocument
          ? { onRowDoubleClick: (row: ResultTableRow) => onEditDocument(row.document) }
          : {})}
      />
      {hasMore
        ? (
          <div className='border-t border-border-subtle bg-bg-panel px-3 py-2'>
            <Button disabled={isFetchingMore} variant='secondary' onClick={onLoadMore}>
              {isFetchingMore ? 'Loading' : 'Load more'}
            </Button>
          </div>
        )
        : null}
    </div>
  );
}

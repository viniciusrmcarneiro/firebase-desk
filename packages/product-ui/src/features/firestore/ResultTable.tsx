import type { FirestoreDocumentResult, SettingsRepository } from '@firebase-desk/repo-contracts';
import { Button, DataTable, type DataTableColumn, EmptyState } from '@firebase-desk/ui';
import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { DocumentContextMenuContent, FieldContextMenuContent } from './FieldContextMenu.tsx';
import { type FieldEditTarget } from './fieldEditModel.ts';
import { FirestoreValueCell } from './FirestoreValueCell.tsx';
import { fieldCatalogForRows, type SubcollectionLoadState } from './resultModel.tsx';
import { useResultTableLayout } from './resultTableLayout.ts';
import { renderSubcollectionButtons } from './SubcollectionControls.tsx';

export interface ResultTableProps {
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly onDeleteDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onEditDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
  readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly onSelectDocument?: ((documentPath: string) => void) | undefined;
  readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
  readonly queryPath: string;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocumentPath: string | null;
  readonly settings?: SettingsRepository | undefined;
  readonly subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>;
}

type ResultTableRow = { readonly kind: 'document'; readonly document: FirestoreDocumentResult; };

export function ResultTable(
  {
    hasMore,
    isFetchingMore,
    onDeleteDocument,
    onEditDocument,
    onDeleteField,
    onEditField,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onSelectDocument,
    onSetFieldNull,
    queryPath,
    rows,
    selectedDocumentPath,
    settings,
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
  const showSubcollections = rows.some((row) =>
    row.hasSubcollections || (row.subcollections?.length ?? 0) > 0
  );
  const columns = useMemo<ReadonlyArray<DataTableColumn<ResultTableRow>>>(
    () => [
      {
        id: 'id',
        header: 'Document ID',
        width: 180,
        minWidth: 120,
        cell: ({ row }) => (
          <code
            aria-label={`Document ID ${row.original.document.id}`}
            title={row.original.document.id}
          >
            {row.original.document.id}
          </code>
        ),
      },
      ...fieldColumns.map((field) => ({
        id: field,
        header: () => <code>{field}</code>,
        width: 160,
        minWidth: 96,
        cell: ({ row }) => {
          const value = row.original.document.data[field];
          return field in row.original.document.data
            ? <FirestoreValueCell value={value} />
            : '';
        },
      } satisfies DataTableColumn<ResultTableRow>)),
      ...(showSubcollections
        ? [
          {
            id: 'subcollections',
            header: 'Subcollections',
            width: 420,
            minWidth: 180,
            maxWidth: 720,
            cell: ({ row }) =>
              renderSubcollectionButtons(
                row.original.document,
                onOpenDocumentInNewTab,
                subcollectionStates[row.original.document.path],
                onLoadSubcollections,
              ),
          } satisfies DataTableColumn<ResultTableRow>,
        ]
        : []),
    ],
    [
      fieldColumns,
      onDeleteField,
      onEditField,
      onLoadSubcollections,
      onOpenDocumentInNewTab,
      onSetFieldNull,
      showSubcollections,
      subcollectionStates,
    ],
  );
  const { hasSavedLayout, layout, resetLayout, saveLayout } = useResultTableLayout({
    columns,
    queryPath,
    settings,
  });
  const showFooter = hasMore || hasSavedLayout;

  return (
    <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]'>
      <DataTable
        columnLayout={layout}
        columns={columns}
        data={tableRows}
        emptyState={<EmptyState title='No documents' />}
        enableColumnReorder
        enableColumnResize
        getRowId={(row) => row.document.path}
        onColumnLayoutChange={saveLayout}
        cellContextMenu={(row, columnId) =>
          renderCellContextMenu({
            columnId,
            document: row.document,
            onDeleteDocument,
            onDeleteField,
            onEditField,
            onOpenDocumentInNewTab,
            onSetFieldNull,
          })}
        rowClassName={(row) =>
          selectedDocumentPath === row.document.path ? 'bg-action-selected' : undefined}
        selectedRowId={selectedDocumentPath}
        {...(onSelectDocument
          ? { onRowClick: (row: ResultTableRow) => onSelectDocument(row.document.path) }
          : {})}
        {...(onEditDocument
          ? { onRowDoubleClick: (row: ResultTableRow) => onEditDocument(row.document) }
          : {})}
      />
      {showFooter
        ? (
          <div className='flex items-center gap-2 border-t border-border-subtle bg-bg-panel px-3 py-2'>
            {hasMore
              ? (
                <Button disabled={isFetchingMore} variant='secondary' onClick={onLoadMore}>
                  {isFetchingMore ? 'Loading' : 'Load more'}
                </Button>
              )
              : null}
            {hasSavedLayout
              ? (
                <Button className='gap-1.5' size='xs' variant='secondary' onClick={resetLayout}>
                  <RotateCcw size={13} aria-hidden='true' />
                  Reset table layout
                </Button>
              )
              : null}
          </div>
        )
        : null}
    </div>
  );
}

function renderCellContextMenu(
  {
    columnId,
    document,
    onDeleteDocument,
    onDeleteField,
    onEditField,
    onOpenDocumentInNewTab,
    onSetFieldNull,
  }: {
    readonly columnId: string;
    readonly document: FirestoreDocumentResult;
    readonly onDeleteDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
    readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
    readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
    readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
    readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
  },
) {
  if (columnId in document.data) {
    return (
      <FieldContextMenuContent
        document={document}
        fieldPath={[columnId]}
        value={document.data[columnId]}
        onDeleteDocument={onDeleteDocument}
        onDeleteField={onDeleteField}
        onEditField={onEditField}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        onSetFieldNull={onSetFieldNull}
      />
    );
  }
  if (!onOpenDocumentInNewTab && !onDeleteDocument) return null;
  return (
    <DocumentContextMenuContent
      document={document}
      onDeleteDocument={onDeleteDocument}
      onOpenDocumentInNewTab={onOpenDocumentInNewTab}
    />
  );
}

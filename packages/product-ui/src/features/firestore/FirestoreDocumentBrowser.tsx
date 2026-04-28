import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
} from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  ChipList,
  cn,
  ContextMenuContent,
  ContextMenuItem,
  DataTable,
  type DataTableColumn,
  DetailRow,
  EmptyState,
  ExplorerTree,
  type ExplorerTreeRowModel,
  IconButton,
  InlineAlert,
  InspectorSection,
  Panel,
  PanelBody,
  PanelHeader,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@firebase-desk/ui';
import {
  Braces,
  ChevronRight,
  Edit3,
  ExternalLink,
  FileJson,
  FileText,
  Folder,
  GitBranch,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Table2,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import {
  FirestoreValueCell,
  firestoreValueType,
  formatFirestoreValue,
  isFirestoreTypedValue,
} from './FirestoreValueCell.tsx';
import type { FirestoreResultView } from './types.ts';

export interface FirestoreDocumentBrowserProps {
  readonly className?: string;
  readonly errorMessage?: string | null;
  readonly hasMore: boolean;
  readonly header?: ReactNode;
  readonly isFetchingMore?: boolean;
  readonly isLoading?: boolean;
  readonly onDeleteDocument?: ((documentPath: string) => Promise<void> | void) | undefined;
  readonly onEditDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?:
    | (
      (documentPath: string) => Promise<ReadonlyArray<FirestoreCollectionNode>>
    )
    | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly onResultViewChange: (view: FirestoreResultView) => void;
  readonly onSelectDocument?: ((documentPath: string) => void) | undefined;
  readonly queryPath: string;
  readonly resultView: FirestoreResultView;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument?: FirestoreDocumentResult | null;
  readonly selectedDocumentPath?: string | null;
}

interface FieldCatalogItem {
  readonly count: number;
  readonly field: string;
  readonly types: ReadonlyArray<string>;
}

interface SubcollectionLoadState {
  readonly status: 'error' | 'loading' | 'success';
  readonly errorMessage?: string;
  readonly items?: ReadonlyArray<FirestoreCollectionNode>;
}

const MAX_SUBCOLLECTION_CHIPS = 10;

export function FirestoreDocumentBrowser(
  {
    className,
    errorMessage = null,
    hasMore,
    header,
    isFetchingMore = false,
    isLoading = false,
    onDeleteDocument,
    onEditDocument,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onResultViewChange,
    onSelectDocument,
    queryPath,
    resultView,
    rows,
    selectedDocument = null,
    selectedDocumentPath = null,
  }: FirestoreDocumentBrowserProps,
) {
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [subcollectionStates, setSubcollectionStates] = useState<
    Readonly<Record<string, SubcollectionLoadState>>
  >({});
  const useSplitLayout = useMediaQuery('(min-width: 1024px)');
  const rowsWithSubcollections = useMemo(
    () => rows.map((row) => mergeLoadedSubcollections(row, subcollectionStates[row.path])),
    [rows, subcollectionStates],
  );
  const selectedDocumentWithSubcollections = useMemo(
    () =>
      rowsWithSubcollections.find((row) => row.path === selectedDocumentPath)
        ?? mergeLoadedSubcollections(
          selectedDocument,
          selectedDocument ? subcollectionStates[selectedDocument.path] : undefined,
        ),
    [rowsWithSubcollections, selectedDocument, selectedDocumentPath, subcollectionStates],
  );

  async function loadSubcollections(documentPath: string) {
    if (!onLoadSubcollections) return;
    setSubcollectionStates((current) => ({
      ...current,
      [documentPath]: { status: 'loading' },
    }));
    try {
      const items = await onLoadSubcollections(documentPath);
      setSubcollectionStates((current) => ({
        ...current,
        [documentPath]: { status: 'success', items },
      }));
    } catch (caught) {
      setSubcollectionStates((current) => ({
        ...current,
        [documentPath]: {
          status: 'error',
          errorMessage: messageFromError(caught, 'Could not load subcollections.'),
        },
      }));
    }
  }

  const mainColumn = (
    <div
      className={header
        ? 'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2'
        : 'grid h-full min-h-0 grid-rows-[minmax(0,1fr)]'}
    >
      {header}
      <ResultPanel
        hasMore={hasMore}
        errorMessage={errorMessage}
        isFetchingMore={isFetchingMore}
        isLoading={isLoading}
        queryPath={queryPath}
        resultView={resultView}
        rows={rowsWithSubcollections}
        selectedDocumentPath={selectedDocumentPath}
        subcollectionStates={subcollectionStates}
        onEditDocument={onEditDocument}
        onLoadMore={onLoadMore}
        onLoadSubcollections={onLoadSubcollections ? loadSubcollections : undefined}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        onResultViewChange={onResultViewChange}
        onSelectDocument={onSelectDocument}
      />
    </div>
  );

  const overviewPanel = overviewCollapsed
    ? <OverviewCollapseStrip onExpand={() => setOverviewCollapsed(false)} />
    : (
      <ResultContextPanel
        resultView={resultView}
        rows={rowsWithSubcollections}
        selectedDocument={selectedDocumentWithSubcollections}
        onCollapse={() => setOverviewCollapsed(true)}
        onDeleteDocument={onDeleteDocument}
        onEditDocument={onEditDocument}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
      />
    );

  return (
    <div className={cn('h-full min-h-0', className)}>
      {useSplitLayout
        ? (
          <ResizablePanelGroup
            key={overviewCollapsed ? 'overview-collapsed' : 'overview-expanded'}
            direction='horizontal'
            className='h-full min-h-0'
          >
            <ResizablePanel className='h-full' minSize='420px'>{mainColumn}</ResizablePanel>
            <ResizableHandle className='mx-2 h-full w-px' />
            <ResizablePanel
              className='h-full'
              defaultSize={overviewCollapsed ? '42px' : '34%'}
              maxSize={overviewCollapsed ? '42px' : '520px'}
              minSize={overviewCollapsed ? '42px' : '280px'}
            >
              {overviewPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        )
        : (
          <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(220px,34%)] gap-2'>
            {mainColumn}
            {overviewPanel}
          </div>
        )}
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMediaQueryMatch(query));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

function getMediaQueryMatch(query: string): boolean {
  return typeof window === 'undefined' ? true : window.matchMedia(query).matches;
}

interface ResultPanelProps {
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly onEditDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly onResultViewChange: (view: FirestoreResultView) => void;
  readonly onSelectDocument?: ((documentPath: string) => void) | undefined;
  readonly queryPath: string;
  readonly resultView: FirestoreResultView;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocumentPath: string | null;
  readonly subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>;
}

function ResultPanel(
  {
    hasMore,
    errorMessage,
    isFetchingMore,
    isLoading,
    onEditDocument,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onResultViewChange,
    onSelectDocument,
    queryPath,
    resultView,
    rows,
    selectedDocumentPath,
    subcollectionStates,
  }: ResultPanelProps,
) {
  const jsonValue = useMemo(() => ({ path: queryPath, documents: rows }), [queryPath, rows]);
  const showPagination = isCollectionPath(queryPath) && hasMore;
  const [expandedTreeIds, setExpandedTreeIds] = useState<ReadonlySet<string>>(() => new Set());

  function toggleTreeNode(id: string) {
    const willExpand = !expandedTreeIds.has(id);
    setExpandedTreeIds((current) => {
      const next = new Set(toggleSet(current, id));
      if (willExpand && id.startsWith('doc:')) {
        next.add(`${id}:fields`);
        next.add(`${id}:subcollections`);
      }
      return next;
    });
    if (!willExpand || !onLoadSubcollections || !id.startsWith('doc:')) return;
    const documentPath = id.slice('doc:'.length);
    const row = rows.find((item) => item.path === documentPath);
    const state = subcollectionStates[documentPath];
    if (
      !row || row.hasSubcollections === false || row.subcollections !== undefined
      || state?.status === 'loading'
    ) return;
    void onLoadSubcollections(documentPath);
  }

  return (
    <Tabs
      className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'
      value={resultView}
      onValueChange={(value) => onResultViewChange(value as FirestoreResultView)}
    >
      <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <PanelHeader
          actions={
            <div className='flex items-center gap-2'>
              <Badge>{isLoading ? 'loading' : `${rows.length} docs`}</Badge>
              <TabsList className='rounded-md border border-border-subtle bg-bg-subtle p-0.5'>
                <TabsTrigger className='h-7 gap-1 rounded-sm border-b-0 px-2' value='table'>
                  <Table2 size={13} aria-hidden='true' /> Table
                </TabsTrigger>
                <TabsTrigger className='h-7 gap-1 rounded-sm border-b-0 px-2' value='tree'>
                  <GitBranch size={13} aria-hidden='true' /> Tree
                </TabsTrigger>
                <TabsTrigger className='h-7 gap-1 rounded-sm border-b-0 px-2' value='json'>
                  <Braces size={13} aria-hidden='true' /> JSON
                </TabsTrigger>
              </TabsList>
            </div>
          }
        >
          <span className='flex min-w-0 items-center gap-2'>
            <Table2 size={15} aria-hidden='true' />
            <span className='truncate'>Results</span>
          </span>
        </PanelHeader>
        <PanelBody className='flex min-h-0 flex-col overflow-hidden p-0'>
          {errorMessage
            ? (
              <div className='border-b border-border-subtle p-2'>
                <InlineAlert variant='danger'>{errorMessage}</InlineAlert>
              </div>
            )
            : null}
          <div className='min-h-0 flex-1 overflow-hidden'>
            <TabsContent className='h-full min-h-0 overflow-hidden' value='table'>
              <ResultTable
                hasMore={showPagination}
                isFetchingMore={isFetchingMore}
                rows={rows}
                selectedDocumentPath={selectedDocumentPath}
                subcollectionStates={subcollectionStates}
                onEditDocument={onEditDocument}
                onLoadMore={onLoadMore}
                onLoadSubcollections={onLoadSubcollections}
                onOpenDocumentInNewTab={onOpenDocumentInNewTab}
                onSelectDocument={onSelectDocument}
              />
            </TabsContent>
            <TabsContent className='h-full min-h-0 overflow-auto' value='tree'>
              {rows.length
                ? (
                  <ResultTreeView
                    queryPath={queryPath}
                    expandedIds={expandedTreeIds}
                    hasMore={showPagination}
                    isFetchingMore={isFetchingMore}
                    rows={rows}
                    subcollectionStates={subcollectionStates}
                    onLoadMore={onLoadMore}
                    onLoadSubcollections={onLoadSubcollections}
                    onOpenDocumentInNewTab={onOpenDocumentInNewTab}
                    onToggleNode={toggleTreeNode}
                  />
                )
                : <EmptyState title='No documents' />}
            </TabsContent>
            <TabsContent className='h-full min-h-0 overflow-hidden' value='json'>
              <textarea
                aria-label='JSON results'
                className='h-full w-full resize-none border-0 bg-bg-panel p-3 font-mono text-xs text-text-secondary outline-none'
                readOnly
                value={JSON.stringify(jsonValue, null, 2)}
              />
            </TabsContent>
          </div>
        </PanelBody>
      </Panel>
    </Tabs>
  );
}

interface ResultTableProps {
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

function ResultTable(
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

interface ResultContextPanelProps {
  readonly onDeleteDocument?: ((documentPath: string) => Promise<void> | void) | undefined;
  readonly onCollapse: () => void;
  readonly onEditDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly resultView: FirestoreResultView;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument: FirestoreDocumentResult | null;
}

function ResultContextPanel(
  {
    onCollapse,
    onDeleteDocument,
    onEditDocument,
    onOpenDocumentInNewTab,
    resultView,
    rows,
    selectedDocument,
  }: ResultContextPanelProps,
) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fieldCatalog = useMemo(() => fieldCatalogForRows(rows), [rows]);
  const showSelectionPreview = resultView === 'table';

  return (
    <>
      <Panel className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <PanelHeader
          actions={
            <span className='flex items-center gap-1'>
              <Badge>{rows.length} docs</Badge>
              <IconButton
                icon={<PanelRightClose size={14} aria-hidden='true' />}
                label='Collapse result overview'
                size='xs'
                variant='ghost'
                onClick={onCollapse}
              />
            </span>
          }
        >
          <span className='flex min-w-0 items-center gap-2'>
            <Table2 size={15} aria-hidden='true' />
            <span className='truncate'>Result overview</span>
          </span>
        </PanelHeader>
        <PanelBody className='min-h-0 p-0'>
          <InspectorSection
            defaultOpen
            icon={<Table2 size={14} aria-hidden='true' />}
            meta={`${fieldCatalog.length} fields`}
            title='Fields in results'
          >
            <FieldCatalogTable fields={fieldCatalog} rowCount={rows.length} />
          </InspectorSection>
          {showSelectionPreview
            ? (
              <InspectorSection
                defaultOpen
                icon={<FileText size={14} aria-hidden='true' />}
                meta={selectedDocument?.id ?? 'none'}
                title='Selection preview'
              >
                <SelectionPreview
                  document={selectedDocument}
                  onDelete={onDeleteDocument ? () => setConfirmOpen(true) : undefined}
                  onEdit={onEditDocument && selectedDocument
                    ? () => onEditDocument(selectedDocument)
                    : undefined}
                  onOpenDocumentInNewTab={onOpenDocumentInNewTab}
                />
              </InspectorSection>
            )
            : (
              <InspectorSection
                defaultOpen
                icon={resultView === 'tree'
                  ? <GitBranch size={14} aria-hidden='true' />
                  : <FileJson size={14} aria-hidden='true' />}
                meta={resultView}
                title={resultView === 'tree' ? 'Tree context' : 'JSON context'}
              >
                <ResultViewFacts resultView={resultView} rows={rows} />
              </InspectorSection>
            )}
        </PanelBody>
      </Panel>
      <ConfirmDialog
        confirmLabel='Delete'
        description={selectedDocument
          ? `Delete ${selectedDocument.path}?`
          : 'Delete the selected document?'}
        open={confirmOpen}
        title='Delete document'
        onConfirm={() => {
          if (selectedDocument) onDeleteDocument?.(selectedDocument.path);
        }}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}

function OverviewCollapseStrip({ onExpand }: { readonly onExpand: () => void; }) {
  return (
    <button
      className='grid h-full w-full place-items-center rounded-md border border-border-subtle bg-bg-panel text-text-muted hover:bg-action-ghost-hover hover:text-text-primary'
      type='button'
      onClick={onExpand}
    >
      <span className='flex items-center gap-2 [writing-mode:vertical-rl]'>
        <PanelRightOpen size={14} aria-hidden='true' />
        Result overview
      </span>
    </button>
  );
}

function FieldCatalogTable(
  { fields, rowCount }: {
    readonly fields: ReadonlyArray<FieldCatalogItem>;
    readonly rowCount: number;
  },
) {
  if (!fields.length) return <EmptyState title='No fields' />;
  return (
    <div className='overflow-auto'>
      <table className='w-full min-w-[360px] border-collapse text-xs'>
        <thead>
          <tr className='border-b border-border-subtle bg-bg-subtle text-left text-text-muted'>
            <th className='h-8 px-3 font-semibold'>Field</th>
            <th className='h-8 px-3 font-semibold'>Types</th>
            <th className='h-8 px-3 font-semibold'>Docs</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.field} className='border-b border-border-subtle'>
              <td className='h-8 px-3'>
                <code>{field.field}</code>
              </td>
              <td className='h-8 max-w-40 truncate px-3 text-text-muted'>
                <code>{field.types.join(', ')}</code>
              </td>
              <td className='h-8 px-3 text-text-muted'>{field.count}/{rowCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SelectionPreviewProps {
  readonly document: FirestoreDocumentResult | null;
  readonly onDelete?: (() => void) | undefined;
  readonly onEdit?: (() => void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
}

function SelectionPreview(
  { document, onDelete, onEdit, onOpenDocumentInNewTab }: SelectionPreviewProps,
) {
  if (!document) {
    return (
      <EmptyState icon={<Braces size={20} aria-hidden='true' />} title='No document selected' />
    );
  }
  return (
    <div className='grid gap-2 p-3'>
      <div className='grid gap-2'>
        <div className='min-w-0 font-mono text-xs text-text-secondary'>{document.path}</div>
        <div className='flex flex-wrap items-center gap-1'>
          <Badge>{Object.keys(document.data).length} fields</Badge>
          {document.hasSubcollections === true ? <Badge>subcollections</Badge> : null}
          {onEdit
            ? (
              <IconButton
                icon={<Edit3 size={14} aria-hidden='true' />}
                label='Edit document'
                size='xs'
                variant='ghost'
                onClick={onEdit}
              />
            )
            : null}
          {onDelete
            ? (
              <IconButton
                icon={<Trash2 size={14} aria-hidden='true' />}
                label='Delete document'
                size='xs'
                variant='ghost'
                onClick={onDelete}
              />
            )
            : null}
        </div>
      </div>
      <NestedValueTree value={document.data} />
      {document.subcollections?.length
        ? (
          <div className='grid gap-2 rounded-md border border-border-subtle p-2'>
            <div className='text-xs font-semibold text-text-secondary'>Subcollections</div>
            <SubcollectionChipList
              collections={document.subcollections}
              maxItems={MAX_SUBCOLLECTION_CHIPS}
              onOpenDocumentInNewTab={onOpenDocumentInNewTab}
            />
          </div>
        )
        : null}
    </div>
  );
}

function ResultViewFacts(
  { resultView, rows }: {
    readonly resultView: FirestoreResultView;
    readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  },
) {
  return (
    <div className='grid gap-2 p-3 text-sm'>
      <DetailRow label='View' value={resultView} />
      <DetailRow label='Documents' value={String(rows.length)} />
      <DetailRow label='Fields' value={String(fieldCatalogForRows(rows).length)} />
    </div>
  );
}

function ResultTreeView(
  {
    expandedIds,
    hasMore,
    isFetchingMore,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onToggleNode,
    queryPath,
    rows,
    subcollectionStates,
  }: {
    readonly expandedIds: ReadonlySet<string>;
    readonly hasMore: boolean;
    readonly isFetchingMore: boolean;
    readonly onLoadMore: () => void;
    readonly onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined;
    readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
    readonly onToggleNode: (id: string) => void;
    readonly queryPath: string;
    readonly rows: ReadonlyArray<FirestoreDocumentResult>;
    readonly subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>;
  },
) {
  const canLoadSubcollections = Boolean(onLoadSubcollections);
  const treeRows = useMemo(
    () =>
      flattenResultTree(
        queryPath,
        rows,
        hasMore,
        expandedIds,
        subcollectionStates,
        canLoadSubcollections,
      ),
    [canLoadSubcollections, expandedIds, hasMore, queryPath, rows, subcollectionStates],
  );

  return (
    <ExplorerTree
      rows={treeRows}
      onToggle={onToggleNode}
      contextMenu={(node) =>
        node.openPath && onOpenDocumentInNewTab
          ? (
            <ContextMenuContent>
              <ContextMenuItem
                className='gap-2'
                onSelect={() => onOpenDocumentInNewTab(node.openPath ?? '')}
              >
                <ExternalLink size={13} aria-hidden='true' /> Open in new tab
              </ContextMenuItem>
            </ContextMenuContent>
          )
          : null}
      renderAction={(node) => (
        <TreeRowAction
          isFetchingMore={isFetchingMore}
          node={node}
          onLoadMore={onLoadMore}
          onLoadSubcollections={onLoadSubcollections}
          onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        />
      )}
    />
  );
}

type ResultTreeNodeKind = 'branch' | 'leaf' | 'load-more' | 'load-subcollections';

interface ResultTreeRowModel extends ExplorerTreeRowModel {
  readonly documentPath?: string;
  readonly errorMessage?: string;
  readonly kind: ResultTreeNodeKind;
  readonly openPath?: string;
  readonly subcollectionStatus?: SubcollectionLoadState['status'] | 'idle';
}

function TreeRowAction(
  {
    isFetchingMore,
    node,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
  }: {
    readonly isFetchingMore: boolean;
    readonly node: ResultTreeRowModel;
    readonly onLoadMore: () => void;
    readonly onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined;
    readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  },
) {
  if (node.kind === 'load-more') {
    return (
      <Button
        disabled={isFetchingMore}
        size='xs'
        variant='secondary'
        onClick={(event) => {
          event.stopPropagation();
          onLoadMore();
        }}
      >
        Load more
      </Button>
    );
  }
  if (node.kind === 'load-subcollections' && node.documentPath && onLoadSubcollections) {
    return (
      <Button
        disabled={node.subcollectionStatus === 'loading'}
        size='xs'
        variant={node.subcollectionStatus === 'error' ? 'secondary' : 'ghost'}
        onClick={(event) => {
          event.stopPropagation();
          onLoadSubcollections(node.documentPath ?? '');
        }}
      >
        {node.subcollectionStatus === 'loading'
          ? <Loader2 className='animate-spin' size={13} aria-hidden='true' />
          : <Folder size={13} aria-hidden='true' />}
        {subcollectionLoadLabel(node.subcollectionStatus)}
      </Button>
    );
  }
  if (node.openPath && onOpenDocumentInNewTab) {
    return (
      <IconButton
        icon={<Folder size={13} aria-hidden='true' />}
        label={`Open ${node.label}`}
        size='xs'
        variant='ghost'
        onClick={(event) => {
          event.stopPropagation();
          onOpenDocumentInNewTab(node.openPath ?? '');
        }}
      />
    );
  }
  return null;
}

function flattenResultTree(
  queryPath: string,
  rows: ReadonlyArray<FirestoreDocumentResult>,
  hasMore: boolean,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
): ReadonlyArray<ResultTreeRowModel> {
  const flattened: ResultTreeRowModel[] = [];
  const rootId = `root:${queryPath}`;
  const rootExpanded = expandedIds.has(rootId);
  flattened.push({
    id: rootId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: queryPath || 'query',
    level: 0,
    meta: isCollectionPath(queryPath) ? 'Collection' : 'Document',
    hasChildren: rows.length > 0 || hasMore,
    expanded: rootExpanded,
  });
  if (!rootExpanded) return flattened;
  for (const row of rows) {
    appendDocumentTreeRows(
      flattened,
      row,
      1,
      expandedIds,
      subcollectionStates,
      canLoadSubcollections,
    );
  }
  if (hasMore) {
    flattened.push({
      id: `${rootId}:load-more`,
      icon: <FileJson size={14} aria-hidden='true' />,
      kind: 'load-more',
      label: 'Load more',
      level: 1,
      meta: 'More',
    });
  }
  return flattened;
}

function appendDocumentTreeRows(
  flattened: ResultTreeRowModel[],
  row: FirestoreDocumentResult,
  level: number,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
) {
  const nodeId = `doc:${row.path}`;
  const expanded = expandedIds.has(nodeId);
  flattened.push({
    id: nodeId,
    icon: <FileText size={14} aria-hidden='true' />,
    kind: 'branch',
    label: row.id,
    level,
    meta: 'Document',
    hasChildren: true,
    expanded,
    openPath: row.path,
  });
  if (!expanded) return;
  const fields = Object.entries(row.data);
  const fieldsId = `${nodeId}:fields`;
  const fieldsExpanded = expandedIds.has(fieldsId);
  flattened.push({
    id: fieldsId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: 'Fields',
    level: level + 1,
    meta: 'Group',
    value: `${fields.length} field${fields.length === 1 ? '' : 's'}`,
    hasChildren: fields.length > 0,
    expanded: fieldsExpanded,
  });
  if (fieldsExpanded) {
    for (const [key, value] of fields) {
      appendValueTreeRows(flattened, key, value, level + 2, `${fieldsId}:field`, expandedIds);
    }
  }
  appendSubcollectionTreeRows(
    flattened,
    row,
    level + 1,
    expandedIds,
    subcollectionStates,
    canLoadSubcollections,
  );
}

function appendSubcollectionTreeRows(
  flattened: ResultTreeRowModel[],
  row: FirestoreDocumentResult,
  level: number,
  expandedIds: ReadonlySet<string>,
  subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>,
  canLoadSubcollections: boolean,
) {
  const nodeId = `doc:${row.path}`;
  const groupId = `${nodeId}:subcollections`;
  if (row.subcollections === undefined) {
    if (!row.hasSubcollections) return;
    const state = subcollectionStates[row.path];
    flattened.push({
      id: groupId,
      icon: <Folder size={14} aria-hidden='true' />,
      kind: canLoadSubcollections && row.hasSubcollections ? 'load-subcollections' : 'leaf',
      label: 'Subcollections',
      level,
      meta: row.hasSubcollections ? subcollectionLoadMeta(state) : 'empty',
      value: row.hasSubcollections ? subcollectionLoadValue(state) : 'none',
      ...(canLoadSubcollections && row.hasSubcollections ? { documentPath: row.path } : {}),
      ...(state?.errorMessage ? { errorMessage: state.errorMessage } : {}),
      subcollectionStatus: state?.status ?? 'idle',
    });
    return;
  }
  if (row.subcollections.length === 0) return;
  const groupExpanded = expandedIds.has(groupId);
  flattened.push({
    id: groupId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: 'Subcollections',
    level,
    meta: 'Group',
    value: `${row.subcollections.length} item${row.subcollections.length === 1 ? '' : 's'}`,
    hasChildren: true,
    expanded: groupExpanded,
  });
  if (!groupExpanded) return;
  for (const collection of row.subcollections) {
    const collectionId = `collection:${collection.path}`;
    const collectionExpanded = expandedIds.has(collectionId);
    const documents = documentsForCollectionNode(collection);
    flattened.push({
      id: collectionId,
      icon: <Folder size={14} aria-hidden='true' />,
      kind: documents.length > 0 ? 'branch' : 'leaf',
      label: collection.id,
      level: level + 1,
      meta: 'Subcollection',
      hasChildren: documents.length > 0,
      expanded: collectionExpanded,
      openPath: collection.path,
    });
    if (documents.length && collectionExpanded) {
      for (const document of documents) {
        appendDocumentTreeRows(
          flattened,
          document,
          level + 2,
          expandedIds,
          subcollectionStates,
          canLoadSubcollections,
        );
      }
    }
  }
}

function appendValueTreeRows(
  flattened: ResultTreeRowModel[],
  key: string,
  value: unknown,
  level: number,
  parentId: string,
  expandedIds: ReadonlySet<string>,
) {
  const nodeId = `${parentId}:${key}`;
  if (!isExpandableValue(value)) {
    flattened.push({
      id: nodeId,
      icon: <FileJson size={14} aria-hidden='true' />,
      kind: 'leaf',
      label: key,
      level,
      meta: valueType(value),
      value: formatValue(value),
    });
    return;
  }
  const entries = Array.isArray(value)
    ? value.map((entry, index) => [`[${index}]`, entry] as const)
    : Object.entries(value as Record<string, unknown>);
  const expanded = expandedIds.has(nodeId);
  flattened.push({
    id: nodeId,
    icon: <Folder size={14} aria-hidden='true' />,
    kind: 'branch',
    label: key,
    level,
    meta: valueType(value),
    hasChildren: entries.length > 0,
    expanded,
  });
  if (!expanded) return;
  for (const [childKey, childValue] of entries) {
    appendValueTreeRows(flattened, childKey, childValue, level + 1, nodeId, expandedIds);
  }
}

function documentsForCollectionNode(
  collection: FirestoreCollectionNode,
): ReadonlyArray<FirestoreDocumentResult> {
  const withDocuments = collection as FirestoreCollectionNode & {
    readonly documents?: ReadonlyArray<FirestoreDocumentResult>;
  };
  return withDocuments.documents ?? [];
}

interface TreeBranchProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly icon: ReactNode;
  readonly label: string;
  readonly level: number;
  readonly meta: string;
}

function TreeBranch(
  { action, children, defaultOpen = false, icon, label, level, meta }: TreeBranchProps,
) {
  return (
    <details className='block' open={defaultOpen} role='treeitem'>
      <summary
        className='grid min-h-8 cursor-pointer list-none grid-cols-[16px_16px_minmax(140px,0.8fr)_minmax(160px,1fr)_112px_auto] items-center gap-2 border-b border-border-subtle pr-3 text-text-primary transition-colors hover:bg-action-ghost-hover [&::-webkit-details-marker]:hidden'
        style={{ paddingLeft: 12 + level * 22 }}
      >
        <ChevronRight size={13} aria-hidden='true' className='text-text-muted' />
        <span className='text-action-primary'>{icon}</span>
        <span className='min-w-0 truncate font-medium'>{label}</span>
        <span />
        <code className='text-text-muted'>{meta}</code>
        <span>{action}</span>
      </summary>
      <div role='group'>{children}</div>
    </details>
  );
}

interface TreeLeafProps {
  readonly action?: ReactNode;
  readonly label: string;
  readonly level: number;
  readonly meta: string;
  readonly value: string;
}

function TreeLeaf({ action, label, level, meta, value }: TreeLeafProps) {
  return (
    <div
      className='grid min-h-8 grid-cols-[16px_16px_minmax(140px,0.8fr)_minmax(160px,1fr)_112px_auto] items-center gap-2 border-b border-border-subtle pr-3 text-text-primary transition-colors hover:bg-action-ghost-hover'
      role='treeitem'
      style={{ paddingLeft: 12 + level * 22 }}
    >
      <span />
      <FileText size={13} aria-hidden='true' className='text-text-muted' />
      <span className='min-w-0 truncate font-medium'>{label}</span>
      <span className='min-w-0 truncate text-text-muted'>{value}</span>
      <code className='text-text-muted'>{meta}</code>
      <span>{action}</span>
    </div>
  );
}

function NestedValueTree({ value }: { readonly value: Record<string, unknown>; }) {
  return (
    <div className='max-h-[48vh] overflow-auto rounded-md border border-border-subtle font-mono text-xs'>
      {Object.entries(value).map(([key, entry]) => renderValueTreeNode(key, entry, 0))}
    </div>
  );
}

function renderValueTreeNode(key: string, value: unknown, level: number): ReactNode {
  if (isExpandableValue(value)) {
    const entries = Array.isArray(value)
      ? value.map((entry, index) => [`[${index}]`, entry] as const)
      : Object.entries(value as Record<string, unknown>);
    return (
      <TreeBranch
        key={key}
        defaultOpen={level < 2}
        icon={<Folder size={14} aria-hidden='true' />}
        label={key}
        level={level}
        meta={valueType(value)}
      >
        {entries.map(([childKey, childValue]) =>
          renderValueTreeNode(childKey, childValue, level + 1)
        )}
      </TreeBranch>
    );
  }
  return (
    <TreeLeaf
      key={key}
      label={key}
      level={level}
      meta={valueType(value)}
      value={formatValue(value)}
    />
  );
}

function fieldCatalogForRows(
  rows: ReadonlyArray<FirestoreDocumentResult>,
): ReadonlyArray<FieldCatalogItem> {
  const counts = new Map<string, { count: number; types: Set<string>; }>();
  for (const row of rows) {
    for (const [field, value] of Object.entries(row.data)) {
      const current = counts.get(field) ?? { count: 0, types: new Set<string>() };
      current.types.add(valueType(value));
      counts.set(field, { count: current.count + 1, types: current.types });
    }
  }
  return Array.from(counts, ([field, value]) => ({
    count: value.count,
    field,
    types: sortedStrings(value.types),
  })).reduce<ReadonlyArray<FieldCatalogItem>>((sorted, item) => insertField(sorted, item), []);
}

function insertField(
  fields: ReadonlyArray<FieldCatalogItem>,
  item: FieldCatalogItem,
): ReadonlyArray<FieldCatalogItem> {
  const index = fields.findIndex((field) => item.field.localeCompare(field.field) < 0);
  if (index < 0) return [...fields, item];
  return [...fields.slice(0, index), item, ...fields.slice(index)];
}

function sortedStrings(values: ReadonlySet<string>): ReadonlyArray<string> {
  return Array.from(values).reduce<ReadonlyArray<string>>((sorted, value) => {
    const index = sorted.findIndex((item) => value.localeCompare(item) < 0);
    if (index < 0) return [...sorted, value];
    return [...sorted.slice(0, index), value, ...sorted.slice(index)];
  }, []);
}

function toggleSet(values: ReadonlySet<string>, value: string): ReadonlySet<string> {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function mergeLoadedSubcollections(
  document: FirestoreDocumentResult,
  state?: SubcollectionLoadState,
): FirestoreDocumentResult;
function mergeLoadedSubcollections(
  document: FirestoreDocumentResult | null,
  state?: SubcollectionLoadState,
): FirestoreDocumentResult | null;
function mergeLoadedSubcollections(
  document: FirestoreDocumentResult | null,
  state?: SubcollectionLoadState,
): FirestoreDocumentResult | null {
  if (!document || state?.status !== 'success') return document;
  const items = state.items ?? [];
  return {
    ...document,
    hasSubcollections: items.length > 0,
    subcollections: items,
  };
}

function renderSubcollectionButtons(
  row: FirestoreDocumentResult,
  onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined,
  state?: SubcollectionLoadState,
  onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined,
): ReactNode {
  if (row.subcollections === undefined) {
    if (!onLoadSubcollections || !row.hasSubcollections) {
      return (
        <span className='text-text-muted'>{row.hasSubcollections ? 'not loaded' : 'none'}</span>
      );
    }
    return (
      <span className='flex min-w-0 flex-wrap items-center gap-1'>
        <Button
          disabled={state?.status === 'loading'}
          size='xs'
          variant={state?.status === 'error' ? 'secondary' : 'ghost'}
          onClick={(event) => {
            event.stopPropagation();
            onLoadSubcollections(row.path);
          }}
        >
          {state?.status === 'loading'
            ? <Loader2 className='animate-spin' size={13} aria-hidden='true' />
            : <Folder size={13} aria-hidden='true' />}
          {subcollectionLoadLabel(state?.status)}
        </Button>
        {state?.status === 'error' && state.errorMessage
          ? <span className='max-w-36 truncate text-text-muted'>{state.errorMessage}</span>
          : null}
      </span>
    );
  }
  if (row.subcollections.length === 0) return <span className='text-text-muted'>none</span>;
  return (
    <SubcollectionChipList
      collections={row.subcollections}
      maxItems={MAX_SUBCOLLECTION_CHIPS}
      onOpenDocumentInNewTab={onOpenDocumentInNewTab}
    />
  );
}

function SubcollectionChipList(
  {
    collections,
    maxItems,
    onOpenDocumentInNewTab,
  }: {
    readonly collections: ReadonlyArray<FirestoreCollectionNode>;
    readonly maxItems: number;
    readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  },
): ReactNode {
  return (
    <ChipList
      items={collections}
      maxItems={maxItems}
      getKey={(collection) => collection.path}
      renderItem={(collection) => (
        <Button
          disabled={!onOpenDocumentInNewTab}
          size='xs'
          variant='ghost'
          onClick={(event) => {
            event.stopPropagation();
            onOpenDocumentInNewTab?.(collection.path);
          }}
        >
          <Folder size={13} aria-hidden='true' /> {collection.id}
        </Button>
      )}
    />
  );
}

function subcollectionLoadLabel(status?: SubcollectionLoadState['status'] | 'idle'): string {
  if (status === 'loading') return 'Loading';
  if (status === 'error') return 'Retry';
  return 'Load';
}

function subcollectionLoadMeta(state?: SubcollectionLoadState): string {
  if (state?.status === 'loading') return 'loading';
  if (state?.status === 'error') return 'error';
  return 'unknown';
}

function subcollectionLoadValue(state?: SubcollectionLoadState): string {
  if (state?.status === 'loading') return 'loading';
  if (state?.status === 'error') return state.errorMessage ?? 'load failed';
  return 'not loaded';
}

function isCollectionPath(path: string): boolean {
  const parts = path.split('/').filter(Boolean);
  return parts.length % 2 === 1;
}

function isExpandableValue(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !isFirestoreTypedValue(value);
}

function valueType(value: unknown): string {
  return firestoreValueType(value);
}

function formatValue(value: unknown): string {
  return formatFirestoreValue(value);
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

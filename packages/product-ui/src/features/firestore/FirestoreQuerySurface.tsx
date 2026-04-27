import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  FirestoreFilterOp,
} from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  cn,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DataTable,
  type DataTableColumn,
  Dialog,
  DialogContent,
  EmptyState,
  IconButton,
  InlineAlert,
  Input,
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
  VirtualList,
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
  Play,
  Plus,
  RotateCcw,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '../../code-editor/CodeEditor.tsx';
import {
  FirestoreValueCell,
  firestoreValueType,
  formatFirestoreValue,
  isFirestoreTypedValue,
} from './FirestoreValueCell.tsx';

export interface FirestoreQueryDraft {
  readonly path: string;
  readonly filters?: ReadonlyArray<FirestoreQueryFilterDraft>;
  readonly filterField: string;
  readonly filterOp: FirestoreFilterOp;
  readonly filterValue: string;
  readonly sortField: string;
  readonly sortDirection: 'asc' | 'desc';
  readonly limit: number;
}

export interface FirestoreQueryFilterDraft {
  readonly id: string;
  readonly field: string;
  readonly op: FirestoreFilterOp;
  readonly value: string;
}

export interface FirestoreQuerySurfaceProps {
  readonly draft: FirestoreQueryDraft;
  readonly errorMessage?: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore?: boolean;
  readonly isLoading?: boolean;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
  readonly onDeleteDocument?: (documentPath: string) => void;
  readonly onLoadMore: () => void;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onReset: () => void;
  readonly onRun: () => void;
  readonly onSaveDocument?: (documentPath: string, data: Record<string, unknown>) => void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument?: FirestoreDocumentResult | null;
  readonly selectedDocumentPath?: string | null;
}

type ResultView = 'json' | 'table' | 'tree';

interface FieldCatalogItem {
  readonly count: number;
  readonly field: string;
  readonly types: ReadonlyArray<string>;
}

const filterOps: ReadonlyArray<FirestoreFilterOp> = [
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'array-contains',
  'array-contains-any',
  'in',
  'not-in',
];

const selectClassName =
  'h-[var(--density-compact-control-height)] rounded-md border border-border bg-bg-panel px-2 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-60';

function createEmptyFilter(id = 'filter-1'): FirestoreQueryFilterDraft {
  return { id, field: '', op: '==', value: '' };
}

function filtersForDraft(draft: FirestoreQueryDraft): ReadonlyArray<FirestoreQueryFilterDraft> {
  if (draft.filters?.length) {
    return draft.filters.map((filter, index) => ({
      id: filter.id || `filter-${index + 1}`,
      field: filter.field,
      op: filter.op,
      value: filter.value,
    }));
  }
  return [{
    id: 'filter-1',
    field: draft.filterField,
    op: draft.filterOp,
    value: draft.filterValue,
  }];
}

function withFilters(
  draft: FirestoreQueryDraft,
  filters: ReadonlyArray<FirestoreQueryFilterDraft>,
): FirestoreQueryDraft {
  const firstFilter = filters[0] ?? createEmptyFilter();
  return {
    ...draft,
    filters,
    filterField: firstFilter.field,
    filterOp: firstFilter.op,
    filterValue: firstFilter.value,
  };
}

function nextFilterId(filters: ReadonlyArray<FirestoreQueryFilterDraft>): string {
  let index = filters.length + 1;
  while (filters.some((filter) => filter.id === `filter-${index}`)) index += 1;
  return `filter-${index}`;
}

export function FirestoreQuerySurface(
  {
    draft,
    errorMessage = null,
    hasMore,
    isFetchingMore = false,
    isLoading = false,
    onDraftChange,
    onDeleteDocument,
    onLoadMore,
    onOpenDocumentInNewTab,
    onReset,
    onRun,
    onSaveDocument,
    onSelectDocument,
    rows,
    selectedDocument = null,
    selectedDocumentPath = null,
  }: FirestoreQuerySurfaceProps,
) {
  const [resultView, setResultView] = useState<ResultView>('table');
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [editorDocument, setEditorDocument] = useState<FirestoreDocumentResult | null>(null);
  const useSplitLayout = useMediaQuery('(min-width: 1024px)');

  const mainColumn = (
    <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2'>
      <QueryBuilder
        draft={draft}
        isLoading={isLoading}
        onDraftChange={onDraftChange}
        onReset={onReset}
        onRun={onRun}
      />
      <ResultPanel
        hasMore={hasMore}
        errorMessage={errorMessage}
        isFetchingMore={isFetchingMore}
        isLoading={isLoading}
        queryPath={draft.path}
        resultView={resultView}
        rows={rows}
        selectedDocumentPath={selectedDocumentPath}
        onEditDocument={setEditorDocument}
        onLoadMore={onLoadMore}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        onResultViewChange={setResultView}
        onSelectDocument={onSelectDocument}
      />
    </div>
  );

  const overviewPanel = overviewCollapsed
    ? <OverviewCollapseStrip onExpand={() => setOverviewCollapsed(false)} />
    : (
      <ResultContextPanel
        resultView={resultView}
        rows={rows}
        selectedDocument={selectedDocument}
        onCollapse={() => setOverviewCollapsed(true)}
        onDeleteDocument={onDeleteDocument}
        onEditDocument={setEditorDocument}
      />
    );

  return (
    <div className='h-full min-h-0 p-2'>
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
      <DocumentEditorModal
        document={editorDocument}
        open={Boolean(editorDocument)}
        onSaveDocument={onSaveDocument}
        onOpenChange={(open) => {
          if (!open) setEditorDocument(null);
        }}
      />
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMediaQueryMatch(query));

  useEffect(() => {
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

interface QueryBuilderProps {
  readonly draft: FirestoreQueryDraft;
  readonly isLoading: boolean;
  readonly onDraftChange: (draft: FirestoreQueryDraft) => void;
  readonly onReset: () => void;
  readonly onRun: () => void;
}

interface ConfirmationRequest {
  readonly confirmLabel: string;
  readonly description: ReactNode;
  readonly onConfirm: () => void;
  readonly title: string;
}

function QueryBuilder({ draft, isLoading, onDraftChange, onReset, onRun }: QueryBuilderProps) {
  const supportsCollectionControls = isCollectionPath(draft.path);
  const filters = filtersForDraft(draft);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);

  function updateFilter(index: number, patch: Partial<FirestoreQueryFilterDraft>) {
    onDraftChange(withFilters(
      draft,
      filters.map((filter, filterIndex) =>
        filterIndex === index ? { ...filter, ...patch } : filter
      ),
    ));
  }

  function addFilter() {
    onDraftChange(withFilters(draft, [...filters, createEmptyFilter(nextFilterId(filters))]));
  }

  function removeFilter(index: number) {
    const nextFilters = filters.filter((_, filterIndex) => filterIndex !== index);
    onDraftChange(withFilters(draft, nextFilters.length ? nextFilters : [createEmptyFilter()]));
  }

  function confirmRemoveFilter(index: number) {
    const filter = filters[index];
    setConfirmation({
      confirmLabel: 'Remove',
      description: filter?.field
        ? `Remove filter on ${filter.field}?`
        : `Remove filter ${index + 1}?`,
      onConfirm: () => removeFilter(index),
      title: 'Remove filter',
    });
  }

  function confirmReset() {
    setConfirmation({
      confirmLabel: 'Reset',
      description: 'Reset the query target, filters, sort, and limit for this tab?',
      onConfirm: onReset,
      title: 'Reset query',
    });
  }

  return (
    <>
      <Panel>
        <PanelHeader actions={<Badge>{supportsCollectionControls ? 'collection' : 'path'}</Badge>}>
          <span className='flex min-w-0 items-center gap-2'>
            <Folder size={15} aria-hidden='true' />
            <span className='truncate'>Query target</span>
          </span>
        </PanelHeader>
        <PanelBody className='grid gap-2 overflow-visible'>
          <div
            className={cn(
              'grid items-center gap-2',
              supportsCollectionControls
                ? 'grid-cols-[minmax(180px,1fr)_96px_auto]'
                : 'grid-cols-[minmax(180px,1fr)_auto]',
            )}
          >
            <Input
              aria-label='Query path'
              className='font-mono'
              disabled={isLoading}
              placeholder='orders or orders/ord_1024'
              value={draft.path}
              onChange={(event) => onDraftChange({ ...draft, path: event.currentTarget.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onRun();
              }}
            />
            {supportsCollectionControls
              ? (
                <Input
                  aria-label='Result limit'
                  className='font-mono'
                  disabled={isLoading}
                  min={1}
                  max={100}
                  type='number'
                  value={draft.limit}
                  onChange={(event) =>
                    onDraftChange({ ...draft, limit: Number(event.currentTarget.value) || 1 })}
                />
              )
              : null}
            <Button disabled={isLoading} variant='primary' onClick={onRun}>
              {isLoading
                ? <Loader2 className='animate-spin' size={14} aria-hidden='true' />
                : <Play size={14} aria-hidden='true' />}
              Run
            </Button>
          </div>
          {supportsCollectionControls
            ? (
              <>
                <div className='grid gap-2'>
                  {filters.map((filter, index) => (
                    <div
                      key={filter.id}
                      className='grid grid-cols-[minmax(140px,1fr)_130px_minmax(140px,1fr)_auto] items-center gap-2'
                    >
                      <Input
                        aria-label={`Filter ${index + 1} field`}
                        className='font-mono'
                        disabled={isLoading}
                        placeholder='status'
                        value={filter.field}
                        onChange={(event) =>
                          updateFilter(index, { field: event.currentTarget.value })}
                      />
                      <select
                        aria-label={`Filter ${index + 1} operator`}
                        className={selectClassName}
                        disabled={isLoading}
                        value={filter.op}
                        onChange={(event) =>
                          updateFilter(index, {
                            op: event.currentTarget.value as FirestoreFilterOp,
                          })}
                      >
                        {filterOps.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <Input
                        aria-label={`Filter ${index + 1} value`}
                        className='font-mono'
                        disabled={isLoading}
                        placeholder='paid'
                        value={filter.value}
                        onChange={(event) =>
                          updateFilter(index, { value: event.currentTarget.value })}
                      />
                      <IconButton
                        disabled={isLoading || filters.length === 1}
                        icon={<X size={14} aria-hidden='true' />}
                        label={`Remove filter ${index + 1}`}
                        size='xs'
                        variant='ghost'
                        onClick={() => confirmRemoveFilter(index)}
                      />
                    </div>
                  ))}
                  <div className='flex items-center justify-between gap-2'>
                    <Button disabled={isLoading} size='xs' variant='secondary' onClick={addFilter}>
                      <Plus size={14} aria-hidden='true' /> Filter
                    </Button>
                    <Button disabled={isLoading} size='xs' variant='ghost' onClick={confirmReset}>
                      <RotateCcw size={14} aria-hidden='true' /> Reset
                    </Button>
                  </div>
                </div>
                <div className='grid grid-cols-[minmax(140px,1fr)_130px] items-center gap-2'>
                  <Input
                    aria-label='Sort field'
                    className='font-mono'
                    disabled={isLoading}
                    placeholder='field'
                    value={draft.sortField}
                    onChange={(event) =>
                      onDraftChange({ ...draft, sortField: event.currentTarget.value })}
                  />
                  <select
                    aria-label='Sort direction'
                    className={selectClassName}
                    disabled={isLoading}
                    value={draft.sortDirection}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        sortDirection: event.currentTarget.value as 'asc' | 'desc',
                      })}
                  >
                    <option value='asc'>asc</option>
                    <option value='desc'>desc</option>
                  </select>
                </div>
              </>
            )
            : (
              <div className='rounded-md border border-border-subtle bg-bg-subtle px-2 py-1 text-xs text-text-secondary'>
                Filters, sorting, limits, and pagination are hidden for document and nested paths.
              </div>
            )}
        </PanelBody>
      </Panel>
      <ConfirmDialog
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        description={confirmation?.description ?? null}
        open={Boolean(confirmation)}
        title={confirmation?.title ?? 'Confirm operation'}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        {...(confirmation?.onConfirm ? { onConfirm: confirmation.onConfirm } : {})}
      />
    </>
  );
}

interface ResultPanelProps {
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly onEditDocument: (document: FirestoreDocumentResult) => void;
  readonly onLoadMore: () => void;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onResultViewChange: (view: ResultView) => void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly queryPath: string;
  readonly resultView: ResultView;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocumentPath: string | null;
}

function ResultPanel(
  {
    hasMore,
    errorMessage,
    isFetchingMore,
    isLoading,
    onEditDocument,
    onLoadMore,
    onOpenDocumentInNewTab,
    onResultViewChange,
    onSelectDocument,
    queryPath,
    resultView,
    rows,
    selectedDocumentPath,
  }: ResultPanelProps,
) {
  const jsonValue = useMemo(() => ({ path: queryPath, documents: rows }), [queryPath, rows]);
  const showPagination = isCollectionPath(queryPath) && hasMore;
  const [expandedTreeIds, setExpandedTreeIds] = useState<ReadonlySet<string>>(() => new Set());

  function toggleTreeNode(id: string) {
    setExpandedTreeIds((current) => toggleSet(current, id));
  }

  return (
    <Tabs
      className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'
      value={resultView}
      onValueChange={(value) => onResultViewChange(value as ResultView)}
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
                onEditDocument={onEditDocument}
                onLoadMore={onLoadMore}
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
                    onLoadMore={onLoadMore}
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
  readonly onEditDocument: (document: FirestoreDocumentResult) => void;
  readonly onLoadMore: () => void;
  readonly onOpenDocumentInNewTab: (documentPath: string) => void;
  readonly onSelectDocument: (documentPath: string) => void;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocumentPath: string | null;
}

type ResultTableRow = { readonly kind: 'document'; readonly document: FirestoreDocumentResult; };

function ResultTable(
  {
    hasMore,
    isFetchingMore,
    onEditDocument,
    onLoadMore,
    onOpenDocumentInNewTab,
    onSelectDocument,
    rows,
    selectedDocumentPath,
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
        width: 180,
        cell: ({ row }) =>
          renderSubcollectionButtons(row.original.document, onOpenDocumentInNewTab),
      },
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
      },
    ],
    [fieldColumns, onOpenDocumentInNewTab],
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
        rowContextMenu={(row) => (
          <ContextMenuContent>
            <ContextMenuItem
              className='gap-2'
              onSelect={() => onOpenDocumentInNewTab(row.document.path)}
            >
              <ExternalLink size={13} aria-hidden='true' /> Open in new tab
            </ContextMenuItem>
          </ContextMenuContent>
        )}
        selectedRowId={selectedDocumentPath}
        onRowClick={(row) => onSelectDocument(row.document.path)}
        onRowDoubleClick={(row) => onEditDocument(row.document)}
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
  readonly onDeleteDocument?: ((documentPath: string) => void) | undefined;
  readonly onCollapse: () => void;
  readonly onEditDocument: (document: FirestoreDocumentResult) => void;
  readonly resultView: ResultView;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument: FirestoreDocumentResult | null;
}

function ResultContextPanel(
  {
    onCollapse,
    onDeleteDocument,
    onEditDocument,
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
                  onDelete={() => setConfirmOpen(true)}
                  onEdit={() => selectedDocument && onEditDocument(selectedDocument)}
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
          ? `Delete ${selectedDocument.path} from the in-memory mock repository?`
          : 'Delete the selected document from the in-memory mock repository?'}
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

interface InspectorSectionProps {
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly icon: ReactNode;
  readonly meta: string;
  readonly title: string;
}

function InspectorSection(
  { children, defaultOpen = false, icon, meta, title }: InspectorSectionProps,
) {
  return (
    <details className='border-b border-border-subtle' open={defaultOpen}>
      <summary className='grid min-h-9 cursor-pointer grid-cols-[16px_16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden'>
        <ChevronRight size={14} aria-hidden='true' className='text-text-muted' />
        <span className='text-action-primary'>{icon}</span>
        <span className='min-w-0 truncate font-semibold text-text-primary'>{title}</span>
        <code className='text-xs text-text-muted'>{meta}</code>
      </summary>
      <div className='border-t border-border-subtle'>{children}</div>
    </details>
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
  readonly onDelete: () => void;
  readonly onEdit: () => void;
}

function SelectionPreview({ document, onDelete, onEdit }: SelectionPreviewProps) {
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
          {document.hasSubcollections ? <Badge>subcollections</Badge> : null}
          <IconButton
            icon={<Edit3 size={14} aria-hidden='true' />}
            label='Edit document'
            size='xs'
            variant='ghost'
            onClick={onEdit}
          />
          <IconButton
            icon={<Trash2 size={14} aria-hidden='true' />}
            label='Delete document'
            size='xs'
            variant='ghost'
            onClick={onDelete}
          />
        </div>
      </div>
      <NestedValueTree value={document.data} />
    </div>
  );
}

function ResultViewFacts(
  { resultView, rows }: {
    readonly resultView: ResultView;
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

function DetailRow({ label, value }: { readonly label: string; readonly value: string; }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-border-subtle pb-1 text-sm'>
      <span className='text-text-muted'>{label}</span>
      <span className='min-w-0 truncate font-mono text-xs text-text-secondary'>{value}</span>
    </div>
  );
}

function ResultTreeView(
  {
    expandedIds,
    hasMore,
    isFetchingMore,
    onLoadMore,
    onOpenDocumentInNewTab,
    onToggleNode,
    queryPath,
    rows,
  }: {
    readonly expandedIds: ReadonlySet<string>;
    readonly hasMore: boolean;
    readonly isFetchingMore: boolean;
    readonly onLoadMore: () => void;
    readonly onOpenDocumentInNewTab: (documentPath: string) => void;
    readonly onToggleNode: (id: string) => void;
    readonly queryPath: string;
    readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  },
) {
  const treeRows = useMemo(
    () => flattenResultTree(queryPath, rows, hasMore, expandedIds),
    [expandedIds, hasMore, queryPath, rows],
  );

  return (
    <div className='h-full min-w-[680px] font-mono text-xs' role='tree'>
      <VirtualList
        estimateSize={() => 32}
        getItemKey={(item) => item.id}
        items={treeRows}
        renderItem={(item) => (
          <ResultTreeRow
            isFetchingMore={isFetchingMore}
            node={item}
            onLoadMore={onLoadMore}
            onOpenDocumentInNewTab={onOpenDocumentInNewTab}
            onToggle={onToggleNode}
          />
        )}
      />
    </div>
  );
}

type ResultTreeNodeKind = 'branch' | 'leaf' | 'load-more';

interface ResultTreeRowModel {
  readonly id: string;
  readonly icon: 'document' | 'field' | 'folder';
  readonly kind: ResultTreeNodeKind;
  readonly label: string;
  readonly level: number;
  readonly meta: string;
  readonly expanded?: boolean;
  readonly hasChildren?: boolean;
  readonly openPath?: string;
  readonly value?: string;
}

function ResultTreeRow(
  {
    isFetchingMore,
    node,
    onLoadMore,
    onOpenDocumentInNewTab,
    onToggle,
  }: {
    readonly isFetchingMore: boolean;
    readonly node: ResultTreeRowModel;
    readonly onLoadMore: () => void;
    readonly onOpenDocumentInNewTab: (documentPath: string) => void;
    readonly onToggle: (id: string) => void;
  },
) {
  const icon = node.icon === 'folder'
    ? <Folder size={14} aria-hidden='true' />
    : node.icon === 'document'
    ? <FileText size={14} aria-hidden='true' />
    : <FileJson size={14} aria-hidden='true' />;
  const openPath = node.openPath;
  const row = (
    <div
      className='grid min-h-8 grid-cols-[16px_16px_minmax(140px,0.8fr)_minmax(160px,1fr)_112px_auto] items-center gap-2 border-b border-border-subtle pr-3 text-text-primary transition-colors hover:bg-action-ghost-hover'
      role='treeitem'
      style={{ paddingLeft: 12 + node.level * 22 }}
      aria-expanded={node.hasChildren ? Boolean(node.expanded) : undefined}
      onClick={() => {
        if (node.hasChildren) onToggle(node.id);
      }}
    >
      <span>
        {node.hasChildren
          ? (
            <ChevronRight
              size={13}
              aria-hidden='true'
              className={cn('text-text-muted transition-transform', node.expanded && 'rotate-90')}
            />
          )
          : null}
      </span>
      <span className='text-action-primary'>{icon}</span>
      <span className='min-w-0 truncate font-medium'>{node.label}</span>
      <span className='min-w-0 truncate text-text-muted'>{node.value ?? ''}</span>
      <code className='text-text-muted'>{node.meta}</code>
      <span>
        {node.kind === 'load-more'
          ? (
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
          )
          : openPath
          ? (
            <IconButton
              icon={<Folder size={13} aria-hidden='true' />}
              label={`Open ${node.label}`}
              size='xs'
              variant='ghost'
              onClick={(event) => {
                event.stopPropagation();
                onOpenDocumentInNewTab(openPath);
              }}
            />
          )
          : null}
      </span>
    </div>
  );

  if (!openPath) return row;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem className='gap-2' onSelect={() => onOpenDocumentInNewTab(openPath)}>
          <ExternalLink size={13} aria-hidden='true' /> Open in new tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function flattenResultTree(
  queryPath: string,
  rows: ReadonlyArray<FirestoreDocumentResult>,
  hasMore: boolean,
  expandedIds: ReadonlySet<string>,
): ReadonlyArray<ResultTreeRowModel> {
  const flattened: ResultTreeRowModel[] = [];
  const rootId = `root:${queryPath}`;
  const rootExpanded = expandedIds.has(rootId);
  flattened.push({
    id: rootId,
    icon: 'folder',
    kind: 'branch',
    label: queryPath || 'query',
    level: 0,
    meta: isCollectionPath(queryPath) ? 'Collection' : 'Document',
    hasChildren: rows.length > 0 || hasMore,
    expanded: rootExpanded,
  });
  if (!rootExpanded) return flattened;
  for (const row of rows) appendDocumentTreeRows(flattened, row, 1, expandedIds);
  if (hasMore) {
    flattened.push({
      id: `${rootId}:load-more`,
      icon: 'field',
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
) {
  const nodeId = `doc:${row.path}`;
  const expanded = expandedIds.has(nodeId);
  flattened.push({
    id: nodeId,
    icon: 'document',
    kind: 'branch',
    label: row.id,
    level,
    meta: 'Document',
    hasChildren: true,
    expanded,
    openPath: row.path,
  });
  if (!expanded) return;
  for (const [key, value] of Object.entries(row.data)) {
    appendValueTreeRows(flattened, key, value, level + 1, `${nodeId}:field`, expandedIds);
  }
  if (!row.subcollections?.length) {
    flattened.push({
      id: `${nodeId}:subcollections`,
      icon: 'field',
      kind: 'leaf',
      label: 'Subcollections',
      level: level + 1,
      meta: 'empty',
      value: 'none',
    });
    return;
  }
  for (const collection of row.subcollections) {
    const collectionId = `collection:${collection.path}`;
    const collectionExpanded = expandedIds.has(collectionId);
    const documents = documentsForCollectionNode(collection);
    flattened.push({
      id: collectionId,
      icon: 'folder',
      kind: 'branch',
      label: collection.id,
      level: level + 1,
      meta: 'Subcollection',
      hasChildren: documents.length > 0,
      expanded: collectionExpanded,
      openPath: collection.path,
    });
    if (documents.length && collectionExpanded) {
      for (const document of documents) {
        appendDocumentTreeRows(flattened, document, level + 2, expandedIds);
      }
    } else {
      flattened.push({
        id: `${collectionId}:count`,
        icon: 'field',
        kind: 'leaf',
        label: 'Documents',
        level: level + 2,
        meta: 'count',
        value: String(collection.documentCount ?? documents.length),
      });
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
      icon: 'field',
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
    icon: 'folder',
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

interface DocumentEditorModalProps {
  readonly document: FirestoreDocumentResult | null;
  readonly onSaveDocument?:
    | ((documentPath: string, data: Record<string, unknown>) => void)
    | undefined;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

function DocumentEditorModal(
  { document, onSaveDocument, onOpenChange, open }: DocumentEditorModalProps,
) {
  const [source, setSource] = useState('{}');
  const [fieldName, setFieldName] = useState('newField');
  const [fieldValue, setFieldValue] = useState('"value"');

  useEffect(() => {
    if (document) setSource(JSON.stringify(document.data, null, 2));
  }, [document]);

  const fields = document ? Object.entries(document.data) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[min(760px,calc(100vw-32px))]'
        description={document?.path ?? null}
        title='Document editor'
      >
        <div className='grid max-h-[68vh] min-h-0 grid-rows-[minmax(180px,1fr)_auto] gap-2'>
          <div className='overflow-hidden rounded-md border border-border-subtle'>
            <CodeEditor
              language='json'
              value={source}
              onChange={setSource}
            />
          </div>
          <div className='grid gap-2 rounded-md border border-border-subtle bg-bg-subtle p-2'>
            <div className='grid max-h-36 gap-1 overflow-auto'>
              {fields.map(([key, value]) => (
                <div
                  key={key}
                  className='grid grid-cols-[minmax(96px,0.5fr)_minmax(0,1fr)] gap-2 text-xs'
                >
                  <code className='truncate text-text-primary'>{key}</code>
                  <Input
                    aria-label={`Edit ${key}`}
                    className='font-mono'
                    value={formatValue(value)}
                    onChange={() => {}}
                  />
                </div>
              ))}
            </div>
            <div className='grid grid-cols-[minmax(96px,0.5fr)_minmax(0,1fr)_auto] gap-2'>
              <Input
                aria-label='New field name'
                value={fieldName}
                onChange={(event) => setFieldName(event.currentTarget.value)}
              />
              <Input
                aria-label='New field value'
                className='font-mono'
                value={fieldValue}
                onChange={(event) => setFieldValue(event.currentTarget.value)}
              />
              <Button
                variant='secondary'
                onClick={() => {
                  const parsed = parseEditorJson(source);
                  setSource(
                    JSON.stringify(
                      { ...parsed, [fieldName]: parseEditorValue(fieldValue) },
                      null,
                      2,
                    ),
                  );
                }}
              >
                Add field
              </Button>
            </div>
          </div>
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant='primary'
            onClick={() => {
              if (document) onSaveDocument?.(document.path, parseEditorJson(source));
              onOpenChange(false);
            }}
          >
            Save mock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  readonly confirmLabel?: string;
  readonly description?: ReactNode;
  readonly onConfirm?: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

function ConfirmDialog(
  { confirmLabel = 'Confirm', description, onConfirm, onOpenChange, open, title }:
    ConfirmDialogProps,
) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent description={description} title={title}>
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant='danger'
            onClick={() => {
              onConfirm?.();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

function renderSubcollectionButtons(
  row: FirestoreDocumentResult,
  onOpenDocumentInNewTab: (documentPath: string) => void,
): ReactNode {
  if (!row.subcollections?.length) return <span className='text-text-muted'>none</span>;
  return (
    <span className='flex flex-wrap gap-1'>
      {row.subcollections.map((collection) => (
        <Button
          key={collection.path}
          size='xs'
          variant='ghost'
          onClick={(event) => {
            event.stopPropagation();
            onOpenDocumentInNewTab(collection.path);
          }}
        >
          <Folder size={13} aria-hidden='true' /> {collection.id}
        </Button>
      ))}
    </span>
  );
}

function isCollectionPath(path: string): boolean {
  const parts = path.split('/').filter(Boolean);
  return parts.length % 2 === 1;
}

function parseEditorJson(source: string): Record<string, unknown> {
  try {
    const value = JSON.parse(source) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseEditorValue(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
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

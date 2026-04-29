import type { FirestoreDocumentResult, SettingsRepository } from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  EmptyState,
  InlineAlert,
  Panel,
  PanelBody,
  PanelHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@firebase-desk/ui';
import { Braces, GitBranch, Plus, Table2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { JsonPreview } from '../../json-preview/index.ts';
import { type FieldEditTarget } from './fieldEditModel.ts';
import {
  documentsForCollectionNode,
  isCollectionPath,
  type SubcollectionLoadState,
  toggleSet,
} from './resultModel.tsx';
import { ResultTable } from './ResultTable.tsx';
import { ResultTreeView } from './ResultTreeView.tsx';
import type { FirestoreResultView } from './types.ts';

export interface ResultPanelProps {
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly actionErrorMessage?: string | null;
  readonly resultsStale?: boolean;
  readonly onCreateDocument?: ((collectionPath: string) => void) | undefined;
  readonly onDeleteDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
  readonly onEditDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
  readonly onLoadMore: () => void;
  readonly onLoadSubcollections?: ((documentPath: string) => Promise<void> | void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly onResultViewChange: (view: FirestoreResultView) => void;
  readonly onSelectDocument?: ((documentPath: string) => void) | undefined;
  readonly onRefreshResults?: (() => void) | undefined;
  readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
  readonly queryPath: string;
  readonly resultView: FirestoreResultView;
  readonly rows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocumentPath: string | null;
  readonly settings?: SettingsRepository | undefined;
  readonly subcollectionStates: Readonly<Record<string, SubcollectionLoadState>>;
}

export function ResultPanel(
  {
    hasMore,
    actionErrorMessage = null,
    errorMessage,
    isFetchingMore,
    isLoading,
    resultsStale = false,
    onCreateDocument,
    onDeleteDocument,
    onDeleteField,
    onEditDocument,
    onEditField,
    onLoadMore,
    onLoadSubcollections,
    onOpenDocumentInNewTab,
    onResultViewChange,
    onRefreshResults,
    onSelectDocument,
    onSetFieldNull,
    queryPath,
    resultView,
    rows,
    selectedDocumentPath,
    settings,
    subcollectionStates,
  }: ResultPanelProps,
) {
  const jsonValue = useMemo(() => ({ path: queryPath, documents: rows }), [queryPath, rows]);
  const showPagination = isCollectionPath(queryPath) && hasMore;
  const firstDocumentPath = rows[0]?.path ?? null;
  const defaultExpandedTreeIds = useMemo(
    () => defaultResultTreeExpansion(queryPath, rows),
    [firstDocumentPath, queryPath],
  );
  const [expandedTreeIds, setExpandedTreeIds] = useState<ReadonlySet<string>>(
    () => defaultExpandedTreeIds,
  );

  useEffect(() => {
    setExpandedTreeIds(defaultExpandedTreeIds);
  }, [defaultExpandedTreeIds]);

  function toggleTreeNode(id: string) {
    const document = findDocumentByTreeNodeId(rows, id);
    const willExpand = !expandedTreeIds.has(id);
    setExpandedTreeIds((current) => {
      const next = new Set(toggleSet(current, id));
      if (willExpand && document) {
        next.add(`${id}:fields`);
        next.add(`${id}:subcollections`);
      }
      return next;
    });
    if (!willExpand || !onLoadSubcollections || !document) return;
    const state = subcollectionStates[document.path];
    if (
      document.hasSubcollections === false || document.subcollections !== undefined
      || state?.status === 'loading'
    ) return;
    void onLoadSubcollections(document.path);
  }

  return (
    <Tabs
      className='h-full min-h-0'
      value={resultView}
      onValueChange={(value) => onResultViewChange(value as FirestoreResultView)}
    >
      <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <PanelHeader
          actions={
            <div className='flex items-center gap-2'>
              <Badge>{isLoading ? 'loading' : `${rows.length} docs`}</Badge>
              {isCollectionPath(queryPath) && onCreateDocument
                ? (
                  <Button size='xs' variant='secondary' onClick={() => onCreateDocument(queryPath)}>
                    <Plus size={13} aria-hidden='true' />
                    New document
                  </Button>
                )
                : null}
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
          {actionErrorMessage
            ? (
              <div className='border-b border-border-subtle p-2'>
                <InlineAlert variant='danger'>{actionErrorMessage}</InlineAlert>
              </div>
            )
            : null}
          {resultsStale
            ? (
              <div className='border-b border-border-subtle p-2'>
                <InlineAlert
                  className='flex items-center justify-between gap-3'
                  variant='warning'
                >
                  <span>Results changed.</span>
                  <Button size='xs' variant='secondary' onClick={onRefreshResults}>
                    Refresh
                  </Button>
                </InlineAlert>
              </div>
            )
            : null}
          <div className='grid min-h-0 flex-1 overflow-hidden'>
            <TabsContent
              className='col-start-1 row-start-1 m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden'
              value='table'
            >
              <ResultTable
                hasMore={showPagination}
                isFetchingMore={isFetchingMore}
                queryPath={queryPath}
                rows={rows}
                selectedDocumentPath={selectedDocumentPath}
                settings={settings}
                subcollectionStates={subcollectionStates}
                onDeleteField={onDeleteField}
                onDeleteDocument={onDeleteDocument}
                onEditDocument={onEditDocument}
                onEditField={onEditField}
                onLoadMore={onLoadMore}
                onLoadSubcollections={onLoadSubcollections}
                onOpenDocumentInNewTab={onOpenDocumentInNewTab}
                onSelectDocument={onSelectDocument}
                onSetFieldNull={onSetFieldNull}
              />
            </TabsContent>
            <TabsContent
              className='col-start-1 row-start-1 m-0 h-full min-h-0 overflow-auto data-[state=inactive]:hidden'
              value='tree'
            >
              {rows.length
                ? (
                  <ResultTreeView
                    queryPath={queryPath}
                    expandedIds={expandedTreeIds}
                    hasMore={showPagination}
                    isFetchingMore={isFetchingMore}
                    rows={rows}
                    subcollectionStates={subcollectionStates}
                    onDeleteField={onDeleteField}
                    onDeleteDocument={onDeleteDocument}
                    onEditField={onEditField}
                    onLoadMore={onLoadMore}
                    onLoadSubcollections={onLoadSubcollections}
                    onOpenDocumentInNewTab={onOpenDocumentInNewTab}
                    onSelectDocument={onSelectDocument}
                    onSetFieldNull={onSetFieldNull}
                    onToggleNode={toggleTreeNode}
                  />
                )
                : (
                  <div className='grid h-full place-items-center'>
                    <EmptyState title='No documents' />
                  </div>
                )}
            </TabsContent>
            <TabsContent
              className='col-start-1 row-start-1 m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden'
              value='json'
            >
              <JsonPreview
                active={resultView === 'json'}
                ariaLabel='JSON results'
                mode='textarea'
                value={jsonValue}
              />
            </TabsContent>
          </div>
        </PanelBody>
      </Panel>
    </Tabs>
  );
}

function defaultResultTreeExpansion(
  queryPath: string,
  rows: ReadonlyArray<FirestoreDocumentResult>,
): ReadonlySet<string> {
  const rootId = `root:${queryPath}`;
  const firstDocument = rows[0];
  if (!firstDocument) return new Set([rootId]);
  const documentId = `doc:${firstDocument.path}`;
  return new Set([rootId, documentId, `${documentId}:fields`]);
}

function findDocumentByTreeNodeId(
  rows: ReadonlyArray<FirestoreDocumentResult>,
  id: string,
): FirestoreDocumentResult | null {
  for (const row of rows) {
    if (`doc:${row.path}` === id) return row;
    for (const collection of row.subcollections ?? []) {
      const nested = findDocumentByTreeNodeId(documentsForCollectionNode(collection), id);
      if (nested) return nested;
    }
  }
  return null;
}

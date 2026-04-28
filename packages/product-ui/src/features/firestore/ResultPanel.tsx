import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import {
  Badge,
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
import { Braces, GitBranch, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { isCollectionPath, type SubcollectionLoadState, toggleSet } from './resultModel.tsx';
import { ResultTable } from './ResultTable.tsx';
import { ResultTreeView } from './ResultTreeView.tsx';
import type { FirestoreResultView } from './types.ts';

export interface ResultPanelProps {
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

export function ResultPanel(
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

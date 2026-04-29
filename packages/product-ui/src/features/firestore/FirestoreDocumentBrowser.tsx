import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { cn, ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@firebase-desk/ui';
import { type ReactNode, useMemo, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery.ts';
import {
  mergeLoadedSubcollections,
  messageFromError,
  type SubcollectionLoadState,
} from './resultModel.tsx';
import { OverviewCollapseStrip, ResultContextPanel } from './ResultOverviewPanel.tsx';
import { ResultPanel } from './ResultPanel.tsx';
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
  readonly settings?: SettingsRepository | undefined;
}

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
    settings,
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
        ? 'grid h-full min-h-0 flex-1 self-stretch grid-rows-[auto_minmax(0,1fr)] gap-2'
        : 'grid h-full min-h-0 flex-1 self-stretch grid-rows-[minmax(0,1fr)]'}
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
        settings={settings}
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
            <ResizablePanel className='flex h-full min-h-0 flex-col' minSize='420px'>
              {mainColumn}
            </ResizablePanel>
            <ResizableHandle className='mx-2 h-full w-px' />
            <ResizablePanel
              className='flex h-full min-h-0 flex-col'
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

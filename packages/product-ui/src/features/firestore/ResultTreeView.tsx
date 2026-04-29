import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import {
  Button,
  ContextMenuContent,
  ContextMenuItem,
  ExplorerTree,
  IconButton,
} from '@firebase-desk/ui';
import { ExternalLink, Folder, Loader2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import {
  flattenResultTree,
  type ResultTreeRowModel,
  subcollectionLoadLabel,
  type SubcollectionLoadState,
} from './resultModel.tsx';

export function ResultTreeView(
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
  const openNode = useCallback(
    (id: string) => {
      const node = treeRows.find((item) => item.id === id);
      if (node?.openPath) onOpenDocumentInNewTab?.(node.openPath);
    },
    [onOpenDocumentInNewTab, treeRows],
  );

  return (
    <ExplorerTree
      rows={treeRows}
      onOpen={openNode}
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

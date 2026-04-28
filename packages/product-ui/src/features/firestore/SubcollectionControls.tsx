import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
} from '@firebase-desk/repo-contracts';
import { Button, ChipList } from '@firebase-desk/ui';
import { Folder, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  MAX_SUBCOLLECTION_CHIPS,
  subcollectionLoadLabel,
  type SubcollectionLoadState,
} from './resultModel.tsx';

export function renderSubcollectionButtons(
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

export function SubcollectionChipList(
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

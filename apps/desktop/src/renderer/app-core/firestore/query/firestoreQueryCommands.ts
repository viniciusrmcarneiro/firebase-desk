import type { FirestoreQueryDraft } from '@firebase-desk/product-ui';
import type {
  ActivityLogAppendInput,
  FirestoreCollectionNode,
  FirestoreQuery,
} from '@firebase-desk/repo-contracts';
import { firestoreQueryDraftMetadata } from './firestoreQuerySelectors.ts';
import type { FirestoreQueryRuntimeState } from './firestoreQueryState.ts';
import {
  firestoreLoadMoreStarted,
  firestoreQueryStarted,
  firestoreRefreshStarted,
  firestoreSubcollectionsLoaded,
} from './firestoreQueryTransitions.ts';

interface FirestoreQueryTabLike {
  readonly id: string;
  readonly kind: string;
}

export interface FirestoreQuerySubmitCommandInput {
  readonly activeDraft: FirestoreQueryDraft;
  readonly clearSelection: boolean;
  readonly query: FirestoreQuery;
  readonly selectedTreeItemId: string | null;
  readonly tab: FirestoreQueryTabLike | undefined;
}

export interface FirestoreQuerySubmitCommandResult {
  readonly interaction: {
    readonly activeTabId: string;
    readonly path: string;
    readonly selectedTreeItemId: string | null;
  } | null;
  readonly path: string | null;
  readonly state: FirestoreQueryRuntimeState;
}

export interface FirestoreQueryCompletionInput {
  readonly connectionId: string;
  readonly draft: FirestoreQueryDraft;
  readonly errorMessage: string | null;
  readonly loadedPages: number;
  readonly resultCount: number;
}

export interface FirestoreLoadMoreCommandResult {
  readonly shouldFetchNextPage: boolean;
  readonly state: FirestoreQueryRuntimeState;
}

export interface FirestoreOpenDocumentIntent {
  readonly connectionId: string;
  readonly path: string;
}

export function runFirestoreQueryCommand(
  state: FirestoreQueryRuntimeState,
  input: FirestoreQuerySubmitCommandInput,
): FirestoreQuerySubmitCommandResult {
  if (!input.tab || input.tab.kind !== 'firestore-query') {
    return { interaction: null, path: null, state };
  }
  return {
    interaction: {
      activeTabId: input.tab.id,
      path: input.activeDraft.path,
      selectedTreeItemId: input.selectedTreeItemId,
    },
    path: input.activeDraft.path,
    state: firestoreQueryStarted(state, {
      clearSelection: input.clearSelection,
      limit: input.activeDraft.limit,
      query: input.query,
      tabId: input.tab.id,
    }),
  };
}

export function loadMoreFirestoreQueryCommand(
  state: FirestoreQueryRuntimeState,
  input: { readonly isDocumentQuery: boolean; },
): FirestoreLoadMoreCommandResult {
  if (input.isDocumentQuery) return { shouldFetchNextPage: false, state };
  return { shouldFetchNextPage: true, state: firestoreLoadMoreStarted(state) };
}

export function loadFirestoreSubcollectionsCommand(
  state: FirestoreQueryRuntimeState,
  input: {
    readonly documentPath: string;
    readonly subcollections: ReadonlyArray<FirestoreCollectionNode>;
  },
): FirestoreQueryRuntimeState {
  return firestoreSubcollectionsLoaded(state, input.documentPath, input.subcollections);
}

export function openFirestoreDocumentInNewTabCommand(
  connectionId: string,
  path: string,
): FirestoreOpenDocumentIntent {
  return { connectionId, path };
}

export function firestoreQueryCompletionActivity(
  input: FirestoreQueryCompletionInput,
): ActivityLogAppendInput {
  const isDocument = isFirestoreDocumentPath(input.draft.path);
  return {
    action: isDocument ? 'Read document' : 'Run query',
    area: 'firestore',
    ...(input.errorMessage ? { error: { message: input.errorMessage } } : {}),
    metadata: {
      isDocument,
      loadedPages: input.loadedPages,
      resultCount: input.resultCount,
      ...firestoreQueryDraftMetadata(input.draft),
    },
    status: input.errorMessage ? 'failure' : 'success',
    summary: input.errorMessage
      ? `Failed to load ${input.draft.path}`
      : `Loaded ${input.resultCount} result${
        input.resultCount === 1 ? '' : 's'
      } from ${input.draft.path}`,
    target: {
      connectionId: input.connectionId,
      path: input.draft.path,
      type: isDocument ? 'firestore-document' : 'firestore-query',
    },
  };
}

function isFirestoreDocumentPath(path: string): boolean {
  return path.split('/').filter(Boolean).length % 2 === 0;
}

export function refreshFirestoreQueryCommand(
  state: FirestoreQueryRuntimeState,
  input: FirestoreQuerySubmitCommandInput & { readonly pagesToReload: number; },
): FirestoreQuerySubmitCommandResult {
  if (!input.tab || input.tab.kind !== 'firestore-query') {
    return { interaction: null, path: null, state };
  }
  return {
    interaction: {
      activeTabId: input.tab.id,
      path: input.activeDraft.path,
      selectedTreeItemId: input.selectedTreeItemId,
    },
    path: input.activeDraft.path,
    state: firestoreRefreshStarted(state, {
      limit: input.activeDraft.limit,
      pagesToReload: input.pagesToReload,
      query: input.query,
      tabId: input.tab.id,
    }),
  };
}

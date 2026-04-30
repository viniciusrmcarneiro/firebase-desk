import type {
  ActivityLogAppendInput,
  FirestoreCollectionNode,
  FirestoreQuery,
  FirestoreQueryDraft,
} from '@firebase-desk/repo-contracts';
import {
  type AppCoreCommandOptions,
  commandActivityMetadata,
  normalizeCommandOptions,
} from '../../shared/index.ts';
import { firestoreQueryDraftMetadata } from './firestoreQuerySelectors.ts';
import type { FirestoreQueryRuntimeState } from './firestoreQueryState.ts';
import {
  firestoreLoadMoreStarted,
  firestorePendingPageReloadCleared,
  firestoreQueryCompletionRecorded,
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
  readonly commandOptions?: AppCoreCommandOptions | undefined;
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
  readonly commandOptions?: AppCoreCommandOptions | undefined;
  readonly connectionId: string;
  readonly draft: FirestoreQueryDraft;
  readonly errorMessage: string | null;
  readonly loadedPages: number;
  readonly resultCount: number;
}

export interface FirestoreQueryCompletionCommandInput extends FirestoreQueryCompletionInput {
  readonly isDocumentQuery: boolean;
  readonly isLoading: boolean;
  readonly pendingPageReloadCount: number;
  readonly runId: number | null;
  readonly tabId: string | null;
}

export interface FirestoreQueryCompletionCommandResult {
  readonly activity: ActivityLogAppendInput | null;
  readonly state: FirestoreQueryRuntimeState;
}

export interface FirestorePageReloadCommandInput {
  readonly hasNextPage: boolean;
  readonly isDocumentQuery: boolean;
  readonly isFetchingNextPage: boolean;
  readonly loadedPageCount: number;
  readonly pendingPageReloadCount: number;
  readonly tabId: string | null;
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
  const target = queryCommandTarget(input);
  if (!target) {
    return { interaction: null, path: null, state };
  }
  return {
    interaction: target.visible
      ? {
        activeTabId: target.tabId,
        path: input.activeDraft.path,
        selectedTreeItemId: input.selectedTreeItemId,
      }
      : null,
    path: input.activeDraft.path,
    state: firestoreQueryStarted(state, {
      clearSelection: input.clearSelection,
      limit: input.activeDraft.limit,
      query: input.query,
      tabId: target.tabId,
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

export function continueFirestorePageReloadCommand(
  state: FirestoreQueryRuntimeState,
  input: FirestorePageReloadCommandInput,
): FirestoreLoadMoreCommandResult {
  if (
    !input.tabId || input.isDocumentQuery || input.pendingPageReloadCount === 0
    || input.loadedPageCount === 0
  ) {
    return { shouldFetchNextPage: false, state };
  }
  if (
    input.pendingPageReloadCount <= 1 || input.loadedPageCount >= input.pendingPageReloadCount
    || !input.hasNextPage
  ) {
    return {
      shouldFetchNextPage: false,
      state: firestorePendingPageReloadCleared(state, input.tabId),
    };
  }
  if (input.isFetchingNextPage) return { shouldFetchNextPage: false, state };
  return { shouldFetchNextPage: true, state };
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

export function completeFirestoreQueryCommand(
  state: FirestoreQueryRuntimeState,
  input: FirestoreQueryCompletionCommandInput,
): FirestoreQueryCompletionCommandResult {
  if (!input.tabId || input.runId === null || input.isLoading) {
    return { activity: null, state };
  }
  if (!input.isDocumentQuery && input.pendingPageReloadCount > 0) {
    return { activity: null, state };
  }
  const key = `${input.tabId}:${input.runId}`;
  if (state.recordedQueryCompletions[key]) return { activity: null, state };
  return {
    activity: firestoreQueryCompletionActivity(input),
    state: firestoreQueryCompletionRecorded(state, key),
  };
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
      ...commandActivityMetadata(input.commandOptions),
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
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 && parts.length % 2 === 0;
}

export function refreshFirestoreQueryCommand(
  state: FirestoreQueryRuntimeState,
  input: FirestoreQuerySubmitCommandInput & { readonly pagesToReload: number; },
): FirestoreQuerySubmitCommandResult {
  const target = queryCommandTarget(input);
  if (!target) {
    return { interaction: null, path: null, state };
  }
  return {
    interaction: target.visible
      ? {
        activeTabId: target.tabId,
        path: input.activeDraft.path,
        selectedTreeItemId: input.selectedTreeItemId,
      }
      : null,
    path: input.activeDraft.path,
    state: firestoreRefreshStarted(state, {
      limit: input.activeDraft.limit,
      pagesToReload: input.pagesToReload,
      query: input.query,
      tabId: target.tabId,
    }),
  };
}

function queryCommandTarget(
  input: FirestoreQuerySubmitCommandInput,
): { readonly tabId: string; readonly visible: boolean; } | null {
  const options = normalizeCommandOptions(input.commandOptions);
  if (!options.visible) return null;
  return input.tab?.kind === 'firestore-query' ? { tabId: input.tab.id, visible: true } : null;
}

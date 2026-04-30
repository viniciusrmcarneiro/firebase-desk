import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import type { FirestoreCollectionNode, FirestoreQuery } from '@firebase-desk/repo-contracts';
import type {
  FirestoreQueryRuntimeState,
  FirestoreResultView,
  SubmittedFirestoreQuery,
} from './firestoreQueryState.ts';

export function firestoreDraftChanged(
  state: FirestoreQueryRuntimeState,
  tabId: string,
  draft: FirestoreQueryDraft,
): FirestoreQueryRuntimeState {
  return { ...state, drafts: { ...state.drafts, [tabId]: draft } };
}

export function firestoreQueryStarted(
  state: FirestoreQueryRuntimeState,
  input: {
    readonly clearSelection: boolean;
    readonly limit: number;
    readonly query: FirestoreQuery;
    readonly runId?: number | undefined;
    readonly tabId: string;
  },
): FirestoreQueryRuntimeState {
  const runId = input.runId ?? state.nextRunId;
  return {
    ...state,
    errorMessage: null,
    isLoading: true,
    nextRunId: Math.max(state.nextRunId, runId + 1),
    pendingPageReloads: omitKey(state.pendingPageReloads, input.tabId),
    queryRequests: {
      ...state.queryRequests,
      [input.tabId]: { limit: input.limit, query: input.query, runId },
    },
    resultsStale: false,
    selectedDocumentPaths: input.clearSelection
      ? omitKey(state.selectedDocumentPaths, input.tabId)
      : state.selectedDocumentPaths,
  };
}

export function firestoreQuerySucceeded(
  state: FirestoreQueryRuntimeState,
  pages: FirestoreQueryRuntimeState['pages'],
  hasMore = false,
): FirestoreQueryRuntimeState {
  return {
    ...state,
    errorMessage: null,
    hasMore,
    isFetchingMore: false,
    isLoading: false,
    pages,
  };
}

export function firestoreQueryFailed(
  state: FirestoreQueryRuntimeState,
  message: string,
): FirestoreQueryRuntimeState {
  return { ...state, errorMessage: message, isFetchingMore: false, isLoading: false };
}

export function firestoreLoadMoreStarted(
  state: FirestoreQueryRuntimeState,
): FirestoreQueryRuntimeState {
  return { ...state, isFetchingMore: true };
}

export function firestoreLoadMoreSucceeded(
  state: FirestoreQueryRuntimeState,
  page: FirestoreQueryRuntimeState['pages'][number],
  hasMore = false,
): FirestoreQueryRuntimeState {
  return {
    ...state,
    hasMore,
    isFetchingMore: false,
    pages: [...state.pages, page],
  };
}

export function firestoreLoadMoreFailed(
  state: FirestoreQueryRuntimeState,
  message: string,
): FirestoreQueryRuntimeState {
  return { ...state, errorMessage: message, isFetchingMore: false };
}

export function firestoreRefreshStarted(
  state: FirestoreQueryRuntimeState,
  input: {
    readonly limit: number;
    readonly pagesToReload: number;
    readonly query: FirestoreQuery;
    readonly runId?: number | undefined;
    readonly tabId: string;
  },
): FirestoreQueryRuntimeState {
  const started = firestoreQueryStarted(state, {
    clearSelection: false,
    limit: input.limit,
    query: input.query,
    runId: input.runId,
    tabId: input.tabId,
  });
  return {
    ...started,
    pendingPageReloads: { ...started.pendingPageReloads, [input.tabId]: input.pagesToReload },
  };
}

export function firestoreRefreshSucceeded(
  state: FirestoreQueryRuntimeState,
  tabId: string,
  pages: FirestoreQueryRuntimeState['pages'],
  hasMore = false,
): FirestoreQueryRuntimeState {
  return {
    ...firestoreQuerySucceeded(state, pages, hasMore),
    pendingPageReloads: omitKey(state.pendingPageReloads, tabId),
    resultsStale: false,
  };
}

export function firestoreResultViewChanged(
  state: FirestoreQueryRuntimeState,
  resultView: FirestoreResultView,
): FirestoreQueryRuntimeState {
  return { ...state, resultView };
}

export function firestoreDocumentSelected(
  state: FirestoreQueryRuntimeState,
  tabId: string,
  path: string | null,
): FirestoreQueryRuntimeState {
  return {
    ...state,
    selectedDocumentPaths: path === null
      ? omitKey(state.selectedDocumentPaths, tabId)
      : { ...state.selectedDocumentPaths, [tabId]: path },
  };
}

export function firestoreSubcollectionsLoaded(
  state: FirestoreQueryRuntimeState,
  documentPath: string,
  subcollections: ReadonlyArray<FirestoreCollectionNode>,
): FirestoreQueryRuntimeState {
  return {
    ...state,
    pages: state.pages.map((page) => ({
      items: page.items.map((document) =>
        document.path === documentPath ? { ...document, subcollections } : document
      ),
    })),
  };
}

export function firestoreResultsMarkedStale(
  state: FirestoreQueryRuntimeState,
): FirestoreQueryRuntimeState {
  return { ...state, resultsStale: true };
}

export function firestoreResultsRefreshed(
  state: FirestoreQueryRuntimeState,
): FirestoreQueryRuntimeState {
  return { ...state, resultsStale: false };
}

export function firestorePendingPageReloadCleared(
  state: FirestoreQueryRuntimeState,
  tabId: string,
): FirestoreQueryRuntimeState {
  return { ...state, pendingPageReloads: omitKey(state.pendingPageReloads, tabId) };
}

export function firestoreQueryCompletionRecorded(
  state: FirestoreQueryRuntimeState,
  key: string,
): FirestoreQueryRuntimeState {
  if (state.recordedQueryCompletions[key]) return state;
  return {
    ...state,
    recordedQueryCompletions: pruneRecordedQueryCompletions({
      ...state.recordedQueryCompletions,
      [key]: true,
    }),
  };
}

export function firestoreTabCleared(
  state: FirestoreQueryRuntimeState,
  tabId: string,
): FirestoreQueryRuntimeState {
  return {
    ...state,
    pendingPageReloads: omitKey(state.pendingPageReloads, tabId),
    queryRequests: omitKey(state.queryRequests, tabId),
    recordedQueryCompletions: omitRecordedQueryCompletionsForTab(
      state.recordedQueryCompletions,
      tabId,
    ),
    selectedDocumentPaths: omitKey(state.selectedDocumentPaths, tabId),
  };
}

export function firestoreQueryRequestFor(
  state: FirestoreQueryRuntimeState,
  tabId: string,
): SubmittedFirestoreQuery | null {
  return state.queryRequests[tabId] ?? null;
}

function omitKey<T>(
  record: Readonly<Record<string, T>>,
  key: string,
): Readonly<Record<string, T>> {
  if (!(key in record)) return record;
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function omitRecordedQueryCompletionsForTab(
  record: Readonly<Record<string, true>>,
  tabId: string,
): Readonly<Record<string, true>> {
  const prefix = `${tabId}:`;
  let changed = false;
  const next: Record<string, true> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith(prefix)) {
      changed = true;
      continue;
    }
    next[key] = value;
  }
  return changed ? next : record;
}

function pruneRecordedQueryCompletions(
  record: Readonly<Record<string, true>>,
): Readonly<Record<string, true>> {
  const entries = Object.entries(record);
  if (entries.length <= 500) return record;
  return Object.fromEntries(entries.slice(entries.length - 500)) as Record<string, true>;
}

import type { FirestoreQueryDraft } from '@firebase-desk/product-ui';
import type {
  ActivityLogAppendInput,
  FirestoreDocumentResult,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import {
  createInitialFirestoreQueryRuntimeState,
  firestoreDocumentSelected,
  firestoreDraftChanged,
  firestorePendingPageReloadCleared,
  firestoreQueryCompletionActivity,
  firestoreTabCleared,
  loadMoreFirestoreQueryCommand,
  openFirestoreDocumentInNewTabCommand,
  refreshFirestoreQueryCommand,
  runFirestoreQueryCommand,
  selectFirestoreActiveDraft,
  selectFirestoreActiveQueryRequest,
  selectFirestoreLoadedPageCount,
  selectFirestoreResultRows,
  selectFirestoreSelectedDocument,
} from '../../app-core/firestore/query/index.ts';
import { selectionActions } from '../stores/selectionStore.ts';
import { activePath, tabActions, tabsStore, type WorkspaceTab } from '../stores/tabsStore.ts';
import { DEFAULT_FIRESTORE_DRAFT, draftToQuery, isDocumentPath } from '../workspaceModel.ts';
import { useGetDocument, useRunQuery } from './useRepositoriesData.ts';

interface UseFirestoreTabStateInput {
  readonly activeProject: ProjectSummary | null;
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialDrafts?: Readonly<Record<string, FirestoreQueryDraft>> | undefined;
  readonly onQueryActivity?: ((input: ActivityLogAppendInput) => void) | undefined;
  readonly selectedTreeItemId: string | null;
}

export interface FirestoreTabState {
  readonly activeLoadedPageCount: number;
  readonly drafts: Readonly<Record<string, FirestoreQueryDraft>>;
  readonly activeDraft: FirestoreQueryDraft;
  readonly activeQueryIsDocument: boolean;
  readonly activeQueryPath: string | null;
  readonly activeQueryRunId: number | null;
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly queryRows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument: FirestoreDocumentResult | null;
  readonly selectedDocumentPath: string | null;
  readonly clearTab: (tabId: string) => void;
  readonly loadMore: () => void;
  readonly openTab: (connectionId: string, path: string) => string;
  readonly openTabInNewTab: (connectionId: string, path: string) => string;
  readonly refreshQuery: () => string | null;
  readonly resetDraft: () => void;
  readonly runQuery: () => string | null;
  readonly selectDocument: (tabId: string, path: string | null) => void;
  readonly setDraft: (draft: FirestoreQueryDraft) => void;
}

export function useFirestoreTabState(
  {
    activeProject,
    activeTab,
    initialDrafts,
    onQueryActivity,
    selectedTreeItemId,
  }: UseFirestoreTabStateInput,
): FirestoreTabState {
  const [queryState, setQueryState] = useState(() =>
    createInitialFirestoreQueryRuntimeState({ drafts: initialDrafts })
  );
  const loggedQueryRuns = useRef<Set<string>>(new Set());

  const activeDraft = selectFirestoreActiveDraft(
    queryState,
    activeTab,
    DEFAULT_FIRESTORE_DRAFT,
    activeTab ? activePath(activeTab) : '',
  );
  const activeQueryRequest = selectFirestoreActiveQueryRequest(
    queryState,
    activeTab,
    activeProject?.id,
  );
  const submittedQuery = activeQueryRequest?.query ?? null;
  const queryScopeId = activeTab?.kind === 'firestore-query' ? activeTab.id : 'inactive';
  const queryRequestIsDocument = submittedQuery ? isDocumentPath(submittedQuery.path) : false;
  const queryResult = useRunQuery(
    queryRequestIsDocument ? null : submittedQuery,
    activeQueryRequest?.limit ?? activeDraft.limit,
    activeQueryRequest?.runId ?? 0,
    activeTab?.kind === 'firestore-query' && Boolean(submittedQuery) && !queryRequestIsDocument,
    queryScopeId,
  );
  const queryDocumentResult = useGetDocument(
    queryRequestIsDocument ? submittedQuery?.connectionId : null,
    queryRequestIsDocument ? submittedQuery?.path : null,
    activeQueryRequest?.runId ?? 0,
    queryScopeId,
  );
  const queryRows = queryRequestIsDocument
    ? queryDocumentResult.data ? [queryDocumentResult.data] : []
    : selectFirestoreResultRows(queryResult.data?.pages ?? []);
  const activeSelectedDocumentPath = activeTab?.kind === 'firestore-query'
    ? queryState.selectedDocumentPaths[activeTab.id] ?? null
    : null;
  const selectedDocument = selectFirestoreSelectedDocument(queryRows, activeSelectedDocumentPath);
  const selectedDocumentPath = selectedDocument?.path ?? null;
  const errorMessage = queryRequestIsDocument
    ? messageFromError(queryDocumentResult.error)
    : messageFromError(queryResult.error);
  const loadedPageCount = queryResult.data?.pages.length ?? 0;
  const activeLoadedPageCount = selectFirestoreLoadedPageCount(
    queryResult.data?.pages ?? [],
    queryRequestIsDocument,
    Boolean(queryDocumentResult.data),
  );
  const pendingPageReloadCount = activeTab?.kind === 'firestore-query'
    ? queryState.pendingPageReloads[activeTab.id] ?? 0
    : 0;

  useEffect(() => {
    if (
      !activeTab || activeTab.kind !== 'firestore-query' || queryRequestIsDocument
      || pendingPageReloadCount <= 1 || loadedPageCount === 0
    ) {
      return;
    }
    if (loadedPageCount >= pendingPageReloadCount || !queryResult.hasNextPage) {
      setQueryState((current) => firestorePendingPageReloadCleared(current, activeTab.id));
      return;
    }
    if (!queryResult.isFetchingNextPage) void queryResult.fetchNextPage();
  }, [
    activeTab,
    loadedPageCount,
    pendingPageReloadCount,
    queryRequestIsDocument,
    queryResult,
  ]);

  useEffect(() => {
    if (
      !onQueryActivity || !activeTab || activeTab.kind !== 'firestore-query'
      || activeQueryRequest?.runId === undefined
    ) {
      return;
    }
    const isLoading = queryRequestIsDocument
      ? queryDocumentResult.isLoading || queryDocumentResult.isFetching
      : queryResult.isLoading || queryResult.isFetching;
    if (isLoading) return;

    const runErrorMessage = queryRequestIsDocument
      ? messageFromError(queryDocumentResult.error)
      : messageFromError(queryResult.error);
    const key = [
      activeTab.id,
      activeQueryRequest.runId,
      runErrorMessage ?? 'success',
      queryRows.length,
      activeLoadedPageCount,
    ].join(':');
    if (!rememberQueryActivity(loggedQueryRuns.current, key)) return;
    onQueryActivity(firestoreQueryCompletionActivity({
      connectionId: activeTab.connectionId,
      draft: activeDraft,
      errorMessage: runErrorMessage,
      loadedPages: activeLoadedPageCount,
      resultCount: queryRows.length,
    }));
  }, [
    activeDraft,
    activeLoadedPageCount,
    activeQueryRequest,
    activeTab,
    onQueryActivity,
    queryDocumentResult.error,
    queryDocumentResult.isFetching,
    queryDocumentResult.isLoading,
    queryRequestIsDocument,
    queryResult.error,
    queryResult.isFetching,
    queryResult.isLoading,
    queryRows.length,
  ]);

  function setDraft(draft: FirestoreQueryDraft) {
    if (!activeTab) return;
    setQueryState((current) => firestoreDraftChanged(current, activeTab.id, draft));
  }

  function resetDraft() {
    if (!activeTab) return;
    setQueryState((current) =>
      firestoreDraftChanged(current, activeTab.id, {
        ...DEFAULT_FIRESTORE_DRAFT,
        path: activePath(activeTab) || DEFAULT_FIRESTORE_DRAFT.path,
      })
    );
  }

  function runQuery(): string | null {
    return submitQuery({ clearSelection: true, pagesToReload: null });
  }

  function refreshQuery(): string | null {
    return submitQuery({
      clearSelection: false,
      pagesToReload: Math.max(1, queryResult.data?.pages.length ?? 1),
    });
  }

  function submitQuery(
    {
      clearSelection,
      pagesToReload,
    }: {
      readonly clearSelection: boolean;
      readonly pagesToReload: number | null;
    },
  ): string | null {
    if (!activeTab || activeTab.kind !== 'firestore-query' || !activeProject) return null;
    const nextQuery = draftToQuery(activeProject.id, activeDraft);
    if (clearSelection) selectDocument(activeTab.id, null);
    const result = pagesToReload === null
      ? runFirestoreQueryCommand(queryState, {
        activeDraft,
        clearSelection,
        query: nextQuery,
        selectedTreeItemId,
        tab: activeTab,
      })
      : refreshFirestoreQueryCommand(queryState, {
        activeDraft,
        clearSelection,
        pagesToReload,
        query: nextQuery,
        selectedTreeItemId,
        tab: activeTab,
      });
    setQueryState(result.state);
    tabActions.pushHistory(activeTab.id, activeDraft.path);
    if (result.interaction) tabActions.recordInteraction(result.interaction);
    return result.path;
  }

  function openTab(connectionId: string, path: string): string {
    const id = tabActions.openOrSelectTab({ kind: 'firestore-query', connectionId, path });
    setQueryState((current) =>
      current.drafts[id]
        ? current
        : firestoreDraftChanged(current, id, { ...DEFAULT_FIRESTORE_DRAFT, path })
    );
    return id;
  }

  function openTabInNewTab(connectionId: string, path: string): string {
    const intent = openFirestoreDocumentInNewTabCommand(connectionId, path);
    const id = tabActions.openTab({
      kind: 'firestore-query',
      connectionId: intent.connectionId,
      path: intent.path,
    });
    setQueryState((current) =>
      firestoreDraftChanged(current, id, { ...DEFAULT_FIRESTORE_DRAFT, path: intent.path })
    );
    return id;
  }

  function clearTab(tabId: string) {
    setQueryState((current) => firestoreTabCleared(current, tabId));
    selectDocument(tabId, null);
  }

  function selectDocument(tabId: string, path: string | null) {
    setQueryState((current) => firestoreDocumentSelected(current, tabId, path));
    if (tabId === tabsStore.state.activeTabId) selectionActions.selectDocument(path);
  }

  function loadMore() {
    const result = loadMoreFirestoreQueryCommand(queryState, {
      isDocumentQuery: queryRequestIsDocument,
    });
    setQueryState(result.state);
    if (result.shouldFetchNextPage) void queryResult.fetchNextPage();
  }

  return {
    activeLoadedPageCount,
    drafts: queryState.drafts,
    activeDraft,
    activeQueryIsDocument: queryRequestIsDocument,
    activeQueryPath: submittedQuery?.path ?? null,
    activeQueryRunId: activeQueryRequest?.runId ?? null,
    errorMessage,
    hasMore: !queryRequestIsDocument && Boolean(queryResult.hasNextPage),
    isFetchingMore: !queryRequestIsDocument && queryResult.isFetchingNextPage,
    isLoading: queryRequestIsDocument
      ? queryDocumentResult.isLoading || queryDocumentResult.isFetching
      : queryResult.isLoading || queryResult.isFetching,
    queryRows,
    selectedDocument,
    selectedDocumentPath,
    clearTab,
    loadMore,
    openTab,
    openTabInNewTab,
    resetDraft,
    refreshQuery,
    runQuery,
    selectDocument,
    setDraft,
  };
}

function messageFromError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Could not load Firestore data.';
}

function rememberQueryActivity(keys: Set<string>, key: string): boolean {
  if (keys.has(key)) return false;
  keys.add(key);
  while (keys.size > 500) {
    const oldestKey = keys.keys().next().value as string | undefined;
    if (!oldestKey) break;
    keys.delete(oldestKey);
  }
  return true;
}

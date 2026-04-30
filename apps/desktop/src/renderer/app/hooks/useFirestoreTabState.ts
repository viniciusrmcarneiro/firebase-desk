import type {
  ActivityLogAppendInput,
  FirestoreDocumentResult,
  FirestoreQuery,
  FirestoreQueryDraft,
  PageRequest,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import {
  createInitialFirestoreQueryRuntimeState,
  executeFirestoreLoadMoreCommand,
  executeFirestoreQueryCommand,
  firestoreDocumentSelected,
  firestoreDraftChanged,
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
import type { FirestoreQueryRuntimeState } from '../../app-core/firestore/query/index.ts';
import { useRepositories } from '../RepositoryProvider.tsx';
import { selectionActions } from '../stores/selectionStore.ts';
import { activePath, tabActions, tabsStore, type WorkspaceTab } from '../stores/tabsStore.ts';
import { DEFAULT_FIRESTORE_DRAFT, draftToQuery, isDocumentPath } from '../workspaceModel.ts';

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
  readonly isTabLoading: (tabId: string) => boolean;
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
  const repositories = useRepositories();
  const [queryState, setQueryState] = useState(() =>
    createInitialFirestoreQueryRuntimeState({ drafts: initialDrafts })
  );
  const queryStateRef = useRef(queryState);
  queryStateRef.current = queryState;

  function updateQueryState(
    update:
      | FirestoreQueryRuntimeState
      | ((
        current: FirestoreQueryRuntimeState,
      ) => FirestoreQueryRuntimeState),
  ): void {
    const next = typeof update === 'function' ? update(queryStateRef.current) : update;
    queryStateRef.current = next;
    setQueryState(next);
  }

  useEffect(() => {
    if (!initialDrafts) return;
    updateQueryState(createInitialFirestoreQueryRuntimeState({ drafts: initialDrafts }));
  }, [initialDrafts]);

  const queryCommandStore = {
    get: () => queryStateRef.current,
    set: updateQueryState,
    subscribe: () => () => undefined,
    update: updateQueryState,
  };
  const queryExecutionEnv = {
    getDocument: (connectionId: string, path: string) =>
      repositories.firestore.getDocument(connectionId, path),
    recordActivity: onQueryActivity,
    runQuery: (query: FirestoreQuery, request: PageRequest) =>
      repositories.firestore.runQuery(query, request),
  };

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
  const queryRequestIsDocument = submittedQuery ? isDocumentPath(submittedQuery.path) : false;
  const queryRows = activeQueryRequest ? selectFirestoreResultRows(queryState.pages) : [];
  const activeSelectedDocumentPath = activeTab?.kind === 'firestore-query'
    ? queryState.selectedDocumentPaths[activeTab.id] ?? null
    : null;
  const selectedDocument = selectFirestoreSelectedDocument(queryRows, activeSelectedDocumentPath);
  const selectedDocumentPath = selectedDocument?.path ?? null;
  const activeErrorMessage = queryState.errorMessage;
  const activeLoadedPageCount = selectFirestoreLoadedPageCount(
    queryState.pages,
    queryRequestIsDocument,
    queryRows.length > 0,
  );

  function setDraft(draft: FirestoreQueryDraft) {
    if (!activeTab) return;
    updateQueryState((current) => firestoreDraftChanged(current, activeTab.id, draft));
  }

  function resetDraft() {
    if (!activeTab) return;
    updateQueryState((current) =>
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
      pagesToReload: Math.max(1, activeLoadedPageCount || 1),
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
    updateQueryState(result.state);
    tabActions.pushHistory(activeTab.id, activeDraft.path);
    if (result.interaction) tabActions.recordInteraction(result.interaction);
    const request = result.state.queryRequests[activeTab.id] ?? null;
    if (request) {
      void executeFirestoreQueryCommand(queryCommandStore, queryExecutionEnv, {
        draft: activeDraft,
        isRefresh: pagesToReload !== null,
        pagesToLoad: pagesToReload ?? 1,
        request,
        tab: activeTab,
      });
    }
    return result.path;
  }

  function openTab(connectionId: string, path: string): string {
    const id = tabActions.openOrSelectTab({ kind: 'firestore-query', connectionId, path });
    updateQueryState((current) =>
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
    updateQueryState((current) =>
      firestoreDraftChanged(current, id, { ...DEFAULT_FIRESTORE_DRAFT, path: intent.path })
    );
    return id;
  }

  function clearTab(tabId: string) {
    updateQueryState((current) => {
      const cleared = firestoreTabCleared(current, tabId);
      return activeTab?.id === tabId
        ? {
          ...cleared,
          errorMessage: null,
          hasMore: false,
          isFetchingMore: false,
          isLoading: false,
          pages: [],
        }
        : cleared;
    });
    selectDocument(tabId, null);
  }

  function selectDocument(tabId: string, path: string | null) {
    updateQueryState((current) => firestoreDocumentSelected(current, tabId, path));
    if (tabId === tabsStore.state.activeTabId) selectionActions.selectDocument(path);
  }

  function loadMore() {
    const result = loadMoreFirestoreQueryCommand(queryState, {
      isDocumentQuery: queryRequestIsDocument,
    });
    updateQueryState(result.state);
    if (result.shouldFetchNextPage && activeTab?.kind === 'firestore-query' && activeQueryRequest) {
      void executeFirestoreLoadMoreCommand(queryCommandStore, queryExecutionEnv, {
        request: activeQueryRequest,
        tab: activeTab,
      });
    }
  }

  return {
    activeLoadedPageCount,
    drafts: queryState.drafts,
    activeDraft,
    activeQueryIsDocument: queryRequestIsDocument,
    activeQueryPath: submittedQuery?.path ?? null,
    activeQueryRunId: activeQueryRequest?.runId ?? null,
    errorMessage: activeErrorMessage,
    hasMore: !queryRequestIsDocument && queryState.hasMore,
    isFetchingMore: !queryRequestIsDocument && queryState.isFetchingMore,
    isLoading: queryState.isLoading,
    isTabLoading,
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

  function isTabLoading(tabId: string): boolean {
    return activeTab?.id === tabId && (queryState.isLoading || queryState.isFetchingMore);
  }
}

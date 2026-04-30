import type {
  ActivityLogAppendInput,
  FirestoreDocumentResult,
  FirestoreQueryDraft,
  PageRequest,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import {
  completeFirestoreQueryCommand,
  createInitialFirestoreQueryRuntimeState,
  firestoreDocumentSelected,
  firestoreDraftChanged,
  firestoreLoadMoreFailed,
  firestoreLoadMoreSucceeded,
  firestoreQueryFailed,
  firestoreQuerySucceeded,
  firestoreRefreshSucceeded,
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
      void executeQuery({
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
      void executeLoadMore({
        draft: activeDraft,
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

  async function executeQuery(
    input: {
      readonly draft: FirestoreQueryDraft;
      readonly isRefresh: boolean;
      readonly pagesToLoad: number;
      readonly request: NonNullable<typeof activeQueryRequest>;
      readonly tab: WorkspaceTab;
    },
  ): Promise<void> {
    const { query, limit, runId } = input.request;
    const isDocumentQuery = isDocumentPath(query.path);
    try {
      const pages = isDocumentQuery
        ? await loadDocumentPage(query.connectionId, query.path)
        : await loadQueryPages(query, limit, input.pagesToLoad);
      const hasMore = !isDocumentQuery && Boolean(pages[pages.length - 1]?.nextCursor);
      const nextState = (current: FirestoreQueryRuntimeState) =>
        input.isRefresh
          ? firestoreRefreshSucceeded(current, input.tab.id, pages, hasMore)
          : firestoreQuerySucceeded(current, pages, hasMore);
      completeQueryRun({
        draft: input.draft,
        errorMessage: null,
        isDocumentQuery,
        loadedPages: selectFirestoreLoadedPageCount(pages, isDocumentQuery, pages.length > 0),
        resultCount: selectFirestoreResultRows(pages).length,
        runId,
        tab: input.tab,
        transition: nextState,
      });
    } catch (error) {
      const loadErrorMessage = messageFromError(error);
      completeQueryRun({
        draft: input.draft,
        errorMessage: loadErrorMessage,
        isDocumentQuery,
        loadedPages: 0,
        resultCount: 0,
        runId,
        tab: input.tab,
        transition: (current) => firestoreQueryFailed(current, loadErrorMessage),
      });
    }
  }

  async function executeLoadMore(
    input: {
      readonly draft: FirestoreQueryDraft;
      readonly request: NonNullable<typeof activeQueryRequest>;
      readonly tab: WorkspaceTab;
    },
  ): Promise<void> {
    const stateSnapshot = queryStateRef.current;
    const cursor = stateSnapshot.pages[stateSnapshot.pages.length - 1]?.nextCursor;
    if (!cursor) {
      updateQueryState((state) => firestoreLoadMoreSucceeded(state, { items: [] }, false));
      return;
    }
    try {
      const page = await repositories.firestore.runQuery(
        input.request.query,
        pageRequest(cursor, input.request.limit),
      );
      updateQueryState((state) =>
        isCurrentRun(state, input.tab.id, input.request.runId)
          ? firestoreLoadMoreSucceeded(
            state,
            firestoreQueryPage(page.items, page.nextCursor),
            Boolean(page.nextCursor),
          )
          : state
      );
    } catch (error) {
      const moreErrorMessage = messageFromError(error);
      updateQueryState((state) =>
        isCurrentRun(state, input.tab.id, input.request.runId)
          ? firestoreLoadMoreFailed(state, moreErrorMessage)
          : state
      );
    }
  }

  async function loadDocumentPage(
    connectionId: string,
    path: string,
  ): Promise<FirestoreQueryRuntimeState['pages']> {
    const document = await repositories.firestore.getDocument(connectionId, path);
    return document ? [{ items: [document] }] : [];
  }

  async function loadQueryPages(
    query: NonNullable<typeof activeQueryRequest>['query'],
    limit: number,
    pagesToLoad: number,
  ): Promise<FirestoreQueryRuntimeState['pages']> {
    const pages: Array<FirestoreQueryRuntimeState['pages'][number]> = [];
    let cursor: PageRequest['cursor'] | undefined;
    do {
      // eslint-disable-next-line no-await-in-loop -- Each page depends on the previous cursor.
      const page = await repositories.firestore.runQuery(query, pageRequest(cursor, limit));
      pages.push(firestoreQueryPage(page.items, page.nextCursor));
      cursor = page.nextCursor ?? undefined;
    } while (cursor && pages.length < pagesToLoad);
    return pages;
  }

  function completeQueryRun(
    input: {
      readonly draft: FirestoreQueryDraft;
      readonly errorMessage: string | null;
      readonly isDocumentQuery: boolean;
      readonly loadedPages: number;
      readonly resultCount: number;
      readonly runId: number;
      readonly tab: WorkspaceTab;
      readonly transition: (state: FirestoreQueryRuntimeState) => FirestoreQueryRuntimeState;
    },
  ): void {
    const current = queryStateRef.current;
    if (!isCurrentRun(current, input.tab.id, input.runId)) return;
    const transitioned = input.transition(current);
    const result = completeFirestoreQueryCommand(transitioned, {
      connectionId: input.tab.connectionId,
      draft: input.draft,
      errorMessage: input.errorMessage,
      isDocumentQuery: input.isDocumentQuery,
      isLoading: false,
      loadedPages: input.loadedPages,
      pendingPageReloadCount: 0,
      resultCount: input.resultCount,
      runId: input.runId,
      tabId: input.tab.id,
    });
    updateQueryState(result.state);
    if (result.activity && onQueryActivity) onQueryActivity(result.activity);
  }
}

function isCurrentRun(
  state: FirestoreQueryRuntimeState,
  tabId: string,
  runId: number,
): boolean {
  return state.queryRequests[tabId]?.runId === runId;
}

function pageRequest(cursor: PageRequest['cursor'] | undefined, limit: number): PageRequest {
  return cursor ? { cursor, limit } : { limit };
}

function firestoreQueryPage(
  items: ReadonlyArray<FirestoreDocumentResult>,
  nextCursor: PageRequest['cursor'] | null | undefined,
): FirestoreQueryRuntimeState['pages'][number] {
  return nextCursor ? { items, nextCursor } : { items };
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Could not load Firestore data.';
}

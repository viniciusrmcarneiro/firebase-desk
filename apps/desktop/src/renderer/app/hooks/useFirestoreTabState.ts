import type { FirestoreQueryDraft } from '@firebase-desk/product-ui';
import type {
  FirestoreDocumentResult,
  FirestoreQuery,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { useEffect, useRef, useState } from 'react';
import { selectionActions } from '../stores/selectionStore.ts';
import { activePath, tabActions, tabsStore, type WorkspaceTab } from '../stores/tabsStore.ts';
import {
  DEFAULT_FIRESTORE_DRAFT,
  draftToQuery,
  getDraft,
  isDocumentPath,
  omitKey,
} from '../workspaceModel.ts';
import { useGetDocument, useRunQuery } from './useRepositoriesData.ts';

interface SubmittedFirestoreQuery {
  readonly limit: number;
  readonly query: FirestoreQuery;
  readonly runId: number;
}

interface UseFirestoreTabStateInput {
  readonly activeProject: ProjectSummary | null;
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialDrafts?: Readonly<Record<string, FirestoreQueryDraft>> | undefined;
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
  { activeProject, activeTab, initialDrafts, selectedTreeItemId }: UseFirestoreTabStateInput,
): FirestoreTabState {
  const [drafts, setDrafts] = useState<Readonly<Record<string, FirestoreQueryDraft>>>(
    () => initialDrafts ?? {},
  );
  const [queryRequests, setQueryRequests] = useState<
    Readonly<Record<string, SubmittedFirestoreQuery | null>>
  >({});
  const [selectedDocumentPaths, setSelectedDocumentPaths] = useState<
    Readonly<Record<string, string>>
  >({});
  const [pendingPageReloads, setPendingPageReloads] = useState<Readonly<Record<string, number>>>(
    {},
  );
  const nextRunId = useRef(1);

  const activeDraft = getDraft(activeTab, drafts);
  const queryRequest = activeTab?.kind === 'firestore-query'
    ? queryRequests[activeTab.id] ?? null
    : null;
  const activeQueryRequest = queryRequest?.query.connectionId === activeProject?.id
    ? queryRequest
    : null;
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
    : queryResult.data?.pages.flatMap((page) => page.items) ?? [];
  const activeSelectedDocumentPath = activeTab?.kind === 'firestore-query'
    ? selectedDocumentPaths[activeTab.id] ?? null
    : null;
  const selectedDocument = queryRows.find((row) => row.path === activeSelectedDocumentPath) ?? null;
  const selectedDocumentPath = selectedDocument?.path ?? null;
  const errorMessage = queryRequestIsDocument
    ? messageFromError(queryDocumentResult.error)
    : messageFromError(queryResult.error);

  const pendingPageReloadCount = activeTab?.kind === 'firestore-query'
    ? pendingPageReloads[activeTab.id] ?? 0
    : 0;
  const loadedPageCount = queryResult.data?.pages.length ?? 0;

  useEffect(() => {
    if (
      !activeTab || activeTab.kind !== 'firestore-query' || queryRequestIsDocument
      || pendingPageReloadCount <= 1 || loadedPageCount === 0
    ) {
      return;
    }
    if (loadedPageCount >= pendingPageReloadCount || !queryResult.hasNextPage) {
      setPendingPageReloads((current) => omitKey(current, activeTab.id));
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

  function setDraft(draft: FirestoreQueryDraft) {
    if (!activeTab) return;
    setDrafts((current) => ({ ...current, [activeTab.id]: draft }));
  }

  function resetDraft() {
    if (!activeTab) return;
    setDrafts((current) => ({
      ...current,
      [activeTab.id]: {
        ...DEFAULT_FIRESTORE_DRAFT,
        path: activePath(activeTab) || DEFAULT_FIRESTORE_DRAFT.path,
      },
    }));
  }

  function runQuery(): string | null {
    return submitQuery({ clearSelection: true });
  }

  function refreshQuery(): string | null {
    const pagesToReload = Math.max(1, queryResult.data?.pages.length ?? 1);
    const path = submitQuery({ clearSelection: false });
    if (path && activeTab?.kind === 'firestore-query' && !queryRequestIsDocument) {
      setPendingPageReloads((current) => ({ ...current, [activeTab.id]: pagesToReload }));
    }
    return path;
  }

  function submitQuery({ clearSelection }: { readonly clearSelection: boolean; }): string | null {
    if (!activeTab || activeTab.kind !== 'firestore-query' || !activeProject) return null;
    const nextQuery = draftToQuery(activeProject.id, activeDraft);
    if (clearSelection) selectDocument(activeTab.id, null);
    setQueryRequests((current) => ({
      ...current,
      [activeTab.id]: { limit: activeDraft.limit, query: nextQuery, runId: nextRunId.current++ },
    }));
    setPendingPageReloads((current) => omitKey(current, activeTab.id));
    tabActions.pushHistory(activeTab.id, activeDraft.path);
    tabActions.recordInteraction({
      activeTabId: activeTab.id,
      path: activeDraft.path,
      selectedTreeItemId,
    });
    return activeDraft.path;
  }

  function openTab(connectionId: string, path: string): string {
    const id = tabActions.openOrSelectTab({ kind: 'firestore-query', connectionId, path });
    setDrafts((current) =>
      current[id] ? current : { ...current, [id]: { ...DEFAULT_FIRESTORE_DRAFT, path } }
    );
    return id;
  }

  function openTabInNewTab(connectionId: string, path: string): string {
    const id = tabActions.openTab({ kind: 'firestore-query', connectionId, path });
    setDrafts((current) => ({ ...current, [id]: { ...DEFAULT_FIRESTORE_DRAFT, path } }));
    return id;
  }

  function clearTab(tabId: string) {
    setQueryRequests((current) => omitKey(current, tabId));
    selectDocument(tabId, null);
  }

  function selectDocument(tabId: string, path: string | null) {
    setSelectedDocumentPaths((current) =>
      path === null ? omitKey(current, tabId) : { ...current, [tabId]: path }
    );
    if (tabId === tabsStore.state.activeTabId) selectionActions.selectDocument(path);
  }

  function loadMore() {
    if (!queryRequestIsDocument) void queryResult.fetchNextPage();
  }

  return {
    activeLoadedPageCount: queryRequestIsDocument
      ? (queryDocumentResult.data ? 1 : 0)
      : loadedPageCount,
    drafts,
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

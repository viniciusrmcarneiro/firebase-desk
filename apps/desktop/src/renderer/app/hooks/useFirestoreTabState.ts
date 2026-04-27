import type { FirestoreQueryDraft } from '@firebase-desk/product-ui';
import type {
  FirestoreDocumentResult,
  FirestoreQuery,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { useState } from 'react';
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
}

interface UseFirestoreTabStateInput {
  readonly activeProject: ProjectSummary | null;
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialDrafts?: Readonly<Record<string, FirestoreQueryDraft>> | undefined;
  readonly selectedTreeItemId: string | null;
}

export interface FirestoreTabState {
  readonly drafts: Readonly<Record<string, FirestoreQueryDraft>>;
  readonly activeDraft: FirestoreQueryDraft;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly queryRows: ReadonlyArray<FirestoreDocumentResult>;
  readonly selectedDocument: FirestoreDocumentResult | null;
  readonly selectedDocumentPath: string | null;
  readonly clearTab: (tabId: string) => void;
  readonly loadMore: () => void;
  readonly openTab: (projectId: string, path: string) => string;
  readonly openTabInNewTab: (projectId: string, path: string) => string;
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

  const activeDraft = getDraft(activeTab, drafts);
  const queryRequest = activeTab?.kind === 'firestore-query'
    ? queryRequests[activeTab.id] ?? null
    : null;
  const activeQueryRequest = queryRequest?.query.projectId === activeProject?.projectId
    ? queryRequest
    : null;
  const submittedQuery = activeQueryRequest?.query ?? null;
  const queryRequestIsDocument = submittedQuery ? isDocumentPath(submittedQuery.path) : false;
  const queryResult = useRunQuery(
    queryRequestIsDocument ? null : submittedQuery,
    activeQueryRequest?.limit ?? activeDraft.limit,
    activeTab?.kind === 'firestore-query' && Boolean(submittedQuery) && !queryRequestIsDocument,
  );
  const queryDocumentResult = useGetDocument(
    queryRequestIsDocument ? submittedQuery?.projectId : null,
    queryRequestIsDocument ? submittedQuery?.path : null,
  );
  const queryRows = queryRequestIsDocument
    ? queryDocumentResult.data ? [queryDocumentResult.data] : []
    : queryResult.data?.pages.flatMap((page) => page.items) ?? [];
  const activeSelectedDocumentPath = activeTab?.kind === 'firestore-query'
    ? selectedDocumentPaths[activeTab.id] ?? null
    : null;
  const selectedDocument = queryRows.find((row) => row.path === activeSelectedDocumentPath) ?? null;
  const selectedDocumentPath = selectedDocument?.path ?? null;

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
    if (!activeTab || activeTab.kind !== 'firestore-query' || !activeProject) return null;
    const nextQuery = draftToQuery(activeProject.projectId, activeDraft);
    selectDocument(activeTab.id, null);
    setQueryRequests((current) => ({
      ...current,
      [activeTab.id]: { limit: activeDraft.limit, query: nextQuery },
    }));
    tabActions.pushHistory(activeTab.id, activeDraft.path);
    tabActions.recordInteraction({
      activeTabId: activeTab.id,
      path: activeDraft.path,
      selectedTreeItemId,
    });
    return activeDraft.path;
  }

  function openTab(projectId: string, path: string): string {
    const id = tabActions.openOrSelectTab({ kind: 'firestore-query', projectId, path });
    setDrafts((current) =>
      current[id] ? current : { ...current, [id]: { ...DEFAULT_FIRESTORE_DRAFT, path } }
    );
    return id;
  }

  function openTabInNewTab(projectId: string, path: string): string {
    const id = tabActions.openTab({ kind: 'firestore-query', projectId, path });
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
    drafts,
    activeDraft,
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
    runQuery,
    selectDocument,
    setDraft,
  };
}

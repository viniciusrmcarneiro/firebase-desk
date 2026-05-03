import type { FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import type { FirestoreDocumentResult, FirestoreQuery } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  firestoreQueryDraftMetadata,
  selectFirestoreLoadedPageCount,
  selectFirestoreResultRows,
  selectFirestoreSelectedDocument,
} from './firestoreQuerySelectors.ts';
import { createInitialFirestoreQueryRuntimeState } from './firestoreQueryState.ts';
import {
  firestoreDocumentSelected,
  firestoreDraftChanged,
  firestoreLoadMoreFailed,
  firestoreLoadMoreStarted,
  firestoreLoadMoreSucceeded,
  firestorePendingPageReloadCleared,
  firestoreQueryCompletionRecorded,
  firestoreQueryFailed,
  firestoreQueryStarted,
  firestoreQuerySucceeded,
  firestoreRefreshStarted,
  firestoreRefreshSucceeded,
  firestoreResultsMarkedStale,
  firestoreResultsRefreshed,
  firestoreResultViewChanged,
  firestoreSubcollectionsLoaded,
  firestoreTabCleared,
} from './firestoreQueryTransitions.ts';

describe('firestore query transitions and selectors', () => {
  it('updates drafts by tab', () => {
    const draft = queryDraft({ path: 'orders' });
    const state = firestoreDraftChanged(createInitialFirestoreQueryRuntimeState(), 'tab-1', draft);

    expect(state.drafts['tab-1']).toBe(draft);
  });

  it('starts queries, increments run ids, and clears selection when requested', () => {
    const selected = firestoreDocumentSelected(
      createInitialFirestoreQueryRuntimeState(),
      'tab-1',
      'orders/ord_1',
    );

    const state = firestoreQueryStarted(selected, {
      clearSelection: true,
      limit: 25,
      query: query('orders'),
      tabId: 'tab-1',
    });

    expect(state.queryRequests['tab-1']).toMatchObject({ limit: 25, runId: 1 });
    expect(state.nextRunId).toBe(2);
    expect(state.selectedDocumentPaths['tab-1']).toBeUndefined();
    expect(state.isLoading).toBe(true);
  });

  it('stores successful and failed query results', () => {
    const row = document('orders/ord_1');
    const succeeded = firestoreQuerySucceeded(
      createInitialFirestoreQueryRuntimeState(),
      'tab-1',
      [{ items: [row] }],
      true,
    );

    expect(succeeded.pages).toEqual([{ items: [row] }]);
    expect(succeeded.resultsByTab['tab-1']?.pages).toEqual([{ items: [row] }]);
    expect(succeeded.hasMore).toBe(true);
    expect(succeeded.isLoading).toBe(false);

    const failed = firestoreQueryFailed(succeeded, 'tab-1', 'failed');
    expect(failed.errorMessage).toBe('failed');
    expect(failed.isLoading).toBe(false);
  });

  it('loads more pages and captures load-more errors', () => {
    const started = firestoreLoadMoreStarted(createInitialFirestoreQueryRuntimeState(), 'tab-1');
    expect(started.isFetchingMore).toBe(true);

    const loaded = firestoreLoadMoreSucceeded(
      started,
      'tab-1',
      { items: [document('orders/ord_1')] },
      false,
    );
    expect(loaded.pages).toHaveLength(1);
    expect(loaded.isFetchingMore).toBe(false);

    const failed = firestoreLoadMoreFailed(started, 'tab-1', 'fetch failed');
    expect(failed.errorMessage).toBe('fetch failed');
    expect(failed.isFetchingMore).toBe(false);
  });

  it('refreshes from page one and tracks loaded page reload count', () => {
    const state = firestoreRefreshStarted(createInitialFirestoreQueryRuntimeState(), {
      limit: 25,
      pagesToReload: 3,
      query: query('orders'),
      tabId: 'tab-1',
    });

    expect(state.pendingPageReloads['tab-1']).toBe(3);

    const refreshed = firestoreRefreshSucceeded(state, 'tab-1', [{ items: [] }]);
    expect(refreshed.pendingPageReloads['tab-1']).toBeUndefined();
    expect(refreshed.resultsStale).toBe(false);
  });

  it('changes result view, selection, stale state, and tab scoped state', () => {
    const selected = firestoreDocumentSelected(
      createInitialFirestoreQueryRuntimeState(),
      'tab-1',
      'a/b',
    );
    expect(selected.selectedDocumentPaths['tab-1']).toBe('a/b');

    const viewChanged = firestoreResultViewChanged(selected, 'tab-1', 'json');
    expect(viewChanged.resultView).toBe('json');
    expect(viewChanged.resultsByTab['tab-1']?.resultView).toBe('json');

    const otherTabChanged = firestoreResultViewChanged(viewChanged, 'tab-2', 'tree');
    expect(otherTabChanged.resultsByTab['tab-1']?.resultView).toBe('json');
    expect(otherTabChanged.resultsByTab['tab-2']?.resultView).toBe('tree');

    const rerun = firestoreQueryStarted(viewChanged, {
      clearSelection: true,
      limit: 25,
      query: query('orders'),
      tabId: 'tab-1',
    });
    expect(rerun.resultsByTab['tab-1']?.resultView).toBe('json');

    const stale = firestoreResultsMarkedStale(viewChanged, 'tab-1');
    expect(stale.resultsStale).toBe(true);
    expect(stale.resultsByTab['tab-1']?.resultsStale).toBe(true);
    const refreshed = firestoreResultsRefreshed(stale, 'tab-1');
    expect(refreshed.resultsStale).toBe(false);
    expect(refreshed.resultsByTab['tab-1']?.resultsStale).toBe(false);

    const clearedReload = firestorePendingPageReloadCleared(
      { ...stale, pendingPageReloads: { 'tab-1': 2 } },
      'tab-1',
    );
    expect(clearedReload.pendingPageReloads['tab-1']).toBeUndefined();

    const recorded = firestoreQueryCompletionRecorded(stale, 'tab-1:1');
    expect(recorded.recordedQueryCompletions['tab-1:1']).toBe(true);

    const clearedTab = firestoreTabCleared(recorded, 'tab-1');
    expect(clearedTab.selectedDocumentPaths['tab-1']).toBeUndefined();
    expect(clearedTab.recordedQueryCompletions['tab-1:1']).toBeUndefined();
  });

  it('merges loaded subcollections into matching result rows', () => {
    const state = firestoreQuerySucceeded(
      createInitialFirestoreQueryRuntimeState(),
      'tab-1',
      [{ items: [document('orders/ord_1'), document('orders/ord_2')] }],
    );

    const merged = firestoreSubcollectionsLoaded(state, 'orders/ord_1', [{
      id: 'events',
      path: 'orders/ord_1/events',
    }]);

    expect(merged.pages[0]?.items[0]?.subcollections).toEqual([{
      id: 'events',
      path: 'orders/ord_1/events',
    }]);
    expect(merged.pages[0]?.items[1]?.subcollections).toBeUndefined();
  });

  it('selects rows, selected documents, page count, and query metadata', () => {
    const row = document('orders/ord_1');
    expect(selectFirestoreResultRows([{ items: [row] }])).toEqual([row]);
    expect(selectFirestoreSelectedDocument([row], 'orders/ord_1')).toBe(row);
    expect(selectFirestoreLoadedPageCount([{}], false, false)).toBe(1);
    expect(selectFirestoreLoadedPageCount([], true, true)).toBe(1);
    expect(firestoreQueryDraftMetadata(queryDraft({ path: 'orders', limit: 5 }))).toMatchObject({
      limit: 5,
      path: 'orders',
    });
  });
});

function query(path: string): FirestoreQuery {
  return { connectionId: 'emu', filters: [], path };
}

function queryDraft(
  overrides: Partial<FirestoreQueryDraft> = {},
): FirestoreQueryDraft {
  return {
    filterField: '',
    filterOp: '==',
    filterValue: '',
    filters: [],
    limit: 25,
    path: 'orders',
    sortDirection: 'asc',
    sortField: '',
    ...overrides,
  };
}

function document(path: string): FirestoreDocumentResult {
  return { data: {}, hasSubcollections: false, id: path.split('/').at(-1) ?? path, path };
}

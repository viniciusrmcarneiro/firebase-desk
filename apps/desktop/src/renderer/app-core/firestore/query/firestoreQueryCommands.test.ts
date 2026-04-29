import type { FirestoreQuery, FirestoreQueryDraft } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  firestoreQueryCompletionActivity,
  loadFirestoreSubcollectionsCommand,
  loadMoreFirestoreQueryCommand,
  openFirestoreDocumentInNewTabCommand,
  refreshFirestoreQueryCommand,
  runFirestoreQueryCommand,
} from './firestoreQueryCommands.ts';
import { createInitialFirestoreQueryRuntimeState } from './firestoreQueryState.ts';

describe('firestore query commands', () => {
  it('submits a query and returns a tab interaction intent', () => {
    const result = runFirestoreQueryCommand(createInitialFirestoreQueryRuntimeState(), {
      activeDraft: draft('orders'),
      clearSelection: true,
      query: query('orders'),
      selectedTreeItemId: 'collection:emu:orders',
      tab,
    });

    expect(result.path).toBe('orders');
    expect(result.interaction).toEqual({
      activeTabId: tab.id,
      path: 'orders',
      selectedTreeItemId: 'collection:emu:orders',
    });
    expect(result.state.queryRequests[tab.id]).toMatchObject({ runId: 1 });
  });

  it('returns no-op results when no Firestore query tab is active', () => {
    const state = createInitialFirestoreQueryRuntimeState();
    const result = runFirestoreQueryCommand(state, {
      activeDraft: draft('orders'),
      clearSelection: true,
      query: query('orders'),
      selectedTreeItemId: null,
      tab: undefined,
    });

    expect(result).toEqual({ interaction: null, path: null, state });
  });

  it('can submit invisible scheduler queries without an open tab', () => {
    const result = runFirestoreQueryCommand(createInitialFirestoreQueryRuntimeState(), {
      activeDraft: draft('orders'),
      clearSelection: false,
      commandOptions: {
        serializationKey: 'nightly-orders',
        source: 'scheduler',
        visible: false,
      },
      query: query('orders'),
      selectedTreeItemId: null,
      tab: undefined,
    });

    expect(result.interaction).toBeNull();
    expect(result.path).toBe('orders');
    expect(result.state.queryRequests['nightly-orders']).toMatchObject({
      query: { path: 'orders' },
      runId: 1,
    });
  });

  it('submits refreshes without clearing selection and stores pages to reload', () => {
    const result = refreshFirestoreQueryCommand(createInitialFirestoreQueryRuntimeState(), {
      activeDraft: draft('orders'),
      clearSelection: false,
      pagesToReload: 2,
      query: query('orders'),
      selectedTreeItemId: null,
      tab,
    });

    expect(result.path).toBe('orders');
    expect(result.state.pendingPageReloads[tab.id]).toBe(2);
  });

  it('returns a load more intent only for collection queries', () => {
    const collectionResult = loadMoreFirestoreQueryCommand(
      createInitialFirestoreQueryRuntimeState(),
      {
        isDocumentQuery: false,
      },
    );
    expect(collectionResult.shouldFetchNextPage).toBe(true);
    expect(collectionResult.state.isFetchingMore).toBe(true);

    const documentState = createInitialFirestoreQueryRuntimeState();
    expect(loadMoreFirestoreQueryCommand(documentState, { isDocumentQuery: true })).toEqual({
      shouldFetchNextPage: false,
      state: documentState,
    });
  });

  it('merges loaded subcollections and returns document open intents', () => {
    const state = loadFirestoreSubcollectionsCommand(
      createInitialFirestoreQueryRuntimeState({
        drafts: {},
      }),
      {
        documentPath: 'orders/ord_1',
        subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
      },
    );
    expect(state.pages).toEqual([]);

    const withPage = loadFirestoreSubcollectionsCommand(
      {
        ...createInitialFirestoreQueryRuntimeState(),
        pages: [{
          items: [{ data: {}, hasSubcollections: true, id: 'ord_1', path: 'orders/ord_1' }],
        }],
      },
      {
        documentPath: 'orders/ord_1',
        subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
      },
    );
    expect(withPage.pages[0]?.items[0]?.subcollections).toEqual([{
      id: 'events',
      path: 'orders/ord_1/events',
    }]);
    expect(openFirestoreDocumentInNewTabCommand('emu', 'orders/ord_1')).toEqual({
      connectionId: 'emu',
      path: 'orders/ord_1',
    });
  });

  it('builds query completion activity for collection and document reads', () => {
    expect(firestoreQueryCompletionActivity({
      commandOptions: { source: 'scheduler', visible: false },
      connectionId: 'emu',
      draft: draft('orders'),
      errorMessage: null,
      loadedPages: 2,
      resultCount: 5,
    })).toMatchObject({
      action: 'Run query',
      metadata: {
        command: expect.objectContaining({ source: 'scheduler', visible: false }),
        isDocument: false,
        loadedPages: 2,
        resultCount: 5,
      },
      status: 'success',
      target: { path: 'orders', type: 'firestore-query' },
    });

    expect(firestoreQueryCompletionActivity({
      connectionId: 'emu',
      draft: draft('orders/ord_1'),
      errorMessage: 'missing',
      loadedPages: 0,
      resultCount: 0,
    })).toMatchObject({
      action: 'Read document',
      error: { message: 'missing' },
      metadata: { isDocument: true },
      status: 'failure',
      target: { path: 'orders/ord_1', type: 'firestore-document' },
    });
  });
});

const tab = {
  connectionId: 'emu',
  history: ['orders'],
  historyIndex: 0,
  id: 'tab-1',
  inspectorWidth: 360,
  kind: 'firestore-query',
  title: 'orders',
};

function query(path: string): FirestoreQuery {
  return { connectionId: 'emu', filters: [], path };
}

function draft(path: string): FirestoreQueryDraft {
  return {
    filterField: '',
    filterOp: '==',
    filterValue: '',
    filters: [],
    limit: 25,
    path,
    sortDirection: 'asc',
    sortField: '',
  };
}

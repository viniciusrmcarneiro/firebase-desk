import type { FirestoreDocumentResult, ProjectSummary } from '@firebase-desk/repo-contracts';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectionActions, selectionStore } from '../stores/selectionStore.ts';
import { tabActions, type WorkspaceTab } from '../stores/tabsStore.ts';
import { DEFAULT_FIRESTORE_DRAFT } from '../workspaceModel.ts';
import { useFirestoreTabState } from './useFirestoreTabState.ts';
import { useGetDocument, useRunQuery } from './useRepositoriesData.ts';

vi.mock('./useRepositoriesData.ts', () => ({
  useGetDocument: vi.fn(),
  useRunQuery: vi.fn(),
}));

const project: ProjectSummary = {
  id: 'emu',
  name: 'Local Emulator',
  projectId: 'demo-local',
  target: 'emulator',
  emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
  hasCredential: false,
  credentialEncrypted: null,
  createdAt: '2026-04-27T00:00:00.000Z',
};

const tab: WorkspaceTab = {
  id: 'tab-firestore-query-1',
  kind: 'firestore-query',
  title: 'orders',
  connectionId: 'emu',
  history: ['orders'],
  historyIndex: 0,
  inspectorWidth: 360,
};

const rows: ReadonlyArray<FirestoreDocumentResult> = [
  { id: 'ord_1024', path: 'orders/ord_1024', data: { status: 'paid' }, hasSubcollections: false },
];

describe('useFirestoreTabState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    selectionActions.reset();
    vi.mocked(useRunQuery).mockReturnValue(runQueryResult({ items: rows }));
    vi.mocked(useGetDocument).mockReturnValue(documentResult(null));
  });

  it('creates active drafts from tab history and updates drafts by active tab', () => {
    const { result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );

    expect(result.current.activeDraft.path).toBe('orders');

    act(() => result.current.setDraft({ ...DEFAULT_FIRESTORE_DRAFT, path: 'customers' }));

    expect(result.current.activeDraft.path).toBe('customers');
    expect(result.current.drafts[tab.id]?.path).toBe('customers');
  });

  it('submits query requests and records tab interaction', () => {
    const pushHistory = vi.spyOn(tabActions, 'pushHistory').mockImplementation(() => {});
    const recordInteraction = vi.spyOn(tabActions, 'recordInteraction').mockImplementation(
      () => {},
    );
    const runQueryHook = vi.mocked(useRunQuery);
    const { result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );

    let path: string | null = null;
    act(() => {
      path = result.current.runQuery();
    });

    expect(path).toBe('orders');
    expect(runQueryHook).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: 'emu', path: 'orders' }),
      25,
      1,
      true,
      tab.id,
    );
    expect(pushHistory).toHaveBeenCalledWith(tab.id, 'orders');
    expect(recordInteraction).toHaveBeenCalledWith({
      activeTabId: tab.id,
      path: 'orders',
      selectedTreeItemId: 'collection:emu:orders',
    });
  });

  it('increments query run IDs so repeated runs do not reuse cached pages', () => {
    const runQueryHook = vi.mocked(useRunQuery);
    const { result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );

    act(() => {
      result.current.runQuery();
    });
    act(() => {
      result.current.runQuery();
    });

    expect(runQueryHook).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: 'emu', path: 'orders' }),
      25,
      2,
      true,
      tab.id,
    );
  });

  it('uses query run IDs for document path loads too', () => {
    const getDocumentHook = vi.mocked(useGetDocument);
    const { result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );

    act(() => result.current.setDraft({ ...DEFAULT_FIRESTORE_DRAFT, path: 'orders/ord_1024' }));
    act(() => {
      result.current.runQuery();
    });

    expect(getDocumentHook).toHaveBeenLastCalledWith('emu', 'orders/ord_1024', 1, tab.id);
  });

  it('keeps selected document scoped to current query rows', () => {
    tabActions.restore({
      activeTabId: tab.id,
      interactionHistory: [],
      interactionHistoryIndex: 0,
      tabs: [tab],
    });
    const { result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );

    act(() => result.current.selectDocument(tab.id, 'orders/ord_1024'));

    expect(selectionStore.state.firestoreDocumentPath).toBe('orders/ord_1024');
    expect(result.current.selectedDocument?.id).toBe('ord_1024');
    expect(result.current.selectedDocumentPath).toBe('orders/ord_1024');

    act(() => result.current.selectDocument(tab.id, 'orders/missing'));

    expect(result.current.selectedDocument).toBeNull();
    expect(result.current.selectedDocumentPath).toBeNull();
  });

  it('refreshes from page one, reloads loaded page count, and preserves selection', () => {
    const fetchNextPage = vi.fn();
    let queryResult = runQueryResult({
      pages: [{ items: rows }, { items: rows }],
      hasNextPage: true,
    });
    vi.mocked(useRunQuery).mockImplementation(() => queryResult);
    tabActions.restore({
      activeTabId: tab.id,
      interactionHistory: [],
      interactionHistoryIndex: 0,
      tabs: [tab],
    });
    const { rerender, result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );
    act(() => result.current.selectDocument(tab.id, 'orders/ord_1024'));

    act(() => {
      expect(result.current.refreshQuery()).toBe('orders');
      queryResult = runQueryResult({
        fetchNextPage,
        hasNextPage: true,
        pages: [{ items: rows }],
      });
    });
    rerender();

    expect(result.current.selectedDocumentPath).toBe('orders/ord_1024');
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('records multi-page refresh activity once after all requested pages load', async () => {
    const fetchNextPage = vi.fn();
    const onQueryActivity = vi.fn();
    let queryResult = runQueryResult({
      pages: [{ items: rows }, { items: rows }],
      hasNextPage: true,
    });
    vi.mocked(useRunQuery).mockImplementation(() => queryResult);
    const { rerender, result } = renderHook(() =>
      useFirestoreTabState({
        activeProject: project,
        activeTab: tab,
        onQueryActivity,
        selectedTreeItemId: 'collection:emu:orders',
      })
    );

    act(() => {
      result.current.runQuery();
    });
    await waitFor(() => expect(onQueryActivity).toHaveBeenCalledTimes(1));
    onQueryActivity.mockClear();

    act(() => {
      expect(result.current.refreshQuery()).toBe('orders');
      queryResult = runQueryResult({
        fetchNextPage,
        hasNextPage: true,
        pages: [{ items: rows }],
      });
    });
    rerender();

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(onQueryActivity).not.toHaveBeenCalled();

    queryResult = runQueryResult({
      hasNextPage: false,
      pages: [{ items: rows }, { items: rows }],
    });
    rerender();

    await waitFor(() => expect(onQueryActivity).toHaveBeenCalledTimes(1));
    expect(onQueryActivity).toHaveBeenLastCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        loadedPages: 2,
        resultCount: 2,
      }),
    }));
  });
});

function runQueryResult(
  {
    fetchNextPage = vi.fn(),
    hasNextPage = false,
    isFetchingNextPage = false,
    items,
    pages,
  }: {
    readonly fetchNextPage?: () => void;
    readonly hasNextPage?: boolean;
    readonly isFetchingNextPage?: boolean;
    readonly items?: ReadonlyArray<FirestoreDocumentResult>;
    readonly pages?: ReadonlyArray<{ readonly items: ReadonlyArray<FirestoreDocumentResult>; }>;
  },
) {
  return {
    data: { pages: pages ?? [{ items: items ?? [] }] },
    fetchNextPage,
    hasNextPage,
    isFetching: false,
    isFetchingNextPage,
    isLoading: false,
  } as unknown as ReturnType<typeof useRunQuery>;
}

function documentResult(data: FirestoreDocumentResult | null) {
  return {
    data,
    isFetching: false,
    isLoading: false,
  } as unknown as ReturnType<typeof useGetDocument>;
}

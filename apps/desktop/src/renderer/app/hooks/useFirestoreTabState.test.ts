import type { FirestoreDocumentResult, ProjectSummary } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
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

    expect(getDocumentHook).toHaveBeenLastCalledWith('emu', 'orders/ord_1024', 1);
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
});

function runQueryResult(page: { readonly items: ReadonlyArray<FirestoreDocumentResult>; }) {
  return {
    data: { pages: [page] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetching: false,
    isFetchingNextPage: false,
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

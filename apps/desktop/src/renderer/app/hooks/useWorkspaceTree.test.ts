import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepositories } from '../RepositoryProvider.tsx';
import { selectionActions, selectionStore } from '../stores/selectionStore.ts';
import { tabActions, type WorkspaceTab } from '../stores/tabsStore.ts';
import { projectNodeId } from '../workspaceModel.ts';
import { useWorkspaceTree } from './useWorkspaceTree.ts';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('../RepositoryProvider.tsx', () => ({
  useRepositories: vi.fn(),
}));

const projects: ReadonlyArray<ProjectSummary> = [
  {
    id: 'emu',
    name: 'Local Emulator',
    projectId: 'demo-local',
    target: 'emulator',
    emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    hasCredential: false,
    credentialEncrypted: null,
    createdAt: '2026-04-27T00:00:00.000Z',
  },
];

const activeTab: WorkspaceTab = {
  id: 'tab-firestore-1',
  kind: 'firestore-query',
  title: 'orders',
  connectionId: 'emu',
  history: ['orders'],
  historyIndex: 0,
  inspectorWidth: 360,
};

describe('useWorkspaceTree', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    selectionActions.reset();
    vi.mocked(useQueryClient).mockReturnValue({
      fetchQuery: vi.fn().mockResolvedValue([{ id: 'orders', path: 'orders' }]),
      invalidateQueries: vi.fn(),
    } as unknown as ReturnType<typeof useQueryClient>);
    vi.mocked(useRepositories).mockReturnValue({
      firestore: {},
    } as unknown as ReturnType<typeof useRepositories>);
  });

  it('selects collection tree items and records tab interaction', () => {
    const openFirestoreTab = vi.fn(() => 'tab-firestore-2');
    const openToolTab = vi.fn(() => 'tab-tool');
    const recordInteraction = vi.spyOn(tabActions, 'recordInteraction').mockImplementation(
      () => {},
    );
    const setLastAction = vi.fn();
    const { result } = renderHook(() =>
      useWorkspaceTree({
        activeTab,
        openFirestoreTab,
        openToolTab,
        projects,
        selectedTreeItemId: null,
        setLastAction,
      })
    );

    act(() => result.current.handleSelectItem('collection:emu:orders'));

    expect(selectionStore.state.treeItemId).toBe('collection:emu:orders');
    expect(openFirestoreTab).toHaveBeenCalledWith('emu', 'orders');
    expect(recordInteraction).toHaveBeenCalledWith({
      activeTabId: 'tab-firestore-2',
      path: 'orders',
      selectedTreeItemId: 'collection:emu:orders',
    });
    expect(setLastAction).toHaveBeenCalledWith('Opened orders');
  });

  it('loads project tools and firestore roots through mocked query client', async () => {
    const fetchQuery = vi.fn().mockResolvedValue([{ id: 'orders', path: 'orders' }]);
    vi.mocked(useQueryClient).mockReturnValue({
      fetchQuery,
      invalidateQueries: vi.fn(),
    } as unknown as ReturnType<typeof useQueryClient>);
    const { result } = renderHook(() =>
      useWorkspaceTree({
        activeTab,
        openFirestoreTab: vi.fn(),
        openToolTab: vi.fn(),
        projects,
        selectedTreeItemId: null,
        setLastAction: vi.fn(),
      })
    );

    act(() => result.current.handleToggleItem(projectNodeId('emu')));
    await waitFor(() =>
      expect(result.current.treeItems.some((item) => item.id === 'firestore:emu')).toBe(true)
    );

    act(() => result.current.handleToggleItem('firestore:emu'));
    await waitFor(() =>
      expect(result.current.treeItems.some((item) => item.id === 'collection:emu:orders')).toBe(
        true,
      )
    );

    expect(fetchQuery).toHaveBeenCalledWith({
      queryKey: ['firestore', 'emu', 'rootCollections'],
      queryFn: expect.any(Function),
    });
  });

  it('surfaces firestore root load errors and retries them', async () => {
    const fetchQuery = vi.fn()
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce([{ id: 'orders', path: 'orders' }]);
    const invalidateQueries = vi.fn();
    vi.mocked(useQueryClient).mockReturnValue({
      fetchQuery,
      invalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    const setLastAction = vi.fn();
    const { result } = renderHook(() =>
      useWorkspaceTree({
        activeTab,
        openFirestoreTab: vi.fn(),
        openToolTab: vi.fn(),
        projects,
        selectedTreeItemId: null,
        setLastAction,
      })
    );

    act(() => result.current.handleToggleItem(projectNodeId('emu')));
    await waitFor(() =>
      expect(result.current.treeItems.some((item) => item.id === 'firestore:emu')).toBe(true)
    );

    act(() => result.current.handleToggleItem('firestore:emu'));
    await waitFor(() =>
      expect(result.current.treeItems).toContainEqual(expect.objectContaining({
        id: 'status:firestore:emu',
        label: 'Load failed',
        secondary: expect.stringContaining('permission denied'),
        status: 'error',
      }))
    );

    act(() => result.current.handleRefreshItem('firestore:emu'));
    await waitFor(() =>
      expect(result.current.treeItems.some((item) => item.id === 'collection:emu:orders')).toBe(
        true,
      )
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['firestore', 'emu', 'rootCollections'],
    });
    expect(setLastAction).toHaveBeenCalledWith('Retried Local Emulator');
    expect(setLastAction).toHaveBeenCalledWith(
      expect.stringContaining('Firestore load failed: permission denied'),
    );
  });
});

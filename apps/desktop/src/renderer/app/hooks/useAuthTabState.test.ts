// @vitest-environment jsdom

import type { AuthUser, ProjectSummary } from '@firebase-desk/repo-contracts';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTab } from '../stores/tabsStore.ts';
import { useAuthTabState } from './useAuthTabState.ts';
import { useSearchUsers, useSetCustomClaims, useUsers } from './useRepositoriesData.ts';

vi.mock('./useRepositoriesData.ts', () => ({
  useSearchUsers: vi.fn(),
  useSetCustomClaims: vi.fn(),
  useUsers: vi.fn(),
}));

const tab: WorkspaceTab = {
  id: 'tab-auth-1',
  kind: 'auth-users',
  title: 'Auth',
  connectionId: 'emu',
  history: ['auth/users'],
  historyIndex: 0,
  inspectorWidth: 360,
};

const ada: AuthUser = {
  uid: 'u_ada',
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  provider: 'password',
  disabled: false,
  customClaims: {},
};

const grace: AuthUser = {
  uid: 'u_grace',
  email: 'grace@example.com',
  displayName: 'Grace Hopper',
  provider: 'google.com',
  disabled: false,
  customClaims: {},
};

describe('useAuthTabState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUsers).mockReturnValue(usersResult([grace]));
    vi.mocked(useSearchUsers).mockImplementation((_projectId, query) =>
      searchResult(query ? [ada] : undefined)
    );
    vi.mocked(useSetCustomClaims).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useSetCustomClaims>);
  });

  it('uses paged users until a search filter is present', () => {
    const { result } = renderHook(() =>
      useAuthTabState({
        activeProject: project,
        activeTab: tab,
        recordActivity: vi.fn(),
        selectedUserId: 'u_grace',
      })
    );

    expect(result.current.users).toEqual([grace]);
    expect(result.current.selectedUser).toEqual(grace);

    act(() => result.current.setAuthFilter('ada'));

    expect(result.current.users).toEqual([ada]);
    expect(result.current.selectedUser).toBeNull();
    expect(useSearchUsers).toHaveBeenLastCalledWith('emu', 'ada', true, 'tab-auth-1', 0);
  });

  it('loads more only when not searching and can clear the filter', () => {
    const fetchNextPage = vi.fn();
    vi.mocked(useUsers).mockReturnValue(usersResult([grace], fetchNextPage));
    const { result } = renderHook(() =>
      useAuthTabState({
        activeProject: project,
        activeTab: tab,
        initialAuthFilter: 'ada',
        recordActivity: vi.fn(),
        selectedUserId: null,
      })
    );

    act(() => result.current.loadMore());
    expect(fetchNextPage).not.toHaveBeenCalled();

    act(() => result.current.clear());
    act(() => result.current.loadMore());

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('refreshes the current auth query from the first page', () => {
    const { result } = renderHook(() =>
      useAuthTabState({
        activeProject: project,
        activeTab: tab,
        recordActivity: vi.fn(),
        selectedUserId: null,
      })
    );

    act(() => result.current.refetch());

    expect(useUsers).toHaveBeenLastCalledWith('emu', 25, 'tab-auth-1', 1);
  });

  it('saves claims and updates the selected user', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      ...grace,
      customClaims: { role: 'owner' },
    });
    vi.mocked(useSetCustomClaims).mockReturnValue({
      mutateAsync,
    } as unknown as ReturnType<typeof useSetCustomClaims>);
    const { result } = renderHook(() =>
      useAuthTabState({
        activeProject: project,
        activeTab: tab,
        recordActivity: vi.fn(),
        selectedUserId: 'u_grace',
      })
    );

    await act(async () => {
      await result.current.saveCustomClaims('u_grace', { role: 'owner' });
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      claims: { role: 'owner' },
      projectId: 'emu',
      uid: 'u_grace',
    });
    expect(result.current.selectedUser?.customClaims).toEqual({ role: 'owner' });
  });

  it('records load failures from the auth controller once per error', async () => {
    const recordActivity = vi.fn();
    vi.mocked(useUsers).mockReturnValue({
      ...usersResult([]),
      error: new Error('auth down'),
    } as unknown as ReturnType<typeof useUsers>);

    const { rerender } = renderHook(() =>
      useAuthTabState({
        activeProject: project,
        activeTab: tab,
        recordActivity,
        selectedUserId: null,
      })
    );

    await waitFor(() => expect(recordActivity).toHaveBeenCalledTimes(1));
    rerender();

    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'Load users',
      error: { message: 'auth down' },
      status: 'failure',
    }));
  });
});

const project: ProjectSummary = {
  id: 'emu',
  name: 'Local Emulator',
  projectId: 'emu',
  target: 'emulator',
  emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
  hasCredential: false,
  credentialEncrypted: null,
  createdAt: '2026-04-27T00:00:00.000Z',
};

function usersResult(users: ReadonlyArray<AuthUser>, fetchNextPage = vi.fn()) {
  return {
    data: { pages: [{ items: users }] },
    fetchNextPage,
    hasNextPage: true,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useUsers>;
}

function searchResult(users: ReadonlyArray<AuthUser> | undefined) {
  return {
    data: users,
    isLoading: false,
  } as unknown as ReturnType<typeof useSearchUsers>;
}

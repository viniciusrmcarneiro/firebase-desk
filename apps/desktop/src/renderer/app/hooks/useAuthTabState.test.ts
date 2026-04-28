import type { AuthUser } from '@firebase-desk/repo-contracts';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTab } from '../stores/tabsStore.ts';
import { useAuthTabState } from './useAuthTabState.ts';
import { useSearchUsers, useUsers } from './useRepositoriesData.ts';

vi.mock('./useRepositoriesData.ts', () => ({
  useSearchUsers: vi.fn(),
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
  });

  it('uses paged users until a search filter is present', () => {
    const { result } = renderHook(() =>
      useAuthTabState({
        activeTab: tab,
        runtimeProjectId: 'demo-local',
        selectedUserId: 'u_grace',
      })
    );

    expect(result.current.users).toEqual([grace]);
    expect(result.current.selectedUser).toEqual(grace);

    act(() => result.current.setAuthFilter('ada'));

    expect(result.current.users).toEqual([ada]);
    expect(result.current.selectedUser).toBeNull();
    expect(useSearchUsers).toHaveBeenLastCalledWith('demo-local', 'ada', true);
  });

  it('loads more only when not searching and can clear the filter', () => {
    const fetchNextPage = vi.fn();
    vi.mocked(useUsers).mockReturnValue(usersResult([grace], fetchNextPage));
    const { result } = renderHook(() =>
      useAuthTabState({
        activeTab: tab,
        initialAuthFilter: 'ada',
        runtimeProjectId: 'demo-local',
        selectedUserId: null,
      })
    );

    act(() => result.current.loadMore());
    expect(fetchNextPage).not.toHaveBeenCalled();

    act(() => result.current.clear());
    act(() => result.current.loadMore());

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

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

import type { AuthUser } from '@firebase-desk/repo-contracts';
import { useState } from 'react';
import type { WorkspaceTab } from '../stores/tabsStore.ts';
import { useSearchUsers, useUsers } from './useRepositoriesData.ts';

interface UseAuthTabStateInput {
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialAuthFilter?: string | undefined;
  readonly runtimeProjectId: string | null;
  readonly selectedUserId: string | null;
}

export interface AuthTabState {
  readonly authFilter: string;
  readonly errorMessage: string | null;
  readonly selectedUser: AuthUser | null;
  readonly users: ReadonlyArray<AuthUser>;
  readonly usersHasMore: boolean;
  readonly usersIsFetchingMore: boolean;
  readonly usersIsLoading: boolean;
  readonly clear: () => void;
  readonly loadMore: () => void;
  readonly refetch: () => void;
  readonly setAuthFilter: (value: string) => void;
}

export function useAuthTabState(
  { activeTab, initialAuthFilter = '', runtimeProjectId, selectedUserId }: UseAuthTabStateInput,
): AuthTabState {
  const [authFilter, setAuthFilter] = useState(initialAuthFilter);
  const usersQuery = useUsers(activeTab?.kind === 'auth-users' ? runtimeProjectId : null, 25);
  const authSearchText = authFilter.trim();
  const usersSearchQuery = useSearchUsers(
    activeTab?.kind === 'auth-users' ? runtimeProjectId : null,
    authSearchText,
    Boolean(authSearchText),
  );
  const users = authSearchText
    ? usersSearchQuery.data ?? []
    : usersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedUser = users.find((user) => user.uid === selectedUserId) ?? null;
  const errorMessage = authSearchText
    ? messageFromError(usersSearchQuery.error)
    : messageFromError(usersQuery.error);

  function loadMore() {
    if (!authSearchText) void usersQuery.fetchNextPage();
  }

  function refetch() {
    void usersQuery.refetch();
  }

  return {
    authFilter,
    errorMessage,
    selectedUser,
    users,
    usersHasMore: !authSearchText && Boolean(usersQuery.hasNextPage),
    usersIsFetchingMore: !authSearchText && usersQuery.isFetchingNextPage,
    usersIsLoading: authSearchText ? usersSearchQuery.isLoading : usersQuery.isLoading,
    clear: () => setAuthFilter(''),
    loadMore,
    refetch,
    setAuthFilter,
  };
}

function messageFromError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Could not load Authentication data.';
}

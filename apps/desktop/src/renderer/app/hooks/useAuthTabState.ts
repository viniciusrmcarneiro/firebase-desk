import type { AuthUser } from '@firebase-desk/repo-contracts';
import { useState } from 'react';
import type { WorkspaceTab } from '../stores/tabsStore.ts';
import { useSearchUsers, useSetCustomClaims, useUsers } from './useRepositoriesData.ts';

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
  readonly saveCustomClaims: (uid: string, claims: Record<string, unknown>) => Promise<void>;
  readonly setAuthFilter: (value: string) => void;
}

export function useAuthTabState(
  { activeTab, initialAuthFilter = '', runtimeProjectId, selectedUserId }: UseAuthTabStateInput,
): AuthTabState {
  const [authFilter, setAuthFilter] = useState(initialAuthFilter);
  const [refreshRunId, setRefreshRunId] = useState(0);
  const [updatedUsers, setUpdatedUsers] = useState<ReadonlyMap<string, AuthUser>>(
    () => new Map(),
  );
  const activeProjectId = activeTab?.kind === 'auth-users' ? runtimeProjectId : null;
  const scopeId = activeTab?.kind === 'auth-users' ? activeTab.id : 'inactive';
  const usersQuery = useUsers(activeProjectId, 25, scopeId, refreshRunId);
  const authSearchText = authFilter.trim();
  const usersSearchQuery = useSearchUsers(
    activeProjectId,
    authSearchText,
    Boolean(authSearchText),
    scopeId,
    refreshRunId,
  );
  const loadedUsers = authSearchText
    ? usersSearchQuery.data ?? []
    : usersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const users = mergeUpdatedUsers(loadedUsers, activeProjectId, updatedUsers);
  const selectedUser = selectedUserId
    ? users.find((user) => user.uid === selectedUserId)
      ?? userFromUpdates(activeProjectId, selectedUserId, updatedUsers)
      ?? null
    : null;
  const errorMessage = authSearchText
    ? messageFromError(usersSearchQuery.error)
    : messageFromError(usersQuery.error);
  const setCustomClaims = useSetCustomClaims();

  function loadMore() {
    if (!authSearchText) void usersQuery.fetchNextPage();
  }

  function refetch() {
    setUpdatedUsers((current) => removeProjectUpdates(current, activeProjectId));
    setRefreshRunId((current) => current + 1);
  }

  async function saveCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
    if (!activeProjectId) throw new Error('No Authentication project selected.');
    const updated = await setCustomClaims.mutateAsync({ claims, projectId: activeProjectId, uid });
    setUpdatedUsers((current) => {
      const next = new Map(current);
      next.set(userKey(activeProjectId, updated.uid), updated);
      return next;
    });
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
    saveCustomClaims,
    setAuthFilter,
  };
}

function mergeUpdatedUsers(
  users: ReadonlyArray<AuthUser>,
  projectId: string | null,
  updatedUsers: ReadonlyMap<string, AuthUser>,
): ReadonlyArray<AuthUser> {
  if (!projectId) return users;
  return users.map((user) => userFromUpdates(projectId, user.uid, updatedUsers) ?? user);
}

function userFromUpdates(
  projectId: string | null,
  uid: string,
  updatedUsers: ReadonlyMap<string, AuthUser>,
): AuthUser | undefined {
  return projectId ? updatedUsers.get(userKey(projectId, uid)) : undefined;
}

function userKey(projectId: string, uid: string): string {
  return `${projectId}:${uid}`;
}

function removeProjectUpdates(
  updatedUsers: ReadonlyMap<string, AuthUser>,
  projectId: string | null,
): ReadonlyMap<string, AuthUser> {
  if (!projectId) return updatedUsers;
  const prefix = `${projectId}:`;
  const next = new Map(updatedUsers);
  for (const key of next.keys()) {
    if (key.startsWith(prefix)) next.delete(key);
  }
  return next;
}

function messageFromError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Could not load Authentication data.';
}

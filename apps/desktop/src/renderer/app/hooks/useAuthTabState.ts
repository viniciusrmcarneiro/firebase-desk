import type { AuthUser, ProjectSummary } from '@firebase-desk/repo-contracts';
import { useEffect, useMemo } from 'react';
import {
  type AuthCommandEnvironment,
  type AuthStore,
  authUsersFailureActivityCommand,
  clearAuthFilterCommand,
  createAuthStore,
  loadMoreAuthUsersCommand,
  refreshAuthUsersCommand,
  saveAuthCustomClaimsCommand,
  selectAuthUsersModel,
  setAuthFilterCommand,
} from '../../app-core/auth/index.ts';
import { useAppCoreSelector } from '../../app-core/shared/index.ts';
import type { WorkspaceTab } from '../stores/tabsStore.ts';
import { useSearchUsers, useSetCustomClaims, useUsers } from './useRepositoriesData.ts';

interface UseAuthTabStateInput {
  readonly activeProject: ProjectSummary | null;
  readonly activeTab: WorkspaceTab | undefined;
  readonly initialAuthFilter?: string | undefined;
  readonly recordActivity: AuthCommandEnvironment['recordActivity'];
  readonly selectedUserId: string | null;
  readonly store?: AuthStore | undefined;
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
  {
    activeProject,
    activeTab,
    initialAuthFilter = '',
    recordActivity,
    selectedUserId,
    store: inputStore,
  }: UseAuthTabStateInput,
): AuthTabState {
  const store = useMemo(
    () => inputStore ?? createAuthStore({ filter: initialAuthFilter }),
    [inputStore],
  );
  const state = useAppCoreSelector(store, (snapshot) => snapshot);
  const activeProjectId = activeTab?.kind === 'auth-users' ? activeProject?.id ?? null : null;
  const scopeId = activeTab?.kind === 'auth-users' ? activeTab.id : 'inactive';
  const usersQuery = useUsers(activeProjectId, 25, scopeId, state.refreshRunId);
  const authSearchText = state.filter.trim();
  const usersSearchQuery = useSearchUsers(
    activeProjectId,
    authSearchText,
    Boolean(authSearchText),
    scopeId,
    state.refreshRunId,
  );
  const listUsers = usersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const searchUsers = usersSearchQuery.data ?? [];
  const model = selectAuthUsersModel(state, {
    listError: usersQuery.error,
    listHasMore: Boolean(usersQuery.hasNextPage),
    listIsFetchingMore: usersQuery.isFetchingNextPage,
    listIsLoading: usersQuery.isLoading,
    listUsers,
    projectId: activeProjectId,
    searchError: usersSearchQuery.error,
    searchIsLoading: usersSearchQuery.isLoading,
    searchUsers,
    selectedUserId,
  });
  const setCustomClaims = useSetCustomClaims();
  const env: AuthCommandEnvironment = {
    now: Date.now,
    recordActivity,
    setCustomClaims: (projectId, uid, claims) =>
      setCustomClaims.mutateAsync({ claims, projectId, uid }),
  };

  useEffect(() => {
    const result = authUsersFailureActivityCommand(store.get(), {
      errorMessage: model.errorMessage,
      filter: state.filter,
      tab: activeTab,
    });
    if (result.state !== store.get()) store.set(result.state);
    if (result.activity) void recordActivity(result.activity);
  }, [activeTab, model.errorMessage, recordActivity, state.filter, store]);

  function loadMore() {
    loadMoreAuthUsersCommand(env, {
      connectionId: activeProject?.id,
      fetchNextPage: () => void usersQuery.fetchNextPage(),
      filter: state.filter,
    });
  }

  function refetch() {
    refreshAuthUsersCommand(store, env, {
      connectionId: activeProject?.id,
      filter: state.filter,
      projectId: activeProjectId,
    });
  }

  async function saveCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
    await saveAuthCustomClaimsCommand(store, env, {
      claims,
      project: activeProject
        ? { connectionId: activeProject.id, projectId: activeProject.projectId }
        : null,
      uid,
    });
  }

  return {
    authFilter: state.filter,
    errorMessage: model.errorMessage,
    selectedUser: model.selectedUser,
    users: model.users,
    usersHasMore: model.usersHasMore,
    usersIsFetchingMore: model.usersIsFetchingMore,
    usersIsLoading: model.usersIsLoading,
    clear: () => store.update(clearAuthFilterCommand),
    loadMore,
    refetch,
    saveCustomClaims,
    setAuthFilter: (value) => store.update((current) => setAuthFilterCommand(current, value)),
  };
}

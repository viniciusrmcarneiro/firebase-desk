import type { AuthUser, ProjectSummary } from '@firebase-desk/repo-contracts';
import { useEffect, useMemo } from 'react';
import {
  type AuthCommandEnvironment,
  clearAuthFilterCommand,
  loadAuthUsersCommand,
  loadMoreAuthUsersCommand,
  refreshAuthUsersCommand,
  saveAuthCustomClaimsCommand,
  setAuthFilterCommand,
} from '../../app-core/auth/authCommands.ts';
import { selectAuthUsersModel } from '../../app-core/auth/authSelectors.ts';
import { type AuthStore, createAuthStore } from '../../app-core/auth/authStore.ts';
import { useAppCoreSelector } from '../../app-core/shared/reactStore.ts';
import { useRepositories } from '../RepositoryProvider.tsx';
import type { WorkspaceTab } from '../stores/tabsStore.ts';

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
  readonly isTabLoading: (tabId: string) => boolean;
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
    [initialAuthFilter, inputStore],
  );
  const state = useAppCoreSelector(store, (snapshot) => snapshot);
  const activeProjectId = activeTab?.kind === 'auth-users' ? activeProject?.id ?? null : null;
  const repositories = useRepositories();
  const model = selectAuthUsersModel(state, {
    listError: state.errorMessage,
    listHasMore: state.usersHasMore,
    listIsFetchingMore: state.usersIsFetchingMore,
    listIsLoading: state.usersIsLoading,
    listUsers: activeProjectId ? state.users : [],
    projectId: activeProjectId,
    searchError: state.errorMessage,
    searchIsLoading: state.usersIsLoading,
    searchUsers: activeProjectId ? state.searchUsers : [],
    selectedUserId,
  });
  const env: AuthCommandEnvironment = {
    listUsers: (projectId, request) => repositories.auth.listUsers(projectId, request),
    now: Date.now,
    recordActivity,
    searchUsers: (projectId, query) => repositories.auth.searchUsers(projectId, query),
    setCustomClaims: (projectId, uid, claims) =>
      repositories.auth.setCustomClaims(projectId, uid, claims),
  };

  useEffect(() => {
    void loadAuthUsersCommand(store, env, {
      project: activeProject
        ? { connectionId: activeProject.id, projectId: activeProject.projectId }
        : null,
      tab: activeTab,
    });
  }, [
    activeProject?.id,
    activeProject?.projectId,
    activeTab,
    repositories.auth,
    recordActivity,
    state.filter,
    store,
  ]);

  function loadMore() {
    void loadMoreAuthUsersCommand(store, env, {
      project: activeProject
        ? { connectionId: activeProject.id, projectId: activeProject.projectId }
        : null,
    });
  }

  function refetch() {
    void refreshAuthUsersCommand(store, env, {
      project: activeProject
        ? { connectionId: activeProject.id, projectId: activeProject.projectId }
        : null,
      tab: activeTab,
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
    isTabLoading: (tabId) =>
      activeTab?.id === tabId && (state.usersIsLoading || state.usersIsFetchingMore),
    loadMore,
    refetch,
    saveCustomClaims,
    setAuthFilter: (value) => store.update((current) => setAuthFilterCommand(current, value)),
  };
}

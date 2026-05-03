import type { AuthUser, ProjectSummary } from '@firebase-desk/repo-contracts';
import { useEffect, useRef } from 'react';
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
  const activeProjectId = activeTab?.kind === 'auth-users' ? activeProject?.id ?? null : null;
  const storeCache = useRef<{
    readonly stores: Map<string, AuthStore>;
    initialAuthFilter: string;
  }>({ initialAuthFilter, stores: new Map() });
  if (storeCache.current.initialAuthFilter !== initialAuthFilter) {
    storeCache.current.initialAuthFilter = initialAuthFilter;
    storeCache.current.stores.clear();
  }
  const store = inputStore
    ?? authStoreFor(activeProjectId ?? 'inactive', storeCache.current.stores, initialAuthFilter);
  const state = useAppCoreSelector(store, (snapshot) => snapshot);
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

function authStoreFor(
  key: string,
  stores: Map<string, AuthStore>,
  initialAuthFilter: string,
): AuthStore {
  const existing = stores.get(key);
  if (existing) return existing;
  const store = createAuthStore({ filter: initialAuthFilter });
  stores.set(key, store);
  return store;
}

import type { AuthUser } from '@firebase-desk/repo-contracts';
import type { AuthRuntimeState } from './authState.ts';
import { userKey } from './authTransitions.ts';

export interface AuthUsersModelInput {
  readonly listError: unknown;
  readonly listHasMore: boolean;
  readonly listIsFetchingMore: boolean;
  readonly listIsLoading: boolean;
  readonly listUsers: ReadonlyArray<AuthUser>;
  readonly projectId: string | null;
  readonly searchError: unknown;
  readonly searchIsLoading: boolean;
  readonly searchUsers: ReadonlyArray<AuthUser>;
  readonly selectedUserId: string | null;
}

export interface AuthUsersModel {
  readonly errorMessage: string | null;
  readonly filterText: string;
  readonly selectedUser: AuthUser | null;
  readonly users: ReadonlyArray<AuthUser>;
  readonly usersHasMore: boolean;
  readonly usersIsFetchingMore: boolean;
  readonly usersIsLoading: boolean;
}

export function selectAuthUsersModel(
  state: AuthRuntimeState,
  input: AuthUsersModelInput,
): AuthUsersModel {
  const filterText = state.filter.trim();
  const users = mergeUpdatedUsers(
    filterText ? input.searchUsers : input.listUsers,
    input.projectId,
    state.updatedUsers,
  );
  return {
    errorMessage: filterText
      ? messageFromError(input.searchError)
      : messageFromError(input.listError),
    filterText,
    selectedUser: selectAuthUser(state, {
      projectId: input.projectId,
      selectedUserId: input.selectedUserId,
      users,
    }),
    users,
    usersHasMore: !filterText && input.listHasMore,
    usersIsFetchingMore: !filterText && input.listIsFetchingMore,
    usersIsLoading: filterText ? input.searchIsLoading : input.listIsLoading,
  };
}

export function selectAuthUser(
  state: AuthRuntimeState,
  input: {
    readonly projectId: string | null;
    readonly selectedUserId: string | null;
    readonly users: ReadonlyArray<AuthUser>;
  },
): AuthUser | null {
  if (!input.selectedUserId) return null;
  return input.users.find((user) => user.uid === input.selectedUserId)
    ?? userFromUpdates(input.projectId, input.selectedUserId, state.updatedUsers)
    ?? null;
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

function messageFromError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Could not load Authentication data.';
}

import type { AuthUser } from '@firebase-desk/repo-contracts';
import type { AuthRuntimeState, AuthUsersRequest } from './authState.ts';

const MAX_FAILURE_KEYS = 500;
const MAX_SUCCESS_KEYS = 500;

export function authFilterChanged(state: AuthRuntimeState, filter: string): AuthRuntimeState {
  return { ...state, filter };
}

export function authFilterCleared(state: AuthRuntimeState): AuthRuntimeState {
  return authFilterChanged(state, '');
}

export function authRefreshRequested(
  state: AuthRuntimeState,
  projectId: string | null,
): AuthRuntimeState {
  return {
    ...state,
    refreshRunId: state.refreshRunId + 1,
    updatedUsers: removeProjectUpdates(state.updatedUsers, projectId),
  };
}

export function authUsersLoadStarted(
  state: AuthRuntimeState,
  request: AuthUsersRequest,
): AuthRuntimeState {
  return {
    ...state,
    activeUsersRequest: request,
    errorMessage: null,
    refreshRunId: Math.max(state.refreshRunId, request.runId),
    usersIsFetchingMore: false,
    usersIsLoading: true,
  };
}

export function authUsersLoadSucceeded(
  state: AuthRuntimeState,
  input: {
    readonly nextCursor: AuthRuntimeState['nextCursor'];
    readonly request: AuthUsersRequest;
    readonly users: ReadonlyArray<AuthUser>;
  },
): AuthRuntimeState {
  if (!sameUsersRequest(state.activeUsersRequest, input.request)) return state;
  const loadedKey = authUsersRequestKey(input.request.projectId, input.request.filter);
  return {
    ...state,
    activeUsersRequest: null,
    errorMessage: null,
    nextCursor: input.request.filter ? null : input.nextCursor,
    searchUsers: input.request.filter ? input.users : state.searchUsers,
    users: input.request.filter ? state.users : input.users,
    usersHasMore: !input.request.filter && Boolean(input.nextCursor),
    usersIsFetchingMore: false,
    usersIsLoading: false,
    usersLoadedKey: loadedKey,
  };
}

export function authUsersLoadFailed(
  state: AuthRuntimeState,
  input: {
    readonly errorMessage: string;
    readonly request: AuthUsersRequest;
  },
): AuthRuntimeState {
  if (!sameUsersRequest(state.activeUsersRequest, input.request)) return state;
  return {
    ...state,
    activeUsersRequest: null,
    errorMessage: input.errorMessage,
    usersHasMore: false,
    usersIsFetchingMore: false,
    usersIsLoading: false,
  };
}

export function authUsersLoadMoreStarted(state: AuthRuntimeState): AuthRuntimeState {
  return { ...state, errorMessage: null, usersIsFetchingMore: true };
}

export function authUsersLoadMoreSucceeded(
  state: AuthRuntimeState,
  input: {
    readonly nextCursor: AuthRuntimeState['nextCursor'];
    readonly users: ReadonlyArray<AuthUser>;
  },
): AuthRuntimeState {
  return {
    ...state,
    errorMessage: null,
    nextCursor: input.nextCursor,
    users: [...state.users, ...input.users],
    usersHasMore: Boolean(input.nextCursor),
    usersIsFetchingMore: false,
  };
}

export function authUsersLoadMoreFailed(
  state: AuthRuntimeState,
  errorMessage: string,
): AuthRuntimeState {
  return { ...state, errorMessage, usersIsFetchingMore: false };
}

export function authCustomClaimsEditing(
  state: AuthRuntimeState,
  uid: string,
): AuthRuntimeState {
  return { ...state, customClaims: { uid, status: 'editing' } };
}

export function authCustomClaimsSaveStarted(
  state: AuthRuntimeState,
  uid: string,
): AuthRuntimeState {
  return { ...state, customClaims: { uid, status: 'saving' } };
}

export function authCustomClaimsSaveSucceeded(
  state: AuthRuntimeState,
  projectId: string,
  user: AuthUser,
): AuthRuntimeState {
  const updatedUsers = new Map(state.updatedUsers);
  updatedUsers.set(userKey(projectId, user.uid), user);
  return { ...state, customClaims: { user, status: 'saved' }, updatedUsers };
}

export function authCustomClaimsSaveFailed(
  state: AuthRuntimeState,
  uid: string,
  errorMessage: string,
): AuthRuntimeState {
  return { ...state, customClaims: { uid, errorMessage, status: 'failed' } };
}

export function authFailureLogged(
  state: AuthRuntimeState,
  key: string,
): AuthRuntimeState {
  if (state.loggedFailureKeys.includes(key)) return state;
  return {
    ...state,
    loggedFailureKeys: [...state.loggedFailureKeys, key].slice(-MAX_FAILURE_KEYS),
  };
}

export function authSuccessLogged(
  state: AuthRuntimeState,
  key: string,
): AuthRuntimeState {
  if (state.loggedSuccessKeys.includes(key)) return state;
  return {
    ...state,
    loggedSuccessKeys: [...state.loggedSuccessKeys, key].slice(-MAX_SUCCESS_KEYS),
  };
}

export function userKey(projectId: string, uid: string): string {
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

export function authUsersRequestKey(projectId: string, filter: string): string {
  return `${projectId}:${filter.trim()}`;
}

function sameUsersRequest(
  left: AuthUsersRequest | null,
  right: AuthUsersRequest,
): boolean {
  return Boolean(
    left && left.projectId === right.projectId && left.filter === right.filter
      && left.runId === right.runId,
  );
}

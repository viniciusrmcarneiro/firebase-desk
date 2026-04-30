import type { AuthUser } from '@firebase-desk/repo-contracts';
import type { AuthRuntimeState } from './authState.ts';

const MAX_FAILURE_KEYS = 500;

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

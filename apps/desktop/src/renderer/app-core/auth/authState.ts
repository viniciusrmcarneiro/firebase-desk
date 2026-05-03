import type { AuthUser, PageRequest } from '@firebase-desk/repo-contracts';

export type AuthCustomClaimsWorkflowState =
  | { readonly status: 'idle'; }
  | { readonly uid: string; readonly status: 'editing'; }
  | { readonly uid: string; readonly status: 'saving'; }
  | { readonly user: AuthUser; readonly status: 'saved'; }
  | { readonly uid: string; readonly errorMessage: string; readonly status: 'failed'; };

export interface AuthRuntimeState {
  readonly activeUsersRequest: AuthUsersRequest | null;
  readonly customClaims: AuthCustomClaimsWorkflowState;
  readonly errorMessage: string | null;
  readonly filter: string;
  readonly loggedFailureKeys: ReadonlyArray<string>;
  readonly loggedSuccessKeys: ReadonlyArray<string>;
  readonly nextCursor: PageRequest['cursor'] | null;
  readonly refreshRunId: number;
  readonly searchUsers: ReadonlyArray<AuthUser>;
  readonly updatedUsers: ReadonlyMap<string, AuthUser>;
  readonly users: ReadonlyArray<AuthUser>;
  readonly usersHasMore: boolean;
  readonly usersIsFetchingMore: boolean;
  readonly usersIsLoading: boolean;
  readonly usersLoadedKey: string | null;
}

export interface AuthUsersRequest {
  readonly filter: string;
  readonly projectId: string;
  readonly runId: number;
}

export interface CreateAuthRuntimeStateInput {
  readonly filter?: string | undefined;
}

export function createInitialAuthRuntimeState(
  input: CreateAuthRuntimeStateInput = {},
): AuthRuntimeState {
  return {
    activeUsersRequest: null,
    customClaims: { status: 'idle' },
    errorMessage: null,
    filter: input.filter ?? '',
    loggedFailureKeys: [],
    loggedSuccessKeys: [],
    nextCursor: null,
    refreshRunId: 0,
    searchUsers: [],
    updatedUsers: new Map(),
    users: [],
    usersHasMore: false,
    usersIsFetchingMore: false,
    usersIsLoading: false,
    usersLoadedKey: null,
  };
}

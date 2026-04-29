import type { AuthUser } from '@firebase-desk/repo-contracts';

export type AuthCustomClaimsWorkflowState =
  | { readonly status: 'idle'; }
  | { readonly uid: string; readonly status: 'editing'; }
  | { readonly uid: string; readonly status: 'saving'; }
  | { readonly user: AuthUser; readonly status: 'saved'; }
  | { readonly uid: string; readonly errorMessage: string; readonly status: 'failed'; };

export interface AuthRuntimeState {
  readonly customClaims: AuthCustomClaimsWorkflowState;
  readonly filter: string;
  readonly loggedFailureKeys: ReadonlyArray<string>;
  readonly refreshRunId: number;
  readonly updatedUsers: ReadonlyMap<string, AuthUser>;
}

export interface CreateAuthRuntimeStateInput {
  readonly filter?: string | undefined;
}

export function createInitialAuthRuntimeState(
  input: CreateAuthRuntimeStateInput = {},
): AuthRuntimeState {
  return {
    customClaims: { status: 'idle' },
    filter: input.filter ?? '',
    loggedFailureKeys: [],
    refreshRunId: 0,
    updatedUsers: new Map(),
  };
}

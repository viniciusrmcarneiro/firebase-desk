import type { ActivityLogAppendInput, AuthUser } from '@firebase-desk/repo-contracts';
import { messageFromError, toError } from '../shared/errors.ts';
import {
  type AppCoreCommandOptions,
  type AppCoreStore,
  commandActivityMetadata,
  documentDataMetadata,
} from '../shared/index.ts';
import { elapsedMs } from '../shared/time.ts';
import type { AuthRuntimeState } from './authState.ts';
import {
  authCustomClaimsSaveFailed,
  authCustomClaimsSaveStarted,
  authCustomClaimsSaveSucceeded,
  authFailureLogged,
  authFilterChanged,
  authFilterCleared,
  authRefreshRequested,
  authSuccessLogged,
} from './authTransitions.ts';

export interface AuthProjectContext {
  readonly connectionId: string;
  readonly projectId: string;
}

export interface AuthCommandEnvironment {
  readonly now: () => number;
  readonly recordActivity: (input: ActivityLogAppendInput) => Promise<void> | void;
  readonly setCustomClaims: (
    projectId: string,
    uid: string,
    claims: Record<string, unknown>,
  ) => Promise<AuthUser>;
}

export interface AuthTabLike {
  readonly connectionId: string;
  readonly id: string;
  readonly kind: string;
}

export function setAuthFilterCommand(
  state: AuthRuntimeState,
  filter: string,
): AuthRuntimeState {
  return authFilterChanged(state, filter);
}

export function clearAuthFilterCommand(state: AuthRuntimeState): AuthRuntimeState {
  return authFilterCleared(state);
}

export function selectAuthUserCommand(uid: string | null): string | null {
  return uid;
}

export function loadMoreAuthUsersCommand(
  env: Pick<AuthCommandEnvironment, 'now' | 'recordActivity'>,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly connectionId: string | null | undefined;
    readonly filter: string;
    readonly fetchNextPage: () => void;
  },
): void {
  const startedAt = env.now();
  if (!input.filter.trim()) input.fetchNextPage();
  void env.recordActivity({
    action: 'Load more users',
    area: 'auth',
    durationMs: elapsedMs(startedAt, env.now()),
    metadata: {
      filter: input.filter.trim() || null,
      ...commandActivityMetadata(input.commandOptions),
    },
    status: 'success',
    summary: 'Requested more Authentication users',
    target: { connectionId: input.connectionId ?? undefined, type: 'auth-user' },
  });
}

export function refreshAuthUsersCommand(
  store: AppCoreStore<AuthRuntimeState>,
  env: Pick<AuthCommandEnvironment, 'now' | 'recordActivity'>,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly connectionId: string | null | undefined;
    readonly filter: string;
    readonly projectId: string | null;
  },
): void {
  const startedAt = env.now();
  store.update((state) => authRefreshRequested(state, input.projectId));
  void env.recordActivity({
    action: 'Refresh users',
    area: 'auth',
    durationMs: elapsedMs(startedAt, env.now()),
    metadata: {
      filter: input.filter.trim() || null,
      ...commandActivityMetadata(input.commandOptions),
    },
    status: 'success',
    summary: 'Requested Authentication refresh',
    target: { connectionId: input.connectionId ?? undefined, type: 'auth-user' },
  });
}

export async function saveAuthCustomClaimsCommand(
  store: AppCoreStore<AuthRuntimeState>,
  env: AuthCommandEnvironment,
  input: {
    readonly claims: Record<string, unknown>;
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly project: AuthProjectContext | null;
    readonly uid: string;
  },
): Promise<void> {
  if (!input.project) throw new Error('No Authentication project selected.');
  const project = input.project;
  const startedAt = env.now();
  store.update((state) => authCustomClaimsSaveStarted(state, input.uid));
  try {
    const updated = await env.setCustomClaims(
      project.connectionId,
      input.uid,
      input.claims,
    );
    store.update((state) => authCustomClaimsSaveSucceeded(state, project.connectionId, updated));
    void env.recordActivity({
      action: 'Save custom claims',
      area: 'auth',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        ...commandActivityMetadata(input.commandOptions),
        ...documentDataMetadata(input.claims),
      },
      payload: { claims: input.claims },
      status: 'success',
      summary: `Saved custom claims for ${input.uid}`,
      target: authUserTarget(project, input.uid),
    });
  } catch (error) {
    const message = messageFromError(error, 'Could not save custom claims.');
    store.update((state) => authCustomClaimsSaveFailed(state, input.uid, message));
    void env.recordActivity({
      action: 'Save custom claims',
      area: 'auth',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        ...commandActivityMetadata(input.commandOptions),
        ...documentDataMetadata(input.claims),
      },
      payload: { claims: input.claims },
      status: 'failure',
      summary: message,
      target: authUserTarget(project, input.uid),
    });
    throw toError(error, message);
  }
}

export function authUsersFailureActivityCommand(
  state: AuthRuntimeState,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly errorMessage: string | null;
    readonly filter: string;
    readonly tab: AuthTabLike | undefined;
  },
): { readonly activity: ActivityLogAppendInput | null; readonly state: AuthRuntimeState; } {
  if (!input.tab || input.tab.kind !== 'auth-users' || !input.errorMessage) {
    return { activity: null, state };
  }
  const filter = input.filter.trim();
  const key = `${input.tab.id}:${filter}:${input.errorMessage}`;
  if (state.loggedFailureKeys.includes(key)) return { activity: null, state };
  return {
    activity: {
      action: filter ? 'Search users' : 'Load users',
      area: 'auth',
      error: { message: input.errorMessage },
      metadata: {
        filter: filter || null,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'failure',
      summary: input.errorMessage,
      target: { connectionId: input.tab.connectionId, type: 'auth-user' },
    },
    state: authFailureLogged(state, key),
  };
}

export function authUsersSuccessActivityCommand(
  state: AuthRuntimeState,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly errorMessage: string | null;
    readonly filter: string;
    readonly hasMore: boolean;
    readonly isLoading: boolean;
    readonly resultCount: number;
    readonly tab: AuthTabLike | undefined;
  },
): { readonly activity: ActivityLogAppendInput | null; readonly state: AuthRuntimeState; } {
  if (
    !input.tab || input.tab.kind !== 'auth-users' || input.isLoading || input.errorMessage
  ) {
    return { activity: null, state };
  }
  const filter = input.filter.trim();
  const key = [
    input.tab.id,
    filter,
    input.resultCount,
    input.hasMore ? 'more' : 'done',
  ].join(':');
  if (state.loggedSuccessKeys.includes(key)) return { activity: null, state };
  return {
    activity: {
      action: filter ? 'Search users' : 'Load users',
      area: 'auth',
      metadata: {
        filter: filter || null,
        hasMore: input.hasMore,
        resultCount: input.resultCount,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'success',
      summary: filter
        ? `Found ${input.resultCount} Authentication users`
        : `Loaded ${input.resultCount} Authentication users`,
      target: { connectionId: input.tab.connectionId, type: 'auth-user' },
    },
    state: authSuccessLogged(state, key),
  };
}

function authUserTarget(
  project: AuthProjectContext,
  uid: string,
): ActivityLogAppendInput['target'] {
  return {
    connectionId: project.connectionId,
    projectId: project.projectId,
    type: 'auth-user',
    uid,
  };
}

import type {
  ActivityLogAppendInput,
  AuthUser,
  Page,
  PageRequest,
} from '@firebase-desk/repo-contracts';
import { DEFAULT_PAGE_LIMIT } from '@firebase-desk/repo-contracts';
import { type AppCoreCommandOptions, commandActivityMetadata } from '../shared/commandOptions.ts';
import { messageFromError, toError } from '../shared/errors.ts';
import type { AppCoreStore } from '../shared/store.ts';
import { elapsedMs } from '../shared/time.ts';
import { documentDataMetadata } from '../shared/valueMetadata.ts';
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
  authUsersLoadFailed,
  authUsersLoadMoreFailed,
  authUsersLoadMoreStarted,
  authUsersLoadMoreSucceeded,
  authUsersLoadStarted,
  authUsersLoadSucceeded,
  authUsersRequestKey,
} from './authTransitions.ts';

export interface AuthProjectContext {
  readonly connectionId: string;
  readonly projectId: string;
}

export interface AuthCommandEnvironment {
  readonly listUsers: (projectId: string, request?: PageRequest) => Promise<Page<AuthUser>>;
  readonly now: () => number;
  readonly recordActivity: (input: ActivityLogAppendInput) => Promise<void> | void;
  readonly searchUsers: (projectId: string, query: string) => Promise<ReadonlyArray<AuthUser>>;
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

export async function loadAuthUsersCommand(
  store: AppCoreStore<AuthRuntimeState>,
  env: Pick<AuthCommandEnvironment, 'listUsers' | 'now' | 'recordActivity' | 'searchUsers'>,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly force?: boolean | undefined;
    readonly project: AuthProjectContext | null;
    readonly reason?: 'initial' | 'refresh' | undefined;
    readonly tab: AuthTabLike | undefined;
  },
): Promise<boolean> {
  if (!input.project || !input.tab || input.tab.kind !== 'auth-users') return false;
  const current = store.get();
  const filter = current.filter.trim();
  const key = authUsersRequestKey(input.project.connectionId, filter);
  if (!input.force) {
    if (current.usersLoadedKey === key && !current.errorMessage) return false;
    const active = current.activeUsersRequest;
    if (active && authUsersRequestKey(active.projectId, active.filter) === key) return false;
  }
  const request = {
    filter,
    projectId: input.project.connectionId,
    runId: current.refreshRunId + 1,
  };
  const startedAt = env.now();
  store.update((state) => authUsersLoadStarted(state, request));
  try {
    const result = filter
      ? { items: await env.searchUsers(input.project.connectionId, filter), nextCursor: null }
      : await env.listUsers(input.project.connectionId, { limit: DEFAULT_PAGE_LIMIT });
    store.update((state) =>
      authUsersLoadSucceeded(state, {
        nextCursor: result.nextCursor,
        request,
        users: result.items,
      })
    );
    void env.recordActivity({
      action: authUsersAction(filter, input.reason),
      area: 'auth',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        filter: filter || null,
        hasMore: Boolean(result.nextCursor),
        resultCount: result.items.length,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'success',
      summary: filter
        ? `Found ${result.items.length} Authentication users`
        : `Loaded ${result.items.length} Authentication users`,
      target: { connectionId: input.project.connectionId, type: 'auth-user' },
    });
    return true;
  } catch (error) {
    const message = messageFromError(error, 'Could not load Authentication data.');
    store.update((state) => authUsersLoadFailed(state, { errorMessage: message, request }));
    void env.recordActivity({
      action: authUsersAction(filter, input.reason),
      area: 'auth',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        filter: filter || null,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'failure',
      summary: message,
      target: { connectionId: input.project.connectionId, type: 'auth-user' },
    });
    return true;
  }
}

export async function loadMoreAuthUsersCommand(
  store: AppCoreStore<AuthRuntimeState>,
  env: Pick<AuthCommandEnvironment, 'listUsers' | 'now' | 'recordActivity'>,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly project: AuthProjectContext | null;
  },
): Promise<boolean> {
  const current = store.get();
  const filter = current.filter.trim();
  if (!input.project || filter || !current.nextCursor || current.usersIsFetchingMore) return false;
  const startedAt = env.now();
  store.update(authUsersLoadMoreStarted);
  try {
    const page = await env.listUsers(input.project.connectionId, {
      cursor: current.nextCursor,
      limit: DEFAULT_PAGE_LIMIT,
    });
    store.update((state) =>
      authUsersLoadMoreSucceeded(state, {
        nextCursor: page.nextCursor,
        users: page.items,
      })
    );
    void env.recordActivity({
      action: 'Load more users',
      area: 'auth',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        filter: null,
        hasMore: Boolean(page.nextCursor),
        resultCount: page.items.length,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'success',
      summary: `Loaded ${page.items.length} more Authentication users`,
      target: { connectionId: input.project.connectionId, type: 'auth-user' },
    });
    return true;
  } catch (error) {
    const message = messageFromError(error, 'Could not load more Authentication users.');
    store.update((state) => authUsersLoadMoreFailed(state, message));
    void env.recordActivity({
      action: 'Load more users',
      area: 'auth',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        filter: null,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'failure',
      summary: message,
      target: { connectionId: input.project.connectionId, type: 'auth-user' },
    });
    return true;
  }
}

export async function refreshAuthUsersCommand(
  store: AppCoreStore<AuthRuntimeState>,
  env: Pick<AuthCommandEnvironment, 'listUsers' | 'now' | 'recordActivity' | 'searchUsers'>,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly project: AuthProjectContext | null;
    readonly tab: AuthTabLike | undefined;
  },
): Promise<boolean> {
  store.update((state) => authRefreshRequested(state, input.project?.connectionId ?? null));
  return await loadAuthUsersCommand(store, env, {
    commandOptions: input.commandOptions,
    force: true,
    project: input.project,
    reason: 'refresh',
    tab: input.tab,
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

function authUsersAction(
  filter: string,
  reason: 'initial' | 'refresh' | undefined,
): string {
  if (reason === 'refresh') return 'Refresh users';
  return filter ? 'Search users' : 'Load users';
}

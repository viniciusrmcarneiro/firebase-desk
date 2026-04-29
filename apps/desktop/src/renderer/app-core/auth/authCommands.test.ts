import type { ActivityLogAppendInput, AuthUser } from '@firebase-desk/repo-contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  type AuthCommandEnvironment,
  authUsersFailureActivityCommand,
  clearAuthFilterCommand,
  loadMoreAuthUsersCommand,
  refreshAuthUsersCommand,
  saveAuthCustomClaimsCommand,
  selectAuthUserCommand,
  setAuthFilterCommand,
} from './authCommands.ts';
import { createAuthStore } from './authStore.ts';

describe('auth commands', () => {
  it('updates filter state through commands', () => {
    const state = setAuthFilterCommand(createAuthStore().get(), 'ada');

    expect(state.filter).toBe('ada');
    expect(clearAuthFilterCommand(state).filter).toBe('');
    expect(selectAuthUserCommand('u_ada')).toBe('u_ada');
  });

  it('records load more and refresh activity', () => {
    const context = commandContext();
    const fetchNextPage = vi.fn();

    loadMoreAuthUsersCommand(context.env, {
      connectionId: 'emu',
      fetchNextPage,
      filter: '',
    });
    refreshAuthUsersCommand(context.store, context.env, {
      connectionId: 'emu',
      filter: 'ada',
      projectId: 'emu',
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(context.store.get().refreshRunId).toBe(1);
    expect(context.activity.map((entry) => entry.action)).toEqual([
      'Load more users',
      'Refresh users',
    ]);
  });

  it('saves custom claims, updates users, and records Activity', async () => {
    const context = commandContext();

    await saveAuthCustomClaimsCommand(context.store, context.env, {
      claims: { role: 'owner' },
      project,
      uid: 'u_ada',
    });

    expect(context.setCustomClaims).toHaveBeenCalledWith('emu', 'u_ada', { role: 'owner' });
    expect(context.store.get().customClaims.status).toBe('saved');
    expect(context.store.get().updatedUsers.get('emu:u_ada')?.customClaims).toEqual({
      role: 'owner',
    });
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Save custom claims',
      metadata: { fieldCount: 1 },
      payload: { claims: { role: 'owner' } },
      status: 'success',
      target: { connectionId: 'emu', projectId: 'demo-local', uid: 'u_ada' },
    });
  });

  it('records failed custom claims saves and rethrows', async () => {
    const rejectedSetCustomClaims: AuthCommandEnvironment['setCustomClaims'] = vi.fn()
      .mockRejectedValue(new Error('denied'));
    const context = commandContext({
      setCustomClaims: rejectedSetCustomClaims,
    });

    await expect(saveAuthCustomClaimsCommand(context.store, context.env, {
      claims: { role: 'owner' },
      project,
      uid: 'u_ada',
    })).rejects.toThrow('denied');

    expect(context.store.get().customClaims).toMatchObject({
      errorMessage: 'denied',
      status: 'failed',
      uid: 'u_ada',
    });
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Save custom claims',
      error: { message: 'denied' },
      status: 'failure',
    });
  });

  it('builds deduped auth failure activity', () => {
    const store = createAuthStore();
    const first = authUsersFailureActivityCommand(store.get(), {
      errorMessage: 'auth down',
      filter: ' ada ',
      tab: { connectionId: 'emu', id: 'tab-auth', kind: 'auth-users' },
    });
    store.set(first.state);
    const second = authUsersFailureActivityCommand(store.get(), {
      errorMessage: 'auth down',
      filter: 'ada',
      tab: { connectionId: 'emu', id: 'tab-auth', kind: 'auth-users' },
    });

    expect(first.activity).toMatchObject({
      action: 'Search users',
      error: { message: 'auth down' },
      metadata: { filter: 'ada' },
      status: 'failure',
    });
    expect(second.activity).toBeNull();
  });
});

const project = {
  connectionId: 'emu',
  projectId: 'demo-local',
};

function commandContext(
  overrides: { readonly setCustomClaims?: AuthCommandEnvironment['setCustomClaims']; } = {},
) {
  const activity: ActivityLogAppendInput[] = [];
  const store = createAuthStore();
  const setCustomClaims = overrides.setCustomClaims
    ?? vi.fn<AuthCommandEnvironment['setCustomClaims']>().mockResolvedValue(
      user({ customClaims: { role: 'owner' } }),
    );
  let time = 1000;
  const env: AuthCommandEnvironment = {
    now: () => time += 5,
    recordActivity: (input: ActivityLogAppendInput) => {
      activity.push(input);
    },
    setCustomClaims,
  };
  return { activity, env, setCustomClaims, store };
}

function user(patch: Partial<AuthUser> = {}): AuthUser {
  return {
    customClaims: {},
    disabled: false,
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
    provider: 'password',
    uid: 'u_ada',
    ...patch,
  };
}

import type { AuthUser } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import { selectAuthUsersModel } from './authSelectors.ts';
import { createInitialAuthRuntimeState } from './authState.ts';
import {
  authCustomClaimsEditing,
  authCustomClaimsSaveFailed,
  authCustomClaimsSaveStarted,
  authCustomClaimsSaveSucceeded,
  authFailureLogged,
  authFilterChanged,
  authFilterCleared,
  authRefreshRequested,
} from './authTransitions.ts';

describe('auth transitions', () => {
  it('tracks filter and refresh state', () => {
    const filtered = authFilterChanged(createInitialAuthRuntimeState(), 'ada');

    expect(filtered.filter).toBe('ada');
    expect(authFilterCleared(filtered).filter).toBe('');
    expect(authRefreshRequested(filtered, 'emu').refreshRunId).toBe(1);
  });

  it('tracks custom claims saves and updated selected users', () => {
    const editing = authCustomClaimsEditing(createInitialAuthRuntimeState(), 'u_ada');
    const saving = authCustomClaimsSaveStarted(editing, 'u_ada');
    const saved = authCustomClaimsSaveSucceeded(
      saving,
      'emu',
      user({ customClaims: { role: 'ops' } }),
    );

    expect(editing.customClaims.status).toBe('editing');
    expect(saving.customClaims.status).toBe('saving');
    expect(saved.customClaims.status).toBe('saved');
    expect(selectAuthUsersModel(saved, modelInput({ selectedUserId: 'u_ada' })).selectedUser)
      .toMatchObject({ customClaims: { role: 'ops' } });
    expect(authCustomClaimsSaveFailed(saving, 'u_ada', 'denied').customClaims).toEqual({
      errorMessage: 'denied',
      status: 'failed',
      uid: 'u_ada',
    });
  });

  it('dedupes failure keys', () => {
    const once = authFailureLogged(createInitialAuthRuntimeState(), 'tab:load:denied');
    const twice = authFailureLogged(once, 'tab:load:denied');

    expect(once.loggedFailureKeys).toEqual(['tab:load:denied']);
    expect(twice).toBe(once);
  });

  it('selects search, paging, selected users, and error state', () => {
    const state = authFilterChanged(createInitialAuthRuntimeState(), 'ada');

    expect(selectAuthUsersModel(
      state,
      modelInput({
        listError: new Error('list failed'),
        listUsers: [user({ uid: 'u_grace' })],
        searchError: new Error('search failed'),
        searchUsers: [user({ uid: 'u_ada' })],
        selectedUserId: 'u_ada',
      }),
    )).toMatchObject({
      errorMessage: 'search failed',
      filterText: 'ada',
      selectedUser: { uid: 'u_ada' },
      users: [{ uid: 'u_ada' }],
      usersHasMore: false,
    });
  });
});

function modelInput(
  patch: Partial<Parameters<typeof selectAuthUsersModel>[1]> = {},
): Parameters<typeof selectAuthUsersModel>[1] {
  return {
    listError: null,
    listHasMore: true,
    listIsFetchingMore: false,
    listIsLoading: false,
    listUsers: [user()],
    projectId: 'emu',
    searchError: null,
    searchIsLoading: false,
    searchUsers: [],
    selectedUserId: null,
    ...patch,
  };
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

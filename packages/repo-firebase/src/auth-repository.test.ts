import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import type { UserRecord } from 'firebase-admin/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthProvider } from './admin-auth-provider.ts';
import { FirebaseAuthRepository } from './auth-repository.ts';

const firebaseMocks = vi.hoisted(() => {
  const auth = {
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    listUsers: vi.fn(),
    setCustomUserClaims: vi.fn(),
  };
  return {
    auth,
    cert: vi.fn((serviceAccount: unknown) => ({ serviceAccount })),
    deleteApp: vi.fn(),
    getAuth: vi.fn(() => auth),
    initializeApp: vi.fn((_options: unknown, name: string) => ({ name })),
  };
});

vi.mock('firebase-admin/app', () => ({
  cert: firebaseMocks.cert,
  deleteApp: firebaseMocks.deleteApp,
  initializeApp: firebaseMocks.initializeApp,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: firebaseMocks.getAuth,
}));

const originalAuthEmulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];

afterEach(() => {
  vi.clearAllMocks();
  restoreAuthEmulatorHost();
});

describe('FirebaseAuthRepository', () => {
  it('lists users with Firebase pagination and emulator host scoping', async () => {
    let hostDuringCall: string | undefined;
    firebaseMocks.auth.listUsers.mockImplementation(async () => {
      hostDuringCall = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
      return {
        users: [userRecord({ uid: 'u_ada' })],
        pageToken: 'next-page',
      };
    });
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9999';
    const { provider, repository } = createRepository();

    try {
      await expect(repository.listUsers('emu', { cursor: { token: 'cursor' }, limit: 2 }))
        .resolves.toEqual({
          items: [expect.objectContaining({ uid: 'u_ada' })],
          nextCursor: { token: 'next-page' },
        });
    } finally {
      await provider.clear();
    }

    expect(firebaseMocks.auth.listUsers).toHaveBeenCalledWith(2, 'cursor');
    expect(hostDuringCall).toBe('127.0.0.1:9099');
    expect(process.env['FIREBASE_AUTH_EMULATOR_HOST']).toBe('localhost:9999');
  });

  it('searches by exact uid and email and dedupes results', async () => {
    const user = userRecord({ email: 'ada@example.com', uid: 'u_ada' });
    firebaseMocks.auth.getUser.mockResolvedValue(user);
    firebaseMocks.auth.getUserByEmail.mockResolvedValue(user);
    const { repository } = createRepository();

    await expect(repository.searchUsers('emu', 'ada@example.com')).resolves.toEqual([
      expect.objectContaining({ email: 'ada@example.com', uid: 'u_ada' }),
    ]);

    expect(firebaseMocks.auth.getUser).toHaveBeenCalledWith('ada@example.com');
    expect(firebaseMocks.auth.getUserByEmail).toHaveBeenCalledWith('ada@example.com');
  });

  it('returns null or empty results for missing users', async () => {
    firebaseMocks.auth.getUser.mockRejectedValue(authError('auth/user-not-found'));
    firebaseMocks.auth.getUserByEmail.mockRejectedValue(authError('auth/user-not-found'));
    const { repository } = createRepository();

    await expect(repository.getUser('emu', 'missing')).resolves.toBeNull();
    await expect(repository.searchUsers('emu', 'missing@example.com')).resolves.toEqual([]);
  });

  it('sets custom claims and returns the refreshed user', async () => {
    firebaseMocks.auth.setCustomUserClaims.mockResolvedValue(undefined);
    firebaseMocks.auth.getUser.mockResolvedValue(userRecord({
      customClaims: { role: 'owner' },
      uid: 'u_ada',
    }));
    const { repository } = createRepository();

    await expect(repository.setCustomClaims('emu', 'u_ada', { role: 'owner' })).resolves
      .toMatchObject({ customClaims: { role: 'owner' } });

    expect(firebaseMocks.auth.setCustomUserClaims).toHaveBeenCalledWith('u_ada', {
      role: 'owner',
    });
  });
});

function createRepository(project = emulatorProject()) {
  const provider = new AdminAuthProvider({
    resolveConnection: async () => ({ credentialJson: null, project }),
  });
  return { provider, repository: new FirebaseAuthRepository(provider) };
}

function emulatorProject(): ProjectSummary {
  return {
    id: 'emu',
    name: 'Local Emulator',
    projectId: 'demo-local',
    target: 'emulator',
    emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    hasCredential: false,
    credentialEncrypted: null,
    createdAt: '2026-04-28T00:00:00.000Z',
  };
}

function userRecord(patch: Partial<UserRecord>): UserRecord {
  return {
    uid: 'u_user',
    email: 'user@example.com',
    displayName: 'User',
    providerData: [{ providerId: 'password' }],
    disabled: false,
    customClaims: {},
    ...patch,
  } as UserRecord;
}

function authError(code: string): Error & { readonly code: string; } {
  return Object.assign(new Error(code), { code });
}

function restoreAuthEmulatorHost(): void {
  if (originalAuthEmulatorHost === undefined) delete process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  else process.env['FIREBASE_AUTH_EMULATOR_HOST'] = originalAuthEmulatorHost;
}

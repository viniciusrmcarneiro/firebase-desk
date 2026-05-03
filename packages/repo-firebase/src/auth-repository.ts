import {
  type AuthRepository,
  type AuthUser,
  DEFAULT_PAGE_LIMIT,
  type Page,
  type PageRequest,
} from '@firebase-desk/repo-contracts';
import type { UserRecord } from 'firebase-admin/auth';
import type { AdminAuthProvider } from './admin-auth-provider.ts';

const MAX_LIMIT = 1000;

export class FirebaseAuthRepository implements AuthRepository {
  private readonly provider: AdminAuthProvider;

  constructor(provider: AdminAuthProvider) {
    this.provider = provider;
  }

  async listUsers(projectId: string, request?: PageRequest): Promise<Page<AuthUser>> {
    return await this.provider.useAuth(projectId, async (auth) => {
      const result = await auth.listUsers(limitFor(request), request?.cursor?.token);
      return {
        items: result.users.map(toAuthUser),
        nextCursor: result.pageToken ? { token: result.pageToken } : null,
      };
    });
  }

  async getUser(projectId: string, uid: string): Promise<AuthUser | null> {
    return await this.provider.useAuth(projectId, async (auth) => {
      try {
        return toAuthUser(await auth.getUser(uid));
      } catch (error) {
        if (isUserNotFound(error)) return null;
        throw error;
      }
    });
  }

  async searchUsers(projectId: string, query: string): Promise<ReadonlyArray<AuthUser>> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return await this.provider.useAuth(projectId, async (auth) => {
      const users: AuthUser[] = [];
      await pushFound(users, () => auth.getUser(trimmed));
      if (trimmed.includes('@')) {
        await pushFound(users, () => auth.getUserByEmail(trimmed));
      }
      return dedupeUsers(users);
    });
  }

  async setCustomClaims(
    projectId: string,
    uid: string,
    claims: Record<string, unknown>,
  ): Promise<AuthUser> {
    assertPlainObject(claims);
    return await this.provider.useAuth(projectId, async (auth) => {
      await auth.setCustomUserClaims(uid, claims);
      return toAuthUser(await auth.getUser(uid));
    });
  }
}

async function pushFound(
  users: AuthUser[],
  load: () => Promise<UserRecord>,
): Promise<void> {
  try {
    users.push(toAuthUser(await load()));
  } catch (error) {
    if (isUserLookupMiss(error)) return;
    throw error;
  }
}

function dedupeUsers(users: ReadonlyArray<AuthUser>): ReadonlyArray<AuthUser> {
  const byUid = new Map<string, AuthUser>();
  for (const user of users) byUid.set(user.uid, user);
  return [...byUid.values()];
}

function toAuthUser(user: UserRecord): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    provider: user.providerData[0]?.providerId ?? (user.email ? 'password' : 'custom'),
    disabled: user.disabled,
    customClaims: { ...user.customClaims },
  };
}

function limitFor(request?: PageRequest): number {
  const value = request?.limit ?? DEFAULT_PAGE_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, value));
}

function isUserLookupMiss(error: unknown): boolean {
  return isUserNotFound(error)
    || errorCode(error) === 'auth/invalid-email'
    || errorCode(error) === 'auth/invalid-uid';
}

function isUserNotFound(error: unknown): boolean {
  return errorCode(error) === 'auth/user-not-found';
}

function errorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { readonly code?: unknown; }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

function assertPlainObject(value: Record<string, unknown>): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Custom claims JSON must be an object.');
  }
}

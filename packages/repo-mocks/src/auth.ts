import {
  type AuthRepository,
  type AuthUser,
  DEFAULT_PAGE_LIMIT,
  type Page,
  type PageRequest,
} from '@firebase-desk/repo-contracts';
import { AUTH_USERS } from './fixtures/index.ts';

const MAX_LIMIT = 1000;

export class MockAuthRepository implements AuthRepository {
  private readonly users = AUTH_USERS.map(cloneUser);

  async listUsers(_projectId: string, request?: PageRequest): Promise<Page<AuthUser>> {
    const offset = Number.parseInt(request?.cursor?.token ?? '0', 10) || 0;
    const limit = limitFor(request);
    const nextOffset = offset + limit;
    const items = this.users.slice(offset, nextOffset).map(cloneUser);
    return {
      items,
      nextCursor: nextOffset < this.users.length ? { token: String(nextOffset) } : null,
    };
  }

  async getUser(_projectId: string, uid: string): Promise<AuthUser | null> {
    const user = this.users.find((u) => u.uid === uid);
    return user ? cloneUser(user) : null;
  }

  async searchUsers(_projectId: string, query: string): Promise<ReadonlyArray<AuthUser>> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.users
      .filter((u) => u.uid.toLowerCase() === q || u.email?.toLowerCase() === q)
      .map(cloneUser);
  }

  async setCustomClaims(
    _projectId: string,
    uid: string,
    claims: Record<string, unknown>,
  ): Promise<AuthUser> {
    assertPlainObject(claims);
    const index = this.users.findIndex((user) => user.uid === uid);
    if (index < 0) throw new Error(`Auth user not found: ${uid}`);
    const updated = { ...this.users[index]!, customClaims: { ...claims } };
    this.users[index] = updated;
    return cloneUser(updated);
  }
}

function limitFor(request?: PageRequest): number {
  const value = request?.limit ?? DEFAULT_PAGE_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, value));
}

function assertPlainObject(value: Record<string, unknown>): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Custom claims JSON must be an object.');
  }
}

function cloneUser(user: AuthUser): AuthUser {
  return {
    ...user,
    customClaims: { ...user.customClaims },
  };
}

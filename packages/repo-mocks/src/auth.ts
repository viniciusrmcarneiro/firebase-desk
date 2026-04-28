import type { AuthRepository, AuthUser, Page, PageRequest } from '@firebase-desk/repo-contracts';
import { AUTH_USERS } from './fixtures/index.ts';

export class MockAuthRepository implements AuthRepository {
  private readonly users = AUTH_USERS.map(cloneUser);

  async listUsers(_projectId: string, request?: PageRequest): Promise<Page<AuthUser>> {
    const offset = Number.parseInt(request?.cursor?.token ?? '0', 10) || 0;
    const limit = request?.limit ?? this.users.length;
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
    const index = this.users.findIndex((user) => user.uid === uid);
    if (index < 0) throw new Error(`Auth user not found: ${uid}`);
    const updated = { ...this.users[index]!, customClaims: { ...claims } };
    this.users[index] = updated;
    return cloneUser(updated);
  }
}

function cloneUser(user: AuthUser): AuthUser {
  return {
    ...user,
    customClaims: { ...user.customClaims },
  };
}

import type { AuthRepository, AuthUser, Page, PageRequest } from '@firebase-desk/repo-contracts';
import { AUTH_USERS } from './fixtures/index.ts';

export class MockAuthRepository implements AuthRepository {
  async listUsers(_projectId: string, request?: PageRequest): Promise<Page<AuthUser>> {
    const offset = Number.parseInt(request?.cursor?.token ?? '0', 10) || 0;
    const limit = request?.limit ?? AUTH_USERS.length;
    const nextOffset = offset + limit;
    const items = AUTH_USERS.slice(offset, nextOffset).map((u) => ({
      ...u,
      customClaims: { ...u.customClaims },
    }));
    return {
      items,
      nextCursor: nextOffset < AUTH_USERS.length ? { token: String(nextOffset) } : null,
    };
  }

  async getUser(_projectId: string, uid: string): Promise<AuthUser | null> {
    const user = AUTH_USERS.find((u) => u.uid === uid);
    return user ? { ...user, customClaims: { ...user.customClaims } } : null;
  }

  async searchUsers(_projectId: string, query: string): Promise<ReadonlyArray<AuthUser>> {
    const q = query.toLowerCase();
    return AUTH_USERS
      .filter((u) => u.email?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q))
      .map((u) => ({ ...u, customClaims: { ...u.customClaims } }));
  }
}

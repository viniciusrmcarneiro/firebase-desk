import type { Page, PageRequest } from './pagination.ts';

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly disabled: boolean;
  readonly customClaims: Record<string, unknown>;
}

export interface AuthRepository {
  listUsers(projectId: string, request?: PageRequest): Promise<Page<AuthUser>>;
  getUser(projectId: string, uid: string): Promise<AuthUser | null>;
  searchUsers(projectId: string, query: string): Promise<ReadonlyArray<AuthUser>>;
}

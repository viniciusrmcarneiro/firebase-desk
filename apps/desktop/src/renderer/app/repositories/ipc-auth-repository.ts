import type { AuthRepository, AuthUser, Page, PageRequest } from '@firebase-desk/repo-contracts';

export class IpcAuthRepository implements AuthRepository {
  async listUsers(projectId: string, request?: PageRequest): Promise<Page<AuthUser>> {
    const page = await window.firebaseDesk.auth.listUsers({
      projectId,
      ...(request ? { request: toIpcPageRequest(request) } : {}),
    });
    return {
      items: page.items.map(toAuthUser),
      nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
    };
  }

  async getUser(projectId: string, uid: string): Promise<AuthUser | null> {
    const user = await window.firebaseDesk.auth.getUser({ projectId, uid });
    return user ? toAuthUser(user) : null;
  }

  async searchUsers(projectId: string, query: string): Promise<ReadonlyArray<AuthUser>> {
    const users = await window.firebaseDesk.auth.searchUsers({ projectId, query });
    return users.map(toAuthUser);
  }

  async setCustomClaims(
    projectId: string,
    uid: string,
    claims: Record<string, unknown>,
  ): Promise<AuthUser> {
    return toAuthUser(await window.firebaseDesk.auth.setCustomClaims({ claims, projectId, uid }));
  }
}

function toIpcPageRequest(request: PageRequest) {
  return {
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
    ...(request.cursor !== undefined ? { cursor: { token: request.cursor.token } } : {}),
  };
}

function toAuthUser(user: AuthUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    provider: user.provider,
    disabled: user.disabled,
    customClaims: { ...user.customClaims },
  };
}

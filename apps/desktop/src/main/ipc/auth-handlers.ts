import type { AuthRepository } from '@firebase-desk/repo-contracts';
import { toIpcAuthUser, toIpcAuthUserPage, toPageRequest } from './converters.ts';
import type { IpcHandlerMap } from './handler-types.ts';

export function createAuthHandlers(
  authRepository: AuthRepository,
): Pick<
  IpcHandlerMap,
  'auth.getUser' | 'auth.listUsers' | 'auth.searchUsers' | 'auth.setCustomClaims'
> {
  return {
    'auth.listUsers': async ({ projectId, request }) =>
      toIpcAuthUserPage(await authRepository.listUsers(projectId, toPageRequest(request))),
    'auth.getUser': async ({ projectId, uid }) => {
      const user = await authRepository.getUser(projectId, uid);
      return user ? toIpcAuthUser(user) : null;
    },
    'auth.searchUsers': async ({ projectId, query }) =>
      (await authRepository.searchUsers(projectId, query)).map(toIpcAuthUser),
    'auth.setCustomClaims': async ({ claims, projectId, uid }) =>
      toIpcAuthUser(await authRepository.setCustomClaims(projectId, uid, claims)),
  };
}

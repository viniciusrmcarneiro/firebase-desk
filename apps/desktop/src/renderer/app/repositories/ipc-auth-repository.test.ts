import { describe, expect, it, vi } from 'vitest';
import { IpcAuthRepository } from './ipc-auth-repository.ts';

describe('IpcAuthRepository', () => {
  it('normalizes Auth responses from IPC', async () => {
    const user = {
      uid: 'u_ada',
      email: 'ada@example.com',
      displayName: 'Ada Lovelace',
      provider: 'password',
      disabled: false,
      customClaims: { role: 'admin' },
    };
    const auth = {
      listUsers: vi.fn().mockResolvedValue({ items: [user], nextCursor: { token: 'next' } }),
      getUser: vi.fn().mockResolvedValue(user),
      searchUsers: vi.fn().mockResolvedValue([user]),
      setCustomClaims: vi.fn().mockResolvedValue({ ...user, customClaims: { role: 'owner' } }),
    } satisfies Partial<DesktopAuthApi>;
    Object.defineProperty(window, 'firebaseDesk', {
      configurable: true,
      value: { auth },
    });
    const repository = new IpcAuthRepository();

    await expect(repository.listUsers('emu', { limit: 1 })).resolves.toEqual({
      items: [user],
      nextCursor: { token: 'next' },
    });
    await expect(repository.getUser('emu', 'u_ada')).resolves.toEqual(user);
    await expect(repository.searchUsers('emu', 'ada@example.com')).resolves.toEqual([user]);
    await expect(repository.setCustomClaims('emu', 'u_ada', { role: 'owner' })).resolves
      .toMatchObject({ customClaims: { role: 'owner' } });

    expect(auth.listUsers).toHaveBeenCalledWith({
      projectId: 'emu',
      request: { limit: 1 },
    });
    expect(auth.setCustomClaims).toHaveBeenCalledWith({
      projectId: 'emu',
      uid: 'u_ada',
      claims: { role: 'owner' },
    });
  });
});

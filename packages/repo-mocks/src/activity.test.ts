import { describe, expect, it } from 'vitest';
import { MockActivityLogRepository } from './activity.ts';

describe('MockActivityLogRepository', () => {
  it('appends, lists newest first, filters, and clears', async () => {
    const repository = new MockActivityLogRepository();

    await repository.append({
      action: 'Run query',
      area: 'firestore',
      status: 'success',
      summary: 'Loaded orders',
    });
    await repository.append({
      action: 'Search users',
      area: 'auth',
      status: 'failure',
      summary: 'Failed users',
    });

    await expect(repository.list()).resolves.toMatchObject([
      { action: 'Search users' },
      { action: 'Run query' },
    ]);
    await expect(repository.list({ area: 'firestore' })).resolves.toMatchObject([
      { action: 'Run query' },
    ]);
    await expect(repository.list({ search: 'failed' })).resolves.toMatchObject([
      { action: 'Search users' },
    ]);

    await repository.clear();

    await expect(repository.list()).resolves.toEqual([]);
  });
});

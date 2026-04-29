import { describe, expect, it } from 'vitest';
import { createMockRepositories } from '../../app/RepositoryProvider.tsx';
import { createAppCoreCommandEnvironment, createCounterIdGenerator } from './commandEnvironment.ts';

describe('app-core command environment', () => {
  it('uses injected repositories, clock, ids, and query client', () => {
    const repositories = createMockRepositories();
    const queryClient = {
      cancelQueries: async () => {},
      invalidateQueries: async () => {},
      isFetching: () => 0,
    };
    const env = createAppCoreCommandEnvironment({
      clock: { now: () => 42 },
      ids: { nextId: (prefix = 'id') => `${prefix}-custom` },
      queryClient,
      repositories,
    });

    expect(env.repositories).toBe(repositories);
    expect(env.clock.now()).toBe(42);
    expect(env.ids.nextId('run')).toBe('run-custom');
    expect(env.queryClient).toBe(queryClient);
  });

  it('provides deterministic counter ids by default', () => {
    const ids = createCounterIdGenerator();

    expect(ids.nextId('run')).toBe('run-1');
    expect(ids.nextId('run')).toBe('run-2');
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createMockRepositories,
  RepositoryProvider,
  type RepositorySet,
} from '../RepositoryProvider.tsx';
import { useProjects } from './useProjects.ts';

describe('useProjects', () => {
  it('loads projects and reloads through the repository', async () => {
    const repositories = createMockRepositories();
    const list = vi.spyOn(repositories.projects, 'list');
    const { result } = renderProjectsHook(repositories);

    await waitFor(() => expect(result.current.data?.length).toBeGreaterThan(0));

    await result.current.reload();

    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps the previous value visible when reload fails', async () => {
    const repositories = createMockRepositories();
    const initial = await repositories.projects.list();
    vi.spyOn(repositories.projects, 'list')
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new Error('denied'));
    const { result } = renderProjectsHook(repositories);

    await waitFor(() => expect(result.current.data).toEqual(initial));
    await expect(result.current.reload()).rejects.toThrow('denied');

    expect(result.current.data).toEqual(initial);
    await waitFor(() => expect(result.current.error?.message).toBe('denied'));
    expect(result.current.isLoading).toBe(false);
  });
});

function renderProjectsHook(repositories: RepositorySet) {
  return renderHook(() => useProjects(), {
    wrapper: ({ children }: { readonly children: ReactNode; }) => (
      <RepositoryProvider repositories={repositories}>{children}</RepositoryProvider>
    ),
  });
}

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '../RepositoryProvider.tsx';

export function useProjects() {
  const repositories = useRepositories();
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => repositories.projects.list(),
  });
}

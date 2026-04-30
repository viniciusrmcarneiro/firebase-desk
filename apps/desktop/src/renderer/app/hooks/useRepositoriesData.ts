import type { PageRequest } from '@firebase-desk/repo-contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRepositories } from '../RepositoryProvider.tsx';

const DEFAULT_PAGE_SIZE = 25;

export function useProjects() {
  const repositories = useRepositories();
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => repositories.projects.list(),
  });
}

export function useRootCollections(connectionId: string | null | undefined, enabled = true) {
  const repositories = useRepositories();
  return useQuery({
    enabled: enabled && Boolean(connectionId),
    queryKey: ['firestore', connectionId, 'rootCollections'],
    queryFn: () => repositories.firestore.listRootCollections(connectionId ?? ''),
  });
}

export function useCollectionDocuments(
  connectionId: string | null | undefined,
  collectionPath: string | null | undefined,
  enabled = true,
) {
  const repositories = useRepositories();
  return useInfiniteQuery({
    enabled: enabled && Boolean(connectionId && collectionPath),
    initialPageParam: undefined as PageRequest['cursor'] | undefined,
    queryKey: ['firestore', connectionId, 'documents', collectionPath],
    queryFn: ({ pageParam }) =>
      repositories.firestore.listDocuments(
        connectionId ?? '',
        collectionPath ?? '',
        pageRequest(pageParam, DEFAULT_PAGE_SIZE),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useSubcollections(
  connectionId: string | null | undefined,
  documentPath: string | null | undefined,
  enabled = true,
) {
  const repositories = useRepositories();
  return useQuery({
    enabled: enabled && Boolean(connectionId && documentPath),
    queryKey: ['firestore', connectionId, 'subcollections', documentPath],
    queryFn: () =>
      repositories.firestore.listSubcollections(connectionId ?? '', documentPath ?? ''),
  });
}

function pageRequest(cursor: PageRequest['cursor'] | undefined, limit: number): PageRequest {
  return cursor ? { cursor, limit } : { limit };
}

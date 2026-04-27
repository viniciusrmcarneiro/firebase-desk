import type { FirestoreQuery, PageRequest, ScriptRunRequest } from '@firebase-desk/repo-contracts';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useRepositories } from '../RepositoryProvider.tsx';

const DEFAULT_PAGE_SIZE = 25;

export function useProjects() {
  const repositories = useRepositories();
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => repositories.projects.list(),
  });
}

export function useRootCollections(projectId: string | null | undefined, enabled = true) {
  const repositories = useRepositories();
  return useQuery({
    enabled: enabled && Boolean(projectId),
    queryKey: ['firestore', projectId, 'rootCollections'],
    queryFn: () => repositories.firestore.listRootCollections(projectId ?? ''),
  });
}

export function useCollectionDocuments(
  projectId: string | null | undefined,
  collectionPath: string | null | undefined,
  enabled = true,
) {
  const repositories = useRepositories();
  return useInfiniteQuery({
    enabled: enabled && Boolean(projectId && collectionPath),
    initialPageParam: undefined as PageRequest['cursor'] | undefined,
    queryKey: ['firestore', projectId, 'documents', collectionPath],
    queryFn: ({ pageParam }) =>
      repositories.firestore.listDocuments(
        projectId ?? '',
        collectionPath ?? '',
        pageRequest(pageParam, DEFAULT_PAGE_SIZE),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useSubcollections(
  projectId: string | null | undefined,
  documentPath: string | null | undefined,
  enabled = true,
) {
  const repositories = useRepositories();
  return useQuery({
    enabled: enabled && Boolean(projectId && documentPath),
    queryKey: ['firestore', projectId, 'subcollections', documentPath],
    queryFn: () => repositories.firestore.listSubcollections(projectId ?? '', documentPath ?? ''),
  });
}

export function useRunQuery(
  query: FirestoreQuery | null,
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
) {
  const repositories = useRepositories();
  return useInfiniteQuery({
    enabled: enabled && Boolean(query),
    initialPageParam: undefined as PageRequest['cursor'] | undefined,
    queryKey: ['firestore', 'query', query, limit],
    queryFn: ({ pageParam }) =>
      repositories.firestore.runQuery(
        query ?? { projectId: '', path: '' },
        pageRequest(pageParam, limit),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useGetDocument(
  projectId: string | null | undefined,
  documentPath: string | null | undefined,
) {
  const repositories = useRepositories();
  return useQuery({
    enabled: Boolean(projectId && documentPath),
    queryKey: ['firestore', projectId, 'document', documentPath],
    queryFn: () => repositories.firestore.getDocument(projectId ?? '', documentPath ?? ''),
  });
}

export function useUsers(projectId: string | null | undefined, limit = DEFAULT_PAGE_SIZE) {
  const repositories = useRepositories();
  return useInfiniteQuery({
    enabled: Boolean(projectId),
    initialPageParam: undefined as PageRequest['cursor'] | undefined,
    queryKey: ['auth', projectId, 'users', limit],
    queryFn: ({ pageParam }) =>
      repositories.auth.listUsers(projectId ?? '', pageRequest(pageParam, limit)),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useSearchUsers(
  projectId: string | null | undefined,
  query: string,
  enabled = true,
) {
  const repositories = useRepositories();
  return useQuery({
    enabled: enabled && Boolean(projectId && query.trim()),
    queryKey: ['auth', projectId, 'users', 'search', query.trim()],
    queryFn: () => repositories.auth.searchUsers(projectId ?? '', query.trim()),
  });
}

export function useRunScript() {
  const repositories = useRepositories();
  return useMutation({
    mutationFn: (request: ScriptRunRequest) => repositories.scriptRunner.run(request),
  });
}

function pageRequest(cursor: PageRequest['cursor'] | undefined, limit: number): PageRequest {
  return cursor ? { cursor, limit } : { limit };
}

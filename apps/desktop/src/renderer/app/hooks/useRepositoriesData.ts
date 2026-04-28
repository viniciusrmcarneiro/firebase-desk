import type {
  AuthUser,
  FirestoreQuery,
  PageRequest,
  ScriptRunRequest,
} from '@firebase-desk/repo-contracts';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useRepositories } from '../RepositoryProvider.tsx';

const DEFAULT_PAGE_SIZE = 25;
const AUTH_MANUAL_QUERY_OPTIONS = {
  gcTime: 0,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: Infinity,
} as const;

export interface SetCustomClaimsInput {
  readonly claims: Record<string, unknown>;
  readonly projectId: string;
  readonly uid: string;
}

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

export function useRunQuery(
  query: FirestoreQuery | null,
  limit = DEFAULT_PAGE_SIZE,
  runId = 0,
  enabled = true,
  scopeId = 'default',
) {
  const repositories = useRepositories();
  return useInfiniteQuery({
    enabled: enabled && Boolean(query),
    gcTime: 0,
    initialPageParam: undefined as PageRequest['cursor'] | undefined,
    queryKey: ['firestore', 'query', scopeId, query, limit, runId],
    queryFn: ({ pageParam }) =>
      repositories.firestore.runQuery(
        query ?? { connectionId: '', path: '' },
        pageRequest(pageParam, limit),
      ),
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  });
}

export function useGetDocument(
  connectionId: string | null | undefined,
  documentPath: string | null | undefined,
  runId = 0,
  scopeId = 'default',
) {
  const repositories = useRepositories();
  return useQuery({
    enabled: Boolean(connectionId && documentPath),
    gcTime: 0,
    queryKey: ['firestore', 'document', scopeId, connectionId, documentPath, runId],
    queryFn: () => repositories.firestore.getDocument(connectionId ?? '', documentPath ?? ''),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
}

export function useUsers(
  projectId: string | null | undefined,
  limit = DEFAULT_PAGE_SIZE,
  scopeId = 'default',
  runId = 0,
) {
  const repositories = useRepositories();
  return useInfiniteQuery({
    enabled: Boolean(projectId),
    ...AUTH_MANUAL_QUERY_OPTIONS,
    initialPageParam: undefined as PageRequest['cursor'] | undefined,
    queryKey: ['auth', scopeId, projectId, 'users', limit, runId],
    queryFn: ({ pageParam }) =>
      repositories.auth.listUsers(projectId ?? '', pageRequest(pageParam, limit)),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useSearchUsers(
  projectId: string | null | undefined,
  query: string,
  enabled = true,
  scopeId = 'default',
  runId = 0,
) {
  const repositories = useRepositories();
  return useQuery({
    enabled: enabled && Boolean(projectId && query.trim()),
    ...AUTH_MANUAL_QUERY_OPTIONS,
    queryKey: ['auth', scopeId, projectId, 'users', 'search', query.trim(), runId],
    queryFn: () => repositories.auth.searchUsers(projectId ?? '', query.trim()),
  });
}

export function useSetCustomClaims() {
  const repositories = useRepositories();
  return useMutation<AuthUser, Error, SetCustomClaimsInput>({
    mutationFn: ({ claims, projectId, uid }) =>
      repositories.auth.setCustomClaims(projectId, uid, claims),
  });
}

export function useRunScript() {
  const repositories = useRepositories();
  return useMutation({
    mutationFn: (request: ScriptRunRequest) => repositories.scriptRunner.run(request),
  });
}

export function useCancelScript() {
  const repositories = useRepositories();
  return useMutation({
    mutationFn: (runId: string) => repositories.scriptRunner.cancel(runId),
  });
}

function pageRequest(cursor: PageRequest['cursor'] | undefined, limit: number): PageRequest {
  return cursor ? { cursor, limit } : { limit };
}

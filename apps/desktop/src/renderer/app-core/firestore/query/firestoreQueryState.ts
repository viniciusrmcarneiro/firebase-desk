import type {
  FirestoreDocumentResult,
  FirestoreQuery,
  FirestoreQueryDraft,
  PageRequest,
} from '@firebase-desk/repo-contracts';

export type FirestoreResultView = 'json' | 'table' | 'tree';

export interface SubmittedFirestoreQuery {
  readonly limit: number;
  readonly query: FirestoreQuery;
  readonly runId: number;
}

export interface FirestoreQueryPage {
  readonly items: ReadonlyArray<FirestoreDocumentResult>;
  readonly nextCursor?: PageRequest['cursor'];
}

export interface FirestoreQueryRuntimeState {
  readonly drafts: Readonly<Record<string, FirestoreQueryDraft>>;
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly nextRunId: number;
  readonly pages: ReadonlyArray<FirestoreQueryPage>;
  readonly pendingPageReloads: Readonly<Record<string, number>>;
  readonly queryRequests: Readonly<Record<string, SubmittedFirestoreQuery | null>>;
  readonly recordedQueryCompletions: Readonly<Record<string, true>>;
  readonly resultView: FirestoreResultView;
  readonly resultsStale: boolean;
  readonly selectedDocumentPaths: Readonly<Record<string, string>>;
}

export interface CreateFirestoreQueryRuntimeStateInput {
  readonly drafts?: Readonly<Record<string, FirestoreQueryDraft>> | undefined;
}

export function createInitialFirestoreQueryRuntimeState(
  input: CreateFirestoreQueryRuntimeStateInput = {},
): FirestoreQueryRuntimeState {
  return {
    drafts: input.drafts ?? {},
    errorMessage: null,
    hasMore: false,
    isFetchingMore: false,
    isLoading: false,
    nextRunId: 1,
    pages: [],
    pendingPageReloads: {},
    queryRequests: {},
    recordedQueryCompletions: {},
    resultView: 'table',
    resultsStale: false,
    selectedDocumentPaths: {},
  };
}

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

export interface FirestoreQueryResultState {
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly pages: ReadonlyArray<FirestoreQueryPage>;
  readonly resultView: FirestoreResultView;
  readonly resultsStale: boolean;
}

export interface FirestoreQueryRuntimeState {
  readonly drafts: Readonly<Record<string, FirestoreQueryDraft>>;
  readonly nextRunId: number;
  readonly pendingPageReloads: Readonly<Record<string, number>>;
  readonly queryRequests: Readonly<Record<string, SubmittedFirestoreQuery | null>>;
  readonly recordedQueryCompletions: Readonly<Record<string, true>>;
  readonly resultsByTab: Readonly<Record<string, FirestoreQueryResultState>>;
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
    nextRunId: 1,
    pendingPageReloads: {},
    queryRequests: {},
    recordedQueryCompletions: {},
    resultsByTab: {},
    selectedDocumentPaths: {},
  };
}

export function emptyFirestoreQueryResultState(): FirestoreQueryResultState {
  return {
    errorMessage: null,
    hasMore: false,
    isFetchingMore: false,
    isLoading: false,
    pages: [],
    resultView: 'table',
    resultsStale: false,
  };
}

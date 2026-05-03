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
  readonly errorMessage: string | null;
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly isLoading: boolean;
  readonly nextRunId: number;
  readonly pages: ReadonlyArray<FirestoreQueryPage>;
  readonly pendingPageReloads: Readonly<Record<string, number>>;
  readonly queryRequests: Readonly<Record<string, SubmittedFirestoreQuery | null>>;
  readonly recordedQueryCompletions: Readonly<Record<string, true>>;
  readonly resultsByTab: Readonly<Record<string, FirestoreQueryResultState>>;
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
  const result = emptyFirestoreQueryResultState();
  return {
    drafts: input.drafts ?? {},
    errorMessage: result.errorMessage,
    hasMore: result.hasMore,
    isFetchingMore: result.isFetchingMore,
    isLoading: result.isLoading,
    nextRunId: 1,
    pages: result.pages,
    pendingPageReloads: {},
    queryRequests: {},
    recordedQueryCompletions: {},
    resultsByTab: {},
    resultView: result.resultView,
    resultsStale: result.resultsStale,
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

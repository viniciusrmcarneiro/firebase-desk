/**
 * Pagination cursor passed back to the caller for `Load more` style flows.
 * Opaque to consumers; repository implementations encode/decode their own state.
 */
export interface PaginationCursor {
  readonly token: string;
}

export interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor: PaginationCursor | null;
}

export interface PageRequest {
  readonly limit?: number;
  readonly cursor?: PaginationCursor;
}

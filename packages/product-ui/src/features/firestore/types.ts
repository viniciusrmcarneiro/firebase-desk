import type { FirestoreFilterOp } from '@firebase-desk/repo-contracts';

export interface FirestoreQueryDraft {
  readonly path: string;
  readonly filters?: ReadonlyArray<FirestoreQueryFilterDraft>;
  readonly filterField: string;
  readonly filterOp: FirestoreFilterOp;
  readonly filterValue: string;
  readonly sortField: string;
  readonly sortDirection: 'asc' | 'desc';
  readonly limit: number;
}

export interface FirestoreQueryFilterDraft {
  readonly id: string;
  readonly field: string;
  readonly op: FirestoreFilterOp;
  readonly value: string;
}

export type FirestoreResultView = 'json' | 'table' | 'tree';

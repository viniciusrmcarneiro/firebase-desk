import type { Page, PageRequest } from './pagination.ts';

export interface FirestoreCollectionNode {
  readonly path: string;
  readonly id: string;
  readonly documentCount?: number;
}

export interface FirestoreDocumentNode {
  readonly path: string;
  readonly id: string;
  readonly hasSubcollections: boolean;
}

export type FirestoreFilterOp =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'in'
  | 'not-in'
  | 'array-contains'
  | 'array-contains-any';

export interface FirestoreFilter {
  readonly field: string;
  readonly op: FirestoreFilterOp;
  readonly value: unknown;
}

export interface FirestoreSort {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

export interface FirestoreQuery {
  readonly projectId: string;
  readonly path: string;
  readonly filters?: ReadonlyArray<FirestoreFilter>;
  readonly sorts?: ReadonlyArray<FirestoreSort>;
}

export interface FirestoreDocumentResult {
  readonly id: string;
  readonly path: string;
  readonly data: Record<string, unknown>;
  readonly hasSubcollections: boolean;
  readonly subcollections?: ReadonlyArray<FirestoreCollectionNode>;
}

export interface FirestoreRepository {
  listRootCollections(projectId: string): Promise<ReadonlyArray<FirestoreCollectionNode>>;
  listDocuments(
    projectId: string,
    collectionPath: string,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentNode>>;
  listSubcollections(
    projectId: string,
    documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>>;
  runQuery(
    query: FirestoreQuery,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentResult>>;
  getDocument(projectId: string, documentPath: string): Promise<FirestoreDocumentResult | null>;
  saveDocument(
    projectId: string,
    documentPath: string,
    data: Record<string, unknown>,
  ): Promise<FirestoreDocumentResult>;
  deleteDocument(projectId: string, documentPath: string): Promise<void>;
}

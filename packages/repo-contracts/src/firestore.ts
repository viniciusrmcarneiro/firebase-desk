import type { Page, PageRequest } from './pagination.ts';
import type { FirestoreFieldStaleBehavior } from './settings.ts';

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
  readonly connectionId: string;
  readonly path: string;
  readonly filters?: ReadonlyArray<FirestoreFilter>;
  readonly sorts?: ReadonlyArray<FirestoreSort>;
}

export interface FirestoreQueryDraft {
  readonly filterField: string;
  readonly filterOp: FirestoreFilterOp;
  readonly filterValue: string;
  readonly filters?: ReadonlyArray<FirestoreQueryFilterDraft>;
  readonly limit: number;
  readonly path: string;
  readonly sortDirection: 'asc' | 'desc';
  readonly sortField: string;
}

export interface FirestoreQueryFilterDraft {
  readonly field: string;
  readonly id: string;
  readonly op: FirestoreFilterOp;
  readonly value: string;
}

export interface FirestoreDocumentResult {
  readonly id: string;
  readonly path: string;
  readonly data: Record<string, unknown>;
  readonly hasSubcollections: boolean;
  readonly subcollections?: ReadonlyArray<FirestoreCollectionNode>;
  readonly updateTime?: string;
}

export interface FirestoreDeleteDocumentOptions {
  readonly deleteSubcollectionPaths: ReadonlyArray<string>;
}

export interface FirestoreGeneratedDocumentId {
  readonly documentId: string;
}

export interface FirestoreSaveDocumentOptions {
  readonly lastUpdateTime?: string;
}

export interface FirestoreUpdateDocumentFieldsOptions {
  readonly lastUpdateTime?: string;
  readonly staleBehavior: FirestoreFieldStaleBehavior;
}

export type FirestoreFieldPatchOperation =
  | {
    readonly baseValue: unknown;
    readonly fieldPath: ReadonlyArray<string>;
    readonly type: 'delete';
  }
  | {
    readonly baseValue: unknown;
    readonly fieldPath: ReadonlyArray<string>;
    readonly type: 'set';
    readonly value: unknown;
  };

export type FirestoreSaveDocumentResult =
  | {
    readonly status: 'saved';
    readonly document: FirestoreDocumentResult;
  }
  | {
    readonly status: 'conflict';
    readonly remoteDocument: FirestoreDocumentResult | null;
  };

export type FirestoreUpdateDocumentFieldsResult =
  | {
    readonly document: FirestoreDocumentResult;
    readonly documentChanged?: boolean;
    readonly status: 'saved';
  }
  | {
    readonly remoteDocument: FirestoreDocumentResult | null;
    readonly status: 'document-changed';
  }
  | {
    readonly remoteDocument: FirestoreDocumentResult | null;
    readonly status: 'conflict';
  };

export interface FirestoreRepository {
  listRootCollections(connectionId: string): Promise<ReadonlyArray<FirestoreCollectionNode>>;
  listDocuments(
    connectionId: string,
    collectionPath: string,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentNode>>;
  listSubcollections(
    connectionId: string,
    documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>>;
  runQuery(
    query: FirestoreQuery,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentResult>>;
  getDocument(connectionId: string, documentPath: string): Promise<FirestoreDocumentResult | null>;
  generateDocumentId(
    connectionId: string,
    collectionPath: string,
  ): Promise<FirestoreGeneratedDocumentId>;
  createDocument(
    connectionId: string,
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<FirestoreDocumentResult>;
  saveDocument(
    connectionId: string,
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ): Promise<FirestoreSaveDocumentResult>;
  updateDocumentFields(
    connectionId: string,
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
  ): Promise<FirestoreUpdateDocumentFieldsResult>;
  deleteDocument(
    connectionId: string,
    documentPath: string,
    options?: FirestoreDeleteDocumentOptions,
  ): Promise<void>;
}

export function assertFirestoreCollectionPath(path: string): void {
  if (!isFirestoreCollectionPath(path)) {
    throw new Error(`Invalid Firestore collection path: ${path}`);
  }
}

export function assertFirestoreDocumentPath(path: string): void {
  if (!isFirestoreDocumentPath(path)) {
    throw new Error(`Invalid Firestore document path: ${path}`);
  }
}

export function isFirestoreCollectionPath(path: string): boolean {
  const parts = firestorePathParts(path);
  return parts.length > 0 && parts.length % 2 === 1;
}

export function isFirestoreDocumentPath(path: string): boolean {
  const parts = firestorePathParts(path);
  return parts.length > 0 && parts.length % 2 === 0;
}

export function firestorePathParts(path: string): ReadonlyArray<string> {
  const parts = path.split('/');
  return parts.some((part) => part.length === 0) ? [] : parts;
}

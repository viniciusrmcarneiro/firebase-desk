import {
  assertFirestoreCollectionPath,
  assertFirestoreDocumentPath,
  DEFAULT_PAGE_LIMIT,
  type FirestoreCollectionNode,
  type FirestoreDeleteDocumentOptions,
  type FirestoreDocumentNode,
  type FirestoreDocumentResult,
  type FirestoreFieldPatchOperation,
  firestorePathParts,
  type FirestoreRepository,
  type FirestoreSaveDocumentOptions,
  type FirestoreSaveDocumentResult,
  type FirestoreUpdateDocumentFieldsOptions,
  type FirestoreUpdateDocumentFieldsResult,
  type Page,
  type PageRequest,
} from '@firebase-desk/repo-contracts';
import {
  type CollectionReference,
  type DocumentSnapshot,
  FieldPath,
  FieldValue,
  type Firestore,
  type OrderByDirection,
  type Query,
  type QueryDocumentSnapshot,
  type WhereFilterOp,
} from 'firebase-admin/firestore';
import type {
  AdminFirestoreProvider,
  FirebaseConnectionConfig,
} from './admin-firestore-provider.ts';
import { FirestoreCursorCache } from './cursor-cache.ts';
import { decodeAdminData, decodeFilterValue, encodeAdminData } from './value-codec.ts';

const MAX_LIMIT = 250;

export class FirebaseFirestoreRepository implements FirestoreRepository {
  private readonly cursors: FirestoreCursorCache;
  private readonly provider: AdminFirestoreProvider;

  constructor(
    provider: AdminFirestoreProvider,
    cursors = new FirestoreCursorCache(),
  ) {
    this.provider = provider;
    this.cursors = cursors;
  }

  async listRootCollections(connectionId: string): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    return await this.withConnection(connectionId, async (db) => {
      const collections = await db.listCollections();
      return collections.map((collection) => collectionNode(collection));
    });
  }

  async listDocuments(
    connectionId: string,
    collectionPath: string,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentNode>> {
    assertCollectionPath(collectionPath);
    return await this.withConnection(connectionId, async (db) => {
      let query: Query = db.collection(collectionPath).orderBy(FieldPath.documentId());
      query = applyCursor(connectionId, query, this.cursors, request);
      const snapshot = await query.limit(limitFor(request) + 1).get();
      return pageFromSnapshots(connectionId, this.cursors, snapshot.docs, async (doc) => {
        const subcollections = await doc.ref.listCollections();
        return { id: doc.id, path: doc.ref.path, hasSubcollections: subcollections.length > 0 };
      }, request);
    });
  }

  async listSubcollections(
    connectionId: string,
    documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    assertDocumentPath(documentPath);
    return await this.withConnection(connectionId, async (db) => {
      const collections = await db.doc(documentPath).listCollections();
      return collections.map((collection) => collectionNode(collection));
    });
  }

  async runQuery(
    query: Parameters<FirestoreRepository['runQuery']>[0],
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentResult>> {
    assertCollectionPath(query.path);
    return await this.withConnection(query.connectionId, async (db) => {
      let adminQuery: Query = db.collection(query.path);
      for (const filter of query.filters ?? []) {
        adminQuery = adminQuery.where(
          filter.field,
          filter.op as WhereFilterOp,
          decodeFilterValue(db, filter.value),
        );
      }
      for (const sort of query.sorts ?? []) {
        adminQuery = adminQuery.orderBy(sort.field, sort.direction as OrderByDirection);
      }
      adminQuery = applyCursor(query.connectionId, adminQuery, this.cursors, request);
      const snapshot = await adminQuery.limit(limitFor(request) + 1).get();
      return pageFromSnapshots(
        query.connectionId,
        this.cursors,
        snapshot.docs,
        (doc) => documentResult(doc),
        request,
      );
    });
  }

  async getDocument(
    connectionId: string,
    documentPath: string,
  ): Promise<FirestoreDocumentResult | null> {
    assertDocumentPath(documentPath);
    return await this.withConnection(connectionId, async (db) => {
      const snapshot = await db.doc(documentPath).get();
      if (!snapshot.exists) return null;
      return await documentResult(snapshot);
    });
  }

  async generateDocumentId(
    connectionId: string,
    collectionPath: string,
  ): Promise<{ readonly documentId: string; }> {
    assertCollectionPath(collectionPath);
    return await this.withConnection(connectionId, async (db) => ({
      documentId: db.collection(collectionPath).doc().id,
    }));
  }

  async createDocument(
    connectionId: string,
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<FirestoreDocumentResult> {
    assertCollectionPath(collectionPath);
    assertDocumentId(documentId);
    return await this.withConnection(connectionId, async (db) => {
      const ref = db.collection(collectionPath).doc(documentId);
      await ref.create(decodeAdminData(db, data));
      return await documentResult(await ref.get());
    });
  }

  async saveDocument(
    connectionId: string,
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ): Promise<FirestoreSaveDocumentResult> {
    assertDocumentPath(documentPath);
    return await this.withConnection(connectionId, async (db) => {
      const ref = db.doc(documentPath);
      const decodedData = decodeAdminData(db, data);
      if (options?.lastUpdateTime) {
        const conflictDocument = await db.runTransaction(async (transaction) => {
          const current = await transaction.get(ref);
          if (snapshotUpdateTime(current) !== options.lastUpdateTime) {
            return current.exists ? await documentResult(current) : null;
          }
          transaction.set(ref, decodedData);
          return undefined;
        });
        if (conflictDocument !== undefined) {
          return { status: 'conflict', remoteDocument: conflictDocument };
        }
      } else {
        await ref.set(decodedData);
      }
      const snapshot = await ref.get();
      return { status: 'saved', document: await documentResult(snapshot) };
    });
  }

  async updateDocumentFields(
    connectionId: string,
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
  ): Promise<FirestoreUpdateDocumentFieldsResult> {
    assertDocumentPath(documentPath);
    assertFieldPatchOperations(operations);
    return await this.withConnection(connectionId, async (db) => {
      const ref = db.doc(documentPath);
      const transactionResult = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        if (!current.exists) return { status: 'conflict' as const, remoteDocument: null };

        const currentUpdateTime = snapshotUpdateTime(current);
        const documentChanged = Boolean(
          options.lastUpdateTime && currentUpdateTime !== options.lastUpdateTime,
        );

        if (documentChanged) {
          const remoteDocument = await documentResult(current);
          if (fieldPatchHasChangedRemoteValue(remoteDocument.data, operations)) {
            return { status: 'conflict' as const, remoteDocument };
          }
          if (options.staleBehavior !== 'save-and-notify') {
            return { status: 'document-changed' as const, remoteDocument };
          }
        }

        for (const operation of operations) {
          transaction.update(
            ref,
            new FieldPath(...operation.fieldPath),
            operation.type === 'delete'
              ? FieldValue.delete()
              : decodeFilterValue(db, operation.value),
          );
        }
        return { status: 'saved' as const, documentChanged };
      });

      if (transactionResult.status !== 'saved') return transactionResult;

      const snapshot = await ref.get();
      if (!snapshot.exists) return { status: 'conflict', remoteDocument: null };
      return {
        status: 'saved',
        document: await documentResult(snapshot),
        ...(transactionResult.documentChanged ? { documentChanged: true } : {}),
      };
    });
  }

  async deleteDocument(
    connectionId: string,
    documentPath: string,
    options?: FirestoreDeleteDocumentOptions,
  ): Promise<void> {
    assertDocumentPath(documentPath);
    const deleteSubcollectionPaths = options?.deleteSubcollectionPaths ?? [];
    for (const subcollectionPath of deleteSubcollectionPaths) {
      assertDirectSubcollectionPath(documentPath, subcollectionPath);
    }
    await this.withConnection(connectionId, async (db) => {
      await Promise.all(
        deleteSubcollectionPaths.map((subcollectionPath) =>
          db.recursiveDelete(db.collection(subcollectionPath))
        ),
      );
      await db.doc(documentPath).delete();
    });
  }

  invalidateConnection(connectionId: string): void {
    this.cursors.invalidateConnection(connectionId);
  }

  private async withConnection<T>(
    connectionId: string,
    operation: (db: Firestore) => Promise<T>,
  ): Promise<T> {
    const { config, db } = await this.provider.getFirestoreConnection(connectionId);
    try {
      return await operation(db);
    } catch (caught) {
      throw firestoreOperationError(caught, config);
    }
  }
}

function collectionNode(collection: CollectionReference): FirestoreCollectionNode {
  return { id: collection.id, path: collection.path };
}

async function documentResult(snapshot: DocumentSnapshot): Promise<FirestoreDocumentResult> {
  const subcollections = await snapshot.ref.listCollections();
  const collectionNodes = subcollections.map(collectionNode);
  return {
    id: snapshot.id,
    path: snapshot.ref.path,
    data: encodeAdminData(snapshot.data() ?? {}),
    hasSubcollections: collectionNodes.length > 0,
    subcollections: collectionNodes,
    ...(snapshotUpdateTime(snapshot) ? { updateTime: snapshotUpdateTime(snapshot)! } : {}),
  };
}

function snapshotUpdateTime(snapshot: DocumentSnapshot): string | null {
  return snapshot.updateTime ? snapshot.updateTime.toDate().toISOString() : null;
}

async function pageFromSnapshots<T>(
  connectionId: string,
  cursors: FirestoreCursorCache,
  docs: ReadonlyArray<QueryDocumentSnapshot>,
  mapDoc: (snapshot: QueryDocumentSnapshot) => Promise<T> | T,
  request?: PageRequest,
): Promise<Page<T>> {
  const limit = limitFor(request);
  const items = docs.slice(0, limit);
  const mapped = await Promise.all(items.map((item) => mapDoc(item)));
  const cursorSnapshot = docs.length > limit ? items.at(-1) : undefined;
  return {
    items: mapped,
    nextCursor: cursorSnapshot ? { token: cursors.create(connectionId, cursorSnapshot) } : null,
  };
}

function applyCursor(
  connectionId: string,
  query: Query,
  cursors: FirestoreCursorCache,
  request?: PageRequest,
): Query {
  if (!request?.cursor) return query;
  const snapshot = cursors.get(connectionId, request.cursor.token);
  if (!snapshot) throw new Error('Firestore pagination cursor expired. Run the query again.');
  return query.startAfter(snapshot);
}

function limitFor(request?: PageRequest): number {
  const value = request?.limit ?? DEFAULT_PAGE_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, value));
}

function assertCollectionPath(path: string): void {
  assertFirestoreCollectionPath(path);
}

function assertDocumentPath(path: string): void {
  assertFirestoreDocumentPath(path);
}

function assertDocumentId(id: string): void {
  if (!id.trim() || id.includes('/')) {
    throw new Error(`Invalid Firestore document ID: ${id}`);
  }
}

function assertFieldPatchOperations(
  operations: ReadonlyArray<FirestoreFieldPatchOperation>,
): void {
  if (!operations.length) throw new Error('At least one Firestore field operation is required.');
  for (const operation of operations) {
    if (!operation.fieldPath.length) throw new Error('Firestore field path is required.');
    for (const segment of operation.fieldPath) {
      if (!segment || /^__.*__$/.test(segment) || Buffer.byteLength(segment, 'utf8') > 1500) {
        throw new Error(`Invalid Firestore field path segment: ${segment}`);
      }
    }
  }
}

function assertDirectSubcollectionPath(documentPath: string, collectionPath: string): void {
  assertCollectionPath(collectionPath);
  const parentPrefix = `${documentPath}/`;
  if (!collectionPath.startsWith(parentPrefix)) {
    throw new Error(
      `Invalid Firestore subcollection path ${collectionPath} for document ${documentPath}`,
    );
  }
  const remainingParts = firestorePathParts(collectionPath.slice(parentPrefix.length));
  if (remainingParts.length !== 1) {
    throw new Error(
      `Invalid Firestore subcollection path ${collectionPath} for document ${documentPath}`,
    );
  }
}

function fieldPatchHasChangedRemoteValue(
  remoteData: Record<string, unknown>,
  operations: ReadonlyArray<FirestoreFieldPatchOperation>,
): boolean {
  return operations.some((operation) =>
    !deepEqual(getNestedValue(remoteData, operation.fieldPath), operation.baseValue)
  );
}

function getNestedValue(
  data: Record<string, unknown>,
  fieldPath: ReadonlyArray<string>,
): unknown {
  let current: unknown = data;
  for (const segment of fieldPath) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortJson(left)) === JSON.stringify(sortJson(right));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    sortedEntriesByKey(value as Record<string, unknown>)
      .map(([key, entry]) => [key, sortJson(entry)]),
  );
}

function sortedEntriesByKey(value: Record<string, unknown>): ReadonlyArray<[string, unknown]> {
  const sorted: Array<[string, unknown]> = [];
  for (const entry of Object.entries(value)) {
    const index = sorted.findIndex(([key]) => entry[0].localeCompare(key) < 0);
    if (index < 0) sorted.push(entry);
    else sorted.splice(index, 0, entry);
  }
  return sorted;
}

function firestoreOperationError(caught: unknown, config: FirebaseConnectionConfig): Error {
  if (config.project.target === 'emulator' && isConnectivityError(caught)) {
    const host = config.project.emulator?.firestoreHost ?? 'the configured host';
    const error = new Error(
      `Firestore emulator is not reachable at ${host}. Start the emulator or update the connection settings.`,
    );
    (error as Error & { cause?: unknown; }).cause = caught;
    return error;
  }
  return caught instanceof Error ? caught : new Error(String(caught));
}

function isConnectivityError(caught: unknown): boolean {
  if (!caught || typeof caught !== 'object') return false;
  const code = (caught as { readonly code?: unknown; }).code;
  if (code === 4 || code === 14) return true;
  const message = caught instanceof Error ? caught.message : String(caught);
  return /ECONNREFUSED|UNAVAILABLE|No connection established|Total timeout/i.test(message);
}

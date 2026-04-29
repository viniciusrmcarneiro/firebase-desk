import type {
  FirestoreCollectionNode,
  FirestoreDocumentNode,
  FirestoreDocumentResult,
  FirestoreRepository,
  Page,
  PageRequest,
} from '@firebase-desk/repo-contracts';
import {
  type CollectionReference,
  type DocumentSnapshot,
  FieldPath,
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
import { decodeFilterValue, encodeAdminData } from './value-codec.ts';

const DEFAULT_LIMIT = 25;
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

  async saveDocument(): Promise<FirestoreDocumentResult> {
    throw new Error('Firestore writes are not available until Phase 8.');
  }

  async deleteDocument(): Promise<void> {
    throw new Error('Firestore deletes are not available until Phase 8.');
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
  };
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
  const value = request?.limit ?? DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, value));
}

function assertCollectionPath(path: string): void {
  const parts = pathParts(path);
  if (parts.length === 0 || parts.length % 2 === 0) {
    throw new Error(`Invalid Firestore collection path: ${path}`);
  }
}

function assertDocumentPath(path: string): void {
  const parts = pathParts(path);
  if (parts.length === 0 || parts.length % 2 !== 0) {
    throw new Error(`Invalid Firestore document path: ${path}`);
  }
}

function pathParts(path: string): ReadonlyArray<string> {
  return path.split('/').filter(Boolean);
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

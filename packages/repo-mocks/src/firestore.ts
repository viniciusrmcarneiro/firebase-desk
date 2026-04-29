import { decode, encode } from '@firebase-desk/data-format';
import type {
  FirestoreCollectionNode,
  FirestoreDeleteDocumentOptions,
  FirestoreDocumentNode,
  FirestoreDocumentResult,
  FirestoreFilter,
  FirestoreQuery,
  FirestoreRepository,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  FirestoreSort,
  Page,
  PageRequest,
} from '@firebase-desk/repo-contracts';
import { COLLECTIONS, MOCK_CONNECTION_LOAD_ERROR_PROJECT_ID } from './fixtures/index.ts';

type FixtureDoc = (typeof COLLECTIONS)[number]['docs'][number];
type FixtureCollection = (typeof COLLECTIONS)[number];
type UpdateTimeLookup = (documentPath: string) => string;

const DEFAULT_LIMIT = 25;
const MOCK_UPDATE_TIME_EPOCH = Date.UTC(2026, 0, 1);

export class MockFirebaseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FirebaseError';
    this.code = code;
  }
}

export class MockFirestoreRepository implements FirestoreRepository {
  private readonly collections: FixtureCollection[] = cloneCollections(COLLECTIONS);
  private readonly documentIdGenerator: () => string;
  private readonly updateTimes = new Map<string, string>();
  private generatedIdCounter = 0;
  private updateTimeCounter = 0;

  constructor(documentIdGenerator?: () => string) {
    this.documentIdGenerator = documentIdGenerator ?? (() => `mock_${++this.generatedIdCounter}`);
  }

  async listRootCollections(connectionId: string): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    assertConnectionAvailable(connectionId);
    return this.collections
      .filter((collection) => !collection.path.includes('/'))
      .map((collection) => collectionNode(this.collections, collection.path));
  }

  async listDocuments(
    connectionId: string,
    collectionPath: string,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentNode>> {
    assertConnectionAvailable(connectionId);
    const collection = this.collections.find((c) => c.path === collectionPath);
    const docs = collection?.docs ?? [];
    return pageDocuments(this.collections, collectionPath, docs, request);
  }

  async listSubcollections(
    connectionId: string,
    documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    assertConnectionAvailable(connectionId);
    return subcollectionsFor(this.collections, documentPath, (path) => this.updateTimeFor(path));
  }

  async runQuery(
    query: FirestoreQuery,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentResult>> {
    assertConnectionAvailable(query.connectionId);
    const collection = this.collections.find((c) => c.path === query.path);
    const docs = sortDocs(filterDocs(collection?.docs ?? [], query.filters), query.sorts);
    return pageResults(
      this.collections,
      query.path,
      docs,
      request,
      (path) => this.updateTimeFor(path),
    );
  }

  async getDocument(
    connectionId: string,
    documentPath: string,
  ): Promise<FirestoreDocumentResult | null> {
    assertConnectionAvailable(connectionId);
    const parts = documentPath.split('/');
    const docId = parts.at(-1);
    const collectionPath = parts.slice(0, -1).join('/');
    const collection = this.collections.find((c) => c.path === collectionPath);
    const doc = collection?.docs.find((d) => d.id === docId);
    if (!doc) return null;
    const subcollections = subcollectionsFor(
      this.collections,
      documentPath,
      (path) => this.updateTimeFor(path),
    );
    return {
      id: doc.id,
      path: documentPath,
      data: encode(doc.data as never) as Record<string, unknown>,
      hasSubcollections: subcollections.length > 0,
      subcollections,
      updateTime: this.updateTimeFor(documentPath),
    };
  }

  async generateDocumentId(
    connectionId: string,
    collectionPath: string,
  ): Promise<{ readonly documentId: string; }> {
    assertConnectionAvailable(connectionId);
    assertCollectionPath(collectionPath);
    return { documentId: this.documentIdGenerator() };
  }

  async createDocument(
    connectionId: string,
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<FirestoreDocumentResult> {
    assertConnectionAvailable(connectionId);
    assertCollectionPath(collectionPath);
    assertDocumentId(documentId);
    const documentPath = `${collectionPath}/${documentId}`;
    if (await this.getDocument(connectionId, documentPath)) {
      throw new MockFirebaseError('already-exists', `Document ${documentPath} already exists`);
    }
    this.writeDocument(collectionPath, documentId, data);
    const saved = await this.getDocument(connectionId, documentPath);
    if (!saved) throw new MockFirebaseError('not-found', `Document ${documentPath} not found`);
    return saved;
  }

  async saveDocument(
    connectionId: string,
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ): Promise<FirestoreSaveDocumentResult> {
    assertConnectionAvailable(connectionId);
    const { collectionPath, docId } = splitDocumentPath(documentPath);
    const current = await this.getDocument(connectionId, documentPath);
    if (options?.lastUpdateTime && current?.updateTime !== options.lastUpdateTime) {
      return { status: 'conflict', remoteDocument: current };
    }
    this.writeDocument(collectionPath, docId, data);
    const saved = await this.getDocument(connectionId, documentPath);
    if (!saved) throw new MockFirebaseError('not-found', `Document ${documentPath} not found`);
    return { status: 'saved', document: saved };
  }

  private writeDocument(
    collectionPath: string,
    docId: string,
    data: Record<string, unknown>,
  ): void {
    let collection = this.collections.find((item) => item.path === collectionPath);
    if (!collection) {
      collection = { path: collectionPath, docs: [] };
      this.collections.push(collection);
    }
    const docs = [...collection.docs];
    const existingIndex = docs.findIndex((doc) => doc.id === docId);
    const nextDoc = { id: docId, data: decodeDocumentData(data) };
    if (existingIndex >= 0) docs.splice(existingIndex, 1, nextDoc);
    else docs.push(nextDoc);
    this.replaceCollection(collectionPath, docs);
    this.touchUpdateTime(`${collectionPath}/${docId}`);
  }

  async deleteDocument(
    connectionId: string,
    documentPath: string,
    options?: FirestoreDeleteDocumentOptions,
  ): Promise<void> {
    assertConnectionAvailable(connectionId);
    const { collectionPath, docId } = splitDocumentPath(documentPath);
    for (const subcollectionPath of options?.deleteSubcollectionPaths ?? []) {
      assertDirectSubcollectionPath(documentPath, subcollectionPath);
      this.deleteCollectionTree(subcollectionPath);
    }
    const collection = this.collections.find((item) => item.path === collectionPath);
    if (!collection) return;
    this.replaceCollection(
      collectionPath,
      collection.docs.filter((doc) => doc.id !== docId),
    );
    this.updateTimes.delete(documentPath);
  }

  private replaceCollection(path: string, docs: ReadonlyArray<FixtureDoc>) {
    const index = this.collections.findIndex((item) => item.path === path);
    const next = { path, docs };
    if (index >= 0) this.collections.splice(index, 1, next);
    else this.collections.push(next);
  }

  private deleteCollectionTree(path: string) {
    for (let index = this.collections.length - 1; index >= 0; index -= 1) {
      const collection = this.collections[index]!;
      if (collection.path === path || collection.path.startsWith(`${path}/`)) {
        for (const doc of collection.docs) this.updateTimes.delete(`${collection.path}/${doc.id}`);
        this.collections.splice(index, 1);
      }
    }
  }

  private updateTimeFor(documentPath: string): string {
    const current = this.updateTimes.get(documentPath);
    if (current) return current;
    return this.touchUpdateTime(documentPath);
  }

  private touchUpdateTime(documentPath: string): string {
    this.updateTimeCounter += 1;
    const updateTime = new Date(MOCK_UPDATE_TIME_EPOCH + this.updateTimeCounter).toISOString();
    this.updateTimes.set(documentPath, updateTime);
    return updateTime;
  }
}

function collectionNode(
  collections: ReadonlyArray<FixtureCollection>,
  path: string,
  updateTimeFor?: UpdateTimeLookup,
  options: { readonly includeDocuments?: boolean; } = {},
): FirestoreCollectionNode {
  const collection = collections.find((item) => item.path === path);
  const id = path.split('/').at(-1) ?? path;
  if (!collection) return { id, path };
  const base = { id, path, documentCount: collection.docs.length };
  if (!options.includeDocuments) return base;
  return {
    ...base,
    documents: pageResults(collections, collection.path, collection.docs, undefined, updateTimeFor)
      .items,
  } as FirestoreCollectionNode;
}

function pageDocuments(
  collections: ReadonlyArray<FixtureCollection>,
  collectionPath: string,
  docs: ReadonlyArray<FixtureDoc>,
  request?: PageRequest,
): Page<FirestoreDocumentNode> {
  const page = pageSlice(docs, request);
  return {
    items: page.items.map((doc) => {
      const path = `${collectionPath}/${doc.id}`;
      return { id: doc.id, path, hasSubcollections: hasSubcollections(collections, path) };
    }),
    nextCursor: page.nextCursor,
  };
}

function pageResults(
  collections: ReadonlyArray<FixtureCollection>,
  collectionPath: string,
  docs: ReadonlyArray<FixtureDoc>,
  request?: PageRequest,
  updateTimeFor: UpdateTimeLookup = () => new Date(MOCK_UPDATE_TIME_EPOCH).toISOString(),
): Page<FirestoreDocumentResult> {
  const page = pageSlice(docs, request);
  return {
    items: page.items.map((doc) => {
      const path = `${collectionPath}/${doc.id}`;
      const subcollections = subcollectionsFor(collections, path, updateTimeFor);
      return {
        id: doc.id,
        path,
        data: encode(doc.data as never) as Record<string, unknown>,
        hasSubcollections: subcollections.length > 0,
        subcollections,
        updateTime: updateTimeFor(path),
      };
    }),
    nextCursor: page.nextCursor,
  };
}

function pageSlice<T>(items: ReadonlyArray<T>, request?: PageRequest): Page<T> {
  const offset = Number.parseInt(request?.cursor?.token ?? '0', 10) || 0;
  const limit = request?.limit ?? DEFAULT_LIMIT;
  const nextOffset = offset + limit;
  return {
    items: items.slice(offset, nextOffset),
    nextCursor: nextOffset < items.length ? { token: String(nextOffset) } : null,
  };
}

function hasSubcollections(
  collections: ReadonlyArray<FixtureCollection>,
  documentPath: string,
): boolean {
  return collections.some((collection) => collection.path.startsWith(`${documentPath}/`));
}

function subcollectionsFor(
  collections: ReadonlyArray<FixtureCollection>,
  documentPath: string,
  updateTimeFor: UpdateTimeLookup = () => new Date(MOCK_UPDATE_TIME_EPOCH).toISOString(),
): ReadonlyArray<FirestoreCollectionNode> {
  const prefix = `${documentPath}/`;
  return collections
    .filter((collection) => collection.path.startsWith(prefix))
    .map((collection) => collection.path.slice(prefix.length))
    .filter((path) => path.length > 0 && !path.includes('/'))
    .map((id) =>
      collectionNode(collections, `${prefix}${id}`, updateTimeFor, { includeDocuments: true })
    );
}

function filterDocs(
  docs: ReadonlyArray<FixtureDoc>,
  filters: FirestoreQuery['filters'],
): ReadonlyArray<FixtureDoc> {
  if (!filters?.length) return docs;
  return docs.filter((doc) => filters.every((filter) => matchesFilter(doc.data, filter)));
}

function matchesFilter(data: Record<string, unknown>, filter: FirestoreFilter): boolean {
  const actual = data[filter.field];
  const expected = filter.value;
  switch (filter.op) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '<':
      return compare(actual, expected) < 0;
    case '<=':
      return compare(actual, expected) <= 0;
    case '>':
      return compare(actual, expected) > 0;
    case '>=':
      return compare(actual, expected) >= 0;
    case 'array-contains':
      return Array.isArray(actual) && actual.includes(expected);
    case 'array-contains-any':
      return Array.isArray(actual) && Array.isArray(expected)
        && expected.some((value) => actual.includes(value));
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'not-in':
      return Array.isArray(expected) && !expected.includes(actual);
  }
}

function sortDocs(
  docs: ReadonlyArray<FixtureDoc>,
  sorts: FirestoreQuery['sorts'],
): ReadonlyArray<FixtureDoc> {
  if (!sorts?.length) return docs;
  const sorted: FixtureDoc[] = [];
  for (const doc of docs) {
    const index = sorted.findIndex((item) => compareBySorts(doc.data, item.data, sorts) < 0);
    if (index < 0) sorted.push(doc);
    else sorted.splice(index, 0, doc);
  }
  return sorted;
}

function compareBySorts(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  sorts: ReadonlyArray<FirestoreSort>,
): number {
  for (const sort of sorts) {
    const result = compare(left[sort.field], right[sort.field]);
    if (result !== 0) return sort.direction === 'asc' ? result : -result;
  }
  return 0;
}

function compare(left: unknown, right: unknown): number {
  const leftValue = comparable(left);
  const rightValue = comparable(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function comparable(value: unknown): string | number {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const toJSON = (value as { readonly toJSON?: () => unknown; }).toJSON;
    if (typeof toJSON === 'function') return JSON.stringify(toJSON.call(value));
  }
  return JSON.stringify(value);
}

function assertConnectionAvailable(connectionId: string) {
  if (connectionId === MOCK_CONNECTION_LOAD_ERROR_PROJECT_ID) {
    throw new MockFirebaseError(
      'permission-denied',
      'Mock connection failed to load. Check credentials or retry.',
    );
  }
}

function splitDocumentPath(documentPath: string) {
  const parts = documentPath.split('/').filter(Boolean);
  if (parts.length === 0 || parts.length % 2 !== 0) {
    throw new MockFirebaseError('invalid-argument', `Invalid document path: ${documentPath}`);
  }
  return {
    collectionPath: parts.slice(0, -1).join('/'),
    docId: parts.at(-1)!,
  };
}

function assertCollectionPath(collectionPath: string) {
  const parts = collectionPath.split('/').filter(Boolean);
  if (parts.length === 0 || parts.length % 2 === 0) {
    throw new MockFirebaseError('invalid-argument', `Invalid collection path: ${collectionPath}`);
  }
}

function assertDocumentId(documentId: string) {
  if (!documentId.trim() || documentId.includes('/')) {
    throw new MockFirebaseError('invalid-argument', `Invalid document ID: ${documentId}`);
  }
}

function assertDirectSubcollectionPath(documentPath: string, collectionPath: string) {
  const documentParts = documentPath.split('/').filter(Boolean);
  const collectionParts = collectionPath.split('/').filter(Boolean);
  if (collectionParts.length === 0 || collectionParts.length % 2 === 0) {
    throw new MockFirebaseError('invalid-argument', `Invalid collection path: ${collectionPath}`);
  }
  if (
    collectionParts.length !== documentParts.length + 1
    || collectionParts.slice(0, documentParts.length).join('/') !== documentParts.join('/')
  ) {
    throw new MockFirebaseError(
      'invalid-argument',
      `Invalid subcollection path ${collectionPath} for document ${documentPath}`,
    );
  }
}

function decodeDocumentData(data: Record<string, unknown>): Record<string, unknown> {
  const decoded = decode(data as never);
  if (!isPlainObject(decoded)) {
    throw new MockFirebaseError('invalid-argument', 'Firestore document data must be an object.');
  }
  return decoded;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneCollections(
  collections: ReadonlyArray<FixtureCollection>,
): FixtureCollection[] {
  return collections.map((collection) => ({
    path: collection.path,
    docs: collection.docs.map((doc) => ({ id: doc.id, data: { ...doc.data } })),
  }));
}

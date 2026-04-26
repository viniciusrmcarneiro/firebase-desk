import { encode } from '@firebase-desk/data-format';
import type {
  FirestoreCollectionNode,
  FirestoreDocumentNode,
  FirestoreDocumentResult,
  FirestoreQuery,
  FirestoreRepository,
  Page,
  PageRequest,
} from '@firebase-desk/repo-contracts';
import { COLLECTIONS } from './fixtures/index.ts';

export class MockFirestoreRepository implements FirestoreRepository {
  async listRootCollections(_projectId: string): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    return COLLECTIONS.map((c) => ({ id: c.name, path: c.name }));
  }

  async listDocuments(
    _projectId: string,
    collectionPath: string,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentNode>> {
    const collection = COLLECTIONS.find((c) => c.name === collectionPath);
    const docs = collection?.docs ?? [];
    const limit = request?.limit ?? docs.length;
    return {
      items: docs.slice(0, limit).map((d) => ({
        id: d.id,
        path: `${collectionPath}/${d.id}`,
        hasSubcollections: false,
      })),
      nextCursor: null,
    };
  }

  async listSubcollections(
    _projectId: string,
    _documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    return [];
  }

  async runQuery(
    query: FirestoreQuery,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentResult>> {
    const collection = COLLECTIONS.find((c) => c.name === query.path);
    const docs = collection?.docs ?? [];
    const limit = request?.limit ?? docs.length;
    return {
      items: docs.slice(0, limit).map((d) => ({
        id: d.id,
        path: `${query.path}/${d.id}`,
        data: encode(d.data as never) as Record<string, unknown>,
        hasSubcollections: false,
      })),
      nextCursor: null,
    };
  }

  async getDocument(
    _projectId: string,
    documentPath: string,
  ): Promise<FirestoreDocumentResult | null> {
    const [collectionName, docId] = documentPath.split('/');
    const collection = COLLECTIONS.find((c) => c.name === collectionName);
    const doc = collection?.docs.find((d) => d.id === docId);
    if (!doc) return null;
    return {
      id: doc.id,
      path: documentPath,
      data: encode(doc.data as never) as Record<string, unknown>,
      hasSubcollections: false,
    };
  }
}

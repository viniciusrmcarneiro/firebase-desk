import type { IpcRequest, IpcResponse } from '@firebase-desk/ipc-schemas';
import type {
  FirestoreCollectionNode,
  FirestoreDeleteDocumentOptions,
  FirestoreDocumentNode,
  FirestoreDocumentResult,
  FirestoreGeneratedDocumentId,
  FirestoreQuery,
  FirestoreRepository,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  Page,
  PageRequest,
} from '@firebase-desk/repo-contracts';

export class IpcFirestoreRepository implements FirestoreRepository {
  async listRootCollections(connectionId: string): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    const collections = await window.firebaseDesk.firestore.listRootCollections({ connectionId });
    return collections.map(toCollectionNode);
  }

  async listDocuments(
    connectionId: string,
    collectionPath: string,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentNode>> {
    const page = await window.firebaseDesk.firestore.listDocuments({
      collectionPath,
      connectionId,
      ...(request ? { request: toIpcPageRequest(request) } : {}),
    });
    return {
      items: page.items.map((document) => ({
        id: document.id,
        path: document.path,
        hasSubcollections: document.hasSubcollections,
      })),
      nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
    };
  }

  async listSubcollections(
    connectionId: string,
    documentPath: string,
  ): Promise<ReadonlyArray<FirestoreCollectionNode>> {
    const collections = await window.firebaseDesk.firestore.listSubcollections({
      connectionId,
      documentPath,
    });
    return collections.map(toCollectionNode);
  }

  async runQuery(
    query: FirestoreQuery,
    request?: PageRequest,
  ): Promise<Page<FirestoreDocumentResult>> {
    const page = await window.firebaseDesk.firestore.runQuery({
      query: toIpcQuery(query),
      ...(request ? { request: toIpcPageRequest(request) } : {}),
    });
    return {
      items: page.items.map(toDocumentResult),
      nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
    };
  }

  async getDocument(
    connectionId: string,
    documentPath: string,
  ): Promise<FirestoreDocumentResult | null> {
    const document = await window.firebaseDesk.firestore.getDocument({
      connectionId,
      documentPath,
    });
    return document ? toDocumentResult(document) : null;
  }

  async saveDocument(
    connectionId: string,
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ): Promise<FirestoreSaveDocumentResult> {
    const result = await window.firebaseDesk.firestore.saveDocument({
      connectionId,
      data,
      documentPath,
      ...(options ? { options: toIpcSaveOptions(options) } : {}),
    });
    return result.status === 'conflict'
      ? {
        status: 'conflict',
        remoteDocument: result.remoteDocument ? toDocumentResult(result.remoteDocument) : null,
      }
      : { status: 'saved', document: toDocumentResult(result.document) };
  }

  async generateDocumentId(
    connectionId: string,
    collectionPath: string,
  ): Promise<FirestoreGeneratedDocumentId> {
    return await window.firebaseDesk.firestore.generateDocumentId({
      collectionPath,
      connectionId,
    });
  }

  async createDocument(
    connectionId: string,
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<FirestoreDocumentResult> {
    return toDocumentResult(
      await window.firebaseDesk.firestore.createDocument({
        collectionPath,
        connectionId,
        data,
        documentId,
      }),
    );
  }

  async deleteDocument(
    connectionId: string,
    documentPath: string,
    options?: FirestoreDeleteDocumentOptions,
  ): Promise<void> {
    await window.firebaseDesk.firestore.deleteDocument({
      connectionId,
      documentPath,
      ...(options ? { options: toIpcDeleteOptions(options) } : {}),
    });
  }
}

function toIpcPageRequest(request: PageRequest): IpcRequest<'firestore.listDocuments'>['request'] {
  return {
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
    ...(request.cursor !== undefined ? { cursor: { token: request.cursor.token } } : {}),
  };
}

function toIpcQuery(query: FirestoreQuery): IpcRequest<'firestore.runQuery'>['query'] {
  return {
    connectionId: query.connectionId,
    path: query.path,
    ...(query.filters !== undefined
      ? { filters: query.filters.map((filter) => ({ ...filter })) }
      : {}),
    ...(query.sorts !== undefined ? { sorts: query.sorts.map((sort) => ({ ...sort })) } : {}),
  };
}

function toIpcDeleteOptions(
  options: FirestoreDeleteDocumentOptions,
): NonNullable<IpcRequest<'firestore.deleteDocument'>['options']> {
  return {
    deleteSubcollectionPaths: [...options.deleteSubcollectionPaths],
  };
}

function toIpcSaveOptions(
  options: FirestoreSaveDocumentOptions,
): NonNullable<IpcRequest<'firestore.saveDocument'>['options']> {
  return options.lastUpdateTime ? { lastUpdateTime: options.lastUpdateTime } : {};
}

function toCollectionNode(
  collection: IpcResponse<'firestore.listRootCollections'>[number],
): FirestoreCollectionNode {
  return {
    id: collection.id,
    path: collection.path,
    ...(collection.documentCount !== undefined ? { documentCount: collection.documentCount } : {}),
  };
}

function toDocumentResult(
  document: NonNullable<IpcResponse<'firestore.getDocument'>>,
): FirestoreDocumentResult {
  return {
    id: document.id,
    path: document.path,
    data: document.data,
    hasSubcollections: document.hasSubcollections,
    ...(document.subcollections
      ? { subcollections: document.subcollections.map(toCollectionNode) }
      : {}),
    ...(document.updateTime ? { updateTime: document.updateTime } : {}),
  };
}

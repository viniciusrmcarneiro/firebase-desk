import type { FirestoreRepository } from '@firebase-desk/repo-contracts';
import {
  toFieldPatchOperation,
  toFirestoreQuery,
  toIpcCollections,
  toIpcDocumentPage,
  toIpcDocumentResult,
  toIpcResultPage,
  toIpcSaveDocumentResult,
  toIpcUpdateDocumentFieldsResult,
  toPageRequest,
  toSaveDocumentOptions,
} from './converters.ts';
import type { IpcHandlerMap } from './handler-types.ts';

export function createFirestoreHandlers(
  firestoreRepository: FirestoreRepository,
): Pick<
  IpcHandlerMap,
  | 'firestore.createDocument'
  | 'firestore.deleteDocument'
  | 'firestore.generateDocumentId'
  | 'firestore.getDocument'
  | 'firestore.listDocuments'
  | 'firestore.listRootCollections'
  | 'firestore.listSubcollections'
  | 'firestore.runQuery'
  | 'firestore.saveDocument'
  | 'firestore.updateDocumentFields'
> {
  return {
    'firestore.listRootCollections': async ({ connectionId }) =>
      toIpcCollections(await firestoreRepository.listRootCollections(connectionId)),
    'firestore.listDocuments': async ({ collectionPath, connectionId, request }) =>
      toIpcDocumentPage(
        await firestoreRepository.listDocuments(
          connectionId,
          collectionPath,
          toPageRequest(request),
        ),
      ),
    'firestore.listSubcollections': async ({ connectionId, documentPath }) =>
      toIpcCollections(await firestoreRepository.listSubcollections(connectionId, documentPath)),
    'firestore.runQuery': async ({ query, request }) =>
      toIpcResultPage(
        await firestoreRepository.runQuery(toFirestoreQuery(query), toPageRequest(request)),
      ),
    'firestore.getDocument': ({ connectionId, documentPath }) =>
      firestoreRepository.getDocument(connectionId, documentPath).then((document) =>
        document ? toIpcDocumentResult(document) : null
      ),
    'firestore.generateDocumentId': ({ collectionPath, connectionId }) =>
      firestoreRepository.generateDocumentId(connectionId, collectionPath),
    'firestore.createDocument': async ({ collectionPath, connectionId, data, documentId }) =>
      toIpcDocumentResult(
        await firestoreRepository.createDocument(connectionId, collectionPath, documentId, data),
      ),
    'firestore.saveDocument': async ({ connectionId, data, documentPath, options }) =>
      toIpcSaveDocumentResult(
        await firestoreRepository.saveDocument(
          connectionId,
          documentPath,
          data,
          toSaveDocumentOptions(options),
        ),
      ),
    'firestore.updateDocumentFields': async (
      { connectionId, documentPath, operations, options },
    ) =>
      toIpcUpdateDocumentFieldsResult(
        await firestoreRepository.updateDocumentFields(
          connectionId,
          documentPath,
          operations.map(toFieldPatchOperation),
          {
            staleBehavior: options.staleBehavior,
            ...(options.lastUpdateTime ? { lastUpdateTime: options.lastUpdateTime } : {}),
          },
        ),
      ),
    'firestore.deleteDocument': async ({ connectionId, documentPath, options }) => {
      await firestoreRepository.deleteDocument(connectionId, documentPath, options);
    },
  };
}

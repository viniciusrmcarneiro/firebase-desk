import type {
  DataMode,
  FirestoreDeleteDocumentOptions,
  FirestoreFieldPatchOperation,
  FirestoreRepository,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  FirestoreUpdateDocumentFieldsOptions,
  FirestoreUpdateDocumentFieldsResult,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { useMemo } from 'react';
import { useAppCoreSelector } from '../../shared/index.ts';
import {
  createFirestoreDocumentCommand,
  deleteFirestoreDocumentCommand,
  type FirestoreWriteCommandEnvironment,
  generateFirestoreDocumentIdCommand,
  saveFirestoreDocumentCommand,
  updateFirestoreDocumentFieldsCommand,
} from './firestoreWriteCommands.ts';
import { selectCreateDocumentRequestForTab } from './firestoreWriteSelectors.ts';
import type { PendingCreateDocumentRequest } from './firestoreWriteState.ts';
import { createFirestoreWriteStore, type FirestoreWriteStore } from './firestoreWriteStore.ts';
import {
  firestoreCreateDocumentRequested,
  firestoreCreateDocumentRequestHandled,
} from './firestoreWriteTransitions.ts';

interface FirestoreWriteTabLike {
  readonly id: string;
  readonly kind: string;
}

export interface UseFirestoreWriteControllerInput {
  readonly activeProject: ProjectSummary | null;
  readonly activeTab: FirestoreWriteTabLike | undefined;
  readonly clearSelectedDocument: (tabId: string) => void;
  readonly dataMode: DataMode;
  readonly firestore: Pick<
    FirestoreRepository,
    | 'createDocument'
    | 'deleteDocument'
    | 'generateDocumentId'
    | 'saveDocument'
    | 'updateDocumentFields'
  >;
  readonly invalidateFirestoreQueries: () => Promise<void>;
  readonly onStatus: (message: string) => void;
  readonly recordActivity: FirestoreWriteCommandEnvironment['recordActivity'];
  readonly store?: FirestoreWriteStore | undefined;
}

export interface FirestoreWriteController {
  readonly createDocument: (
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  readonly createDocumentRequest: PendingCreateDocumentRequest | null;
  readonly deleteDocument: (
    documentPath: string,
    options: FirestoreDeleteDocumentOptions,
  ) => Promise<void>;
  readonly generateDocumentId: (collectionPath: string) => Promise<string>;
  readonly handleCreateDocumentRequestHandled: (requestId: number) => void;
  readonly requestCreateDocument: (request: PendingCreateDocumentRequest) => void;
  readonly saveDocument: (
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ) => Promise<FirestoreSaveDocumentResult | void>;
  readonly store: FirestoreWriteStore;
  readonly updateDocumentFields: (
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
  ) => Promise<FirestoreUpdateDocumentFieldsResult | void>;
}

export function useFirestoreWriteController(
  input: UseFirestoreWriteControllerInput,
): FirestoreWriteController {
  const store = useMemo(() => input.store ?? createFirestoreWriteStore(), [input.store]);
  const state = useAppCoreSelector(store, (snapshot) => snapshot);
  const project = input.activeProject
    ? { connectionId: input.activeProject.id, projectId: input.activeProject.projectId }
    : null;
  const env: FirestoreWriteCommandEnvironment = {
    dataMode: input.dataMode,
    firestore: input.firestore,
    invalidateFirestoreQueries: input.invalidateFirestoreQueries,
    now: Date.now,
    recordActivity: input.recordActivity,
  };

  function requestCreateDocument(request: PendingCreateDocumentRequest) {
    store.update((current) => firestoreCreateDocumentRequested(current, request));
  }

  function handleCreateDocumentRequestHandled(requestId: number) {
    store.update((current) => firestoreCreateDocumentRequestHandled(current, requestId));
  }

  async function generateDocumentId(collectionPath: string): Promise<string> {
    return await generateFirestoreDocumentIdCommand(env, { collectionPath, project });
  }

  async function createDocument(
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const result = await createFirestoreDocumentCommand(store, env, {
        collectionPath,
        data,
        documentId,
        project,
      });
      if (result) input.onStatus(result.lastAction);
    } catch (error) {
      input.onStatus(`Create failed: ${messageFromError(error, 'Could not create document.')}`);
      throw error;
    }
  }

  async function saveDocument(
    documentPath: string,
    data: Record<string, unknown>,
    options?: FirestoreSaveDocumentOptions,
  ): Promise<FirestoreSaveDocumentResult | void> {
    try {
      const result = await saveFirestoreDocumentCommand(store, env, {
        data,
        documentPath,
        options,
        project,
      });
      if (result) input.onStatus(result.lastAction);
      return result?.result;
    } catch (error) {
      input.onStatus(`Save failed: ${messageFromError(error, 'Could not save document.')}`);
      throw error;
    }
  }

  async function updateDocumentFields(
    documentPath: string,
    operations: ReadonlyArray<FirestoreFieldPatchOperation>,
    options: FirestoreUpdateDocumentFieldsOptions,
  ): Promise<FirestoreUpdateDocumentFieldsResult | void> {
    try {
      const result = await updateFirestoreDocumentFieldsCommand(store, env, {
        documentPath,
        operations,
        options,
        project,
      });
      if (result) input.onStatus(result.lastAction);
      return result?.result;
    } catch (error) {
      input.onStatus(`Update failed: ${messageFromError(error, 'Could not update fields.')}`);
      throw error;
    }
  }

  async function deleteDocument(
    documentPath: string,
    options: FirestoreDeleteDocumentOptions,
  ): Promise<void> {
    try {
      const result = await deleteFirestoreDocumentCommand(store, env, {
        deleteSubcollectionPaths: options.deleteSubcollectionPaths,
        documentPath,
        project,
      });
      if (!result) return;
      if (input.activeTab?.kind === 'firestore-query') {
        input.clearSelectedDocument(input.activeTab.id);
      }
      input.onStatus(result.lastAction);
    } catch (error) {
      input.onStatus(`Delete failed: ${messageFromError(error, 'Could not delete document.')}`);
      throw error;
    }
  }

  return {
    createDocument,
    createDocumentRequest: selectCreateDocumentRequestForTab(state, input.activeTab?.id),
    deleteDocument,
    generateDocumentId,
    handleCreateDocumentRequestHandled,
    requestCreateDocument,
    saveDocument,
    store,
    updateDocumentFields,
  };
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

import type {
  ActivityLogAppendInput,
  ActivityLogStatus,
  DataMode,
  FirestoreFieldPatchOperation,
  FirestoreRepository,
  FirestoreSaveDocumentOptions,
  FirestoreSaveDocumentResult,
  FirestoreUpdateDocumentFieldsOptions,
  FirestoreUpdateDocumentFieldsResult,
} from '@firebase-desk/repo-contracts';
import {
  type AppCoreCommandOptions,
  type AppCoreStore,
  commandActivityMetadata,
  documentDataMetadata,
  fieldPatchMetadata,
  shouldNotifyForCommandStatus,
} from '../../shared/index.ts';
import { fieldPatchStatusLabel } from './firestoreWriteSelectors.ts';
import type { FirestoreWriteState } from './firestoreWriteState.ts';
import {
  firestoreCreateFailed,
  firestoreCreateStarted,
  firestoreCreateSucceeded,
  firestoreDeleteFailed,
  firestoreDeleteStarted,
  firestoreDeleteSucceeded,
  firestoreFieldPatchFailed,
  firestoreFieldPatchStarted,
  firestoreFieldPatchSucceeded,
  firestoreSaveFailed,
  firestoreSaveStarted,
  firestoreSaveSucceeded,
} from './firestoreWriteTransitions.ts';

export interface FirestoreWriteProjectContext {
  readonly connectionId: string;
  readonly projectId: string;
}

export interface FirestoreWriteCommandEnvironment {
  readonly dataMode: DataMode;
  readonly firestore: FirestoreWriteRepository;
  readonly invalidateFirestoreQueries: () => Promise<void>;
  readonly now: () => number;
  readonly recordActivity: (input: ActivityLogAppendInput) => Promise<void> | void;
}

export type FirestoreWriteRepository = Pick<
  FirestoreRepository,
  | 'createDocument'
  | 'deleteDocument'
  | 'generateDocumentId'
  | 'saveDocument'
  | 'updateDocumentFields'
>;

export interface FirestoreWriteCommandResult<T> {
  readonly lastAction: string;
  readonly notification: string | null;
  readonly result: T;
}

export async function generateFirestoreDocumentIdCommand(
  env: FirestoreWriteCommandEnvironment,
  input: {
    readonly collectionPath: string;
    readonly project: FirestoreWriteProjectContext | null;
  },
): Promise<string> {
  if (!input.project) throw new Error('Choose a project before creating a document.');
  try {
    const generated = await env.firestore.generateDocumentId(
      input.project.connectionId,
      input.collectionPath,
    );
    return generated.documentId;
  } catch (error) {
    const message = messageFromError(error, 'Could not generate document ID.');
    throw toError(error, message);
  }
}

export async function createFirestoreDocumentCommand(
  store: AppCoreStore<FirestoreWriteState>,
  env: FirestoreWriteCommandEnvironment,
  input: {
    readonly collectionPath: string;
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly data: Record<string, unknown>;
    readonly documentId: string;
    readonly project: FirestoreWriteProjectContext | null;
  },
): Promise<
  FirestoreWriteCommandResult<Awaited<ReturnType<FirestoreRepository['createDocument']>>> | void
> {
  if (!input.project) return;
  const startedAt = env.now();
  const documentPath = input.collectionPath
    ? `${input.collectionPath}/${input.documentId}`
    : input.documentId;
  store.update((state) => firestoreCreateStarted(state, documentPath));
  try {
    const document = await env.firestore.createDocument(
      input.project.connectionId,
      input.collectionPath,
      input.documentId,
      input.data,
    );
    if (env.dataMode !== 'mock') await env.invalidateFirestoreQueries();
    store.update((state) => firestoreCreateSucceeded(state, document));
    void env.recordActivity({
      action: 'Create document',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        collectionPath: input.collectionPath,
        documentId: input.documentId,
        ...commandActivityMetadata(input.commandOptions),
        ...documentDataMetadata(input.data),
      },
      payload: { data: input.data },
      status: 'success',
      summary: `Created ${document.path}`,
      target: firestoreDocumentTarget(input.project, document.path),
    });
    return commandResult(`Created ${document.path}`, 'success', document, input.commandOptions);
  } catch (error) {
    const message = messageFromError(error, 'Could not create document.');
    store.update((state) => firestoreCreateFailed(state, documentPath, message));
    void env.recordActivity({
      action: 'Create document',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        collectionPath: input.collectionPath,
        documentId: input.documentId,
        ...commandActivityMetadata(input.commandOptions),
        ...documentDataMetadata(input.data),
      },
      payload: { data: input.data },
      status: 'failure',
      summary: message,
      target: firestoreDocumentTarget(input.project, documentPath),
    });
    throw toError(error, message);
  }
}

export async function saveFirestoreDocumentCommand(
  store: AppCoreStore<FirestoreWriteState>,
  env: FirestoreWriteCommandEnvironment,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly data: Record<string, unknown>;
    readonly documentPath: string;
    readonly options?: FirestoreSaveDocumentOptions | undefined;
    readonly project: FirestoreWriteProjectContext | null;
  },
): Promise<FirestoreWriteCommandResult<FirestoreSaveDocumentResult> | void> {
  if (!input.project) return;
  const startedAt = env.now();
  store.update((state) => firestoreSaveStarted(state, input.documentPath));
  try {
    const result = await env.firestore.saveDocument(
      input.project.connectionId,
      input.documentPath,
      input.data,
      input.options,
    );
    store.update((state) => firestoreSaveSucceeded(state, input.documentPath, result));
    if (result.status === 'conflict') {
      void env.recordActivity({
        action: 'Save document',
        area: 'firestore',
        durationMs: elapsedMs(startedAt, env.now()),
        metadata: {
          lastUpdateTime: input.options?.lastUpdateTime ?? null,
          remoteUpdateTime: result.remoteDocument?.updateTime ?? null,
          ...commandActivityMetadata(input.commandOptions),
          ...documentDataMetadata(input.data),
        },
        payload: { data: input.data },
        status: 'conflict',
        summary: `Save conflict on ${input.documentPath}`,
        target: firestoreDocumentTarget(input.project, input.documentPath),
      });
      return commandResult(
        `Save conflict: ${input.documentPath}`,
        'conflict',
        result,
        input.commandOptions,
      );
    }
    if (env.dataMode !== 'mock') await env.invalidateFirestoreQueries();
    void env.recordActivity({
      action: 'Save document',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        lastUpdateTime: input.options?.lastUpdateTime ?? null,
        updateTime: result.document.updateTime ?? null,
        ...commandActivityMetadata(input.commandOptions),
        ...documentDataMetadata(input.data),
      },
      payload: { data: input.data },
      status: 'success',
      summary: `Saved ${result.document.path}`,
      target: firestoreDocumentTarget(input.project, result.document.path),
    });
    return commandResult(`Saved ${result.document.path}`, 'success', result, input.commandOptions);
  } catch (error) {
    const message = messageFromError(error, 'Could not save document.');
    store.update((state) => firestoreSaveFailed(state, input.documentPath, message));
    void env.recordActivity({
      action: 'Save document',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        lastUpdateTime: input.options?.lastUpdateTime ?? null,
        ...commandActivityMetadata(input.commandOptions),
        ...documentDataMetadata(input.data),
      },
      payload: { data: input.data },
      status: 'failure',
      summary: message,
      target: firestoreDocumentTarget(input.project, input.documentPath),
    });
    throw toError(error, message);
  }
}

export async function updateFirestoreDocumentFieldsCommand(
  store: AppCoreStore<FirestoreWriteState>,
  env: FirestoreWriteCommandEnvironment,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly documentPath: string;
    readonly operations: ReadonlyArray<FirestoreFieldPatchOperation>;
    readonly options: FirestoreUpdateDocumentFieldsOptions;
    readonly project: FirestoreWriteProjectContext | null;
  },
): Promise<FirestoreWriteCommandResult<FirestoreUpdateDocumentFieldsResult> | void> {
  if (!input.project) return;
  const startedAt = env.now();
  store.update((state) => firestoreFieldPatchStarted(state, input.documentPath));
  try {
    const result = await env.firestore.updateDocumentFields(
      input.project.connectionId,
      input.documentPath,
      input.operations,
      input.options,
    );
    store.update((state) => firestoreFieldPatchSucceeded(state, input.documentPath, result));
    if (result.status === 'conflict' || result.status === 'document-changed') {
      const status = result.status === 'conflict' ? 'conflict' : 'success';
      const label = fieldPatchStatusLabel(result.status);
      void env.recordActivity({
        action: 'Update fields',
        area: 'firestore',
        durationMs: elapsedMs(startedAt, env.now()),
        metadata: {
          classification: result.status,
          lastUpdateTime: input.options.lastUpdateTime ?? null,
          remoteUpdateTime: result.remoteDocument?.updateTime ?? null,
          staleBehavior: input.options.staleBehavior,
          ...commandActivityMetadata(input.commandOptions),
          ...fieldPatchMetadata(input.operations),
        },
        payload: { operations: input.operations },
        status,
        summary: `${label} on ${input.documentPath}`,
        target: firestoreDocumentTarget(input.project, input.documentPath),
      });
      return commandResult(
        `${label}: ${input.documentPath}`,
        status,
        result,
        input.commandOptions,
      );
    }
    if (env.dataMode !== 'mock') await env.invalidateFirestoreQueries();
    const lastAction = result.documentChanged
      ? `Saved ${result.document.path}; document changed elsewhere`
      : `Saved ${result.document.path}`;
    void env.recordActivity({
      action: 'Update fields',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        classification: result.documentChanged ? 'document-changed-saved' : 'saved',
        lastUpdateTime: input.options.lastUpdateTime ?? null,
        staleBehavior: input.options.staleBehavior,
        updateTime: result.document.updateTime ?? null,
        ...commandActivityMetadata(input.commandOptions),
        ...fieldPatchMetadata(input.operations),
      },
      payload: { operations: input.operations },
      status: 'success',
      summary: lastAction,
      target: firestoreDocumentTarget(input.project, result.document.path),
    });
    return commandResult(lastAction, 'success', result, input.commandOptions);
  } catch (error) {
    const message = messageFromError(error, 'Could not update fields.');
    store.update((state) => firestoreFieldPatchFailed(state, input.documentPath, message));
    void env.recordActivity({
      action: 'Update fields',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        lastUpdateTime: input.options.lastUpdateTime ?? null,
        staleBehavior: input.options.staleBehavior,
        ...commandActivityMetadata(input.commandOptions),
        ...fieldPatchMetadata(input.operations),
      },
      payload: { operations: input.operations },
      status: 'failure',
      summary: message,
      target: firestoreDocumentTarget(input.project, input.documentPath),
    });
    throw toError(error, message);
  }
}

export async function deleteFirestoreDocumentCommand(
  store: AppCoreStore<FirestoreWriteState>,
  env: FirestoreWriteCommandEnvironment,
  input: {
    readonly commandOptions?: AppCoreCommandOptions | undefined;
    readonly deleteSubcollectionPaths: ReadonlyArray<string>;
    readonly documentPath: string;
    readonly project: FirestoreWriteProjectContext | null;
  },
): Promise<FirestoreWriteCommandResult<void> | void> {
  if (!input.project) return;
  const startedAt = env.now();
  store.update((state) => firestoreDeleteStarted(state, input.documentPath));
  try {
    await env.firestore.deleteDocument(input.project.connectionId, input.documentPath, {
      deleteSubcollectionPaths: input.deleteSubcollectionPaths,
    });
    if (env.dataMode !== 'mock') await env.invalidateFirestoreQueries();
    store.update((state) => firestoreDeleteSucceeded(state, input.documentPath));
    void env.recordActivity({
      action: 'Delete document',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: {
        deleteSubcollectionPaths: input.deleteSubcollectionPaths,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'success',
      summary: `Deleted ${input.documentPath}`,
      target: firestoreDocumentTarget(input.project, input.documentPath),
    });
    return commandResult(
      `Deleted ${input.documentPath}`,
      'success',
      undefined,
      input.commandOptions,
    );
  } catch (error) {
    const message = messageFromError(error, 'Could not delete document.');
    store.update((state) => firestoreDeleteFailed(state, input.documentPath, message));
    void env.recordActivity({
      action: 'Delete document',
      area: 'firestore',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: {
        deleteSubcollectionPaths: input.deleteSubcollectionPaths,
        ...commandActivityMetadata(input.commandOptions),
      },
      status: 'failure',
      summary: message,
      target: firestoreDocumentTarget(input.project, input.documentPath),
    });
    throw toError(error, message);
  }
}

function commandResult<T>(
  lastAction: string,
  status: ActivityLogStatus,
  result: T,
  options: AppCoreCommandOptions | undefined,
): FirestoreWriteCommandResult<T> {
  return {
    lastAction,
    notification: shouldNotifyForCommandStatus(options, status) ? lastAction : null,
    result,
  };
}

function firestoreDocumentTarget(
  project: FirestoreWriteProjectContext,
  path: string,
): ActivityLogAppendInput['target'] {
  return {
    connectionId: project.connectionId,
    path,
    projectId: project.projectId,
    type: 'firestore-document',
  };
}

function elapsedMs(startedAt: number, endedAt: number): number {
  return Math.max(0, endedAt - startedAt);
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function toError(error: unknown, message: string): Error {
  return error instanceof Error ? error : new Error(message);
}

import type {
  ActivityLogAppendInput,
  FirestoreDocumentResult,
  FirestoreRepository,
  FirestoreSaveDocumentResult,
  FirestoreUpdateDocumentFieldsResult,
} from '@firebase-desk/repo-contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  createFirestoreDocumentCommand,
  deleteFirestoreDocumentCommand,
  type FirestoreWriteCommandEnvironment,
  type FirestoreWriteProjectContext,
  generateFirestoreDocumentIdCommand,
  saveFirestoreDocumentCommand,
  updateFirestoreDocumentFieldsCommand,
} from './firestoreWriteCommands.ts';
import { createFirestoreWriteStore } from './firestoreWriteStore.ts';

describe('firestore write commands', () => {
  it('generates document IDs for active projects', async () => {
    const context = commandContext();

    await expect(generateFirestoreDocumentIdCommand(context.env, {
      collectionPath: 'orders',
      project,
    })).resolves.toBe('generated-id');
    expect(context.firestore.generateDocumentId).toHaveBeenCalledWith('emu', 'orders');
  });

  it('creates documents, invalidates live queries, and records Activity', async () => {
    const context = commandContext({ dataMode: 'live' });
    const result = await createFirestoreDocumentCommand(context.store, context.env, {
      collectionPath: 'orders',
      data: { status: 'new' },
      documentId: 'ord_new',
      project,
    });

    expect(context.firestore.createDocument).toHaveBeenCalledWith(
      'emu',
      'orders',
      'ord_new',
      { status: 'new' },
    );
    expect(context.invalidateFirestoreQueries).toHaveBeenCalledTimes(1);
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Create document',
      metadata: { documentId: 'ord_new', fieldCount: 1 },
      status: 'success',
      target: { path: 'orders/ord_1' },
    });
    expect(result.lastAction).toBe('Created orders/ord_1');
    expect(result.notification).toBe('Created orders/ord_1');
    expect(context.store.get().create.status).toBe('created');
  });

  it('keeps scheduler mutation activity while suppressing success notifications', async () => {
    const context = commandContext();
    const result = await createFirestoreDocumentCommand(context.store, context.env, {
      collectionPath: 'orders',
      commandOptions: {
        notifyPolicy: 'issues-only',
        serializationKey: 'nightly-create',
        source: 'scheduler',
        visible: false,
      },
      data: { status: 'new' },
      documentId: 'ord_new',
      project,
    });

    expect(result.lastAction).toBe('Created orders/ord_1');
    expect(result.notification).toBeNull();
    expect(context.activity.at(-1)).toMatchObject({
      metadata: {
        command: {
          notifyPolicy: 'issues-only',
          serializationKey: 'nightly-create',
          source: 'scheduler',
          visible: false,
        },
      },
      status: 'success',
    });
  });

  it('rejects create, save, update, and delete when no project is selected', async () => {
    const context = commandContext();

    await expect(createFirestoreDocumentCommand(context.store, context.env, {
      collectionPath: 'orders',
      data: { status: 'new' },
      documentId: 'ord_new',
      project: null,
    })).rejects.toThrow('Choose a project before creating a document.');
    await expect(saveFirestoreDocumentCommand(context.store, context.env, {
      data: { status: 'paid' },
      documentPath: 'orders/ord_1',
      project: null,
    })).rejects.toThrow('Choose a project before saving a document.');
    await expect(updateFirestoreDocumentFieldsCommand(context.store, context.env, {
      documentPath: 'orders/ord_1',
      operations: [{
        baseValue: 'draft',
        fieldPath: ['status'],
        type: 'set',
        value: 'paid',
      }],
      options: { staleBehavior: 'save-and-notify' },
      project: null,
    })).rejects.toThrow('Choose a project before updating fields.');
    await expect(deleteFirestoreDocumentCommand(context.store, context.env, {
      deleteSubcollectionPaths: [],
      documentPath: 'orders/ord_1',
      project: null,
    })).rejects.toThrow('Choose a project before deleting a document.');

    expect(context.firestore.createDocument).not.toHaveBeenCalled();
    expect(context.firestore.saveDocument).not.toHaveBeenCalled();
    expect(context.firestore.updateDocumentFields).not.toHaveBeenCalled();
    expect(context.firestore.deleteDocument).not.toHaveBeenCalled();
    expect(context.activity).toEqual([]);
  });

  it('returns full save conflicts without invalidating', async () => {
    const conflict: FirestoreSaveDocumentResult = {
      remoteDocument: document({ status: 'remote' }),
      status: 'conflict',
    };
    const context = commandContext({
      saveDocument: vi.fn().mockResolvedValue(conflict),
    });

    const result = await saveFirestoreDocumentCommand(context.store, context.env, {
      data: { status: 'local' },
      documentPath: 'orders/ord_1',
      options: { lastUpdateTime: 'old' },
      project,
    });

    expect(context.invalidateFirestoreQueries).not.toHaveBeenCalled();
    expect(result.result).toBe(conflict);
    expect(result.lastAction).toBe('Save conflict: orders/ord_1');
    expect(result.notification).toBe('Save conflict: orders/ord_1');
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Save document',
      metadata: { lastUpdateTime: 'old', remoteUpdateTime: null },
      status: 'conflict',
    });
    expect(context.store.get().save.status).toBe('conflict');
  });

  it('updates fields and classifies stale unchanged saves', async () => {
    const patchResult: FirestoreUpdateDocumentFieldsResult = {
      document: document({ status: 'paid' }),
      documentChanged: true,
      status: 'saved',
    };
    const context = commandContext({
      updateDocumentFields: vi.fn().mockResolvedValue(patchResult),
    });

    const result = await updateFirestoreDocumentFieldsCommand(context.store, context.env, {
      documentPath: 'orders/ord_1',
      operations: [{
        baseValue: 'draft',
        fieldPath: ['status'],
        type: 'set',
        value: 'paid',
      }],
      options: { staleBehavior: 'save-and-notify' },
      project,
    });

    expect(context.firestore.updateDocumentFields).toHaveBeenCalledWith(
      'emu',
      'orders/ord_1',
      [{
        baseValue: 'draft',
        fieldPath: ['status'],
        type: 'set',
        value: 'paid',
      }],
      { staleBehavior: 'save-and-notify' },
    );
    expect(result.lastAction).toBe('Saved orders/ord_1; document changed elsewhere');
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Update fields',
      metadata: { classification: 'document-changed-saved', writeMode: 'field-patch' },
      payload: { operations: [{ fieldPath: ['status'] }] },
      status: 'success',
    });
  });

  it('records field conflicts and does not invalidate', async () => {
    const conflict: FirestoreUpdateDocumentFieldsResult = {
      remoteDocument: document({ status: 'remote' }),
      status: 'conflict',
    };
    const context = commandContext({
      updateDocumentFields: vi.fn().mockResolvedValue(conflict),
    });

    const result = await updateFirestoreDocumentFieldsCommand(context.store, context.env, {
      documentPath: 'orders/ord_1',
      commandOptions: { notifyPolicy: 'issues-only' },
      operations: [{
        baseValue: 'draft',
        fieldPath: ['status'],
        type: 'set',
        value: 'paid',
      }],
      options: { lastUpdateTime: 'old', staleBehavior: 'block' },
      project,
    });

    expect(context.invalidateFirestoreQueries).not.toHaveBeenCalled();
    expect(result.lastAction).toBe('Field conflict: orders/ord_1');
    expect(result.notification).toBe('Field conflict: orders/ord_1');
    expect(context.activity.at(-1)).toMatchObject({
      metadata: { classification: 'conflict', staleBehavior: 'block' },
      status: 'conflict',
    });
  });

  it('deletes documents with selected subcollections', async () => {
    const context = commandContext();

    const result = await deleteFirestoreDocumentCommand(context.store, context.env, {
      deleteSubcollectionPaths: ['orders/ord_1/events'],
      documentPath: 'orders/ord_1',
      project,
    });

    expect(context.firestore.deleteDocument).toHaveBeenCalledWith('emu', 'orders/ord_1', {
      deleteSubcollectionPaths: ['orders/ord_1/events'],
    });
    expect(result.lastAction).toBe('Deleted orders/ord_1');
    expect(context.store.get().deleteDocument.status).toBe('deleted');
  });

  it('records failures and keeps dialog callers able to catch', async () => {
    const context = commandContext({
      deleteDocument: vi.fn().mockRejectedValue(new Error('denied')),
    });

    await expect(deleteFirestoreDocumentCommand(context.store, context.env, {
      deleteSubcollectionPaths: [],
      documentPath: 'orders/ord_1',
      project,
    })).rejects.toThrow('denied');
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Delete document',
      error: { message: 'denied' },
      status: 'failure',
    });
    expect(context.store.get().deleteDocument.status).toBe('failed');
  });
});

const project: FirestoreWriteProjectContext = {
  connectionId: 'emu',
  projectId: 'demo-local',
};

function commandContext(
  overrides:
    & Partial<
      Pick<
        FirestoreRepository,
        | 'createDocument'
        | 'deleteDocument'
        | 'generateDocumentId'
        | 'saveDocument'
        | 'updateDocumentFields'
      >
    >
    & { readonly dataMode?: 'live' | 'mock'; } = {},
) {
  const { dataMode = 'mock', ...firestoreOverrides } = overrides;
  const activity: ActivityLogAppendInput[] = [];
  const store = createFirestoreWriteStore();
  const firestore = {
    createDocument: vi.fn().mockResolvedValue(document()),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    generateDocumentId: vi.fn().mockResolvedValue({ documentId: 'generated-id' }),
    saveDocument: vi.fn().mockResolvedValue({ document: document(), status: 'saved' }),
    updateDocumentFields: vi.fn().mockResolvedValue({ document: document(), status: 'saved' }),
    ...firestoreOverrides,
  } satisfies Pick<
    FirestoreRepository,
    | 'createDocument'
    | 'deleteDocument'
    | 'generateDocumentId'
    | 'saveDocument'
    | 'updateDocumentFields'
  >;
  const invalidateFirestoreQueries = vi.fn().mockResolvedValue(undefined);
  let time = 1000;
  const env: FirestoreWriteCommandEnvironment = {
    dataMode,
    firestore,
    invalidateFirestoreQueries,
    now: () => time += 5,
    recordActivity: (input) => {
      activity.push(input);
    },
  };
  return { activity, env, firestore, invalidateFirestoreQueries, store };
}

function document(data: Record<string, unknown> = {}): FirestoreDocumentResult {
  return {
    data,
    hasSubcollections: false,
    id: 'ord_1',
    path: 'orders/ord_1',
  };
}

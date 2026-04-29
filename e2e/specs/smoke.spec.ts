import type { IpcRequest, IpcResponse } from '@firebase-desk/ipc-schemas';
import { expect, type Page, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchDesktop } from '../fixtures/launch.ts';

type FirebaseDeskGlobal = {
  readonly firebaseDesk: {
    readonly health: {
      readonly check: (
        request: IpcRequest<'health.check'>,
      ) => Promise<IpcResponse<'health.check'>>;
    };
    readonly projects: {
      readonly list: () => Promise<IpcResponse<'projects.list'>>;
    };
    readonly firestore: {
      readonly getDocument: (
        request: IpcRequest<'firestore.getDocument'>,
      ) => Promise<IpcResponse<'firestore.getDocument'>>;
      readonly listDocuments: (
        request: IpcRequest<'firestore.listDocuments'>,
      ) => Promise<IpcResponse<'firestore.listDocuments'>>;
      readonly listRootCollections: (
        request: IpcRequest<'firestore.listRootCollections'>,
      ) => Promise<IpcResponse<'firestore.listRootCollections'>>;
      readonly listSubcollections: (
        request: IpcRequest<'firestore.listSubcollections'>,
      ) => Promise<IpcResponse<'firestore.listSubcollections'>>;
      readonly runQuery: (
        request: IpcRequest<'firestore.runQuery'>,
      ) => Promise<IpcResponse<'firestore.runQuery'>>;
      readonly saveDocument: (
        request: IpcRequest<'firestore.saveDocument'>,
      ) => Promise<IpcResponse<'firestore.saveDocument'>>;
      readonly deleteDocument: (
        request: IpcRequest<'firestore.deleteDocument'>,
      ) => Promise<IpcResponse<'firestore.deleteDocument'>>;
    };
  };
};

const EMULATOR_ACCOUNT_NAME = 'Local Emulator E2E';
const FIRESTORE_PROJECT_ID = 'demo-local';

test('desktop window boots and IPC health round-trips', async () => {
  const app = await launchDesktop();
  try {
    const page = await app.firstWindow();
    await expect(page).toHaveTitle(/Firebase Desk/);

    const result = await page.evaluate(async () => {
      const api = (globalThis as unknown as FirebaseDeskGlobal).firebaseDesk;
      return api.health.check({ ping: 'ping', sentAt: new Date().toISOString() });
    });

    expect(result.pong).toBe('pong');
  } finally {
    await app.close();
  }
});

test('mock JavaScript Query runs and renders streamed output', async () => {
  const userDataDir = await mkdtemp(join(tmpdir(), 'firebase-desk-e2e-'));
  const app = await launchDesktop({ args: ['--data-mode=mock'], userDataDir });
  try {
    const page = await app.firstWindow();
    await expect(page).toHaveTitle(/Firebase Desk/);

    const tree = page.getByRole('tree', { name: 'Account tree' });
    await expect(tree.getByRole('treeitem', { name: /Local Emulator/ })).toBeVisible();
    await tree.getByRole('treeitem', { name: /Local Emulator/ }).click();
    await tree.getByRole('treeitem', { name: /JavaScript Query/ }).click();

    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
    await page.getByRole('button', { name: 'Run' }).click();

    await expect(page.getByText('yield DocumentSnapshot')).toBeVisible();
    await expect(page.getByText('yield QuerySnapshot')).toBeVisible();
    await expect(page.getByText(/^\d+(?:\.\d{3}s|ms)$/)).toBeVisible();
  } finally {
    await app.close();
    await rm(userDataDir, { force: true, recursive: true });
  }
});

test('Firestore reads real emulator collections, documents, queries, cursors, and subcollections', async () => {
  const userDataDir = await mkdtemp(join(tmpdir(), 'firebase-desk-e2e-'));
  const app = await launchDesktop({ args: ['--data-mode=live'], userDataDir });
  try {
    const page = await app.firstWindow();
    await expect(page).toHaveTitle(/Firebase Desk/);
    await addLocalEmulatorAccount(page);

    const connectionId = await connectionIdForAccount(page, EMULATOR_ACCOUNT_NAME);
    expect(connectionId).toBeTruthy();

    await expandFirestoreRoots(page);
    const tree = page.getByRole('tree', { name: 'Account tree' });
    await expect(tree.getByRole('treeitem', { name: /orders/ })).toBeVisible();
    await expect(tree.getByRole('treeitem', { name: /customers/ })).toBeVisible();
    await expect(tree.getByRole('treeitem', { name: /featureFlags/ })).toBeVisible();
    await expect(tree.getByText('ord_1024')).toHaveCount(0);

    await tree.getByRole('treeitem', { name: /orders/ }).click();
    await expect(page.getByLabel('Query path')).toHaveValue('orders');

    await queryField(page, 'Sort field').fill('');
    await page.getByLabel('Result limit').fill('2');
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByText('Document ID')).toBeVisible();
    await expect(page.getByText('ord_1024')).toBeVisible();
    await expect(page.getByText('ord_1025')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible();

    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByText('ord_1026')).toBeVisible();

    await ensureFilterRow(page);
    await queryField(page, 'Filter 1 field').fill('status');
    await page.getByLabel('Filter 1 value').fill('paid');
    await page.getByLabel('Result limit').fill('3');
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByText('ord_1024')).toBeVisible();
    await expect(page.getByText('ord_1027')).toBeVisible();

    await page.getByRole('tab', { name: 'JSON' }).click();
    await expect(page.getByLabel('JSON results')).toHaveValue(/orders\/ord_1024\/events/);
    await page.getByRole('tab', { name: 'Table' }).click();
    await expect(page.getByRole('button', { name: /events/ })).toBeVisible();

    await page.getByLabel('Query path').fill('orders/ord_1024/events');
    await queryField(page, 'Filter 1 field').fill('');
    await page.getByLabel('Filter 1 value').fill('');
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByText('evt_created')).toBeVisible();
    await expect(page.getByText('evt_paid')).toBeVisible();

    await page.getByLabel('Query path').fill('orders/ord_1024');
    await page.getByRole('button', { name: 'Run' }).click();
    await page.getByRole('tab', { name: 'JSON' }).click();
    await expect(page.getByLabel('JSON results')).toHaveValue(/"path": "orders\/ord_1024"/);
    await expect(page.getByLabel('JSON results')).toHaveValue(/Ada Lovelace/);
    await page.getByRole('tab', { name: 'Table' }).click();

    await page.getByLabel('Query path').fill('orders');
    await page.getByLabel('Result limit').fill('1');
    await queryField(page, 'Sort field').fill('total');
    await page.getByLabel('Sort direction').selectOption('desc');
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByText('ord_1123')).toBeVisible();

    const firestoreReads = await readFirestoreThroughIpc(page, connectionId!);
    expect(firestoreReads.rootCollections).toEqual(
      expect.arrayContaining(['customers', 'featureFlags', 'orders']),
    );
    expect(firestoreReads.firstDocumentIds).toEqual(['ord_1024', 'ord_1025']);
    expect(firestoreReads.secondDocumentIds).toEqual(['ord_1026', 'ord_1027']);
    expect(firestoreReads.filteredDocumentIds).toEqual(['ord_1024', 'ord_1027']);
    expect(firestoreReads.sortedDocumentIds).toEqual(['ord_1123']);
    expect(firestoreReads.subcollectionPaths).toEqual(['orders/ord_1024/events']);
    expect(firestoreReads.documentSubcollectionPaths).toEqual(['orders/ord_1024/events']);
  } finally {
    await app.close();
    await rm(userDataDir, { force: true, recursive: true });
  }
});

test('Firestore writes typed values to the emulator and deletes selected subcollections', async () => {
  const userDataDir = await mkdtemp(join(tmpdir(), 'firebase-desk-e2e-'));
  const app = await launchDesktop({ args: ['--data-mode=live'], userDataDir });
  try {
    const page = await app.firstWindow();
    await expect(page).toHaveTitle(/Firebase Desk/);
    await addLocalEmulatorAccount(page);

    const connectionId = await connectionIdForAccount(page, EMULATOR_ACCOUNT_NAME);
    expect(connectionId).toBeTruthy();

    const smoke = await writeFirestoreThroughIpc(page, connectionId!);
    const direct = await readFirestoreDirectly(smoke);

    expect(smoke.savedTypedDocument).toMatchObject({
      id: smoke.typedDocumentId,
      path: `smokeWrites/${smoke.typedDocumentId}`,
      data: {
        active: true,
        count: 42,
        customerRef: { __type__: 'reference', path: 'customers/cus_ada' },
        deliveredAt: { __type__: 'timestamp', value: smoke.deliveredAt },
        note: 'typed smoke',
        optional: null,
        payload: { __type__: 'bytes', base64: 'aGVsbG8tc21va2U=' },
        place: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
        tags: ['smoke', 'typed'],
      },
    });
    expect(smoke.savedTypedDocument?.data['metadata']).toEqual({ nested: 'value' });
    expect(smoke.readTypedDocument).toEqual(smoke.savedTypedDocument);
    expect(smoke.typedQueryIds).toEqual([smoke.typedDocumentId]);

    expect(smoke.parentAfterDelete).toBeNull();
    expect(smoke.deletedChildAfterDelete).toBeNull();
    expect(smoke.keptChildAfterDelete).toMatchObject({
      path: `smokeDeletes/${smoke.deleteDocumentId}/keep/kept`,
      data: { type: 'kept' },
    });

    expect(direct.smokeWriteDocumentNames).toContain(
      firestoreDocumentName(`smokeWrites/${smoke.typedDocumentId}`),
    );
    expect(direct.typedDocument?.fields).toMatchObject({
      active: { booleanValue: true },
      count: { integerValue: '42' },
      customerRef: { referenceValue: firestoreDocumentName('customers/cus_ada') },
      deliveredAt: { timestampValue: smoke.deliveredAt },
      metadata: { mapValue: { fields: { nested: { stringValue: 'value' } } } },
      note: { stringValue: 'typed smoke' },
      optional: { nullValue: null },
      payload: { bytesValue: 'aGVsbG8tc21va2U=' },
      place: { geoPointValue: { latitude: -36.8485, longitude: 174.7633 } },
      tags: {
        arrayValue: {
          values: [{ stringValue: 'smoke' }, { stringValue: 'typed' }],
        },
      },
    });
    expect(direct.parentAfterDelete).toBeNull();
    expect(direct.deletedChildAfterDelete).toBeNull();
    expect(direct.keptChildAfterDelete?.fields).toMatchObject({ type: { stringValue: 'kept' } });
  } finally {
    await app.close();
    await rm(userDataDir, { force: true, recursive: true });
  }
});

async function addLocalEmulatorAccount(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Firebase Account' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'Local emulator' }).click();
  await dialog.getByLabel('Display name').fill(EMULATOR_ACCOUNT_NAME);
  await dialog.getByRole('button', { name: 'Add account' }).click();
  await expect(dialog).toBeHidden();
}

async function connectionIdForAccount(page: Page, accountName: string): Promise<string | null> {
  return await page.evaluate(async (name) => {
    const api = (globalThis as unknown as FirebaseDeskGlobal).firebaseDesk;
    const projects = await api.projects.list();
    return projects.find((project) => project.name === name)?.id ?? null;
  }, accountName);
}

async function expandFirestoreRoots(page: Page): Promise<void> {
  const tree = page.getByRole('tree', { name: 'Account tree' });
  await expect(tree.getByRole('treeitem', { name: new RegExp(EMULATOR_ACCOUNT_NAME) }))
    .toBeVisible();
  await tree.getByRole('treeitem', { name: new RegExp(EMULATOR_ACCOUNT_NAME) }).click();
  await expect(tree.getByRole('treeitem', { name: /Firestore/ })).toBeVisible();
  await tree.getByRole('treeitem', { name: /Firestore/ }).click();
}

async function ensureFilterRow(page: Page): Promise<void> {
  if (await queryField(page, 'Filter 1 field').count()) return;
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(queryField(page, 'Filter 1 field')).toBeVisible();
}

function queryField(page: Page, name: string) {
  return page.getByRole('combobox', { name });
}

async function readFirestoreThroughIpc(page: Page, connectionId: string) {
  return await page.evaluate(async (id) => {
    const api = (globalThis as unknown as FirebaseDeskGlobal).firebaseDesk;
    const roots = await api.firestore.listRootCollections({ connectionId: id });
    const firstDocuments = await api.firestore.listDocuments({
      collectionPath: 'orders',
      connectionId: id,
      request: { limit: 2 },
    });
    const secondDocuments = firstDocuments.nextCursor
      ? await api.firestore.listDocuments({
        collectionPath: 'orders',
        connectionId: id,
        request: { cursor: firstDocuments.nextCursor, limit: 2 },
      })
      : { items: [] };
    const filtered = await api.firestore.runQuery({
      query: {
        connectionId: id,
        filters: [{ field: 'status', op: '==', value: 'paid' }],
        path: 'orders',
      },
      request: { limit: 2 },
    });
    const sorted = await api.firestore.runQuery({
      query: {
        connectionId: id,
        path: 'orders',
        sorts: [{ direction: 'desc', field: 'total' }],
      },
      request: { limit: 1 },
    });
    const subcollections = await api.firestore.listSubcollections({
      connectionId: id,
      documentPath: 'orders/ord_1024',
    });
    const document = await api.firestore.getDocument({
      connectionId: id,
      documentPath: 'orders/ord_1024',
    });

    return {
      documentSubcollectionPaths: document?.subcollections?.map((collection) => collection.path)
        ?? [],
      filteredDocumentIds: filtered.items.map((documentResult) => documentResult.id),
      firstDocumentIds: firstDocuments.items.map((documentNode) => documentNode.id),
      rootCollections: roots.map((collection) => collection.id),
      secondDocumentIds: secondDocuments.items.map((documentNode) => documentNode.id),
      sortedDocumentIds: sorted.items.map((documentResult) => documentResult.id),
      subcollectionPaths: subcollections.map((collection) => collection.path),
    };
  }, connectionId);
}

async function writeFirestoreThroughIpc(page: Page, connectionId: string) {
  return await page.evaluate(async (id) => {
    const api = (globalThis as unknown as FirebaseDeskGlobal).firebaseDesk;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const typedDocumentId = `typed-${suffix}`;
    const deleteDocumentId = `delete-${suffix}`;
    const typedPath = `smokeWrites/${typedDocumentId}`;
    const deletePath = `smokeDeletes/${deleteDocumentId}`;
    const deliveredAt = new Date().toISOString();

    const savedTypedDocument = await api.firestore.saveDocument({
      connectionId: id,
      documentPath: typedPath,
      data: {
        active: true,
        count: 42,
        customerRef: { __type__: 'reference', path: 'customers/cus_ada' },
        deliveredAt: { __type__: 'timestamp', value: deliveredAt },
        metadata: { nested: 'value' },
        note: 'typed smoke',
        optional: null,
        payload: { __type__: 'bytes', base64: 'aGVsbG8tc21va2U=' },
        place: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
        tags: ['smoke', 'typed'],
      },
    });
    const readTypedDocument = await api.firestore.getDocument({
      connectionId: id,
      documentPath: typedPath,
    });
    const typedQuery = await api.firestore.runQuery({
      query: {
        connectionId: id,
        filters: [{
          field: 'deliveredAt',
          op: '==',
          value: { __type__: 'timestamp', value: deliveredAt },
        }],
        path: 'smokeWrites',
      },
      request: { limit: 5 },
    });

    await api.firestore.saveDocument({
      connectionId: id,
      documentPath: deletePath,
      data: { type: 'parent' },
    });
    await api.firestore.saveDocument({
      connectionId: id,
      documentPath: `${deletePath}/events/deleted`,
      data: { type: 'deleted' },
    });
    await api.firestore.saveDocument({
      connectionId: id,
      documentPath: `${deletePath}/keep/kept`,
      data: { type: 'kept' },
    });
    await api.firestore.deleteDocument({
      connectionId: id,
      documentPath: deletePath,
      options: { deleteSubcollectionPaths: [`${deletePath}/events`] },
    });
    const parentAfterDelete = await api.firestore.getDocument({
      connectionId: id,
      documentPath: deletePath,
    });
    const deletedChildAfterDelete = await api.firestore.getDocument({
      connectionId: id,
      documentPath: `${deletePath}/events/deleted`,
    });
    const keptChildAfterDelete = await api.firestore.getDocument({
      connectionId: id,
      documentPath: `${deletePath}/keep/kept`,
    });

    return {
      deleteDocumentId,
      deletedChildAfterDelete,
      deliveredAt,
      keptChildAfterDelete,
      parentAfterDelete,
      readTypedDocument,
      savedTypedDocument,
      typedDocumentId,
      typedQueryIds: typedQuery.items.map((document) => document.id),
    };
  }, connectionId);
}

interface FirestoreRestDocument {
  readonly fields?: Record<string, unknown>;
  readonly name: string;
}

interface FirestoreRestListResponse {
  readonly documents?: ReadonlyArray<FirestoreRestDocument>;
}

interface FirestoreWriteSmokeResult {
  readonly deleteDocumentId: string;
  readonly deliveredAt: string;
  readonly typedDocumentId: string;
}

async function readFirestoreDirectly(smoke: FirestoreWriteSmokeResult) {
  const typedDocument = await getFirestoreEmulatorDocument(
    `smokeWrites/${smoke.typedDocumentId}`,
  );
  const smokeWrites = await listFirestoreEmulatorCollection('smokeWrites');
  const parentAfterDelete = await getFirestoreEmulatorDocument(
    `smokeDeletes/${smoke.deleteDocumentId}`,
  );
  const deletedChildAfterDelete = await getFirestoreEmulatorDocument(
    `smokeDeletes/${smoke.deleteDocumentId}/events/deleted`,
  );
  const keptChildAfterDelete = await getFirestoreEmulatorDocument(
    `smokeDeletes/${smoke.deleteDocumentId}/keep/kept`,
  );

  return {
    deletedChildAfterDelete,
    keptChildAfterDelete,
    parentAfterDelete,
    smokeWriteDocumentNames: smokeWrites.map((document) => document.name),
    typedDocument,
  };
}

async function getFirestoreEmulatorDocument(
  documentPath: string,
): Promise<FirestoreRestDocument | null> {
  const response = await fetch(firestoreRestUrl(documentPath));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore emulator get failed: ${response.status} ${await response.text()}`);
  }
  return await response.json() as FirestoreRestDocument;
}

async function listFirestoreEmulatorCollection(
  collectionPath: string,
): Promise<ReadonlyArray<FirestoreRestDocument>> {
  const response = await fetch(firestoreRestUrl(collectionPath));
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Firestore emulator list failed: ${response.status} ${await response.text()}`);
  }
  const page = await response.json() as FirestoreRestListResponse;
  return page.documents ?? [];
}

function firestoreRestUrl(path: string): string {
  return `${firestoreEmulatorOrigin()}/v1/${firestoreDocumentName(path)}`;
}

function firestoreDocumentName(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${encodedPath}`;
}

function firestoreEmulatorOrigin(): string {
  const host = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
  return host.startsWith('http://') || host.startsWith('https://') ? host : `http://${host}`;
}

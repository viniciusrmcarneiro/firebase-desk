import { expect, type Page, test } from '@playwright/test';
import { replaceMonacoEditorValue } from '../fixtures/editor.ts';
import {
  deleteFirestoreEmulatorDocument,
  getFirestoreEmulatorDocument,
  setFirestoreEmulatorDocument,
} from '../fixtures/firestore-rest.ts';
import {
  addLocalEmulatorAccount,
  openFirestore,
  openLiveApp,
  uniqueSmokeId,
} from '../fixtures/live-app.ts';

test('Firestore query, create, edit, conflict, and delete flows use emulator UI', async () => {
  const live = await openLiveApp();
  try {
    const page = live.page;
    const suffix = uniqueSmokeId('ui');
    await addLocalEmulatorAccount(page);
    await openFirestore(page);

    await test.step('query seeded orders', async () => {
      await expectFirestoreRoots(page);
      await querySeededOrders(page);
    });

    await test.step('create and edit document through UI', async () => {
      await createAndEditDocument(page, suffix);
    });

    await test.step('resolve save conflict through UI', async () => {
      await resolveConflict(page, suffix);
    });

    await test.step('delete document with selected subcollection through UI', async () => {
      await deleteWithSelectedSubcollection(page, suffix);
    });
  } finally {
    await live.close();
  }
});

async function expectFirestoreRoots(page: Page): Promise<void> {
  const tree = page.getByRole('tree', { name: 'Account tree' });
  await expect(tree.getByRole('treeitem', { name: /orders/ })).toBeVisible();
  await expect(tree.getByRole('treeitem', { name: /customers/ })).toBeVisible();
  await expect(tree.getByRole('treeitem', { name: /featureFlags/ })).toBeVisible();
  await expect(tree.getByText('ord_1024')).toHaveCount(0);
}

async function querySeededOrders(page: Page): Promise<void> {
  const tree = page.getByRole('tree', { name: 'Account tree' });
  await tree.getByRole('treeitem', { name: /orders/ }).click();
  await expect(page.getByLabel('Query path')).toHaveValue('orders');

  await clearFiltersAndSort(page);
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
  await expect(page.getByRole('button', { name: /events/ }).first()).toBeVisible();

  await page.getByLabel('Query path').fill('orders/ord_1024/events');
  await clearFiltersAndSort(page);
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
  await clearFiltersAndSort(page);
  await queryField(page, 'Sort field').fill('total');
  await page.getByLabel('Sort direction').selectOption('desc');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('ord_1123')).toBeVisible();
}

async function createAndEditDocument(page: Page, suffix: string): Promise<void> {
  const documentId = `created-${suffix}`;
  const path = `smokeUiCreates/${documentId}`;
  const createdAt = new Date().toISOString();

  await runCollectionQuery(page, 'smokeUiCreates');
  await page.getByRole('button', { name: 'New document' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New document' });
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel('Document ID').fill(documentId);
  await replaceMonacoEditorValue(
    page,
    createDialog,
    JSON.stringify(
      {
        count: 1,
        createdAt: { __type__: 'timestamp', value: createdAt },
        location: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
        source: 'ui-create',
        status: 'draft',
      },
      null,
      2,
    ),
  );
  await expect(createDialog.getByRole('button', { name: 'Create' })).toBeEnabled();
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expectDialogHidden(createDialog, 'Create dialog stayed open');
  await refreshChangedResults(page);
  await expect(page.getByText(documentId)).toBeVisible();

  const created = await getFirestoreEmulatorDocument(path);
  expect(created?.fields).toMatchObject({
    count: { integerValue: '1' },
    createdAt: { timestampValue: createdAt },
    location: { geoPointValue: { latitude: -36.8485, longitude: 174.7633 } },
    source: { stringValue: 'ui-create' },
    status: { stringValue: 'draft' },
  });

  await selectDocument(page, documentId);
  await page.getByRole('button', { name: 'Edit document' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit document JSON' });
  await expect(editDialog).toBeVisible();
  await replaceMonacoEditorValue(
    page,
    editDialog,
    JSON.stringify(
      {
        count: 2,
        createdAt: { __type__: 'timestamp', value: createdAt },
        source: 'ui-edit',
        status: 'edited',
      },
      null,
      2,
    ),
  );
  await editDialog.getByRole('button', { name: 'Save' }).click();
  await expectDialogHidden(editDialog, 'Edit dialog stayed open');
  await refreshChangedResults(page);
  await expect(page.getByText('edited').first()).toBeVisible();

  const edited = await getFirestoreEmulatorDocument(path);
  expect(edited?.fields).toMatchObject({
    count: { integerValue: '2' },
    createdAt: { timestampValue: createdAt },
    source: { stringValue: 'ui-edit' },
    status: { stringValue: 'edited' },
  });
}

async function resolveConflict(page: Page, suffix: string): Promise<void> {
  const documentId = `conflict-${suffix}`;
  const path = `smokeUiConflicts/${documentId}`;
  const deliveredAt = new Date(Date.now() + 1).toISOString();
  await setFirestoreEmulatorDocument(path, {
    deliveredAt: { __type__: 'timestamp', value: deliveredAt },
    title: 'base',
  });

  await runCollectionQuery(page, 'smokeUiConflicts');
  await selectDocument(page, documentId);
  await page.getByRole('button', { name: 'Edit document' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit document JSON' });
  await expect(editDialog).toBeVisible();

  await setFirestoreEmulatorDocument(path, {
    deliveredAt: { __type__: 'timestamp', value: deliveredAt },
    remoteOnly: true,
    title: 'remote',
  });
  await replaceMonacoEditorValue(
    page,
    editDialog,
    JSON.stringify(
      {
        deliveredAt: { __type__: 'timestamp', value: deliveredAt },
        localOnly: true,
        title: 'local',
      },
      null,
      2,
    ),
  );
  await editDialog.getByRole('button', { name: 'Save' }).click();

  const conflictDialog = page.getByRole('dialog', { name: 'Resolve save conflict' });
  await expect(conflictDialog).toBeVisible();
  await expect(conflictDialog.getByText(/changed/)).toBeVisible();
  await replaceMonacoEditorValue(
    page,
    conflictDialog,
    JSON.stringify(
      {
        deliveredAt: { __type__: 'timestamp', value: deliveredAt },
        localMerged: true,
        remoteOnly: true,
        title: 'merged',
      },
      null,
      2,
    ),
  );
  await conflictDialog.getByRole('button', { name: 'Save merged' }).click();
  await expectDialogHidden(conflictDialog, 'Conflict dialog stayed open');

  const merged = await getFirestoreEmulatorDocument(path);
  expect(merged?.fields).toMatchObject({
    deliveredAt: { timestampValue: deliveredAt },
    localMerged: { booleanValue: true },
    remoteOnly: { booleanValue: true },
    title: { stringValue: 'merged' },
  });
}

async function deleteWithSelectedSubcollection(page: Page, suffix: string): Promise<void> {
  const documentId = `delete-${suffix}`;
  const path = `smokeUiDeletes/${documentId}`;
  const deletedChildPath = `${path}/events/deleted`;
  const keptChildPath = `${path}/keep/kept`;
  await setFirestoreEmulatorDocument(path, { type: 'parent' });
  await setFirestoreEmulatorDocument(deletedChildPath, { type: 'deleted' });
  await setFirestoreEmulatorDocument(keptChildPath, { type: 'kept' });

  await runCollectionQuery(page, 'smokeUiDeletes');
  await selectDocument(page, documentId);
  await expect(page.getByRole('button', { name: /events/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Delete document' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete document' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Delete subcollection events/ }).check();
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expectDialogHidden(dialog, 'Delete dialog stayed open');

  expect(await getFirestoreEmulatorDocument(path)).toBeNull();
  expect(await getFirestoreEmulatorDocument(deletedChildPath)).toBeNull();
  expect(await getFirestoreEmulatorDocument(keptChildPath)).toMatchObject({
    fields: { type: { stringValue: 'kept' } },
  });

  await deleteFirestoreEmulatorDocument(keptChildPath);
}

async function runCollectionQuery(page: Page, path: string): Promise<void> {
  await page.getByRole('tab', { name: 'Table' }).click();
  await page.getByLabel('Query path').fill(path);
  await page.getByLabel('Result limit').fill('25');
  await clearFiltersAndSort(page);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('Document ID')).toBeVisible();
}

async function clearFiltersAndSort(page: Page): Promise<void> {
  await queryField(page, 'Sort field').fill('');
  if (await queryField(page, 'Filter 1 field').count()) {
    await queryField(page, 'Filter 1 field').fill('');
    await page.getByLabel('Filter 1 value').fill('');
  }
}

async function ensureFilterRow(page: Page): Promise<void> {
  if (await queryField(page, 'Filter 1 field').count()) return;
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(queryField(page, 'Filter 1 field')).toBeVisible();
}

function queryField(page: Page, name: string) {
  return page.getByRole('combobox', { name });
}

async function selectDocument(page: Page, documentId: string): Promise<void> {
  await page.getByText(documentId, { exact: true }).first().click();
  await expect(page.getByText(new RegExp(`/${escapeRegExp(documentId)}$`)).first()).toBeVisible();
}

async function refreshChangedResults(page: Page): Promise<void> {
  const bannerText = page.getByText('Results changed.');
  await expect(bannerText).toBeVisible();
  await bannerText.locator('xpath=..').getByRole('button', { name: 'Refresh' }).click();
}

async function expectDialogHidden(dialog: ReturnType<Page['getByRole']>, message: string) {
  try {
    await expect(dialog).toBeHidden();
  } catch (error) {
    throw new Error(`${message}: ${await dialog.textContent()}`, { cause: error });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

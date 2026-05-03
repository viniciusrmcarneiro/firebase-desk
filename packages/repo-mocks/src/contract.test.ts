import type { ScriptRunEvent } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  createAuthUserFixture,
  createFixtureCollection,
  createFixtureDocument,
  createProjectFixture,
  MOCK_CONNECTION_LOAD_ERROR_PROJECT_ID,
  MockAuthRepository,
  MockFirebaseError,
  MockFirestoreRepository,
  MockProjectsRepository,
  MockScriptRunnerRepository,
  MockSettingsRepository,
} from './index.ts';

describe('repo-mocks contract conformance', () => {
  it('projects repo: list/get/add/remove round-trip', async () => {
    const repo = new MockProjectsRepository();
    const initial = await repo.list();
    expect(initial.length).toBeGreaterThan(0);
    await expect(repo.add({
      name: ' ',
      projectId: 'tmp',
      target: 'emulator',
      emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    })).rejects.toThrow('Project display name is required.');
    await expect(repo.add({
      name: 'Prod',
      projectId: 'prod',
      target: 'production',
    })).rejects.toThrow('Service account JSON is required.');
    await expect(repo.add({
      name: 'Prod',
      projectId: 'prod',
      target: 'production',
      credentialJson: serviceAccountJson('other-prod'),
    })).rejects.toThrow('Service account project_id does not match the selected project ID.');
    const prod = await repo.add({
      name: 'Prod',
      projectId: 'prod',
      target: 'production',
      credentialJson: serviceAccountJson('prod'),
    });
    expect(prod).toMatchObject({
      hasCredential: true,
      projectId: 'prod',
      target: 'production',
    });
    expect(prod.emulator).toBeUndefined();
    const added = await repo.add({
      name: 'Tmp',
      projectId: 'tmp',
      target: 'emulator',
    });
    expect(added.emulator).toEqual({ firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' });
    expect((await repo.get(added.id))?.id).toBe(added.id);
    const updated = await repo.update(added.id, {
      name: 'Tmp Renamed',
      projectId: 'tmp-renamed',
    });
    expect(updated.name).toBe('Tmp Renamed');
    expect(updated.projectId).toBe('tmp-renamed');
    await expect(repo.update('prod', { projectId: 'other-prod' })).rejects.toThrow(
      'Production project ID comes from the service account JSON.',
    );
    await expect(repo.update(added.id, { name: ' ' })).rejects.toThrow(
      'Project display name is required.',
    );
    await repo.remove(added.id);
    expect(await repo.get(added.id)).toBeNull();
  });

  it('firestore repo: covers collection, document, pagination, write, delete, and errors', async () => {
    const repo = new MockFirestoreRepository();
    const cols = await repo.listRootCollections('p');
    expect(cols.length).toBeGreaterThan(0);
    expect(cols.some((collection) => collection.path === 'auditLogs')).toBe(true);

    const docs = await repo.listDocuments('p', 'orders', { limit: 1 });
    expect(docs.items).toHaveLength(1);
    expect(docs.nextCursor?.token).toBe('1');
    await expect(repo.listDocuments('p', 'orders/ord_1024')).rejects.toThrow(
      'Invalid collection path',
    );

    const page = await repo.runQuery({ connectionId: 'p', path: 'orders' }, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.data).toBeDefined();
    expect(page.items[0]?.subcollections?.[0]?.path).toBe('orders/ord_1024/events');
    await expect(repo.runQuery({ connectionId: 'p', path: 'orders/ord_1024' })).rejects.toThrow(
      'Invalid collection path',
    );
    await expect(repo.runQuery(
      { connectionId: 'p', path: 'orders' },
      { cursor: { token: 'expired' } },
    )).rejects.toThrow('Firestore pagination cursor expired.');

    const subcollections = await repo.listSubcollections('p', 'orders/ord_1024');
    expect(subcollections.map((collection) => collection.path)).toContain('orders/ord_1024/events');
    await expect(repo.listSubcollections('p', 'orders')).rejects.toThrow('Invalid document path');

    const document = await repo.getDocument('p', 'orders/ord_1024');
    expect(document?.path).toBe('orders/ord_1024');
    await expect(repo.getDocument('p', 'orders')).rejects.toThrow('Invalid document path');

    const savedResult = await repo.saveDocument('p', 'orders/ord_saved', { status: 'draft' });
    expect(savedResult.status).toBe('saved');
    const saved = await repo.getDocument('p', 'orders/ord_saved');
    expect(saved?.path).toBe('orders/ord_saved');
    expect(saved?.updateTime).toBeDefined();

    await expect(repo.generateDocumentId('p', 'orders')).resolves.toEqual({
      documentId: 'mock_1',
    });
    await expect(repo.generateDocumentId('p', '/orders')).rejects.toThrow(
      'Invalid collection path',
    );
    const created = await repo.createDocument('p', 'orders', 'ord_created', { status: 'new' });
    expect(created.path).toBe('orders/ord_created');
    await expect(repo.createDocument('p', 'orders', 'ord_created', { status: 'again' }))
      .rejects.toThrow('already exists');
    await expect(repo.createDocument('p', 'orders/', 'ord_invalid', {})).rejects.toThrow(
      'Invalid collection path',
    );

    await repo.saveDocument('p', 'orders/ord_fields', {
      id: 'data-id',
      path: 'data-path',
      subcollections: 'data-subcollections',
      'a.b': true,
    });
    await expect(repo.getDocument('p', 'orders/ord_fields')).resolves.toMatchObject({
      data: {
        id: 'data-id',
        path: 'data-path',
        subcollections: 'data-subcollections',
        'a.b': true,
      },
    });

    await repo.saveDocument('p', 'orders/ord_encoded', {
      customerRef: { __type__: 'reference', path: 'customers/cus_ada' },
      deliveredAt: { __type__: 'timestamp', value: '2026-04-29T10:30:00.000Z' },
      payload: { __type__: 'bytes', base64: 'aGVsbG8=' },
      place: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
    });
    await expect(repo.getDocument('p', 'orders/ord_encoded')).resolves.toMatchObject({
      data: {
        customerRef: { __type__: 'reference', path: 'customers/cus_ada' },
        deliveredAt: { __type__: 'timestamp', value: '2026-04-29T10:30:00.000Z' },
        payload: { __type__: 'bytes', base64: 'aGVsbG8=' },
        place: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
      },
    });
    await expect(repo.saveDocument('p', '/orders/ord_invalid', {})).rejects.toThrow(
      'Invalid document path',
    );

    await repo.saveDocument('p', 'orders/ord_patch', {
      status: 'draft',
      remote: 'old',
      'a.b': 'literal',
      meta: { count: 1 },
    });
    const patchBase = await repo.getDocument('p', 'orders/ord_patch');
    await expect(repo.updateDocumentFields('p', 'orders/ord_patch', [{
      baseValue: 'draft',
      fieldPath: ['status'],
      type: 'set',
      value: 'paid',
    }], {
      lastUpdateTime: patchBase!.updateTime!,
      staleBehavior: 'save-and-notify',
    })).resolves.toMatchObject({
      status: 'saved',
      document: { data: { status: 'paid', remote: 'old', 'a.b': 'literal' } },
    });
    const dottedBase = await repo.getDocument('p', 'orders/ord_patch');
    await repo.updateDocumentFields('p', 'orders/ord_patch', [{
      baseValue: 'literal',
      fieldPath: ['a.b'],
      type: 'delete',
    }], {
      lastUpdateTime: dottedBase!.updateTime!,
      staleBehavior: 'save-and-notify',
    });
    await expect(repo.getDocument('p', 'orders/ord_patch')).resolves.toMatchObject({
      data: { status: 'paid', remote: 'old', meta: { count: 1 } },
    });
    expect((await repo.getDocument('p', 'orders/ord_patch'))?.data['a.b']).toBeUndefined();
    const missingDeleteBase = await repo.getDocument('p', 'orders/ord_patch');
    await repo.updateDocumentFields('p', 'orders/ord_patch', [{
      baseValue: undefined,
      fieldPath: ['meta', 'missing', 'nested'],
      type: 'delete',
    }], {
      lastUpdateTime: missingDeleteBase!.updateTime!,
      staleBehavior: 'save-and-notify',
    });
    await expect(repo.getDocument('p', 'orders/ord_patch')).resolves.toMatchObject({
      data: { meta: { count: 1 }, remote: 'old', status: 'paid' },
    });

    const staleBase = await repo.getDocument('p', 'orders/ord_patch');
    await repo.saveDocument('p', 'orders/ord_patch', {
      status: 'paid',
      remote: 'new',
      meta: { count: 1 },
    });
    await expect(repo.updateDocumentFields('p', 'orders/ord_patch', [{
      baseValue: 'paid',
      fieldPath: ['status'],
      type: 'set',
      value: 'shipped',
    }], {
      lastUpdateTime: staleBase!.updateTime!,
      staleBehavior: 'save-and-notify',
    })).resolves.toMatchObject({
      documentChanged: true,
      status: 'saved',
      document: { data: { status: 'shipped', remote: 'new' } },
    });
    const patchConflictBase = await repo.getDocument('p', 'orders/ord_patch');
    await repo.saveDocument('p', 'orders/ord_patch', {
      status: 'remote',
      remote: 'new',
      meta: { count: 1 },
    });
    await expect(repo.updateDocumentFields('p', 'orders/ord_patch', [{
      baseValue: 'shipped',
      fieldPath: ['status'],
      type: 'set',
      value: 'local',
    }], {
      lastUpdateTime: patchConflictBase!.updateTime!,
      staleBehavior: 'save-and-notify',
    })).resolves.toMatchObject({
      status: 'conflict',
      remoteDocument: { data: { status: 'remote' } },
    });
    await expect(repo.updateDocumentFields('p', 'orders/ord_patch', [{
      baseValue: 'new',
      fieldPath: ['remote'],
      type: 'set',
      value: 'blocked',
    }], {
      lastUpdateTime: patchConflictBase!.updateTime!,
      staleBehavior: 'block',
    })).resolves.toMatchObject({
      status: 'document-changed',
      remoteDocument: { data: { remote: 'new' } },
    });

    const conflictBase = await repo.getDocument('p', 'orders/ord_encoded');
    expect(conflictBase?.updateTime).toBeDefined();
    await repo.saveDocument('p', 'orders/ord_encoded', { status: 'remote' });
    await expect(repo.saveDocument(
      'p',
      'orders/ord_encoded',
      { status: 'local' },
      { lastUpdateTime: conflictBase!.updateTime! },
    )).resolves.toMatchObject({
      status: 'conflict',
      remoteDocument: { data: { status: 'remote' } },
    });
    await expect(repo.getDocument('p', 'orders/ord_encoded')).resolves.toMatchObject({
      data: { status: 'remote' },
    });

    await repo.saveDocument('p', 'objects/a', { value: { score: 2, toJSON: 'not callable' } });
    await repo.saveDocument('p', 'objects/b', { value: { score: 1 } });
    await expect(repo.runQuery({
      connectionId: 'p',
      path: 'objects',
      sorts: [{ field: 'value', direction: 'asc' }],
    })).resolves.toMatchObject({ items: expect.any(Array) });

    await repo.deleteDocument('p', 'orders/ord_saved');
    expect(await repo.getDocument('p', 'orders/ord_saved')).toBeNull();

    await repo.saveDocument('p', 'orders/ord_nested', { status: 'draft' });
    await repo.saveDocument('p', 'orders/ord_nested/events/evt_1', { type: 'deleted' });
    await repo.saveDocument('p', 'orders/ord_nested/audit/aud_1', { type: 'kept' });
    await expect(repo.deleteDocument('p', 'orders/ord_nested', {
      deleteSubcollectionPaths: ['orders/ord_nested/events/'],
    })).rejects.toThrow('Invalid collection path');
    await expect(repo.deleteDocument('p', 'orders/ord_nested', {
      deleteSubcollectionPaths: ['orders/ord_nested/events/evt_1/logs'],
    })).rejects.toThrow('Invalid subcollection path');
    await repo.deleteDocument('p', 'orders/ord_nested', {
      deleteSubcollectionPaths: ['orders/ord_nested/events'],
    });
    expect(await repo.getDocument('p', 'orders/ord_nested')).toBeNull();
    expect(await repo.getDocument('p', 'orders/ord_nested/events/evt_1')).toBeNull();
    expect(await repo.getDocument('p', 'orders/ord_nested/audit/aud_1')).not.toBeNull();
    await expect(repo.listSubcollections('p', 'orders/ord_nested')).resolves.toEqual([
      expect.objectContaining({ path: 'orders/ord_nested/audit' }),
    ]);

    await expect(repo.listRootCollections(MOCK_CONNECTION_LOAD_ERROR_PROJECT_ID)).rejects
      .toBeInstanceOf(MockFirebaseError);
  });

  it('auth repo: list + search + get', async () => {
    const repo = new MockAuthRepository();
    const defaultPage = await repo.listUsers('p');
    expect(defaultPage.items).toHaveLength(25);
    expect(defaultPage.nextCursor?.token).toBe('25');
    const page = await repo.listUsers('p', { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor?.token).toBe('2');
    const found = await repo.searchUsers('p', 'ada@example.com');
    expect(found.length).toBe(1);
    const user = await repo.getUser('p', 'u_ada');
    expect(user?.uid).toBe('u_ada');
    expect(user?.customClaims['permissions']).toEqual(['read', 'write', 'billing']);
    const updated = await repo.setCustomClaims('p', 'u_ada', { role: 'owner' });
    expect(updated.customClaims).toEqual({ role: 'owner' });
    await expect(repo.setCustomClaims('p', 'u_ada', [] as unknown as Record<string, unknown>))
      .rejects.toThrow('Custom claims JSON must be an object.');
    await expect(repo.getUser('p', 'u_ada')).resolves.toMatchObject({
      customClaims: { role: 'owner' },
    });
  });

  it('settings repo: load/save with hotkey overrides', async () => {
    const repo = new MockSettingsRepository();
    await repo.save({
      sidebarWidth: 320,
      firestoreFieldCatalogs: {
        orders: [{ count: 1, field: 'status', types: ['string'] }],
      },
    });
    expect((await repo.load()).sidebarWidth).toBe(320);
    expect((await repo.load()).firestoreFieldCatalogs.orders).toEqual([
      { count: 1, field: 'status', types: ['string'] },
    ]);
    await repo.setHotkeyOverrides({ 'sidebar.toggle': 'Ctrl+Shift+B' });
    expect((await repo.getHotkeyOverrides())['sidebar.toggle']).toBe('Ctrl+Shift+B');
  });

  it('script runner covers stream, errors, empty, arrays, plain objects, and document-like values', async () => {
    const repo = new MockScriptRunnerRepository();
    const result = await repo.run({ runId: 'run-1', connectionId: 'p', source: 'noop' });
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.stream?.some((item) => item.label.includes('QuerySnapshot'))).toBe(true);
    const querySnapshot = result.stream?.find((item) => item.label === 'yield QuerySnapshot');
    expect(querySnapshot?.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            updatedAt: expect.objectContaining({ __type__: 'timestamp' }),
          }),
        }),
      ]),
    );

    await expect(repo.run({ runId: 'run-2', connectionId: 'p', source: 'throw new Error()' }))
      .resolves
      .toMatchObject({ errors: [{ code: 'permission-denied' }] });
    await expect(repo.run({ runId: 'run-3', connectionId: 'p', source: 'empty' })).resolves
      .toMatchObject({ returnValue: null, stream: [] });
    await expect(repo.run({ runId: 'run-4', connectionId: 'p', source: 'array' })).resolves
      .toMatchObject({ stream: [{ label: 'yield array' }] });
    await expect(repo.run({ runId: 'run-5', connectionId: 'p', source: 'plain' })).resolves
      .toMatchObject({ stream: [{ label: 'yield plain object' }] });
    await expect(repo.run({ runId: 'run-6', connectionId: 'p', source: 'document' })).resolves
      .toMatchObject({ stream: [{ label: 'yield document-like value' }] });
    await expect(repo.cancel('run-6')).resolves.toBeUndefined();
  });

  it('script runner emits live events and unsubscribes listeners', async () => {
    const repo = new MockScriptRunnerRepository();
    const events: ScriptRunEvent[] = [];
    const unsubscribe = repo.subscribe((event) => events.push(event));

    await repo.run({ runId: 'run-live', connectionId: 'p', source: 'plain' });

    expect(events[0]).toMatchObject({ type: 'log', runId: 'run-live' });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'output', runId: 'run-live' }),
        expect.objectContaining({ type: 'complete', runId: 'run-live' }),
      ]),
    );

    unsubscribe();
    events.length = 0;
    await repo.run({ runId: 'run-after-unsubscribe', connectionId: 'p', source: 'throw' });

    expect(events).toEqual([]);
  });

  it('fixture builders create targeted contract-shaped data', () => {
    expect(createProjectFixture({ id: 'x' }).projectId).toBe('x');
    expect(createFixtureDocument('doc').id).toBe('doc');
    expect(createFixtureCollection('items').path).toBe('items');
    expect(createAuthUserFixture({ uid: 'u_x' }).email).toBe('u_x@example.com');
  });
});

function serviceAccountJson(projectId: string): string {
  return JSON.stringify({
    type: 'service_account',
    project_id: projectId,
    client_email: `firebase-adminsdk@example.${projectId}.iam.gserviceaccount.com`,
    private_key: '-----BEGIN PRIVATE KEY-----\\nmock\\n-----END PRIVATE KEY-----\\n',
    private_key_id: 'mock-key-id',
  });
}

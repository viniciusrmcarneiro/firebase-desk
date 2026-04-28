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
    const added = await repo.add({
      name: 'Tmp',
      projectId: 'tmp',
      target: 'emulator',
      emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    });
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

    const page = await repo.runQuery({ connectionId: 'p', path: 'orders' }, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.data).toBeDefined();
    expect(page.items[0]?.subcollections?.[0]?.path).toBe('orders/ord_1024/events');

    const subcollections = await repo.listSubcollections('p', 'orders/ord_1024');
    expect(subcollections.map((collection) => collection.path)).toContain('orders/ord_1024/events');

    const document = await repo.getDocument('p', 'orders/ord_1024');
    expect(document?.path).toBe('orders/ord_1024');

    const saved = await repo.saveDocument('p', 'orders/ord_saved', { status: 'draft' });
    expect(saved.path).toBe('orders/ord_saved');
    expect(await repo.getDocument('p', 'orders/ord_saved')).not.toBeNull();

    await repo.saveDocument('p', 'objects/a', { value: { score: 2, toJSON: 'not callable' } });
    await repo.saveDocument('p', 'objects/b', { value: { score: 1 } });
    await expect(repo.runQuery({
      connectionId: 'p',
      path: 'objects',
      sorts: [{ field: 'value', direction: 'asc' }],
    })).resolves.toMatchObject({ items: expect.any(Array) });

    await repo.deleteDocument('p', 'orders/ord_saved');
    expect(await repo.getDocument('p', 'orders/ord_saved')).toBeNull();

    await expect(repo.listRootCollections(MOCK_CONNECTION_LOAD_ERROR_PROJECT_ID)).rejects
      .toBeInstanceOf(MockFirebaseError);
  });

  it('auth repo: list + search + get', async () => {
    const repo = new MockAuthRepository();
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
    await expect(repo.getUser('p', 'u_ada')).resolves.toMatchObject({
      customClaims: { role: 'owner' },
    });
  });

  it('settings repo: load/save with hotkey overrides', async () => {
    const repo = new MockSettingsRepository();
    await repo.save({ sidebarWidth: 320 });
    expect((await repo.load()).sidebarWidth).toBe(320);
    await repo.setHotkeyOverrides({ 'sidebar.toggle': 'Ctrl+Shift+B' });
    expect((await repo.getHotkeyOverrides())['sidebar.toggle']).toBe('Ctrl+Shift+B');
  });

  it('script runner covers stream, errors, empty, arrays, plain objects, and document-like values', async () => {
    const repo = new MockScriptRunnerRepository();
    const result = await repo.run({ projectId: 'p', source: 'noop' });
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

    await expect(repo.run({ projectId: 'p', source: 'throw new Error()' })).resolves
      .toMatchObject({ errors: [{ code: 'permission-denied' }] });
    await expect(repo.run({ projectId: 'p', source: 'empty' })).resolves
      .toMatchObject({ returnValue: null, stream: [] });
    await expect(repo.run({ projectId: 'p', source: 'array' })).resolves
      .toMatchObject({ stream: [{ label: 'yield array' }] });
    await expect(repo.run({ projectId: 'p', source: 'plain' })).resolves
      .toMatchObject({ stream: [{ label: 'yield plain object' }] });
    await expect(repo.run({ projectId: 'p', source: 'document' })).resolves
      .toMatchObject({ stream: [{ label: 'yield document-like value' }] });
  });

  it('fixture builders create targeted contract-shaped data', () => {
    expect(createProjectFixture({ id: 'x' }).projectId).toBe('x');
    expect(createFixtureDocument('doc').id).toBe('doc');
    expect(createFixtureCollection('items').path).toBe('items');
    expect(createAuthUserFixture({ uid: 'u_x' }).email).toBe('u_x@example.com');
  });
});

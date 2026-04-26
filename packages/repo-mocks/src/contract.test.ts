import { describe, expect, it } from 'vitest';
import {
  MockAuthRepository,
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
    const added = await repo.add({ name: 'Tmp', projectId: 'tmp', target: 'emulator' });
    expect((await repo.get(added.id))?.id).toBe(added.id);
    await repo.remove(added.id);
    expect(await repo.get(added.id)).toBeNull();
  });

  it('firestore repo: lists collections + runs query with encoded data', async () => {
    const repo = new MockFirestoreRepository();
    const cols = await repo.listRootCollections('p');
    expect(cols.length).toBeGreaterThan(0);
    const page = await repo.runQuery({ projectId: 'p', path: 'orders' });
    expect(page.items[0]?.data).toBeDefined();
  });

  it('auth repo: list + search + get', async () => {
    const repo = new MockAuthRepository();
    const page = await repo.listUsers('p');
    expect(page.items.length).toBeGreaterThan(0);
    const found = await repo.searchUsers('p', 'ada');
    expect(found.length).toBe(1);
    expect((await repo.getUser('p', 'u_ada'))?.uid).toBe('u_ada');
  });

  it('settings repo: load/save with hotkey overrides', async () => {
    const repo = new MockSettingsRepository();
    await repo.save({ sidebarWidth: 320 });
    expect((await repo.load()).sidebarWidth).toBe(320);
    await repo.setHotkeyOverrides({ 'sidebar.toggle': 'Ctrl+Shift+B' });
    expect((await repo.getHotkeyOverrides())['sidebar.toggle']).toBe('Ctrl+Shift+B');
  });

  it('script runner returns logs + return value', async () => {
    const result = await new MockScriptRunnerRepository().run({ projectId: 'p', source: 'noop' });
    expect(result.logs.length).toBeGreaterThan(0);
  });
});

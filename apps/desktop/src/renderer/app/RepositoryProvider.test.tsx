import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRepositories } from './RepositoryProvider.tsx';

const snapshot: SettingsSnapshot = {
  sidebarWidth: 320,
  inspectorWidth: 360,
  theme: 'system',
  dataMode: 'mock',
  hotkeyOverrides: {},
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createRepositories', () => {
  it('uses desktop settings in mock data mode when the desktop API is available', async () => {
    const save = vi.fn(async () => ({ ...snapshot, dataMode: 'live' as const }));
    const onDataModeChange = vi.fn();
    vi.stubGlobal('firebaseDesk', {
      projects: {
        list: vi.fn(async () => []),
      },
      settings: {
        load: vi.fn(async () => snapshot),
        save,
        getHotkeyOverrides: vi.fn(async () => ({})),
        setHotkeyOverrides: vi.fn(async () => {}),
      },
    });

    const repositories = createRepositories({ dataMode: 'mock', onDataModeChange });
    await repositories.settings.save({ dataMode: 'live' });

    expect(save).toHaveBeenCalledWith({ dataMode: 'live' });
    expect(onDataModeChange).toHaveBeenCalledWith('live');
  });

  it('does not fall back to mock feature repositories in live data mode', async () => {
    const listUsers = vi.fn(async () => ({ items: [], nextCursor: null }));
    const runScript = vi.fn(async () => ({
      returnValue: 1,
      logs: [],
      errors: [],
      durationMs: 1,
    }));
    vi.stubGlobal('firebaseDesk', {
      auth: {
        listUsers,
      },
      firestore: {
        listRootCollections: vi.fn(async () => []),
      },
      projects: {
        list: vi.fn(async () => []),
      },
      scriptRunner: {
        run: runScript,
        cancel: vi.fn(async () => {}),
      },
      settings: {
        load: vi.fn(async () => ({ ...snapshot, dataMode: 'live' as const })),
        save: vi.fn(async () => ({ ...snapshot, dataMode: 'live' as const })),
        getHotkeyOverrides: vi.fn(async () => ({})),
        setHotkeyOverrides: vi.fn(async () => {}),
      },
    });

    const repositories = createRepositories({ dataMode: 'live' });

    await expect(repositories.auth.listUsers('demo-local')).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(listUsers).toHaveBeenCalledWith({ projectId: 'demo-local' });
    await expect(repositories.scriptRunner.run({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'return 1;',
    }))
      .resolves.toMatchObject({ returnValue: 1 });
    expect(runScript).toHaveBeenCalledWith({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'return 1;',
    });
  });
});

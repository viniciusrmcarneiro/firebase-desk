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
});

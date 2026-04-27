import type { SettingsSnapshot } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import { MainSettingsRepository } from './main-settings-repository.ts';

const initialSnapshot: SettingsSnapshot = {
  sidebarWidth: 320,
  inspectorWidth: 360,
  theme: 'system',
  dataMode: 'mock',
  hotkeyOverrides: { 'query.run': 'Meta+Enter' },
};

describe('MainSettingsRepository', () => {
  it('merges patches without erasing omitted settings', async () => {
    const store = new MemorySettingsStore(initialSnapshot);
    const repository = new MainSettingsRepository(store);

    await expect(repository.save({ dataMode: 'live' })).resolves.toEqual({
      ...initialSnapshot,
      dataMode: 'live',
    });
  });

  it('updates hotkey overrides through the settings snapshot', async () => {
    const store = new MemorySettingsStore(initialSnapshot);
    const repository = new MainSettingsRepository(store);

    await repository.setHotkeyOverrides({ 'tab.new': 'Meta+N' });

    await expect(repository.getHotkeyOverrides()).resolves.toEqual({ 'tab.new': 'Meta+N' });
  });
});

class MemorySettingsStore {
  constructor(private snapshot: SettingsSnapshot) {}

  async load(): Promise<SettingsSnapshot> {
    return this.clone(this.snapshot);
  }

  async save(snapshot: SettingsSnapshot): Promise<SettingsSnapshot> {
    this.snapshot = this.clone(snapshot);
    return this.clone(this.snapshot);
  }

  private clone(snapshot: SettingsSnapshot): SettingsSnapshot {
    return { ...snapshot, hotkeyOverrides: { ...snapshot.hotkeyOverrides } };
  }
}

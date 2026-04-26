import type {
  HotkeyOverrides,
  SettingsRepository,
  SettingsSnapshot,
} from '@firebase-desk/repo-contracts';

const DEFAULT_SNAPSHOT: SettingsSnapshot = {
  sidebarWidth: 280,
  inspectorWidth: 360,
  theme: 'system',
  hotkeyOverrides: {},
};

export class MockSettingsRepository implements SettingsRepository {
  private snapshot: SettingsSnapshot = { ...DEFAULT_SNAPSHOT };

  async load(): Promise<SettingsSnapshot> {
    return { ...this.snapshot, hotkeyOverrides: { ...this.snapshot.hotkeyOverrides } };
  }

  async save(patch: Partial<SettingsSnapshot>): Promise<SettingsSnapshot> {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      hotkeyOverrides: patch.hotkeyOverrides
        ? { ...patch.hotkeyOverrides }
        : { ...this.snapshot.hotkeyOverrides },
    };
    return this.load();
  }

  async getHotkeyOverrides(): Promise<HotkeyOverrides> {
    return { ...this.snapshot.hotkeyOverrides };
  }

  async setHotkeyOverrides(overrides: HotkeyOverrides): Promise<void> {
    this.snapshot = { ...this.snapshot, hotkeyOverrides: { ...overrides } };
  }
}

import type {
  HotkeyOverrides,
  SettingsPatch,
  SettingsRepository,
  SettingsSnapshot,
} from '@firebase-desk/repo-contracts';

const DEFAULT_SNAPSHOT: SettingsSnapshot = {
  sidebarWidth: 320,
  inspectorWidth: 360,
  theme: 'system',
  dataMode: 'mock',
  hotkeyOverrides: {},
};

export class MockSettingsRepository implements SettingsRepository {
  private snapshot: SettingsSnapshot = { ...DEFAULT_SNAPSHOT };

  async load(): Promise<SettingsSnapshot> {
    return { ...this.snapshot, hotkeyOverrides: { ...this.snapshot.hotkeyOverrides } };
  }

  async save(patch: SettingsPatch): Promise<SettingsSnapshot> {
    this.snapshot = {
      sidebarWidth: patch.sidebarWidth ?? this.snapshot.sidebarWidth,
      inspectorWidth: patch.inspectorWidth ?? this.snapshot.inspectorWidth,
      theme: patch.theme ?? this.snapshot.theme,
      dataMode: patch.dataMode ?? this.snapshot.dataMode,
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

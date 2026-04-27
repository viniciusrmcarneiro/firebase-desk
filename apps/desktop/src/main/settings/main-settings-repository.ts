import type {
  HotkeyOverrides,
  SettingsPatch,
  SettingsRepository,
  SettingsSnapshot,
} from '@firebase-desk/repo-contracts';

interface SettingsStoreLike {
  readonly load: () => Promise<SettingsSnapshot>;
  readonly save: (snapshot: SettingsSnapshot) => Promise<SettingsSnapshot>;
}

export class MainSettingsRepository implements SettingsRepository {
  private readonly store: SettingsStoreLike;

  constructor(store: SettingsStoreLike) {
    this.store = store;
  }

  async load(): Promise<SettingsSnapshot> {
    return await this.store.load();
  }

  async save(patch: SettingsPatch): Promise<SettingsSnapshot> {
    const current = await this.store.load();
    return await this.store.save({
      sidebarWidth: patch.sidebarWidth ?? current.sidebarWidth,
      inspectorWidth: patch.inspectorWidth ?? current.inspectorWidth,
      theme: patch.theme ?? current.theme,
      dataMode: patch.dataMode ?? current.dataMode,
      hotkeyOverrides: patch.hotkeyOverrides
        ? { ...patch.hotkeyOverrides }
        : { ...current.hotkeyOverrides },
    });
  }

  async getHotkeyOverrides(): Promise<HotkeyOverrides> {
    return (await this.load()).hotkeyOverrides;
  }

  async setHotkeyOverrides(overrides: HotkeyOverrides): Promise<void> {
    await this.save({ hotkeyOverrides: { ...overrides } });
  }
}

import type {
  HotkeyOverrides,
  SettingsPatch,
  SettingsRepository,
  SettingsSnapshot,
} from '@firebase-desk/repo-contracts';

export class IpcSettingsRepository implements SettingsRepository {
  async load(): Promise<SettingsSnapshot> {
    return await window.firebaseDesk.settings.load();
  }

  async save(patch: SettingsPatch): Promise<SettingsSnapshot> {
    return await window.firebaseDesk.settings.save(patch);
  }

  async getHotkeyOverrides(): Promise<HotkeyOverrides> {
    return await window.firebaseDesk.settings.getHotkeyOverrides();
  }

  async setHotkeyOverrides(overrides: HotkeyOverrides): Promise<void> {
    await window.firebaseDesk.settings.setHotkeyOverrides(overrides);
  }
}

/**
 * Future map of user-defined hotkey overrides.
 * Keys are central registry IDs (see @firebase-desk/hotkeys); values are accelerator strings.
 * Phase 2 ships the plumbing only; the rebinding UI is deferred.
 */
export type HotkeyOverrides = Readonly<Record<string, string>>;

export interface SettingsSnapshot {
  readonly sidebarWidth: number;
  readonly inspectorWidth: number;
  readonly theme: 'system' | 'light' | 'dark';
  readonly hotkeyOverrides: HotkeyOverrides;
}

export interface SettingsRepository {
  load(): Promise<SettingsSnapshot>;
  save(patch: Partial<SettingsSnapshot>): Promise<SettingsSnapshot>;
  getHotkeyOverrides(): Promise<HotkeyOverrides>;
  setHotkeyOverrides(overrides: HotkeyOverrides): Promise<void>;
}

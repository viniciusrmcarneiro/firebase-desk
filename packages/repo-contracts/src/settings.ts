/**
 * Future map of user-defined hotkey overrides.
 * Keys are central registry IDs (see @firebase-desk/hotkeys); values are accelerator strings.
 * Phase 2 ships the plumbing only; the rebinding UI is deferred.
 */
export type HotkeyOverrides = Readonly<Record<string, string>>;

export type DataMode = 'mock' | 'live';

export interface ResultTableLayout {
  readonly columnOrder: string[];
  readonly columnSizing: Record<string, number>;
}

export type ResultTableLayouts = Record<string, ResultTableLayout>;

export interface SettingsSnapshot {
  readonly sidebarWidth: number;
  readonly inspectorWidth: number;
  readonly theme: 'system' | 'light' | 'dark';
  readonly dataMode: DataMode;
  readonly hotkeyOverrides: HotkeyOverrides;
  readonly resultTableLayouts: ResultTableLayouts;
}

export interface SettingsPatch {
  readonly sidebarWidth?: number | undefined;
  readonly inspectorWidth?: number | undefined;
  readonly theme?: SettingsSnapshot['theme'] | undefined;
  readonly dataMode?: DataMode | undefined;
  readonly hotkeyOverrides?: HotkeyOverrides | undefined;
  readonly resultTableLayouts?: ResultTableLayouts | undefined;
}

export interface SettingsRepository {
  load(): Promise<SettingsSnapshot>;
  save(patch: SettingsPatch): Promise<SettingsSnapshot>;
  getHotkeyOverrides(): Promise<HotkeyOverrides>;
  setHotkeyOverrides(overrides: HotkeyOverrides): Promise<void>;
}

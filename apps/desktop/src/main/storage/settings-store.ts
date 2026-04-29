import { SettingsFileSchema } from '@firebase-desk/ipc-schemas';
import {
  type ActivityLogSettings,
  DEFAULT_ACTIVITY_LOG_SETTINGS,
  type SettingsSnapshot,
} from '@firebase-desk/repo-contracts';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonAtomic } from './atomic-write.ts';

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
  activityLog: DEFAULT_ACTIVITY_LOG_SETTINGS,
  sidebarWidth: 320,
  inspectorWidth: 360,
  theme: 'system',
  dataMode: 'live',
  hotkeyOverrides: {},
  resultTableLayouts: {},
  firestoreFieldCatalogs: {},
};

export class SettingsStore {
  private readonly filePath: string;
  private cache: SettingsSnapshot | null = null;

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'settings.json');
  }

  async load(): Promise<SettingsSnapshot> {
    if (this.cache) return cloneSnapshot(this.cache);
    this.cache = await this.readFile();
    return cloneSnapshot(this.cache);
  }

  async save(snapshot: SettingsSnapshot): Promise<SettingsSnapshot> {
    this.cache = cloneSnapshot(snapshot);
    await writeJsonAtomic(this.filePath, { version: 1, snapshot: this.cache });
    return cloneSnapshot(this.cache);
  }

  private async readFile(): Promise<SettingsSnapshot> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      const settingsFile = SettingsFileSchema.safeParse(parsed);
      if (!settingsFile.success) return cloneSnapshot(DEFAULT_SETTINGS_SNAPSHOT);
      return cloneSnapshot(settingsFile.data.snapshot);
    } catch (error) {
      if (isNotFound(error)) return cloneSnapshot(DEFAULT_SETTINGS_SNAPSHOT);
      throw error;
    }
  }
}

function cloneSnapshot(snapshot: SettingsSnapshot): SettingsSnapshot {
  return {
    ...snapshot,
    activityLog: cloneActivityLogSettings(snapshot.activityLog),
    hotkeyOverrides: { ...snapshot.hotkeyOverrides },
    firestoreFieldCatalogs: Object.fromEntries(
      Object.entries(snapshot.firestoreFieldCatalogs).map(([key, entries]) => [
        key,
        entries.map((entry) => ({
          count: entry.count,
          field: entry.field,
          types: [...entry.types],
        })),
      ]),
    ),
    resultTableLayouts: Object.fromEntries(
      Object.entries(snapshot.resultTableLayouts).map(([key, value]) => [
        key,
        {
          columnOrder: [...value.columnOrder],
          columnSizing: { ...value.columnSizing },
        },
      ]),
    ),
  };
}

function cloneActivityLogSettings(settings: ActivityLogSettings): ActivityLogSettings {
  return { ...settings };
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

import { z } from 'zod';

export const HotkeyOverridesSchema = z.record(z.string(), z.string());

export const DataModeSchema = z.enum(['mock', 'live']);

export const ResultTableLayoutSchema = z.object({
  columnOrder: z.array(z.string()),
  columnSizing: z.record(z.string(), z.number().int().nonnegative()),
});

export const ResultTableLayoutsSchema = z.record(z.string(), ResultTableLayoutSchema);

export const SettingsSnapshotSchema = z.object({
  sidebarWidth: z.number().int().nonnegative(),
  inspectorWidth: z.number().int().nonnegative(),
  theme: z.enum(['system', 'light', 'dark']),
  dataMode: DataModeSchema,
  hotkeyOverrides: HotkeyOverridesSchema,
  resultTableLayouts: ResultTableLayoutsSchema.default({}),
});

export const SettingsPatchSchema = SettingsSnapshotSchema.partial();

export const SettingsFileSchema = z.object({
  version: z.literal(1),
  snapshot: SettingsSnapshotSchema,
});

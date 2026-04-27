import { z } from 'zod';

export const HotkeyOverridesSchema = z.record(z.string(), z.string());

export const DataModeSchema = z.enum(['mock', 'live']);

export const SettingsSnapshotSchema = z.object({
  sidebarWidth: z.number().int().nonnegative(),
  inspectorWidth: z.number().int().nonnegative(),
  theme: z.enum(['system', 'light', 'dark']),
  dataMode: DataModeSchema,
  hotkeyOverrides: HotkeyOverridesSchema,
});

export const SettingsPatchSchema = SettingsSnapshotSchema.partial();

export const SettingsFileSchema = z.object({
  version: z.literal(1),
  snapshot: SettingsSnapshotSchema,
});

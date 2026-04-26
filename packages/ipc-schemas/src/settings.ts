import { z } from 'zod';

export const HotkeyOverridesSchema = z.record(z.string(), z.string());

export const SettingsSnapshotSchema = z.object({
  sidebarWidth: z.number().int().nonnegative(),
  inspectorWidth: z.number().int().nonnegative(),
  theme: z.enum(['system', 'light', 'dark']),
  hotkeyOverrides: HotkeyOverridesSchema,
});

export const SettingsPatchSchema = SettingsSnapshotSchema.partial();

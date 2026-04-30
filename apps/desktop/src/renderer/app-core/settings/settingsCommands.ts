import type { AppearanceMode } from '@firebase-desk/design-tokens';
import type { ActivityLogAppendInput } from '@firebase-desk/repo-contracts';
import { messageFromError } from '../shared/errors.ts';
import { elapsedMs } from '../shared/time.ts';
import { settingsPatchMetadata, settingsPatchSummary } from './settingsSelectors.ts';

export interface SettingsCommandEnvironment {
  readonly now: () => number;
  readonly onStatus?: ((message: string) => void) | undefined;
  readonly recordActivity: (input: ActivityLogAppendInput) => Promise<void> | void;
}

export interface ChangeAppearanceModeInput {
  readonly mode: AppearanceMode;
  readonly setMode: (mode: AppearanceMode) => Promise<void>;
}

export async function changeAppearanceModeCommand(
  env: SettingsCommandEnvironment,
  input: ChangeAppearanceModeInput,
): Promise<void> {
  const startedAt = env.now();
  try {
    await input.setMode(input.mode);
    void env.recordActivity({
      action: 'Change theme',
      area: 'settings',
      durationMs: elapsedMs(startedAt, env.now()),
      metadata: { mode: input.mode },
      status: 'success',
      summary: `Theme changed to ${input.mode}`,
      target: { type: 'settings' },
    });
  } catch (error) {
    const message = messageFromError(error, 'Could not change theme.');
    env.onStatus?.(`Theme failed: ${message}`);
    void env.recordActivity({
      action: 'Change theme',
      area: 'settings',
      durationMs: elapsedMs(startedAt, env.now()),
      error: { message },
      metadata: { mode: input.mode },
      status: 'failure',
      summary: message,
      target: { type: 'settings' },
    });
  }
}

export function recordSettingsSavedCommand(
  env: Pick<SettingsCommandEnvironment, 'recordActivity'>,
  patch: Parameters<typeof settingsPatchMetadata>[0],
): void {
  void env.recordActivity({
    action: 'Update settings',
    area: 'settings',
    metadata: settingsPatchMetadata(patch),
    status: 'success',
    summary: settingsPatchSummary(patch),
    target: { type: 'settings' },
  });
}

export interface DesktopDataDirectoryApi {
  readonly getConfig?: (() => Promise<{ readonly dataDirectory: string; }>) | undefined;
  readonly openDataDirectory?: (() => Promise<void>) | undefined;
}

export async function loadDataDirectoryPathCommand(
  api: DesktopDataDirectoryApi | null,
): Promise<string | null> {
  if (!api?.getConfig) return null;
  try {
    const config = await api.getConfig();
    return config.dataDirectory;
  } catch {
    return null;
  }
}

export async function openDataDirectoryCommand(
  env: Pick<SettingsCommandEnvironment, 'onStatus'>,
  api: DesktopDataDirectoryApi | null,
): Promise<void> {
  if (!api?.openDataDirectory) throw new Error('Data location is unavailable.');
  await api.openDataDirectory();
  env.onStatus?.('Opened data location');
}

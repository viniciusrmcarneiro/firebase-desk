import type { SettingsRepository } from '@firebase-desk/repo-contracts';
import type { IpcHandlerMap } from './handler-types.ts';

export function createSettingsHandlers(
  settingsRepository: SettingsRepository,
  activityLogRepository: { readonly prune: () => Promise<void>; },
): Pick<
  IpcHandlerMap,
  | 'settings.getHotkeyOverrides'
  | 'settings.load'
  | 'settings.save'
  | 'settings.setHotkeyOverrides'
> {
  return {
    'settings.load': () => settingsRepository.load(),
    'settings.save': async (request) => {
      const snapshot = await settingsRepository.save(request);
      if (request.activityLog?.maxBytes !== undefined) await activityLogRepository.prune();
      return snapshot;
    },
    'settings.getHotkeyOverrides': () => settingsRepository.getHotkeyOverrides(),
    'settings.setHotkeyOverrides': async (request) => {
      await settingsRepository.setHotkeyOverrides(request);
    },
  };
}

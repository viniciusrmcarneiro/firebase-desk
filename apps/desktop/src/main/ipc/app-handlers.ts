import type { SettingsRepository } from '@firebase-desk/repo-contracts';
import { resolveDataMode } from '../app/data-mode.ts';
import type { IpcHandlerMap } from './handler-types.ts';

export interface AppHandlerDeps {
  readonly appVersion: string;
  readonly dataDirectory: string;
  readonly openDataDirectory: () => Promise<string>;
  readonly settingsRepository: SettingsRepository;
}

export function createAppHandlers(
  deps: AppHandlerDeps,
): Pick<IpcHandlerMap, 'app.config' | 'app.openDataDirectory' | 'health.check'> {
  return {
    'health.check': () => ({
      pong: 'pong' as const,
      receivedAt: new Date().toISOString(),
      appVersion: deps.appVersion,
    }),
    'app.config': async () => ({
      ...await resolveDataMode(deps.settingsRepository),
      dataDirectory: deps.dataDirectory,
    }),
    'app.openDataDirectory': async () => {
      const errorMessage = await deps.openDataDirectory();
      if (errorMessage) throw new Error(errorMessage);
    },
  };
}

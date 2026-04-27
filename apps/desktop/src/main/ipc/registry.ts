import { IPC_CHANNELS, type IpcChannel } from '@firebase-desk/ipc-schemas';
import { app, dialog, ipcMain, shell } from 'electron';
import { readFile } from 'node:fs/promises';
import { resolveDataMode } from '../app/data-mode.ts';
import { MainProjectsRepository } from '../projects/main-projects-repository.ts';
import { MainSettingsRepository } from '../settings/main-settings-repository.ts';
import { CredentialsStore } from '../storage/credentials-store.ts';
import { ProjectsStore } from '../storage/projects-store.ts';
import { SettingsStore } from '../storage/settings-store.ts';

type Handler<C extends IpcChannel> = (
  request: import('@firebase-desk/ipc-schemas').IpcRequest<C>,
) =>
  | Promise<import('@firebase-desk/ipc-schemas').IpcResponse<C>>
  | import('@firebase-desk/ipc-schemas').IpcResponse<C>;

export function registerIpcHandlers(): void {
  const userDataPath = app.getPath('userData');
  const settingsRepository = new MainSettingsRepository(new SettingsStore(userDataPath));
  const projectsRepository = new MainProjectsRepository(
    new ProjectsStore(userDataPath),
    new CredentialsStore(userDataPath),
  );

  const handlers: Partial<{ [C in IpcChannel]: Handler<C>; }> = {
    'health.check': (_request) => ({
      pong: 'pong' as const,
      receivedAt: new Date().toISOString(),
      appVersion: app.getVersion(),
    }),
    'app.config': async () => ({
      ...await resolveDataMode(settingsRepository),
      dataDirectory: userDataPath,
    }),
    'app.openDataDirectory': async () => {
      const errorMessage = await shell.openPath(userDataPath);
      if (errorMessage) throw new Error(errorMessage);
    },
    'projects.list': async () => [...await projectsRepository.list()],
    'projects.get': ({ id }) => projectsRepository.get(id),
    'projects.add': (request) => projectsRepository.add(request),
    'projects.update': ({ id, patch }) => projectsRepository.update(id, patch),
    'projects.remove': ({ id }) => projectsRepository.remove(id),
    'projects.validateServiceAccount': ({ json }) =>
      projectsRepository.validateServiceAccount(json),
    'projects.pickServiceAccountFile': async () => {
      const result = await dialog.showOpenDialog({
        title: 'Select service account JSON',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (result.canceled || !result.filePaths[0]) return { canceled: true };
      return { canceled: false, json: await readFile(result.filePaths[0], 'utf8') };
    },
    'settings.load': () => settingsRepository.load(),
    'settings.save': (request) => settingsRepository.save(request),
    'settings.getHotkeyOverrides': () => settingsRepository.getHotkeyOverrides(),
    'settings.setHotkeyOverrides': async (request) => {
      await settingsRepository.setHotkeyOverrides(request);
    },
  };

  for (const channel of Object.keys(IPC_CHANNELS) as IpcChannel[]) {
    const handler = handlers[channel];
    if (!handler) continue;
    const schema = IPC_CHANNELS[channel];
    ipcMain.handle(channel, async (_event, raw: unknown) => {
      const parsed = schema.request.parse(raw);
      const result = await (handler as Handler<typeof channel>)(parsed as never);
      return schema.response.parse(result);
    });
  }
}

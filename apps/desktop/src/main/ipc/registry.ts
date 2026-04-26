import { IPC_CHANNELS, type IpcChannel } from '@firebase-desk/ipc-schemas';
import { ipcMain } from 'electron';
import { app } from 'electron';

type Handler<C extends IpcChannel> = (
  request: import('@firebase-desk/ipc-schemas').IpcRequest<C>,
) =>
  | Promise<import('@firebase-desk/ipc-schemas').IpcResponse<C>>
  | import('@firebase-desk/ipc-schemas').IpcResponse<C>;

const handlers: Partial<{ [C in IpcChannel]: Handler<C>; }> = {
  'health.check': (_request) => ({
    pong: 'pong' as const,
    receivedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
  }),
};

export function registerIpcHandlers(): void {
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

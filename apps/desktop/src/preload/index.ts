import {
  IPC_CHANNELS,
  type IpcChannel,
  type IpcRequest,
  type IpcResponse,
} from '@firebase-desk/ipc-schemas';
import { contextBridge, ipcRenderer } from 'electron';

function invoke<C extends IpcChannel>(channel: C, request: IpcRequest<C>): Promise<IpcResponse<C>> {
  return ipcRenderer.invoke(channel, request) as Promise<IpcResponse<C>>;
}

const api = {
  health: {
    check: (request: IpcRequest<'health.check'>) => invoke('health.check', request),
  },
  // Placeholders: rest of the surface fills in Phases 3+.
  channels: Object.keys(IPC_CHANNELS) as IpcChannel[],
} as const;

export type DesktopApi = typeof api;

contextBridge.exposeInMainWorld('firebaseDesk', api);

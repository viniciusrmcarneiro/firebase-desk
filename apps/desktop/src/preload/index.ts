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
  app: {
    getConfig: () => invoke('app.config', {}),
    openDataDirectory: () => invoke('app.openDataDirectory', {}),
  },
  health: {
    check: (request: IpcRequest<'health.check'>) => invoke('health.check', request),
  },
  projects: {
    list: () => invoke('projects.list', {}),
    get: (request: IpcRequest<'projects.get'>) => invoke('projects.get', request),
    add: (request: IpcRequest<'projects.add'>) => invoke('projects.add', request),
    update: (request: IpcRequest<'projects.update'>) => invoke('projects.update', request),
    remove: (request: IpcRequest<'projects.remove'>) => invoke('projects.remove', request),
    validateServiceAccount: (request: IpcRequest<'projects.validateServiceAccount'>) =>
      invoke('projects.validateServiceAccount', request),
    pickServiceAccountFile: () => invoke('projects.pickServiceAccountFile', {}),
  },
  settings: {
    load: () => invoke('settings.load', {}),
    save: (request: IpcRequest<'settings.save'>) => invoke('settings.save', request),
    getHotkeyOverrides: () => invoke('settings.getHotkeyOverrides', {}),
    setHotkeyOverrides: (request: IpcRequest<'settings.setHotkeyOverrides'>) =>
      invoke('settings.setHotkeyOverrides', request),
  },
  firestore: {
    listRootCollections: (request: IpcRequest<'firestore.listRootCollections'>) =>
      invoke('firestore.listRootCollections', request),
    listDocuments: (request: IpcRequest<'firestore.listDocuments'>) =>
      invoke('firestore.listDocuments', request),
    listSubcollections: (request: IpcRequest<'firestore.listSubcollections'>) =>
      invoke('firestore.listSubcollections', request),
    runQuery: (request: IpcRequest<'firestore.runQuery'>) => invoke('firestore.runQuery', request),
    getDocument: (request: IpcRequest<'firestore.getDocument'>) =>
      invoke('firestore.getDocument', request),
  },
  scriptRunner: {
    run: (request: IpcRequest<'scriptRunner.run'>) => invoke('scriptRunner.run', request),
    cancel: (request: IpcRequest<'scriptRunner.cancel'>) => invoke('scriptRunner.cancel', request),
  },
  auth: {
    listUsers: (request: IpcRequest<'auth.listUsers'>) => invoke('auth.listUsers', request),
    getUser: (request: IpcRequest<'auth.getUser'>) => invoke('auth.getUser', request),
    searchUsers: (request: IpcRequest<'auth.searchUsers'>) => invoke('auth.searchUsers', request),
    setCustomClaims: (request: IpcRequest<'auth.setCustomClaims'>) =>
      invoke('auth.setCustomClaims', request),
  },
  channels: Object.keys(IPC_CHANNELS) as IpcChannel[],
} as const;

export type DesktopApi = typeof api;

contextBridge.exposeInMainWorld('firebaseDesk', api);

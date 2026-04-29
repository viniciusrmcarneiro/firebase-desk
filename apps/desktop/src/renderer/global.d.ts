/// <reference types="vite/client" />

import type { IpcRequest, IpcResponse } from '@firebase-desk/ipc-schemas';
import type { ScriptRunEventListener } from '@firebase-desk/repo-contracts';

declare global {
  interface DesktopAppApi {
    readonly getConfig: () => Promise<IpcResponse<'app.config'>>;
    readonly openDataDirectory: () => Promise<IpcResponse<'app.openDataDirectory'>>;
  }

  interface DesktopHealthApi {
    readonly check: (request: IpcRequest<'health.check'>) => Promise<IpcResponse<'health.check'>>;
  }

  interface DesktopProjectsApi {
    readonly list: () => Promise<IpcResponse<'projects.list'>>;
    readonly get: (request: IpcRequest<'projects.get'>) => Promise<IpcResponse<'projects.get'>>;
    readonly add: (request: IpcRequest<'projects.add'>) => Promise<IpcResponse<'projects.add'>>;
    readonly update: (
      request: IpcRequest<'projects.update'>,
    ) => Promise<IpcResponse<'projects.update'>>;
    readonly remove: (
      request: IpcRequest<'projects.remove'>,
    ) => Promise<IpcResponse<'projects.remove'>>;
    readonly validateServiceAccount: (
      request: IpcRequest<'projects.validateServiceAccount'>,
    ) => Promise<IpcResponse<'projects.validateServiceAccount'>>;
    readonly pickServiceAccountFile: () => Promise<IpcResponse<'projects.pickServiceAccountFile'>>;
  }

  interface DesktopSettingsApi {
    readonly load: () => Promise<IpcResponse<'settings.load'>>;
    readonly save: (request: IpcRequest<'settings.save'>) => Promise<IpcResponse<'settings.save'>>;
    readonly getHotkeyOverrides: () => Promise<IpcResponse<'settings.getHotkeyOverrides'>>;
    readonly setHotkeyOverrides: (
      request: IpcRequest<'settings.setHotkeyOverrides'>,
    ) => Promise<IpcResponse<'settings.setHotkeyOverrides'>>;
  }

  interface DesktopFirestoreApi {
    readonly listRootCollections: (
      request: IpcRequest<'firestore.listRootCollections'>,
    ) => Promise<IpcResponse<'firestore.listRootCollections'>>;
    readonly listDocuments: (
      request: IpcRequest<'firestore.listDocuments'>,
    ) => Promise<IpcResponse<'firestore.listDocuments'>>;
    readonly listSubcollections: (
      request: IpcRequest<'firestore.listSubcollections'>,
    ) => Promise<IpcResponse<'firestore.listSubcollections'>>;
    readonly runQuery: (
      request: IpcRequest<'firestore.runQuery'>,
    ) => Promise<IpcResponse<'firestore.runQuery'>>;
    readonly getDocument: (
      request: IpcRequest<'firestore.getDocument'>,
    ) => Promise<IpcResponse<'firestore.getDocument'>>;
    readonly saveDocument: (
      request: IpcRequest<'firestore.saveDocument'>,
    ) => Promise<IpcResponse<'firestore.saveDocument'>>;
    readonly deleteDocument: (
      request: IpcRequest<'firestore.deleteDocument'>,
    ) => Promise<IpcResponse<'firestore.deleteDocument'>>;
  }

  interface DesktopScriptRunnerApi {
    readonly run: (
      request: IpcRequest<'scriptRunner.run'>,
    ) => Promise<IpcResponse<'scriptRunner.run'>>;
    readonly cancel: (
      request: IpcRequest<'scriptRunner.cancel'>,
    ) => Promise<IpcResponse<'scriptRunner.cancel'>>;
    readonly subscribe: (listener: ScriptRunEventListener) => () => void;
  }

  interface DesktopAuthApi {
    readonly listUsers: (
      request: IpcRequest<'auth.listUsers'>,
    ) => Promise<IpcResponse<'auth.listUsers'>>;
    readonly getUser: (
      request: IpcRequest<'auth.getUser'>,
    ) => Promise<IpcResponse<'auth.getUser'>>;
    readonly searchUsers: (
      request: IpcRequest<'auth.searchUsers'>,
    ) => Promise<IpcResponse<'auth.searchUsers'>>;
    readonly setCustomClaims: (
      request: IpcRequest<'auth.setCustomClaims'>,
    ) => Promise<IpcResponse<'auth.setCustomClaims'>>;
  }

  interface DesktopApi {
    readonly app: DesktopAppApi;
    readonly health: DesktopHealthApi;
    readonly projects: DesktopProjectsApi;
    readonly settings: DesktopSettingsApi;
    readonly firestore: DesktopFirestoreApi;
    readonly scriptRunner: DesktopScriptRunnerApi;
    readonly auth: DesktopAuthApi;
    readonly channels: ReadonlyArray<string>;
  }

  interface Window {
    readonly firebaseDesk: DesktopApi;
  }
}

export type { DesktopApi };

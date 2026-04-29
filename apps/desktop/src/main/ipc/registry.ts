import {
  IPC_CHANNELS,
  type IpcChannel,
  type IpcRequest,
  type IpcResponse,
  SCRIPT_RUN_EVENT_CHANNEL,
} from '@firebase-desk/ipc-schemas';
import type {
  AuthUser,
  FirestoreCollectionNode,
  FirestoreDocumentNode,
  FirestoreDocumentResult,
  FirestoreQuery,
  Page,
  PageRequest,
  ScriptRunEvent,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import {
  AdminAuthProvider,
  AdminFirestoreProvider,
  FirebaseAuthRepository,
  type FirebaseConnectionResolver,
  FirebaseFirestoreRepository,
} from '@firebase-desk/repo-firebase';
import { ProcessScriptRunnerRepository } from '@firebase-desk/script-runner';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDataMode } from '../app/data-mode.ts';
import { MainProjectsRepository } from '../projects/main-projects-repository.ts';
import { MainSettingsRepository } from '../settings/main-settings-repository.ts';
import { CredentialsStore } from '../storage/credentials-store.ts';
import { ProjectsStore } from '../storage/projects-store.ts';
import { SettingsStore } from '../storage/settings-store.ts';

type Handler<C extends IpcChannel> = (
  request: IpcRequest<C>,
) => Promise<IpcResponse<C>> | IpcResponse<C>;

interface IpcLogger {
  error(message: string, error: unknown): void;
}

const ipcLogger: IpcLogger = {
  error(message, error) {
    process.stderr.write(`${message}\n${errorText(error)}\n`);
  },
};

export function registerIpcHandlers(): void {
  const userDataPath = app.getPath('userData');
  const settingsRepository = new MainSettingsRepository(new SettingsStore(userDataPath));
  const projectsStore = new ProjectsStore(userDataPath);
  const credentialsStore = new CredentialsStore(userDataPath);
  const projectsRepository = new MainProjectsRepository(projectsStore, credentialsStore);
  const connectionResolver: FirebaseConnectionResolver = {
    async resolveConnection(connectionId) {
      const project = await projectsRepository.get(connectionId);
      if (!project) throw new Error(`Connection not found: ${connectionId}`);
      return {
        project,
        credentialJson: project.hasCredential ? await credentialsStore.load(project.id) : null,
      };
    },
  };
  const firestoreProvider = new AdminFirestoreProvider(connectionResolver);
  const firestoreRepository = new FirebaseFirestoreRepository(firestoreProvider);
  const authProvider = new AdminAuthProvider(connectionResolver);
  const scriptRunnerRepository = new ProcessScriptRunnerRepository(connectionResolver, {
    workerPath: scriptRunnerWorkerPath(),
  });
  scriptRunnerRepository.subscribe(broadcastScriptRunEvent);
  const authRepository = new FirebaseAuthRepository(authProvider);

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
    'projects.update': async ({ id, patch }) => {
      const project = await projectsRepository.update(id, patch);
      firestoreRepository.invalidateConnection(id);
      await firestoreProvider.invalidateConnection(id);
      await authProvider.invalidateConnection(id);
      return project;
    },
    'projects.remove': async ({ id }) => {
      await projectsRepository.remove(id);
      firestoreRepository.invalidateConnection(id);
      await firestoreProvider.invalidateConnection(id);
      await authProvider.invalidateConnection(id);
    },
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
    'firestore.listRootCollections': async ({ connectionId }) =>
      toIpcCollections(await firestoreRepository.listRootCollections(connectionId)),
    'firestore.listDocuments': async ({ collectionPath, connectionId, request }) =>
      toIpcDocumentPage(
        await firestoreRepository.listDocuments(
          connectionId,
          collectionPath,
          toPageRequest(request),
        ),
      ),
    'firestore.listSubcollections': async ({ connectionId, documentPath }) =>
      toIpcCollections(await firestoreRepository.listSubcollections(connectionId, documentPath)),
    'firestore.runQuery': async ({ query, request }) =>
      toIpcResultPage(
        await firestoreRepository.runQuery(toFirestoreQuery(query), toPageRequest(request)),
      ),
    'firestore.getDocument': ({ connectionId, documentPath }) =>
      firestoreRepository.getDocument(connectionId, documentPath).then((document) =>
        document ? toIpcDocumentResult(document) : null
      ),
    'firestore.saveDocument': async ({ connectionId, data, documentPath }) =>
      toIpcDocumentResult(
        await firestoreRepository.saveDocument(connectionId, documentPath, data),
      ),
    'firestore.deleteDocument': async ({ connectionId, documentPath, options }) => {
      await firestoreRepository.deleteDocument(connectionId, documentPath, options);
    },
    'scriptRunner.run': async (request) =>
      toIpcScriptRunResult(await scriptRunnerRepository.run(request)),
    'scriptRunner.cancel': async ({ runId }) => {
      await scriptRunnerRepository.cancel(runId);
    },
    'auth.listUsers': async ({ projectId, request }) =>
      toIpcAuthUserPage(await authRepository.listUsers(projectId, toPageRequest(request))),
    'auth.getUser': async ({ projectId, uid }) => {
      const user = await authRepository.getUser(projectId, uid);
      return user ? toIpcAuthUser(user) : null;
    },
    'auth.searchUsers': async ({ projectId, query }) =>
      (await authRepository.searchUsers(projectId, query)).map(toIpcAuthUser),
    'auth.setCustomClaims': async ({ claims, projectId, uid }) =>
      toIpcAuthUser(await authRepository.setCustomClaims(projectId, uid, claims)),
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
      try {
        const parsed = schema.request.parse(raw);
        const result = await (handler as Handler<typeof channel>)(parsed as never);
        return schema.response.parse(result);
      } catch (error) {
        ipcLogger.error(`[ipc] ${channel} failed`, error);
        throw error;
      }
    });
  }
}

function scriptRunnerWorkerPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    resolve(currentDir, 'script-runner-worker.js'),
    resolve(currentDir, '..', 'script-runner-worker.js'),
    resolve(currentDir, '../script-runner-worker.ts'),
  ];
  const workerPath = candidatePaths.find((path) => existsSync(path));
  if (workerPath) return workerPath;
  throw new Error(`Unable to locate script runner worker. Checked ${candidatePaths.join(', ')}.`);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

function toPageRequest(
  request?: {
    readonly cursor?: { readonly token: string; } | undefined;
    readonly limit?: number | undefined;
  },
): PageRequest | undefined {
  if (!request) return undefined;
  return {
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
    ...(request.cursor !== undefined ? { cursor: { token: request.cursor.token } } : {}),
  };
}

function toIpcAuthUserPage(page: Page<AuthUser>): IpcResponse<'auth.listUsers'> {
  return {
    items: page.items.map(toIpcAuthUser),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

function toIpcAuthUser(user: AuthUser): NonNullable<IpcResponse<'auth.getUser'>> {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    provider: user.provider,
    disabled: user.disabled,
    customClaims: { ...user.customClaims },
  };
}

function toFirestoreQuery(query: IpcRequest<'firestore.runQuery'>['query']): FirestoreQuery {
  return {
    connectionId: query.connectionId,
    path: query.path,
    ...(query.filters !== undefined
      ? { filters: query.filters.map((filter) => ({ ...filter })) }
      : {}),
    ...(query.sorts !== undefined ? { sorts: query.sorts.map((sort) => ({ ...sort })) } : {}),
  };
}

function toIpcCollections(
  collections: ReadonlyArray<FirestoreCollectionNode>,
): IpcResponse<'firestore.listRootCollections'> {
  return collections.map(toIpcCollectionNode);
}

function toIpcCollectionNode(
  collection: FirestoreCollectionNode,
): IpcResponse<'firestore.listRootCollections'>[number] {
  return {
    id: collection.id,
    path: collection.path,
    ...(collection.documentCount !== undefined ? { documentCount: collection.documentCount } : {}),
  };
}

function toIpcDocumentPage(
  page: Page<FirestoreDocumentNode>,
): IpcResponse<'firestore.listDocuments'> {
  return {
    items: page.items.map((document) => ({
      id: document.id,
      path: document.path,
      hasSubcollections: document.hasSubcollections,
    })),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

function toIpcResultPage(
  page: Page<FirestoreDocumentResult>,
): IpcResponse<'firestore.runQuery'> {
  return {
    items: page.items.map(toIpcDocumentResult),
    nextCursor: page.nextCursor ? { token: page.nextCursor.token } : null,
  };
}

function toIpcDocumentResult(
  document: FirestoreDocumentResult,
): NonNullable<IpcResponse<'firestore.getDocument'>> {
  return {
    id: document.id,
    path: document.path,
    data: document.data,
    hasSubcollections: document.hasSubcollections,
    ...(document.subcollections
      ? { subcollections: document.subcollections.map(toIpcCollectionNode) }
      : {}),
  };
}

function toIpcScriptRunResult(result: ScriptRunResult): IpcResponse<'scriptRunner.run'> {
  return {
    returnValue: result.returnValue,
    ...(result.stream
      ? {
        stream: result.stream.map((item) => ({
          id: item.id,
          label: item.label,
          badge: item.badge,
          view: item.view,
          value: item.value,
        })),
      }
      : {}),
    logs: result.logs.map((log) => ({
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
    })),
    errors: result.errors.map((error) => ({
      ...(error.name ? { name: error.name } : {}),
      ...(error.code ? { code: error.code } : {}),
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    })),
    durationMs: result.durationMs,
    ...(result.cancelled !== undefined ? { cancelled: result.cancelled } : {}),
  };
}

function toIpcScriptRunEvent(event: ScriptRunEvent): unknown {
  if (event.type === 'complete') {
    return { ...event, result: toIpcScriptRunResult(event.result) };
  }
  return event;
}

export function broadcastScriptRunEvent(event: ScriptRunEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(SCRIPT_RUN_EVENT_CHANNEL, toIpcScriptRunEvent(event));
  }
}
